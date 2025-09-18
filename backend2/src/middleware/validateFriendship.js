import User from "../models/User.js";
import { error } from "../utils/response.js";

/**
 * Validate group members on group creation
 */
export const validateGroupMembers = async (req, res, next) => {
  try {
    const { members } = req.body;
    const loggedInUserId = req.user.id;

    if (!members || !Array.isArray(members) || members.length === 0) {
      return error(res, 400, "Members are required");
    }

    const me = await User.findById(loggedInUserId).select("friends");

    for (let memberId of members) {
      if (!me.friends.map((f) => f.toString()).includes(memberId)) {
        return error(res, 403, `User ${memberId} is not in your friend list`);
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Validate new member when adding to a group
 */
export const validateNewMember = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const loggedInUserId = req.user.id;

    if (!userId) {
      return error(res, 400, "UserId is required");
    }

    const me = await User.findById(loggedInUserId).select("friends");

    if (!me.friends.map((f) => f.toString()).includes(userId)) {
      return error(res, 403, `User ${userId} is not in your friend list`);
    }

    next();
  } catch (err) {
    next(err);
  }
};
