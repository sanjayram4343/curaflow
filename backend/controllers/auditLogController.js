import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';

// @desc    Get all audit logs (Admin/Super Admin only)
// @route   GET /api/audit-logs
// @access  Private (Admin/Super Admin only)
export const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;

    const query = {};

    // Filter by users in the same hospital if not Super Admin
    if (req.user.role !== 'Super Admin') {
      const hospitalUsers = await User.find({ hospital: req.user.hospital }).select('_id');
      const userIds = hospitalUsers.map(u => u._id);
      query.user = { $in: userIds };
    }

    if (search) {
      // Find matching users first
      const matchedUsers = await User.find({
        name: { $regex: search, $options: 'i' }
      }).select('_id');
      const matchedUserIds = matchedUsers.map(u => u._id);

      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } },
        { user: { $in: matchedUserIds } }
      ];
    }

    const skipIndex = (parseInt(page) - 1) * parseInt(limit);

    const total = await ActivityLog.countDocuments(query);
    const logs = await ActivityLog.find(query)
      .populate('user')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skipIndex);

    res.json({
      logs,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    });
  } catch (error) {
    next(error);
  }
};
