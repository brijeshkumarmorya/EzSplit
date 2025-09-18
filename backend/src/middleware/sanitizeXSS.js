import xss from "xss";
import logger from "../utils/logger.js"; // optional, for error logging

const sanitizeValue = (value) => {
  if (typeof value === "string") {
    // Strict sanitization: removes all HTML tags
    return xss(value, {
      whiteList: {}, // no tags allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ["script", "style"],
    }).trim();
  }
  return value;
};

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== "object") return;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === "string") {
        obj[i] = sanitizeValue(obj[i]);
      } else if (typeof obj[i] === "object" && obj[i] !== null) {
        sanitizeObject(obj[i]); // recursive
      }
    }
  } else {
    for (let key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (typeof obj[key] === "string") {
          obj[key] = sanitizeValue(obj[key]);
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    }
  }
};

export const sanitizeXSS = (req, res, next) => {
  try {
    // Skip file uploads (faster, prevents issues)
    if (req.get("Content-Type")?.includes("multipart/form-data")) {
      return next();
    }

    sanitizeObject(req.body);
    sanitizeObject(req.query);
    sanitizeObject(req.params);

    next();
  } catch (error) {
    logger?.error("XSS sanitization error:", error);
    next(error);
  }
};
