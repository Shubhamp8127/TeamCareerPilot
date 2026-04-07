import "../styles/jobHunting.css";
import {
  Upload,
  Search,
  Briefcase,
  FileText,
  Sparkles,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import apiClient from "../services/apiClient";
import { markFeatureUsed } from "../services/dashboardApi";
import { motion, animate } from "framer-motion";
import Footer from "../components/Footer";
import jsPDF from "jspdf";

/* ================= FRAMER VARIANTS ================= */
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const JobHunting = () => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
const [analysisStarted, setAnalysisStarted] = useState(false);
const [loadingMessage, setLoadingMessage] = useState(
  t("jobHunting.analyzingResume")
);

  /* ATS COUNT-UP */
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    markFeatureUsed().catch((err) => {
      console.error("Feature usage tracking failed:", err);
    });
  }, []);

  useEffect(() => {
    if (!result?.atsScore) return;

    setAnimatedScore(0);

    const controls = animate(0, result.atsScore, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate(value) {
        setAnimatedScore(Math.round(value));
      },
    });

    return () => controls.stop();
  }, [result]);

  const handleBoxClick = () => fileInputRef.current.click();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setError(t("jobHunting.errorInvalidFile"));
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setResult(null);
    setError("");
  };

  const handleAnalyze = async () => {
  if (!file) {
    setError(t("jobHunting.errorNoFile"));
    return;
  }

  const formData = new FormData();
  formData.append("resume", file);

  try {
    setLoading(true);
    setAnalysisStarted(true);
    setProgress(0);
    setError("");
    setResult(null);

    // Fake smooth progress animation
const messages = [
  t("jobHunting.parsingResume"),
  t("jobHunting.checkingATS"),
  t("jobHunting.matchingSkills"),
  t("jobHunting.generatingRecommendations"),
];

let messageIndex = 0;

const interval = setInterval(() => {
  setProgress((prev) => {
    if (prev >= 90) return prev;
    return prev + 5;
  });

  setLoadingMessage(messages[messageIndex % messages.length]);
  messageIndex++;
}, 1200);

    const res = await apiClient.post("/api/resume/analyze", formData);

    clearInterval(interval);
    setProgress(100);

    setTimeout(() => {
      setResult(res.data);
      setLoading(false);
    }, 800);

  } catch {
    setError("Resume analysis failed. Please try again.");
    setLoading(false);
  }
};

  /* ================= DOWNLOAD PDF ================= */
