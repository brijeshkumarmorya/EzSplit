// src/controllers/authController.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { success, error } from "../utils/response.js";

/**
 * Register: creates a user (no tokens)
 */
export const register = async (req, res, next) => {
  try {
    const { name, username, email, password, upiId } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return error(res, 400, "User already exists");

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new User({ name, username, email, passwordHash, upiId });
    await newUser.save();

    return success(res, 201, { message: "User registered successfully" });
  } catch (err) {
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
    const accessToken = jwt.sign(
      { id: user._id },
      config.jwtSecret,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "1h" }
    );

    // Refresh token (longer-lived)
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d" }
    );

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
      user: { id: user._id, name: user.name, username: user.username, email: user.email },
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
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (e) {
      return error(res, 403, "Invalid refresh token");
    }

    // Ensure token matches stored token
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return error(res, 403, "Invalid refresh token");
    }

    // Issue new access token
    const newAccessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "1h",
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
    const { refreshToken } = req.body;
    if (!refreshToken) return error(res, 400, "Refresh token required");

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (e) {
      // token invalid or expired — still accept logout
      return success(res, 200, { message: "Logged out" });
    }

    const user = await User.findById(decoded.id);
    if (user && user.refreshToken === refreshToken) {
      user.refreshToken = null;
      await user.save();
    }

    return success(res, 200, { message: "Logged out" });
  } catch (err) {
    next(err);
  }
};
