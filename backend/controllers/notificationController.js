import Notification from '../models/Notification.js';

// @desc    Get all notifications for user's hospital
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res, next) => {
  try {
    const query = {};

    if (req.user.role !== 'Super Admin') {
      query.hospital = req.user.hospital;
      query.$or = [
        { recipient: req.user._id },
        { recipient: null } // broadcast
      ];
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markNotificationAsRead = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'Super Admin') {
      query.hospital = req.user.hospital;
    }

    const notification = await Notification.findOne(query);

    if (notification) {
      notification.isRead = true;
      await notification.save();
      res.json(notification);
    } else {
      res.status(404);
      throw new Error('Notification not found or unauthorized');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role !== 'Super Admin') {
      query.hospital = req.user.hospital;
      query.$or = [
        { recipient: req.user._id },
        { recipient: null }
      ];
    }

    await Notification.updateMany(query, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};