const handleDownloadPDF = () => {
  if (!result) return;

  const doc = new jsPDF("p", "mm", "a4");

  const pageHeight = 297;
  const pageWidth = 210;

  const headerHeight = 50;
  const footerHeight = 25;

  const contentTop = headerHeight + 5;
  const contentBottom = pageHeight - footerHeight - 5;

  let y = contentTop;

  // Direct image paths (NO onload nesting)
  const headerImg = "/header.jpeg";
  const footerImg = "/footer.jpeg";
  const watermarkImg = "/watermark.jpeg";

  const addHeaderFooter = () => {
    doc.addImage(headerImg, "JPEG", 0, 0, pageWidth, headerHeight);
    doc.addImage(
      footerImg,
      "JPEG",
      0,
      pageHeight - footerHeight,
      pageWidth,
      footerHeight
    );
  };

  const addWatermark = () => {
    const watermarkWidth = 120;
    const watermarkHeight = 120;

    const x = (pageWidth - watermarkWidth) / 2;
    const yPos = (pageHeight - watermarkHeight) / 2;

    

    // NO opacity (safe)
    doc.addImage(
      watermarkImg,
      "JPEG",
      x,
      yPos,
      watermarkWidth,
      watermarkHeight
    );
  };

  // First page
  addHeaderFooter();
  addWatermark();

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);

  const checkPageBreak = (spaceNeeded = 10) => {
    if (y + spaceNeeded > contentBottom) {
      doc.addPage();
      addHeaderFooter();
      addWatermark();
      y = contentTop;
    }
  };

  const leftMargin = 30;
  const contentWidth = 155;
  const lineHeight = 6;

  // FILE NAME
  doc.text(fileName, 25, y);
  y += 10;

  // ATS SCORE
  doc.text(`ATS Score: ${result.atsScore}`, 25, y);
  y += 15;

  // MISSING SKILLS
  doc.setFontSize(13);
  doc.text("MISSING SKILLS:", 25, y);
  y += 8;

  doc.setFontSize(12);
  result.missingSkills?.forEach((skill) => {
    const wrapped = doc.splitTextToSize(`- ${skill}`, contentWidth);
    checkPageBreak(wrapped.length * lineHeight);
    doc.text(wrapped, leftMargin, y);
    y += wrapped.length * lineHeight;
  });

  y += 5;

  // RECOMMENDED ROLES
  doc.setFontSize(13);
  doc.text("RECOMMENDED ROLES:", 25, y);
  y += 8;

  doc.setFontSize(12);
  result.recommendedRoles?.forEach((role) => {
    const wrapped = doc.splitTextToSize(`- ${role}`, contentWidth);
    checkPageBreak(wrapped.length * lineHeight);
    doc.text(wrapped, leftMargin, y);
    y += wrapped.length * lineHeight;
  });

  y += 5;

  // IMPROVEMENT TIPS
  doc.setFontSize(13);
  doc.text("IMPROVEMENT TIPS:", 25, y);
  y += 8;

  doc.setFontSize(12);
  result.improvementTips?.forEach((tip) => {
    const wrapped = doc.splitTextToSize(`- ${tip}`, contentWidth);
    checkPageBreak(wrapped.length * lineHeight);
    doc.text(wrapped, leftMargin, y);
    y += wrapped.length * lineHeight;
  });

  doc.save("Resume_Analysis_Report.pdf");
};







  return (
    <>
      {loading && (
  <div className="full-loader">
    <div className="loader-content">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ repeat: Infinity, duration: 1.2 }}
        className="loader-text"
      >
        {loadingMessage}
      </motion.h2>

      <div className="ai-spinner"></div>
      

      <div className="progress-bar">
        <motion.div
          className="progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "easeOut" }}
        />
      </div>

      <p className="progress-percent">{progress}%</p>
    </div>
  </div>
)}


  {/* ================= UPLOAD PAGE ================= */}
      {!loading && !result && (
        <>
      <div className="jh-page">
        {/* HEADER */}
        <motion.div
          className="jh-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="jh-hero-icon">
            <Briefcase size={22} />
          </div>

          <h1 className="jh-hero-title">
  {t("Resume")} <span>{t("Analyzer")}</span>
</h1>

         <p className="jh-hero-subtitle">
  {t("jobHunting.heroSubtitle")}
</p>
        </motion.div>

        {/* CARD */}
        <div className="jh-card">
          <h3 className="jh-upload-title">
            <span className="jh-upload-title-icon">
              <Upload size={18} />
            </span>
            {t("jobHunting.uploadTitle")}
          </h3>

          <input
            type="file"
            accept="application/pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          <div className="jh-upload-box" onClick={handleBoxClick}>
            {fileName ? (
              <div className="jh-file-name">
                <FileText size={16} /> {fileName}
              </div>
            ) : (
              <>
                <div className="jh-file-icon">
                  <FileText size={28} />
                </div>
                <p className="jh-main-text">
                  {t("jobHunting.uploadChooseFile")}
                </p>
                <span>{t("jobHunting.uploadFormatOnly")}</span>
              </>
            )}
          </div>

          <button
            className="jh-analyze-btn"
            onClick={handleAnalyze}
            disabled={loading}
          >
            <Sparkles size={18} style={{ marginRight: "8px" }} />
            {loading ? t("jobHunting.loadingText") : t("jobHunting.analyzeBtn")}
          </button>

          {error && <p className="error">{error}</p>}

        </div>

            {/* ================= WHAT YOU’LL GET ================= */}
        <motion.div
          className="jh-benefits"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <motion.h3
            className="jh-benefits-title"
            variants={fadeUp}
          >
             {t(" What You’ll Get")}
          </motion.h3>

          <motion.div className="jh-benefits-grid">
            <motion.div
              className="jh-benefit-card"
              variants={fadeUp}
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <div className="jh-benefit-icon success">
                <Search size={18} />
              </div>
              <h4>Resume Analysis</h4>
              <p>
                AI evaluates your resume for strengths, gaps, and improvement areas.
              </p>
            </motion.div>

            <motion.div
              className="jh-benefit-card"
              variants={fadeUp}
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <div className="jh-benefit-icon info">
                <Briefcase size={18} />
              </div>
              <h4>ATS Compliant</h4>
              <p>
                AI checks if your resume follows ATS standards and suggests optimizations for better recruiter visibility.
              </p>
            </motion.div>

            <motion.div
              className="jh-benefit-card"
              variants={fadeUp}
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <div className="jh-benefit-icon warning">
                <Upload size={18} />
              </div>
              <h4>Downloadable Report</h4>
              <p>
                Generate a detailed AI-powered resume analysis report that you can download and review anytime.
              </p>
            </motion.div>
          </motion.div>
      </motion.div>

        </div> 
        
        </>
      )}


          {/* ================= RESULT ================= */}
          {result && !loading &&  (
            <>
              <div className="resume-analysis-header">
                <h2>Resume Analysis</h2>
                <p>{fileName}</p>
              </div>

              <motion.div
                className="resume-analysis"
                variants={container}
                initial="hidden"
                animate="show"
              >
                {/* ATS SCORE */}
                <motion.div className="ats-card" variants={scaleIn}>
                  <div className="ats-circle">
                    <svg width="160" height="160">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="url(#gradGlow)"
                        strokeWidth="14"
                        fill="none"
                        opacity="0.35"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="#1e293b"
                        strokeWidth="12"
                        fill="none"
                      />
                      <motion.circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="url(#grad)"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray="440"
                        strokeDashoffset={
                          440 - (result.atsScore || 0) * 4.4
                        }
                        strokeLinecap="round"
                        initial={{ strokeDashoffset: 440 }}
                        animate={{
                          strokeDashoffset:
                            440 - (result.atsScore || 0) * 4.4,
                        }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                      />
                      <defs>
                        <linearGradient id="grad">
                          <stop offset="0%" stopColor="#facc15" />
                          <stop offset="100%" stopColor="#fb7185" />
                        </linearGradient>
                        <linearGradient id="gradGlow">
                          <stop offset="0%" stopColor="#facc15" />
                          <stop offset="100%" stopColor="#fb7185" />
                        </linearGradient>
                      </defs>
                    </svg>

                    <div className="ats-text">
                      <motion.h2
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8 }}
                      >
                        {animatedScore}
                      </motion.h2>
                      <span>ATS Score</span>
                    </div>
                  </div>
                </motion.div>

                {/* DETAILS */}
                <motion.div className="analysis-details">
                  <motion.div className="analysis-box" variants={fadeUp}>
                    <h4 className="missing-title">
                      Missing Skills
                      <Search size={16} className="missing-search" />
                    </h4>
                    <ul>
                      {result.missingSkills?.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </motion.div>

                  <motion.div className="analysis-box" variants={fadeUp}>
                    <h4>Recommended Roles</h4>
                    <ul>
                      {result.recommendedRoles?.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </motion.div>

                  <motion.div className="analysis-box" variants={fadeUp}>
                    <h4>Improvement Tips</h4>
                    <ul>
                      {result.improvementTips?.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </motion.div>
                </motion.div>
              </motion.div>

              {/* ================= DOWNLOAD PDF BUTTON ================= */}
              <button
                className="jh-analyze-btn download"
                onClick={handleDownloadPDF}
                style={{ marginTop: "20px", background: "#10B981" }}
              >
                Download PDF
              </button>
            </>
          )}

        

      <Footer />
    </>
  );
};

export default JobHunting;