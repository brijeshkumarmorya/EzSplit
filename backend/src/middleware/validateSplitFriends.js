import User from "../models/User.js";

/**
 * Ensures all split recipients are in the logged-in user's friends list.
 * Works only for shared expenses. Skips validation for personal expenses.
 */
const validateSplitFriends = async (req, res, next) => {
  try {
    const meId = req.user.id;
    const { splitType, splitDetails } = req.body;

    // ✅ Case 1: Personal expense → skip validation
    if (!splitDetails || splitType === "none") {
      return next();
    }

    // ✅ Case 2: Shared expense must have valid participants
    if (!Array.isArray(splitDetails) || splitDetails.length === 0) {
      return res
        .status(400)
        .json({ message: "Split members are required for shared expenses" });
    }

    // Normalize to array of userIds (in case client sent [{user: id}, ...])
    const splitUserIds = splitDetails.map((item) =>
      typeof item === "string" ? item : item?.user
    );

    if (splitUserIds.some((id) => !id)) {
      return res
        .status(400)
        .json({ message: "Invalid splitDetails format" });
    }

    // Fetch current user's friends
    const me = await User.findById(meId).select("friends");
    if (!me) return res.status(404).json({ message: "User not found" });

    const myFriendIds = new Set(me.friends.map((f) => f.toString()));

    // Ensure all split recipients are friends
    for (const uid of splitUserIds) {
      if (!myFriendIds.has(uid) && uid !== meId) {
        return res.status(403).json({
          message: `You can only split with friends. ${uid} is not in your friend list.`,
        });
      }
    }

    // Attach normalized list for the controller to reuse (deduped)
    req._splitUserIds = [...new Set(splitUserIds)];

    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export default validateSplitFriends;
