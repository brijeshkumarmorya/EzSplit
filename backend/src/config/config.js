import dotenv from "dotenv";
dotenv.config();

const config = {
  port: process.env.PORT || 8000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:8080",
  nodeEnv: process.env.NODE_ENV || "development",
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
};

export default config;
