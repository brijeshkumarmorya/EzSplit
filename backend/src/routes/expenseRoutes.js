import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  addExpense,
  getGroupExpenses,
  getUserExpenses,
  getGroupBalances,
} from "../controllers/expenseController.js";

const router = express.Router();

router.post("/", authMiddleware, addExpense);
router.get("/group/:groupId", authMiddleware, getGroupExpenses);
router.get("/user/:userId", authMiddleware, getUserExpenses);
router.get("/group/:groupId/balances", authMiddleware, getGroupBalances);

export default router;
