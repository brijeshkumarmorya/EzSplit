// src/controllers/friendController.js
import User from "../models/User.js";
import { success, error } from "../utils/response.js";
import {
  validateFriend,
  sendRequestHelper,
  acceptRequestHelper,
  rejectRequestHelper,
} from "../utils/friendUtils.js";

// Send Friend Request
export const sendFriendRequest = async (req, res, next) => {
  try {
    const { friendId } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    validateFriend(userId, friend, friendId);

    try {
      sendRequestHelper(user, friendId);
    } catch (e) {
      return error(res, 400, e.message);
    }

    friend.friendRequests.addToSet(userId);

    await user.save();
    await friend.save();

    return success(res, 200, { message: "Friend request sent" });
  } catch (err) {
    next(err);
  }
};

// Accept Friend Request
export const acceptFriendRequest = async (req, res, next) => {
  try {
    const { friendId } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    validateFriend(userId, friend, friendId);

    try {
      acceptRequestHelper(user, friend);
    } catch (e) {
      return error(res, 400, e.message);
    }

    await user.save();
    await friend.save();

    return success(res, 200, { message: "Friend request accepted" });
  } catch (err) {
    next(err);
  }
};

// Reject Friend Request
export const rejectFriendRequest = async (req, res, next) => {
  try {
    const { friendId } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    validateFriend(userId, friend, friendId);

    try {
      rejectRequestHelper(user, friend);
    } catch (e) {
      return error(res, 400, e.message);
    }

    await user.save();
    await friend.save();

    return success(res, 200, { message: "Friend request rejected" });
  } catch (err) {
    next(err);
  }
};

// Get Friends List
export const getFriends = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("friends", "name username email")
      .lean();

    return success(res, 200, { friends: user.friends });
  } catch (err) {
    next(err);
  }
};

// Get Pending Friend Requests
export const getPendingRequests = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("friendRequests", "name username email")
      .lean();

    return success(res, 200, { pendingRequests: user.friendRequests });
  } catch (err) {
    next(err);
  }
};
