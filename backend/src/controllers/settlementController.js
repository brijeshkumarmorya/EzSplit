import mongoose from "mongoose";
import Expense from "../models/Expense.js";
import { computeSettlement } from "../utils/expenseUtils.js";
import { success, error } from "../utils/response.js";

/**
 * Helper → run aggregation to compute balances
 */
const aggregateBalances = async (matchStage) => {
  const balances = await Expense.aggregate([
    { $match: matchStage },
    { $unwind: "$splitDetails" },
    {
      $group: {
        _id: "$splitDetails.user",
        balance: {
          $sum: {
            $cond: [
              { $eq: ["$paidBy", "$splitDetails.user"] },
              "$amount", // if user is payer, add full amount
              { $multiply: [-1, "$splitDetails.finalShare"] } // else subtract their share
            ]
          }
        }
      }
    }
  ]);

  // Convert aggregation result → object { userId: balance }
  const combinedBalances = {};
  balances.forEach((b) => {
    combinedBalances[b._id.toString()] =
      Math.round(b.balance * 100) / 100; // round 2 decimals
  });

  return combinedBalances;
};

/**
 * 🔹 Global settlement (all users OR specific user dashboard)
 */
export const getGlobalSettlement = async (req, res, next) => {
  try {
    const { userId } = req.query;

    const matchStage = userId
      ? {
          $or: [
            { paidBy: new mongoose.Types.ObjectId(userId) },
            { "splitDetails.user": new mongoose.Types.ObjectId(userId) }
          ]
        }
      : {};

    const combinedBalances = await aggregateBalances(matchStage);

    if (!combinedBalances || Object.keys(combinedBalances).length === 0) {
      return error(res, 404, "No expenses found");
    }

    const transfers = computeSettlement(combinedBalances);

    return success(res, 200, {
      scope: userId ? `Dashboard for ${userId}` : "Global settlement",
      balances: combinedBalances,
      transfers,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 🔹 Group-level settlement
 */
export const getGroupSettlement = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const matchStage = { group: new mongoose.Types.ObjectId(groupId) };
    const combinedBalances = await aggregateBalances(matchStage);

    if (!combinedBalances || Object.keys(combinedBalances).length === 0) {
      return error(res, 404, "No expenses found in this group");
    }

    const transfers = computeSettlement(combinedBalances);

    return success(res, 200, {
      scope: `Group ${groupId} settlement`,
      balances: combinedBalances,
      transfers,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 🔹 Per-user settlement (dashboard view)
 */
export const getUserSettlement = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const matchStage = {
      $or: [
        { paidBy: new mongoose.Types.ObjectId(userId) },
        { "splitDetails.user": new mongoose.Types.ObjectId(userId) }
      ]
    };

    const combinedBalances = await aggregateBalances(matchStage);

    if (!combinedBalances || Object.keys(combinedBalances).length === 0) {
      return error(res, 404, "No expenses found for this user");
    }

    const transfers = computeSettlement(combinedBalances);

    // Filter only transfers involving this user
    const userTransfers = transfers.filter(
      (t) => t.from === userId || t.to === userId
    );

    return success(res, 200, {
      scope: `User ${userId} settlement`,
      balance: combinedBalances[userId] || 0,
      transfers: userTransfers,
    });
  } catch (err) {
    next(err);
  }
};
