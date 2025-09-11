import mongoose from "mongoose";

/**
 * Sub-schema for split details
 * Represents how much each user owes/pays in a shared expense
 */
const splitSubSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Optional if using percentage split (e.g., 60/40)
    percentage: { type: Number, default: null },

    // Optional if using custom split (e.g., ₹900 / ₹300)
    amount: { type: Number, default: null },

    // Final computed share for the user (always required, regardless of split type)
    finalShare: { type: Number, required: true, min: 0 },

    // Status of payment for this user's share
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "paid"],
      default: "pending",
    },
  },
  { _id: false } // prevent auto-generating _id for subdocs
);

/**
 * Main Expense schema
 */
const expenseSchema = new mongoose.Schema(
  {
    // Core fields
    description: { type: String, required: true, trim: true },
    notes: { type: String, trim: true }, // optional notes

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" }, // supports future multi-currency

    // Category for reports/analytics
    category: {
      type: String,
      enum: [
        "food",
        "rent",
        "utilities",
        "travel",
        "shopping",
        "entertainment",
        "other",
      ],
      default: "other",
    },

    // Who paid the bill
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // If belongs to a group, otherwise null
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },

    // Defines how the expense is split
    splitType: {
      type: String,
      enum: ["equal", "percentage", "custom", "none"], // "none" = no split (personal)
      default: "none",
    },

    // Details of splits (required only if splitType !== "none")
    splitDetails: {
      type: [splitSubSchema],
      validate: {
        validator: function (v) {
          // If splitType is "none", no splitDetails needed
          // Else, must have at least one participant
          return this.splitType === "none" || (Array.isArray(v) && v.length > 0);
        },
        message: "Split details required for shared expenses",
      },
    },

    // System-controlled field → auto-inferred from context
    expenseType: {
      type: String,
      enum: ["personal", "group", "instant"], 
      default: "personal",
      immutable: true, // cannot be set manually from outside
    },
  },
  { timestamps: true } // auto add createdAt, updatedAt
);

/**
 * Pre-save hook:
 * Ensures expenseType and splitType remain consistent
 */
expenseSchema.pre("save", function (next) {
  // Case 1: Group expense → always "group"
  if (this.group) {
    this.expenseType = "group";
  }
  // Case 2: No group & no split → treat as "personal"
  else if (!this.group && (!this.splitDetails || this.splitDetails.length <= 1)) {
    this.expenseType = "personal";
    this.splitType = "none";

    // Auto-generate splitDetails so payer is only participant
    this.splitDetails = [
      {
        user: this.paidBy,
        finalShare: this.amount,
        status: "paid", // already paid since payer covered it
      },
    ];
  }
  // Case 3: No group & multiple participants → treat as "instant"
  else if (!this.group && this.splitDetails.length > 1) {
    this.expenseType = "instant";
  }

  next();
});

export default mongoose.models.Expense ||
  mongoose.model("Expense", expenseSchema);
