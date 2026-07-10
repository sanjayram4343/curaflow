import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { logActivity } from '../utils/activityLogger.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'jwt_secret_dev_123', {
    expiresIn: '30d',
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).populate('hospital department');

    if (user && (await user.comparePassword(password))) {
      if (user.status === 'Inactive') {
        return res.status(403).json({ message: 'Account is inactive' });
      }

      await logActivity(user._id, 'User Login', `Logged in successfully from IP: ${req.ip}`, req);

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hospital: user.hospital,
        department: user.department,
        token: generateToken(user._id),
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('hospital department').select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create user (Super Admin / Hospital Admin)
// @route   POST /api/auth/users
// @access  Private (Admin only)
export const createUser = async (req, res, next) => {
  const { name, email, password, role, hospital, department } = req.body;

  try {
    // Check permission
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Hospital Admin') {
      res.status(403);
      throw new Error('Not authorized to create users');
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    // Hospital Admin can only create users for their own hospital
    let finalHospital = hospital;
    if (req.user.role === 'Hospital Admin') {
      finalHospital = req.user.hospital;
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      hospital: finalHospital,
      department,
    });

    await logActivity(req.user._id, 'User Created', `Created user ${user.name} (${user.email}) as ${user.role}`, req);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      hospital: user.hospital,
      department: user.department,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users in hospital
// @route   GET /api/auth/users
// @access  Private
export const getUsers = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role !== 'Super Admin') {
      query.hospital = req.user.hospital;
    }

    const users = await User.find(query)
      .populate('hospital department')
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Update user status / details
// @route   PUT /api/auth/users/:id
// @access  Private
export const updateUser = async (req, res, next) => {
  const { name, email, role, status, department } = req.body;
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Role verification
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Hospital Admin') {
      res.status(403);
      throw new Error('Not authorized to update users');
    }

    if (req.user.role === 'Hospital Admin' && user.hospital.toString() !== req.user.hospital.toString()) {
      res.status(403);
      throw new Error('Not authorized to update users outside your hospital');
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    user.status = status || user.status;
    user.department = department !== undefined ? department : user.department;

    const updatedUser = await user.save();

    await logActivity(req.user._id, 'User Updated', `Updated user details for ${updatedUser.name} (${updatedUser.email})`, req);

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
      hospital: updatedUser.hospital,
      department: updatedUser.department,
    });
  } catch (error) {
    next(error);
  }
};
