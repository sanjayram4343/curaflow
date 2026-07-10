import ActivityLog from '../models/ActivityLog.js';

export const logActivity = async (userId, action, details, req = null) => {
  try {
    let ipAddress = '';
    if (req) {
      ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    }

    await ActivityLog.create({
      user: userId,
      action,
      details,
      ipAddress
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};
