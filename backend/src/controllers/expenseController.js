import Expense from "../models/Expense.js";
import User from "../models/User.js";

// Add a new expense
export const addExpense = async (req, res) => {
  try {
    const { description, amount, paidBy, splitBetween, group } = req.body;

    if (!description || !amount || !paidBy || !splitBetween?.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const expense = new Expense({
      description,
      amount,
      paidBy,
      splitBetween,
      group: group || null,
    });

    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all expenses for a group
export const getGroupExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;
    const expenses = await Expense.find({ group: groupId })
      .populate("paidBy", "name username email")
      .populate("splitBetween", "name username email");
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all expenses for a user
export const getUserExpenses = async (req, res) => {
  try {
    const { userId } = req.params;
    const expenses = await Expense.find({
      $or: [{ paidBy: userId }, { splitBetween: userId }],
    })
      .populate("paidBy", "name username email")
      .populate("splitBetween", "name username email");
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Calculate balances for a group
export const getGroupBalances = async (req, res) => {
  try {
    const { groupId } = req.params;
    const expenses = await Expense.find({ group: groupId })
      .populate("paidBy", "name username")
      .populate("splitBetween", "name username");

    const balances = {};

    expenses.forEach((exp) => {
      const splitAmount = exp.amount / exp.splitBetween.length;

      exp.splitBetween.forEach((user) => {
        if (!balances[user._id]) balances[user._id] = 0;
        balances[user._id] -= splitAmount;
      });

      if (!balances[exp.paidBy._id]) balances[exp.paidBy._id] = 0;
      balances[exp.paidBy._id] += exp.amount;
    });

    res.json(balances); // Example: { userId1: 200, userId2: -100, ... }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
