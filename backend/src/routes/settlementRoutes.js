import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getGlobalSettlement,
  getGroupSettlement,
  getUserSettlement,
} from "../controllers/settlementController.js";

const settlementRouter = express.Router();

// Global or dashboard (all balances)
settlementRouter.get("/global", authMiddleware, getGlobalSettlement);

// Group-level settlement
settlementRouter.get("/group/:groupId", authMiddleware, getGroupSettlement);

// Per-user dashboard settlement
settlementRouter.get("/user/:userId", authMiddleware, getUserSettlement);

export default settlementRouter;
