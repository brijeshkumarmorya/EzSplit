import Expense from "../models/Expense.js";
import { calculateSplits, computeNetBalances, computeSettlement } from "../utils/expenseUtils.js";
import { success, error } from "../utils/response.js";

// Add Expense
export const addExpense = async (req, res, next) => {
  try {
    const { description, amount, group, splitType, splitDetails, category, notes, currency } =
      req.body;
    const paidBy = req.user.id;

    if (!description || !amount) return error(res, 400, "Missing required fields");

    let splitDetailsForDB = [];
    if (splitDetails && splitDetails.length > 0 && splitType !== "none") {
      let participants = [];

      if (splitType === "equal") {
        participants = splitDetails.map((p) => (typeof p === "string" ? p : p.user));
      } else if (splitType === "percentage") {
        participants = splitDetails.map((p) => ({ user: p.user, percentage: Number(p.percentage) }));
      } else if (splitType === "custom") {
        participants = splitDetails.map((p) => ({ user: p.user, amount: Number(p.amount) }));
      }

      const calculated = calculateSplits(Number(amount), splitType, participants);
      splitDetailsForDB = calculated.map((c, idx) => {
        const orig = splitDetails[idx] || {};
        return {
          user: c.user,
          percentage: c.percentage ?? orig.percentage ?? null,
          amount: c.amount ?? orig.amount ?? null,
          finalShare: Number(c.finalShare),
          status: c.user.toString() === paidBy.toString() ? "paid" : "pending",
        };
      });
    }

    const expense = new Expense({
      description,
      amount: Number(amount),
      paidBy,
      group: group || null,
      splitType: splitType || "none",
      splitDetails: splitDetailsForDB,
      category: category || "other",
      notes: notes || "",
      currency: currency || "INR",
    });

    await expense.save();
    await expense.populate([
      { path: "paidBy", select: "name username email" },
      { path: "splitDetails.user", select: "name username email" },
    ]);

    return success(res, 201, { message: "Expense created", expense });
  } catch (err) {
    next(err);
  }
};

// Get single expense settlement
export const getExpenseSettlement = async (req, res, next) => {
  try {
    const { expenseId } = req.params;
    const expense = await Expense.findById(expenseId)
      .populate("paidBy", "name username email")
      .populate("splitDetails.user", "name username email");

    if (!expense) return error(res, 404, "Expense not found");

    const balances = computeNetBalances(expense);
    const transfers = computeSettlement(balances);

    return success(res, 200, { expenseId, balances, transfers });
  } catch (err) {
    next(err);
  }
};
