import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  createGroup,
  getMyGroups,
  getGroupById,
  addMember,
  removeMember,
} from "../controllers/groupController.js";
import { validateGroupMembers, validateNewMember } from "../middleware/validateFriendship.js";

const router = express.Router();

router.post("/", authMiddleware, validateGroupMembers, createGroup);
router.get("/my", authMiddleware, getMyGroups);
router.get("/:groupId", authMiddleware, getGroupById);
router.patch("/:groupId/add-member", authMiddleware, validateNewMember, addMember);
router.delete("/:groupId/remove-member", authMiddleware, removeMember);

export default router;
