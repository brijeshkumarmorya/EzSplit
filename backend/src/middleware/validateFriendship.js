import User from "../models/User.js";

// Group create karte waqt: ensure sabhi members friend list me hain
export const validateGroupMembers = async (req, res, next) => {
  try {
    const { members } = req.body;
    const loggedInUserId = req.user.id;

    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: "Members are required" });
    }

    // Logged-in user ko fetch karo
    const me = await User.findById(loggedInUserId).select("friends");

    // Check karo har member friends list me hai ya nahi
    for (let memberId of members) {
      if (!me.friends.map(f => f.toString()).includes(memberId)) {
        return res.status(403).json({
          message: `User ${memberId} is not in your friend list`,
        });
      }
    }

    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Group me naya member add karte waqt
export const validateNewMember = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const loggedInUserId = req.user.id;

    if (!userId) {
      return res.status(400).json({ message: "UserId is required" });
    }

    const me = await User.findById(loggedInUserId).select("friends");

    if (!me.friends.map(f => f.toString()).includes(userId)) {
      return res.status(403).json({
        message: `User ${userId} is not in your friend list`,
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
