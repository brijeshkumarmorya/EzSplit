// src/controllers/authController.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { success, error } from "../utils/response.js";
import config from "../config/config.js";
import logger from "../utils/logger.js";
import { validatePassword } from "../utils/passwordUtils.js";

/**
 * Register: creates a user (no tokens)
 */

export const register = async (req, res, next) => {
  try {
    const { name, username, email, password, upiId } = req.body;

    if (!name || !username || !email || !password) {
      return error(res, 400, "Please fill in all required fields");
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return error(res, 400, passwordValidation.message);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });
    if (existingUser) return error(res, 400, "User already exists");

    const passwordHash = await bcrypt.hash(password, 12);
    const newUser = new User({
      name,
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      upiId,
    });
    await newUser.save();

    logger.info(`New user registered: ${normalizedUsername}`);

    return success(res, 201, { message: "User registered successfully" });
  } catch (err) {
    logger.error("Registration failed", err);
    next(err);
  }
};

/**
 * Login: returns accessToken (short-lived) + refreshToken (longer)
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return error(res, 400, "Invalid credentials");

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return error(res, 400, "Invalid credentials");

    // Access token (short-lived)
    const accessToken = jwt.sign({ id: user._id }, config.jwtSecret, {
      expiresIn: config.accessTokenExpiresIn || "1h",
    });

    // Refresh token (longer-lived)
    const refreshToken = jwt.sign({ id: user._id }, config.jwtRefreshSecret, {
      expiresIn: config.refreshTokenExpiresIn || "7d",
    });

    // Save refresh token in DB (single session strategy)
    user.refreshToken = refreshToken;
    await user.save();

    // Send refresh token as HttpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === "production", // ✅ only send over HTTPS in production
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return success(res, 200, {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Refresh: exchange refreshToken for a new access token
 */
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return error(res, 401, "Refresh token required");

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    } catch (e) {
      return error(res, 403, "Invalid refresh token");
    }

    // Ensure token matches stored token
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return error(res, 403, "Invalid refresh token");
    }

    // Issue new access token
    const newAccessToken = jwt.sign({ id: user._id }, config.jwtSecret, {
      expiresIn: config.accessTokenExpiresIn || "1h",
    });

    return success(res, 200, { accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
};

/**
 * Logout: revoke refresh token (server-side)
 */

export const logout = async (req, res, next) => {
  try {
    // Try from cookie first, fallback to body
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    if (!refreshToken) return error(res, 400, "Refresh token required");

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    } catch (e) {
      // Invalid or expired token → still clear cookie and accept logout
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: config.nodeEnv === "production",
        sameSite: "strict",
      });
      return success(res, 200, { message: "Logged out" });
    }

    // Find user and remove refresh token
    const user = await User.findById(decoded.id);
    if (user && user.refreshToken === refreshToken) {
      user.refreshToken = null;
      await user.save();
    }

    // Clear refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "strict",
    });

    return success(res, 200, { message: "Logged out" });
  } catch (err) {
    next(err);
  }
};
