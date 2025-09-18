// src/controllers/friendController.js
import User from "../models/User.js";
import { success, error } from "../utils/response.js";
import {
  validateFriend,
  sendRequestHelper,
  acceptRequestHelper,
  rejectRequestHelper,
} from "../utils/friendUtils.js";
import { sendNotification } from "../utils/notificationUtils.js";
import { io } from "../server.js";

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

    // Send notification to friend
    await sendNotification(io, {
      userId: friendId,
      senderId: userId,
      type: "friend_request",
      message: `${user.name} sent you a friend request`,
    });

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

    await sendNotification(io, {
      userId: friendId,
      senderId: userId,
      type: "friend_accept",
      message: `${user.name} accepted your friend request`,
    });

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

// 🔍 Unified Search (text + regex)
export const searchUsers = async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === "") {
      return error(res, 400, "Search query is required");
    }

    // 1️⃣ Try text search first (more relevant)
    let users = await User.find(
      { $text: { $search: query } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .select("name username email");

    // 2️⃣ If no results, or to enrich results → also do regex search
    const regexMatches = await User.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { name: { $regex: query, $options: "i" } },
      ],
    }).select("name username email");

    // Merge & deduplicate (avoid duplicates if user appears in both searches)
    const merged = [...users, ...regexMatches].reduce((acc, user) => {
      if (!acc.some((u) => u._id.toString() === user._id.toString())) {
        acc.push(user);
      }
      return acc;
    }, []);

    // Exclude logged-in user
    const filtered = merged.filter((u) => u._id.toString() !== req.user.id);

    return success(res, 200, { count: filtered.length, users: filtered });
  } catch (err) {
    next(err);
  }
};
