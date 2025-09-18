// src/utils/friendUtils.js

/**
 * Ensure friend exists and is not self
 */
export const validateFriend = (userId, friend, friendId) => {
  if (!friend) throw new Error("User not found");
  if (userId === friendId) throw new Error("You can't add yourself");
};

/**
 * Send a friend request
 */
export const sendRequestHelper = (user, friendId) => {
  if (user.friends.includes(friendId)) throw new Error("Already friends");
  if (user.sentRequests.includes(friendId)) throw new Error("Friend request already sent");
  if (user.friendRequests.includes(friendId)) throw new Error("You already have a request from this user");

  user.sentRequests.addToSet(friendId);
};

/**
 * Accept a friend request
 */
export const acceptRequestHelper = (user, friend) => {
  if (!user.friendRequests.includes(friend._id)) {
    throw new Error("No request from this user");
  }

  user.friends.addToSet(friend._id);
  friend.friends.addToSet(user._id);

  user.friendRequests.pull(friend._id);
  friend.sentRequests.pull(user._id);
};

/**
 * Reject a friend request
 */
export const rejectRequestHelper = (user, friend) => {
  if (!user.friendRequests.includes(friend._id)) {
    throw new Error("No request from this user");
  }

  user.friendRequests.pull(friend._id);
  friend.sentRequests.pull(user._id);
};
