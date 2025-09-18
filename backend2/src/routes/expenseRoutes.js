import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import validateSplitFriends from "../middleware/validateSplitFriends.js";
import { expenseValidation } from "../validators/expenseValidators.js";
import { validate } from "../middleware/validate.js";
import {
  addExpense,
  getExpenseSettlement,
} from "../controllers/expenseController.js";

const expenseRouter = express.Router();

expenseRouter.post("/", authMiddleware, expenseValidation, validate, validateSplitFriends, addExpense);
expenseRouter.get("/:expenseId/settlement", authMiddleware, getExpenseSettlement);

export default expenseRouter;
