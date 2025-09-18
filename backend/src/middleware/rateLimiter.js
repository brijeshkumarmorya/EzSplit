// src/middleware/rateLimiter.js
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import logger from "../utils/logger.js";

// ================== Custom Handler ==================
const logBlockedAttempt = (req, res, options) => {
  logger.warn("🚨 Rate limit exceeded", {
    ip: req.ip,
    path: req.originalUrl,
    method: req.method,
    userAgent: req.get("User-Agent"),
    time: new Date().toISOString(),
  });

  res.status(options.statusCode).json({
    success: false,
    error: "Too many requests, please try again later.",
    retryAfter: req.rateLimit?.resetTime
      ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
      : Math.round(options.windowMs / 1000),
  });
};

// ================== Auth Limiter ==================
// Limits failed login attempts (5 per 15 min per IP+UA)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  handler: logBlockedAttempt,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req)}_${req.get("User-Agent") || "unknown"}`,
  skipSuccessfulRequests: true, // Only count failed responses (401/403)
});

// ================== General API Limiter ==================
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 100,
  handler: logBlockedAttempt,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req), // ✅ IPv4 + IPv6 safe
});

// ================== Payment Limiter ==================
// Stricter limits for sensitive payment endpoints
export const paymentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min
  max: 10,
  handler: logBlockedAttempt,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req)}_${req.user?.id || "anon"}`, // tie to user if logged in
});
