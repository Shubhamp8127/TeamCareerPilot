import User from "../models/User.js";
import Activity from "../models/Activity.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  verifyRefreshToken,
  REFRESH_COOKIE_KEY,
} from "../utils/tokenUtils.js";



// ================= COMMON HELPERS =================

const buildUserResponse = (user) => ({
  id: user._id,
  first_name: user.first_name,
  last_name: user.last_name,
  email: user.email,
  avatar_url: user.avatar || null,
  plan: user.plan || "Trial",
});

const issueSessionTokens = async (user, res) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = hashToken(refreshToken);
  await user.save();

  setRefreshTokenCookie(res, refreshToken);
  return accessToken;
};



// ================= REGISTER =================

export const register = async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      first_name,
      last_name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    const accessToken = await issueSessionTokens(user, res);

    res.status(201).json({
      message: "User registered successfully",
      user: buildUserResponse(user),
      accessToken,
    });
  } catch (error) {
    console.log("Register Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};



// ================= LOGIN =================

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const accessToken = await issueSessionTokens(user, res);

    // Create login activity
    await Activity.create({
      user: user._id,
      message: "User logged in",
      type: "login",
    });

    res.json({
      message: "Login successful",
      user: buildUserResponse(user),
      accessToken,
    });
  } catch (error) {
    console.log("Login Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};



// ================= FORGOT PASSWORD =================

export const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    const user = await User.findOne({ email });

    // Security reason se same response
    if (!user) {
      return res.json({
        message:
          "If an account exists with this email, a reset link has been sent.",
      });
    }

    // Generate raw token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash token for DB
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Strict 15 minutes expiry
    user.resetToken = hashedToken;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;

    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
  from: `"CareerPilot Support" <${process.env.EMAIL_USER}>`,
  to: user.email,
  subject: "Reset Your Password – CareerPilot",
  html: `
    <div style="font-family: Arial, sans-serif; color: #1E293B; line-height: 1.5;">
      <h2 style="margin-bottom: 10px;">Password Reset Request</h2>
      <p>Dear User,</p>
      <p>We received a request to reset the password for your <strong>CareerPilot</strong> account.</p>
      <p>To proceed, please click the button below to create a new password. This link is valid for a limited time for security reasons.</p>
      <a href="${resetUrl}" style="
        display: inline-block;
        padding: 12px 24px;
        margin: 10px 0;
        font-size: 16px;
        color: #ffffff;
        background-color: #2563EB;
        text-decoration: none;
        border-radius: 6px;
      ">Reset Your Password</a>
      <p>This link will expire in <strong>15 minutes</strong>.</p>
      <p>If you did not request a password reset, please ignore this email. Your account will remain secure, and no changes will be made.</p>
      <p>For any assistance, feel free to contact our support team.</p>
      <p>Best regards,<br><strong>CareerPilot Support Team</strong><br>CareerPilot</p>
    </div>
  `,
});

    res.json({ message: "Reset link sent to your email" });
  } catch (error) {
    console.log("Forgot Password Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};



// ================= RESET PASSWORD =================

export const resetPassword = async (req, res) => {
  try {
    const token = req.params.token;

    if (!token) {
      return res.status(400).json({ message: "Invalid reset link" });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({ resetToken: hashedToken });

    if (!user) {
      return res.status(400).json({ message: "Invalid reset link" });
    }

    // 🔴 Expiry Check
    if (!user.resetTokenExpiry || user.resetTokenExpiry < Date.now()) {
      user.resetToken = null;
      user.resetTokenExpiry = null;
      await user.save();

      return res.status(400).json({
        message: "Reset link expired. Please request a new one.",
      });
    }

    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    // Same password check
    const isSame = await bcrypt.compare(password, user.password);
    if (isSame) {
      return res.status(400).json({
        message: "You cannot reuse your current password",
      });
    }

    // Password history check
    for (let oldPassword of user.passwordHistory || []) {
      const match = await bcrypt.compare(password, oldPassword);
      if (match) {
        return res.status(400).json({
          message: "You cannot reuse a previously used password",
        });
      }
    }

    // Maintain last 5 passwords
    if (!user.passwordHistory) {
      user.passwordHistory = [];
    }

    user.passwordHistory.push(user.password);

    if (user.passwordHistory.length > 5) {
      user.passwordHistory.shift();
    }

    // Set new password
    user.password = await bcrypt.hash(password, 10);

    // Remove reset token
    user.resetToken = null;
    user.resetTokenExpiry = null;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.log("Reset Password Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};



// ================= GET PROFILE =================

export const getProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    res.json({ user: buildUserResponse(req.user) });
  } catch (error) {
    console.log("Profile fetch error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};


// ================= UPDATE PROFILE =================

export const updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, avatar, education, password } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let updatedFields = [];

    if (first_name !== undefined) {
      user.first_name = first_name.trim();
      updatedFields.push("name");
    }
    if (last_name !== undefined) {
      user.last_name = last_name.trim();
      updatedFields.push("name");
    }
    if (avatar !== undefined) {
      user.avatar = avatar;
      updatedFields.push("profile picture");
    }
    if (education !== undefined) {
      user.education = education;
      updatedFields.push("bio");
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
      updatedFields.push("password");
    }

    await user.save();

    // Create profile update activity
    if (updatedFields.length > 0) {
      await Activity.create({
        user: user._id,
        message: " Updated Profile Information",
        type: "profile_update",
      });
    }

    res.json({
      message: "Profile updated successfully",
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.log("Update Profile Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};



// ================= REFRESH TOKEN =================

export const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_KEY];

    if (!refreshToken) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const hashedIncomingToken = hashToken(refreshToken);

    if (!user.refreshToken || user.refreshToken !== hashedIncomingToken) {
      return res.status(401).json({ message: "Refresh token mismatch" });
    }

    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshToken = hashToken(newRefreshToken);
    await user.save();

    setRefreshTokenCookie(res, newRefreshToken);

    const accessToken = generateAccessToken(user._id);

    res.json({
      accessToken,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.log("Refresh Token Error:", error);
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};



// ================= LOGOUT =================

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_KEY];

    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        const user = await User.findById(decoded.id);

        if (user) {
          user.refreshToken = null;
          await user.save();
        }
      } catch (innerError) {
        console.log("Logout cleanup skipped:", innerError.message);
      }
    }
  } catch (error) {
    console.log("Logout Error:", error);
  } finally {
    clearRefreshTokenCookie(res);
    res.json({ message: "Logged out successfully" });
  }
};

// ================= CHANGE PASSWORD =================

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Validate new password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      });
    }

    // Check if new password is same as current
    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return res.status(400).json({ message: "New password cannot be the same as current password" });
    }

    // Check password history
    if (user.passwordHistory) {
      for (let oldPassword of user.passwordHistory) {
        const match = await bcrypt.compare(newPassword, oldPassword);
        if (match) {
          return res.status(400).json({ message: "You cannot reuse a previously used password" });
        }
      }
    }

    // Update password history
    if (!user.passwordHistory) {
      user.passwordHistory = [];
    }
    user.passwordHistory.push(user.password);
    if (user.passwordHistory.length > 5) {
      user.passwordHistory.shift();
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    // Create activity
    await Activity.create({
      user: user._id,
      message: "Password changed successfully",
      type: "password_change",
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.log("Change Password Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ================= UPDATE SUBSCRIPTION PLAN =================

export const updatePlan = async (req, res) => {
  try {

    const { userId, plan, billingCycle } = req.body;

    if (!userId || !plan) {
      return res.status(400).json({ message: "User ID and plan required" });
    }

    let expiry = new Date();

    if (billingCycle === "quarterly") {
      expiry.setMonth(expiry.getMonth() + 3);
    } else {
      expiry.setMonth(expiry.getMonth() + 1);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        plan,
        planExpiry: expiry,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Activity log
    await Activity.create({
      user: user._id,
      message: `Subscribed to ${plan}`,
      type: "subscription",
    });

    res.json({
      message: "Plan activated successfully",
      plan: user.plan,
      expiry: user.planExpiry,
    });

  } catch (error) {
    console.log("Update Plan Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};