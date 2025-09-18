import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    index: true, // frequent queries by user
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    index: true, // queries by sender
  },
  type: {
    type: String,
    enum: [
      "friend_request",
      "friend_accept",
      "expense_added",
      "payment_request",
      "payment_confirmed",
    ],
    required: true,
  },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed }, // flexible payload (IDs, metadata)
  isRead: { type: Boolean, default: false, index: true },
}, {
  timestamps: true, // adds createdAt + updatedAt automatically
});

// 🔹 Indexes for performance
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 }); // unread notifications sorted
notificationSchema.index({ user: 1, type: 1 }); // filter by type
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // auto-expire in 90 days

export default mongoose.model("Notification", notificationSchema);
