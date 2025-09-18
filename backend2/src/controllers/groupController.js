import Group from "../models/Group.js";
import Expense from "../models/Expense.js";
import { computeNetBalances } from "../utils/expenseUtils.js";
import { success, error } from "../utils/response.js";

// Create group
export const createGroup = async (req, res, next) => {
  try {
    const { name, members } = req.body;

    if (!name || !members?.length) {
      return error(res, 400, "Name and members are required");
    }

    const group = new Group({
      name,
      members,
      createdBy: req.user.id,
    });

    await group.save();
    return success(res, 201, { group });
  } catch (err) {
    next(err);
  }
};

// Get all groups of logged-in user
export const getMyGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({ members: req.user.id })
      .populate("members", "name username email")
      .populate("createdBy", "name username email")
      .lean();
    return success(res, 200, { groups });
  } catch (err) {
    next(err);
  }
};

// Get group details by ID
export const getGroupById = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate("members", "name username email")
      .populate("createdBy", "name username email")
      .lean();
    if (!group) return error(res, 404, "Group not found");
    return success(res, 200, { group });
  } catch (err) {
    next(err);
  }
};

// Add a member to group
export const addMember = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.groupId);

    if (!group) return error(res, 404, "Group not found");

    if (!group.members.includes(userId)) {
      group.members.push(userId);
      await group.save();
    }

    return success(res, 200, { group });
  } catch (err) {
    next(err);
  }
};

// Remove a member from group
export const removeMember = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.groupId);

    if (!group) return error(res, 404, "Group not found");

    if (userId !== req.user.id) {
      return error(res, 403, "You can only remove yourself");
    }

    const expenses = await Expense.find({ group: group._id });
    let balances = {};
    expenses.forEach((e) => {
      const b = computeNetBalances(e);
      for (const [u, amt] of Object.entries(b)) {
        balances[u] = (balances[u] || 0) + amt;
      }
    });

    if ((balances[userId] || 0) < 0) {
      return error(res, 400, "Clear all dues before leaving group");
    }

    group.members = group.members.filter((m) => m.toString() !== userId);
    await group.save();

    return success(res, 200, { message: "You left the group successfully", group });
  } catch (err) {
    next(err);
  }
};
