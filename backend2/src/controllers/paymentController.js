import mongoose from "mongoose";
import Payment from "../models/Payment.js";
import Expense from "../models/Expense.js";
import User from "../models/User.js";
import qrcode from "qrcode";
import { success, error } from "../utils/response.js";
import Group from "../models/Group.js";
import { computeNetBalances } from "../utils/expenseUtils.js";

/**
 * Create a combined payment (UPI or Cash/Manual)
 */
export const createCombinedPayment = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payerId = req.user.id;
    const { payeeId, expenseIds, note, method } = req.body; // method: 'upi' | 'cash'

    if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
      return error(res, 400, "expenseIds required");
    }
    if (!["upi", "cash"].includes(method)) {
      return error(res, 400, "method must be 'upi' or 'cash'");
    }

    const expenses = await Expense.find({ _id: { $in: expenseIds } }).session(session);
    if (expenses.length !== expenseIds.length) {
      return error(res, 404, "Some expenses not found");
    }

    let total = 0;
    const relatedExpenses = [];

    for (const e of expenses) {
      if (e.paidBy.toString() !== payeeId) {
        await session.abortTransaction();
        return error(res, 400, `Expense ${e._id} was not paid by this payee`);
      }

      const share = e.splitDetails.find(
        (d) => d.user.toString() === payerId && d.status !== "paid"
      );

      if (share) {
        total += share.finalShare;
        relatedExpenses.push(e._id);
      }
    }

    if (total <= 0) {
      await session.abortTransaction();
      return error(res, 400, "No unpaid shares found");
    }

    const payee = await User.findById(payeeId).session(session);
    if (!payee) {
      await session.abortTransaction();
      return error(res, 400, "Payee not found");
    }

    let upiIntent = null;
    let qrData = null;

    if (method === "upi") {
      if (!payee.upiId) {
        await session.abortTransaction();
        return error(res, 400, "Payee has no UPI set");
      }

      upiIntent = `upi://pay?pa=${payee.upiId}&pn=${encodeURIComponent(
        payee.name
      )}&am=${total}&cu=INR`;
      qrData = await qrcode.toDataURL(upiIntent);
    }

    const payment = await Payment.create(
      [
        {
          payer: payerId,
          payee: payeeId,
          amount: total,
          method,
          upiIntent,
          qrData,
          relatedExpenses,
          note,
          status: method === "upi" ? "created" : "pending",
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return success(res, 201, {
      message: `Combined payment created via ${method}`,
      payment: payment[0],
    });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

/**
 * Submit payment proof (UPI only)
 */
export const submitPaymentProof = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { transactionId, screenshotUrl } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) return error(res, 404, "Payment not found");

    if (payment.payer.toString() !== req.user.id) {
      return error(res, 403, "Not your payment");
    }

    if (payment.method !== "upi") {
      return error(res, 400, "Proof required only for UPI payments");
    }

    payment.transactionId = transactionId;
    payment.screenshotUrl = screenshotUrl || null;
    payment.status = "pending";

    await payment.save();
    return success(res, 200, {
      message: "Proof submitted, awaiting confirmation",
      payment,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Confirm or reject payment (Payee side)
 */
export const confirmPayment = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { paymentId } = req.params;
    const { action } = req.body; // "confirm" | "reject"

    const payment = await Payment.findById(paymentId).session(session);
    if (!payment) return error(res, 404, "Payment not found");

    if (payment.payee.toString() !== req.user.id) {
      return error(res, 403, "Not your payment to confirm");
    }

    if (!["pending"].includes(payment.status)) {
      return error(res, 400, "Only pending payments can be confirmed/rejected");
    }

    if (action === "confirm") {
      payment.status = "confirmed";
      payment.confirmedAt = new Date();

      if (payment.relatedExpenses?.length > 0) {
        await Expense.bulkWrite(
          payment.relatedExpenses.map((expId) => ({
            updateOne: {
              filter: { _id: expId, "splitDetails.user": payment.payer },
              update: { $set: { "splitDetails.$.status": "paid" } },
            },
          })),
          { session }
        );
      }
    } else if (action === "reject") {
      payment.status = "rejected";
    }

    await payment.save({ session });
    await session.commitTransaction();

    return success(res, 200, { message: `Payment ${action}ed`, payment });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

/**
 * Request money from another user
 * - Group: requester can only request if that member owes them
 * - Instant: requester can only request if friend owes them from an expense
 */
export const requestMoney = async (req, res, next) => {
  try {
    const { toUserId, groupId, note } = req.body;
    const fromUserId = req.user.id;

    if (!toUserId) {
      return error(res, 400, "toUserId required");
    }

    // -------------------------
    // CASE 1: GROUP REQUEST
    // -------------------------
    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group || !group.members.includes(fromUserId) || !group.members.includes(toUserId)) {
        return error(res, 400, "Both users must be in the group");
      }

      // Compute balances within this group
      const expenses = await Expense.find({ group: groupId });
      let balances = {};
      expenses.forEach((e) => {
        const b = computeNetBalances(e);
        for (const [u, amt] of Object.entries(b)) {
          balances[u] = (balances[u] || 0) + amt;
        }
      });

      // ✅ requester must be owed money
      if (!balances[toUserId] || balances[toUserId] >= 0) {
        return error(res, 400, "This member does not owe you any money");
      }

      const amount = Math.min(-balances[toUserId], balances[fromUserId] || 0);
      if (amount <= 0) {
        return error(res, 400, "No pending dues to request");
      }

      const request = await Payment.create({
        payer: toUserId,
        payee: fromUserId,
        amount,
        method: "cash",
        note: note || "Payment request",
        status: "pending",
        relatedExpenses: [],
        group: groupId,
      });

      return success(res, 201, { message: "Group payment request created", request });
    }

    // -------------------------
    // CASE 2: INSTANT REQUEST
    // -------------------------
    else {
      const expenses = await Expense.find({
        paidBy: fromUserId,
        "splitDetails.user": toUserId,
      });

      let amount = 0;
      for (const e of expenses) {
        // ✅ Only request if "toUserId" has unpaid share
        const share = e.splitDetails.find(
          (s) => s.user.toString() === toUserId && s.status !== "paid"
        );
        if (share) amount += share.finalShare;
      }

      if (amount <= 0) {
        return error(res, 400, "Friend does not owe you anything");
      }

      const request = await Payment.create({
        payer: toUserId,
        payee: fromUserId,
        amount,
        method: "cash",
        note: note || "Instant payment request",
        status: "pending",
        relatedExpenses: [],
        group: null,
      });

      return success(res, 201, { message: "Instant payment request created", request });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Get requests received by logged-in user (incoming)
 */
export const getIncomingRequests = async (req, res, next) => {
  try {
    const requests = await Payment.find({
      payer: req.user.id,
      status: "pending",
    })
      .populate("payee", "name email username")
      .populate("group", "name")
      .lean();

    return success(res, 200, { count: requests.length, requests });
  } catch (err) {
    next(err);
  }
};

/**
 * Get requests sent by logged-in user (outgoing)
 */
export const getOutgoingRequests = async (req, res, next) => {
  try {
    const requests = await Payment.find({
      payee: req.user.id,
      status: "pending",
    })
      .populate("payer", "name email username")
      .populate("group", "name");

    return success(res, 200, { count: requests.length, requests });
  } catch (err) {
    next(err);
  }
};

