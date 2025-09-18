// src/routes/authRoutes.js
import express from "express";
import { register, login, refreshToken, logout } from "../controllers/authController.js";
import { registerValidation, loginValidation } from "../validators/authValidators.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

router.post("/register", registerValidation, validate, register);
router.post("/login", loginValidation, validate, login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);

export default router;
