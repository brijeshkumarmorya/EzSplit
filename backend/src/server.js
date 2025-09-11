import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: "*", // later restrict to frontend URL
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("🔗 User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

app.use(cors());
app.use(express.json());

// Health Check Route
app.get("/", (req, res) => {
  res.send("Expense Manager Backend Running ✅");
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/friends", friendRoutes);

const PORT = process.env.PORT || 8000;
server.listen(PORT,"0.0.0.0", () => console.log(`🚀 Server running on port ${PORT}`));
