import Group from "../models/Group.js";
import User from "../models/User.js";

// Create group
export const createGroup = async (req, res) => {
  try {
    const { name, members } = req.body;

    if (!name || !members?.length) {
      return res.status(400).json({ message: "Name and members are required" });
    }

    const group = new Group({
      name,
      members,
      createdBy: req.user.id,
    });

    await group.save();
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all groups of logged-in user
export const getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id })
      .populate("members", "name username email")
      .populate("createdBy", "name username email");
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get group details by ID
export const getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate("members", "name username email")
      .populate("createdBy", "name username email");

    if (!group) return res.status(404).json({ message: "Group not found" });

    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add a member to group
export const addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.groupId);

    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.members.includes(userId)) {
      group.members.push(userId);
      await group.save();
    }

    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Remove a member from group
export const removeMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.groupId);

    if (!group) return res.status(404).json({ message: "Group not found" });

    group.members = group.members.filter((m) => m.toString() !== userId);
    await group.save();

    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
