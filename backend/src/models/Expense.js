import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  splitBetween: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" }, // optional (null for instant split)
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Expense", expenseSchema);
