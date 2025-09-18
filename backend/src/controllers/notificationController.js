import Notification from "../models/Notification.js";
import { success, error } from "../utils/response.js";

export const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .populate("sender", "name username email")
      .sort({ createdAt: -1 });
    return success(res, 200, { notifications });
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notif) return error(res, 404, "Notification not found");
    return success(res, 200, { notif });
  } catch (err) {
    next(err);
  }
};

