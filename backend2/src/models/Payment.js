import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  payer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  payee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  relatedExpenses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Expense" }],
  amount: { type: Number, required: true },
  method: { type: String, enum: ["upi", "cash", "manual"], default: "upi" },
  upiIntent: { type: String },
  qrData: { type: String },
  transactionId: { type: String },
  screenshotUrl: { type: String },
  note: { type: String },

  status: {
    type: String,
    enum: ["created", "pending", "confirmed", "rejected"],
    default: "created",
    index: true
  },

  createdAt: { type: Date, default: Date.now },
  confirmedAt: { type: Date },
});

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
