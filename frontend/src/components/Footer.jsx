// src/components/Footer.jsx
import "../styles/footer.css";
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Github,
  ArrowUp,
  Sparkles,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../services/apiClient";

const Footer = () => {
  const { t } = useTranslation();
  const footerRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // ================== SUBSCRIBE STATES ==================
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  // ======================================================

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubscribe = async () => {
    if (!email || !validateEmail(email)) {
      toast.error("Please enter a valid email!");
      return;
    }
    if (!agreed) {
      toast.error("You must accept the privacy policy!");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.status === 409) {
        toast("You're already subscribed! 🎉", { icon: "🎉" });
        return;
      }

      if (!res.ok) throw new Error("Failed");

      toast.success("Subscribed successfully! 🎉");
      setEmail("");
      setAgreed(false);

    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setShowScrollBtn(entry.isIntersecting),
      { threshold: 0.3 }
    );
    if (footerRef.current) observer.observe(footerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <footer className="footer" ref={footerRef}>
      {/* ✅ Removed Toaster - using App.js global Toaster */}

      <div className="footer-content">
        {/* BRAND */}
        <div className="footer-brand">
          <h3 className="footer-logo">
            <Sparkles className="logo-icon" />
            <span className="logo-text">
              Career<span>Pilot</span>
            </span>
          </h3>
          <p className="brand-desc">
            {t(
              "footer.description",
              "Your comprehensive platform for career guidance and college recommendations powered by AI."
            )}
          </p>
          <div className="footer-contact">
            <p><Mail size={16} /> cpcommunityhub@gmail.com</p>
            <p><Phone size={16} /> +91 7000000000</p>
            <p><MapPin size={16} /> 123 Innovation Drive, Tech City</p>
          </div>
        </div>

        {/* LINKS */}
        <div className="footer-links">
          <h4>FEATURES</h4>
          <a href="#">Features</a>
          <a href="/career-quiz">Career Quiz</a>
          <a href="/career-tree">Graphical Career Overview</a>
          <Link to="/colleges">College Finder</Link>
          <Link to="/resources">Learning Resource</Link>
        </div>

        <div className="footer-links">
          <h4>COMPANY</h4>
          <a href="#">About</a>
          <Link to="/team">Team</Link>
          <a href="#">Careers</a>
          <a href="#">Press</a>
          <a href="#">Contact</a>
        </div>

        <div className="footer-links">
          <h4>SUPPORT</h4>
          <a href="#">Help</a>
          <a href="#">Study Materials</a>
          <a href="#">Career Guides</a>
          <a href="#">Blog</a>
          <a href="#">API Docs</a>
        </div>

        <div className="footer-links">
          <h4>LEGAL</h4>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Cookie Policy</a>
          <a href="#">GDPR</a>
        </div>
      </div>

      {/* SOCIAL + SUBSCRIBE ROW */}
      <div className="footer-lower-row">
        <div className="footer-social">
          <Facebook />
          <Twitter />
          <Instagram />
          <Linkedin />
          <Github />
        </div>

        {/* SUBSCRIBE */}
        <div className="footer-subscribe">
          <div className="subscribe-row">
            <span className="subscribe-label">Stay updated:</span>
            <div className="subscribe-input-wrapper">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <button onClick={handleSubscribe} disabled={loading}>
                {loading ? <span className="spinner"></span> : "Subscribe"}
              </button>
            </div>
          </div>

          <label className="gdpr-checkbox">
            <input
              type="checkbox"
              checked={agreed}
              onChange={() => setAgreed(!agreed)}
              disabled={loading}
            />
            I agree to receive emails and accept the privacy policy.
          </label>
        </div>
      </div>

      <div className="footer-divider" />
      <div className="footer-bottom">
        © {new Date().getFullYear()} CareerGuide. All rights reserved. Built with ❤️ for students everywhere.
      </div>

      {showScrollBtn && (
        <button className="scroll-top-btn" onClick={scrollToTop}>
          <ArrowUp />
        </button>
      )}
    </footer>
  );
};

export default Footer;
