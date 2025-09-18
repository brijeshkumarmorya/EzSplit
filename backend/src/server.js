// ================== Core Imports ==================
import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

// ================== Config & Utils ==================
import connectDB from "./config/db.js";
import config from "./config/config.js";
import { validateConfig } from "./config/validateConfig.js";
import logger from "./utils/logger.js";
import { registerUserSocket, removeUserSocket } from "./utils/notificationUtils.js";

// ================== Middlewares ==================
import { errorHandler } from "./middleware/errorHandler.js";
import { sanitizeXSS } from "./middleware/sanitizeXSS.js";
import { apiLimiter } from "./middleware/rateLimiter.js";

// ================== Routes ==================
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import settlementRoutes from "./routes/settlementRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

// ================== Environment & DB ==================
dotenv.config();       // Load environment variables from .env
validateConfig();      // Ensure required env vars are set
connectDB();           // Connect to MongoDB

// ================== App & Server Setup ==================
const app = express();
const server = http.createServer(app);

// ================== Security Middlewares ==================
// Helmet: sets secure HTTP headers
// crossOriginEmbedderPolicy disabled to avoid Socket.io CORS issues in dev
app.use(helmet({ crossOriginEmbedderPolicy: false }));

// Sanitize MongoDB queries to prevent NoSQL injection
app.use(mongoSanitize());

// Apply global rate limit to all API routes
app.use("/api", apiLimiter);

// CORS configuration (restricts frontend origin but allows Postman/mobile apps)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow non-browser clients
      const allowedOrigins = [config.frontendUrl];
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true, // allow cookies & auth headers
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"], // no "Cookie"
  })
);

// ================== Global Middlewares ==================
// Parse cookies
app.use(cookieParser());

// Parse JSON and URL-encoded bodies (limit to 10mb to prevent flooding)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Sanitize inputs for XSS protection
app.use(sanitizeXSS);

// ================== Socket.io Setup ==================
const io = new Server(server, {
  cors: {
    origin: config.frontendUrl,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket.io middleware for authentication
// Expects JWT in either handshake.auth.token or Authorization header
io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) throw new Error("No token provided");

    const decoded = jwt.verify(token, config.jwtSecret);
    socket.userId = decoded.id; // attach userId to socket
    next();
  } catch (err) {
    logger.warn(`Socket auth failed: ${err.message}`);
    next(new Error("Unauthorized: Invalid token"));
  }
});

// Socket.io events
io.on("connection", (socket) => {
  logger.info(`🔗 Socket connected: ${socket.id} (user: ${socket.userId})`);

  // Register socket in notification utility
  registerUserSocket(socket.userId, socket.id);

  socket.on("disconnect", () => {
    if (socket.userId) removeUserSocket(socket.userId, socket.id);
    logger.info(`❌ Socket disconnected: ${socket.id}`);
  });
});

// ================== Health Check ==================
// Useful for monitoring (Kubernetes, Docker, uptime checks)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ================== Routes ==================
app.get("/", (req, res) => {
  res.send("Expense Manager Backend Running ✅");
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/notifications", notificationRoutes);

// ================== Error Handler ==================
// Handles any unhandled errors in routes
app.use(errorHandler);

// ================== Graceful Shutdown ==================
// Close server properly on SIGINT (Ctrl+C) or SIGTERM (production)
const shutdown = () => {
  logger.info("Shutting down gracefully...");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ================== Start Server ==================
const PORT = config.port || process.env.PORT || 8000;
server.listen(PORT, "0.0.0.0", () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📱 Frontend URL: ${config.frontendUrl}`);
  logger.info(`🌍 Environment: ${config.nodeEnv}`);
});

// Export for testing and reusability
export { io, app, server };
