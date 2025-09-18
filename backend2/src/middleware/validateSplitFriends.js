import User from "../models/User.js";
import { error } from "../utils/response.js";

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
      return error(res, 400, "Split members are required for shared expenses");
    }

    const splitUserIds = splitDetails.map((item) =>
      typeof item === "string" ? item : item?.user
    );

    if (splitUserIds.some((id) => !id)) {
      return error(res, 400, "Invalid splitDetails format");
    }

    const me = await User.findById(meId).select("friends");
    if (!me) return error(res, 404, "User not found");

    const myFriendIds = new Set(me.friends.map((f) => f.toString()));

    for (const uid of splitUserIds) {
      if (!myFriendIds.has(uid) && uid !== meId) {
        return error(res, 403, `You can only split with friends. ${uid} is not in your friend list.`);
      }
    }

    req._splitUserIds = [...new Set(splitUserIds)];

    next();
  } catch (err) {
    next(err);
  }
};

export default validateSplitFriends;
