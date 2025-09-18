import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import paymentRouter from "./routes/paymentRoutes.js";
import settlementRouter from "./routes/settlementRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import logger from "./utils/logger.js";
import { config } from "./config/config.js";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// ----------------- Security Middlewares -----------------
app.use(helmet());

// Restrict CORS to frontend
app.use(
  cors({
    origin: config.frontendUrl, // ✅ only allow frontend URL
    credentials: true,
  })
);

// ----------------- Middleware -----------------
app.use(express.json());

// ----------------- Socket.io -----------------
const io = new Server(server, {
  cors: {
    origin: config.frontendUrl,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  logger.info(`🔗 User connected: ${socket.id}`);

  socket.on("disconnect", () => {
    logger.info(`❌ User disconnected: ${socket.id}`);
  });
});

// ----------------- Routes -----------------
app.get("/", (req, res) => {
  res.send("Expense Manager Backend Running ✅");
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/payments", paymentRouter);
app.use("/api/settlements", settlementRouter);

// ----------------- Error Handler -----------------
app.use(errorHandler);

// ----------------- Start Server -----------------
server.listen(config.port, "0.0.0.0", () =>
  logger.info(`🚀 Server running on port ${config.port}`)
);
