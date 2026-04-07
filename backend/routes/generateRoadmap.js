import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/", async (req, res) => {
  try {
    const {
      careerGoal,
      level,
      interests,
      learningStyle,
      hoursPerWeek,
      timeline,
    } = req.body;

    if (!careerGoal) {
      return res.status(400).json({ error: "careerGoal is required" });
    }

    const prompt = `You are an expert career coach. Generate a detailed, structured career roadmap in strictly JSON format (without markdown backticks) for the following user details.
The JSON must adhere strictly to this structure:
{
  "career": "string (The requested career name)",
  "level": "string (e.g. Beginner, Intermediate)",
  "timeline": "string (e.g. 14 Months)",
  "hoursPerWeek": "string (e.g. 10 hrs)",
  "finishBy": "string (e.g. Month Year, like June 2025)",
  "phases": [
    {
      "phaseId": 1,
      "title": "string (e.g. Foundations)",
      "duration": "string (e.g. Months 1 - 3)",
      "status": "string (first phase should be 'active', rest 'upcoming')",
      "progress": number (0-100, can be 25 for first phase, 0 for rest),
      "topics": [
        { "name": "string", "completed": boolean (leave some false for active phase) }
      ],
      "tools": [
        { "name": "string (e.g. Python, NumPy, Jupyter)" }
      ],
      "miniProject": {
        "title": "string (e.g. Student Score Predictor)",
        "level": "string (e.g. Beginner Project)"
      }
    }
  ],
  "skillProgress": [
    { "skill": "string", "progress": number (0-100) }
  ],
  "nextMilestone": {
    "title": "string (e.g. Complete Python Basics)",
    "deadline": "string (e.g. 15 May 2024)"
  }
}

Career Goal: ${careerGoal}
Current Level: ${level || "Not specified"}
Areas of Interest: ${Array.isArray(interests) ? interests.join(", ") : interests || "None"}
Learning Style: ${learningStyle || "Mixed"}
Hours Per Week: ${hoursPerWeek || "Not specified"}
Target Timeline (months): ${timeline || "Not specified"}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    let text = result.response.text();

    // Strip markdown formatting if any
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

    // Find the bounds of the JSON object, ignoring any conversational text
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      text = text.slice(jsonStart, jsonEnd + 1);
    }

    let roadmapData;
    try {
      roadmapData = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON from Gemini:", text);
      return res.status(500).json({ error: "Failed to parse roadmap data" });
    }

    return res.json({ roadmap: roadmapData });
  } catch (error) {
    console.error("Generate roadmap error:", error);
    return res.status(500).json({ error: "Failed to generate roadmap" });
  }
});

export default router;
