// src/routes/authRoutes.js
import express from "express";
import { register, login, refreshToken, logout } from "../controllers/authController.js";
import { registerValidation, loginValidation } from "../validators/authValidators.js";
import { validate } from "../middleware/validate.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/register", authLimiter, registerValidation, validate, register);
router.post("/login", authLimiter, loginValidation, validate, login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);

export default router;
