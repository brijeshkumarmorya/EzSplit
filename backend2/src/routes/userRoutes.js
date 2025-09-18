import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import { success, error } from "../utils/response.js";

const router = express.Router();

router.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");
    if (!user) return error(res, 404, "User not found");
    return success(res, 200, { user });
  } catch (err) {
    next(err);
  }
});

export default router;
