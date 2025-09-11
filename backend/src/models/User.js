import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true, lowercase: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  upiId: { type: String },
  createdAt: { type: Date, default: Date.now },

  // Friend System
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  sentRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
});

// case-insensitive search
userSchema.index({ username: "text", name: "text" });

export default mongoose.model("User", userSchema);
