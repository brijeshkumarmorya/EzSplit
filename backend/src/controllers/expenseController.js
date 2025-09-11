import Expense from "../models/Expense.js";

/* ---------------- Helper Functions ---------------- */

/**
 * Calculates split details based on type
 */
function calculateSplits(totalAmount, splitType, participants) {
  if (!["equal", "percentage", "custom"].includes(splitType)) {
    throw new Error("Invalid splitType");
  }

  // Equal split
  if (splitType === "equal") {
    const n = participants.length;
    if (n === 0) throw new Error("No participants for equal split");
    const rawShare = totalAmount / n;
    const share = Math.round(rawShare * 100) / 100;
    const remainder = Math.round((totalAmount - share * n) * 100) / 100;

    return participants.map((u, idx) => ({
      user: typeof u === "string" ? u : u.user,
      finalShare: Math.round((share + (idx === 0 ? remainder : 0)) * 100) / 100,
    }));
  }

  // Percentage split
  if (splitType === "percentage") {
    const totalPercent = participants.reduce(
      (s, p) => s + (p.percentage || 0),
      0
    );
    if (Math.round(totalPercent * 100) / 100 !== 100) {
      throw new Error("Percentages must add up to 100");
    }

    return participants.map((p) => ({
      user: p.user,
      percentage: p.percentage,
      finalShare: Math.round((totalAmount * (p.percentage / 100)) * 100) / 100,
    }));
  }

  // Custom split
  if (splitType === "custom") {
    const totalCustom = participants.reduce((s, p) => s + (p.amount || 0), 0);
    if (
      Math.round(totalCustom * 100) / 100 !==
      Math.round(totalAmount * 100) / 100
    ) {
      throw new Error("Custom amounts must add up to the total amount");
    }

    return participants.map((p) => ({
      user: p.user,
      amount: p.amount,
      finalShare: Math.round(p.amount * 100) / 100,
    }));
  }
}

/**
 * Builds a net balance map from an expense
 */
function computeNetBalances(expense) {
  const balances = {};
  expense.splitDetails.forEach((d) => (balances[d.user.toString()] = 0));

  // subtract owed amount
  expense.splitDetails.forEach((d) => {
    balances[d.user.toString()] -= Number(d.finalShare);
  });

  // add paid amount
  balances[expense.paidBy.toString()] =
    (balances[expense.paidBy.toString()] || 0) + Number(expense.amount);

  Object.keys(balances).forEach(
    (k) => (balances[k] = Math.round(balances[k] * 100) / 100)
  );

  return balances;
}

/**
 * Computes minimal settlement transfers between debtors and creditors
 */
function computeSettlement(balances) {
  const debtors = [];
  const creditors = [];

  for (const [user, bal] of Object.entries(balances)) {
    const amt = Math.round(bal * 100) / 100;
    if (amt < -0.009) debtors.push({ user, amount: -amt });
    else if (amt > 0.009) creditors.push({ user, amount: amt });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers = [];
  let i = 0,
    j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const transferAmount = Math.min(debtor.amount, creditor.amount);

    transfers.push({
      from: debtor.user,
      to: creditor.user,
      amount: Math.round(transferAmount * 100) / 100,
    });

    debtor.amount = Math.round((debtor.amount - transferAmount) * 100) / 100;
    creditor.amount = Math.round((creditor.amount - transferAmount) * 100) / 100;

    if (debtor.amount <= 0.009) i++;
    if (creditor.amount <= 0.009) j++;
  }

  return transfers;
}

/* ---------------- Controllers ---------------- */

/**
 * Create a new expense
 */
export const addExpense = async (req, res) => {
  try {
    const {
      description,
      amount,
      paidBy,
      group,
      splitType,
      splitDetails,
      category,
      notes,
      currency,
    } = req.body;

    if (!description || !amount || !paidBy) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let splitDetailsForDB = [];

    // Handle shared expenses (equal / percentage / custom)
    if (splitDetails && splitDetails.length > 0 && splitType !== "none") {
      let participants = [];

      if (splitType === "equal") {
        participants = splitDetails.map((p) =>
          typeof p === "string" ? p : p.user
        );
      } else if (splitType === "percentage") {
        participants = splitDetails.map((p) => ({
          user: p.user,
          percentage: Number(p.percentage),
        }));
      } else if (splitType === "custom") {
        participants = splitDetails.map((p) => ({
          user: p.user,
          amount: Number(p.amount),
        }));
      }

      const calculated = calculateSplits(
        Number(amount),
        splitType,
        participants
      );

      splitDetailsForDB = calculated.map((c, idx) => {
        const orig = splitDetails[idx] || {};
        return {
          user: c.user,
          percentage: c.percentage ?? orig.percentage ?? null,
          amount: c.amount ?? orig.amount ?? null,
          finalShare: Number(c.finalShare),
          status: "pending",
        };
      });
    }

    // Construct expense
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

    res.status(201).json({ message: "Expense created", expense });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Get settlement details for a given expense
 */
export const getExpenseSettlement = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const expense = await Expense.findById(expenseId)
      .populate("paidBy", "name username email")
      .populate("splitDetails.user", "name username email");

    if (!expense) return res.status(404).json({ message: "Expense not found" });

    const balances = computeNetBalances(expense);
    const transfers = computeSettlement(balances);

    const idToUser = {};
    expense.splitDetails.forEach((d) => {
      idToUser[d.user._id.toString()] = {
        id: d.user._id.toString(),
        name: d.user.name,
        username: d.user.username,
      };
    });
    idToUser[expense.paidBy._id.toString()] = {
      id: expense.paidBy._id.toString(),
      name: expense.paidBy.name,
      username: expense.paidBy.username,
    };

    const readableTransfers = transfers.map((t) => ({
      from: { id: t.from, ...idToUser[t.from] },
      to: { id: t.to, ...idToUser[t.to] },
      amount: t.amount,
    }));

    res.json({ expenseId, balances, transfers: readableTransfers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Mark current user as having paid their share
 */
export const payExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userId = req.user.id; // extracted by authMiddleware

    const expense = await Expense.findById(expenseId);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    const detail = expense.splitDetails.find(
      (d) => d.user.toString() === userId
    );
    if (!detail)
      return res
        .status(403)
        .json({ message: "You are not part of this split" });

    if (detail.status === "paid") {
      return res.status(400).json({ message: "You already paid" });
    }

    detail.status = "paid";
    await expense.save();

    res.json({ message: "Marked as paid", expense });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
