import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import validateSplitFriends from "../middleware/validateSplitFriends.js";
import {
  addExpense,
  payExpense,
  getExpenseSettlement,
} from "../controllers/expenseController.js";

const router = express.Router();

/**
 * @route   POST /api/expenses
 * @desc    Create a new expense (personal / group / instant split)
 * @access  Private (JWT required)
 * @middleware validateSplitFriends ensures all split participants are friends
 */
router.post("/", authMiddleware, validateSplitFriends, addExpense);

/**
 * @route   PATCH /api/expenses/:expenseId/pay
 * @desc    Mark current user’s share of the expense as paid
 * @access  Private
 */
router.patch("/:expenseId/pay", authMiddleware, payExpense);

/**
 * @route   GET /api/expenses/:expenseId/settlement
 * @desc    Get settlement details (who owes whom)
 * @access  Private
 */
router.get("/:expenseId/settlement", authMiddleware, getExpenseSettlement);

export default router;
