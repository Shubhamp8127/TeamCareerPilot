import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";

// ================= ROUTES =================
import collegeRoutes from "./routes/collegeRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js"; // ✅ FIXED
import quizRoutes from "./routes/quizRoutes.js";
import newsletterRoutes from "./routes/newsletterRoutes.js";
import path from "path";

const app = express();
const __dirname = path.resolve();

// ================= DATABASE =================
connectDB();

// ================= MIDDLEWARES =================
const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

// ================= API ROUTES =================
app.use("/api/colleges", collegeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/dashboard", dashboardRoutes); // ✅ NOW WORKS
app.use("/api/quiz", quizRoutes);
app.use("/api", newsletterRoutes);

// Temporarily allow cron job in development
if (process.env.NODE_ENV === "production") {
 
  console.log("STATIC PATH:", path.join(__dirname, "../frontend/dist"));

  // Serve static files from the frontend/dist directory
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  // For any other route, serve index.html (for React Router)
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
}

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
  res.send("🚀 Career Advisor API Running");
});

// ================= SERVER =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
