// backend/controllers/resumeController.js

import dotenv from "dotenv";
dotenv.config();

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "path";

// ✅ CONFIRMED WORKING MODEL
const GEMINI_MODEL = "gemini-2.5-flash";

// ✅ Initialize Gemini safely
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// ================================
// Resume Analysis Controller
// ================================
export const analyzeResume = async (req, res) => {
  try {
    // 1️⃣ Validate upload
    if (!req.file) {
      return res.status(400).json({ error: "No resume uploaded" });
    }

    if (!genAI) {
      console.error("❌ GEMINI_API_KEY not configured");
      return res
        .status(500)
        .json({ error: "AI service is not configured on the server." });
    }

    // 2️⃣ Extract text from PDF (Windows-safe)
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(req.file.buffer),
      standardFontDataUrl: `file:///${path
        .join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/")
        .replace(/\\/g, "/")}/`,
    });

    const pdf = await loadingTask.promise;

    let resumeText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      resumeText += content.items.map((item) => item.str).join(" ") + "\n";
    }

    if (!resumeText.trim()) {
      return res.status(400).json({ error: "Unable to read resume text" });
    }

    // 3️⃣ Gemini model
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
    });

    // 4️⃣ Strict JSON prompt (ATS-style)
    const prompt = `
You are an ATS and career expert.

Return ONLY valid JSON in EXACTLY this format:
{
  "atsScore": number,
  "missingSkills": string[],
  "recommendedRoles": string[],
  "improvementTips": string[]
}

Rules:
- atsScore must be between 0 and 100
- Do NOT add extra keys
- Do NOT add explanations
- JSON only

Resume:
${resumeText.slice(0, 3000)}
`;

    // 5️⃣ Gemini call (official v1beta format)
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const rawText =
      result?.response?.candidates
        ?.flatMap((c) =>
          c?.content?.parts?.map((p) => p.text || "") || []
        )
        .join("")
        .trim() || "";

    // 6️⃣ Extract JSON safely
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI response missing JSON payload");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // 7️⃣ Return clean response
    return res.json(parsed);
  } catch (err) {
    // 🔴 Detailed error logging
    console.error("❌ Resume analysis error:", {
      message: err?.message,
      status: err?.status,
      statusText: err?.statusText,
      details: err?.response?.data || err.toString(),
    });

    // Return detailed error for debugging (in development) or generic message (in production)
    const errorMessage = process.env.NODE_ENV === "production" 
      ? "Resume analysis failed. Please try again."
      : `Resume analysis failed: ${err?.message}`;

    return res.status(500).json({
      error: errorMessage,
    });
  }
};

// Debug (safe)
console.log(
  "Loaded GEMINI_API_KEY:",
  process.env.GEMINI_API_KEY ? "YES" : "NO"
);