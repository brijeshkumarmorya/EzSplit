import User from "../models/User.js";

// Send Friend Request
export const sendFriendRequest = async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.user.id;

    if (userId === friendId) return res.status(400).json({ msg: "You can't add yourself" });

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!friend) return res.status(404).json({ msg: "User not found" });

    if (user.friends.includes(friendId))
      return res.status(400).json({ msg: "Already friends" });

    if (user.sentRequests.includes(friendId))
      return res.status(400).json({ msg: "Friend request already sent" });

    if (user.friendRequests.includes(friendId))
      return res.status(400).json({ msg: "You already have a request from this user" });

    user.sentRequests.push(friendId);
    friend.friendRequests.push(userId);

    await user.save();
    await friend.save();

    res.json({ msg: "Friend request sent" });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// Accept Friend Request
export const acceptFriendRequest = async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!friend) return res.status(404).json({ msg: "User not found" });

    if (!user.friendRequests.includes(friendId))
      return res.status(400).json({ msg: "No request from this user" });

    // Add each other as friends
    user.friends.push(friendId);
    friend.friends.push(userId);

    // Remove from requests
    user.friendRequests = user.friendRequests.filter(id => id.toString() !== friendId);
    friend.sentRequests = friend.sentRequests.filter(id => id.toString() !== userId);

    await user.save();
    await friend.save();

    res.json({ msg: "Friend request accepted" });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// Reject Friend Request
export const rejectFriendRequest = async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!friend) return res.status(404).json({ msg: "User not found" });

    if (!user.friendRequests.includes(friendId))
      return res.status(400).json({ msg: "No request from this user" });

    // Remove request
    user.friendRequests = user.friendRequests.filter(id => id.toString() !== friendId);
    friend.sentRequests = friend.sentRequests.filter(id => id.toString() !== userId);

    await user.save();
    await friend.save();

    res.json({ msg: "Friend request rejected" });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// Get Friends List
export const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("friends", "name username email");
    res.json(user.friends);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// Get Pending Friend Requests
export const getPendingRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("friendRequests", "name username email");
    res.json(user.friendRequests);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};
