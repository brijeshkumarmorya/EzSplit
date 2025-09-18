import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 8000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:8080",
  nodeEnv: process.env.NODE_ENV || "development",
};