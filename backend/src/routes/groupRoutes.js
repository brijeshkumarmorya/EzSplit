import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  createGroup,
  getMyGroups,
  getGroupById,
  addMember,
  removeMember,
} from "../controllers/groupController.js";

const router = express.Router();

router.post("/", authMiddleware, createGroup);
router.get("/my", authMiddleware, getMyGroups);
router.get("/:groupId", authMiddleware, getGroupById);
router.post("/:groupId/add-member", authMiddleware, addMember);
router.post("/:groupId/remove-member", authMiddleware, removeMember);

export default router;
