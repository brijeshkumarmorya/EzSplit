import Notification from "../models/Notification.js";
import logger from "./logger.js";

// Keep mapping of userId -> socketId(s)
const onlineUsers = new Map();

export const registerUserSocket = (userId, socketId) => {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
  logger.info(`User ${userId} connected on socket ${socketId}`);
};

export const removeUserSocket = (userId, socketId) => {
  if (onlineUsers.has(userId)) {
    onlineUsers.get(userId).delete(socketId);
    if (onlineUsers.get(userId).size === 0) onlineUsers.delete(userId);
  }
  logger.info(`User ${userId} disconnected from socket ${socketId}`);
};

export const sendNotification = async (io, { userId, senderId, type, message, data = {} }) => {
  try {
    const notification = await Notification.create({
      user: userId,
      sender: senderId,
      type,
      message,
      data,
    });

    // Emit to online users
    const sockets = onlineUsers.get(userId?.toString());
    if (sockets) {
      sockets.forEach((sid) => {
        io.to(sid).emit("notification", notification);
      });
    }

    return notification;
  } catch (err) {
    logger.error("Failed to send notification", err);
  }
};
