import { error } from "../utils/response.js";
import logger from "../utils/logger.js";

// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  logger.error("🔥 Internal Error:", err); // log full error on server

  // If already handled, avoid double response
  if (res.headersSent) {
    return next(err);
  }

  // Generic message to client
  return error(res, err.statusCode || 500, err.message || "Internal Server Error");
};
