import Equipment from '../models/Equipment.js';
import { logActivity } from '../utils/activityLogger.js';

// @desc    Get all equipment with search, filtering, pagination, sorting
// @route   GET /api/equipment
// @access  Private
export const getEquipment = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status,
      category,
      department,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Scoped by hospital if not Super Admin
    if (req.user.role !== 'Super Admin') {
      query.hospital = req.user.hospital;
    }

    // Apply filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (department) query.department = department;

    // Search query
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skipIndex = (parseInt(page) - 1) * parseInt(limit);

    const total = await Equipment.countDocuments(query);
    const equipmentList = await Equipment.find(query)
      .populate('hospital department assignedPatient')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skipIndex);

    res.json({
      equipment: equipmentList,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single equipment
// @route   GET /api/equipment/:id
// @access  Private
export const getEquipmentById = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'Super Admin') {
      query.hospital = req.user.hospital;
    }

    const item = await Equipment.findOne(query).populate('hospital department assignedPatient');
    if (item) {
      res.json(item);
    } else {
      res.status(404);
      throw new Error('Equipment not found or unauthorized');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create equipment
// @route   POST /api/equipment
// @access  Private (Admin/Staff only)
export const createEquipment = async (req, res, next) => {
  const { name, category, serialNumber, status, department, hospital } = req.body;

  try {
    let finalHospital = hospital;
    if (req.user.role !== 'Super Admin') {
      finalHospital = req.user.hospital;
    }

    if (!finalHospital) {
      res.status(400);
      throw new Error('Hospital is required');
    }

    // Check duplicate serial number
    const duplicate = await Equipment.findOne({ serialNumber });
    if (duplicate) {
      res.status(400);
      throw new Error('Equipment with this serial number already exists');
    }

    const item = await Equipment.create({
      name,
      category,
      serialNumber,
      status: status || 'Available',
      hospital: finalHospital,
      department,
    });

    await logActivity(req.user._id, 'Equipment Created', `Created equipment ${item.name} (${item.serialNumber})`, req);

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

// @desc    Update equipment
// @route   PUT /api/equipment/:id
// @access  Private (Admin/Staff only)
export const updateEquipment = async (req, res, next) => {
  const { name, category, serialNumber, status, department } = req.body;

  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'Super Admin') {
      query.hospital = req.user.hospital;
    }

    const item = await Equipment.findOne(query);

    if (!item) {
      res.status(404);
      throw new Error('Equipment not found or unauthorized');
    }

    // Check duplicate serial if changing
    if (serialNumber && serialNumber !== item.serialNumber) {
      const duplicate = await Equipment.findOne({ serialNumber });
      if (duplicate) {
        res.status(400);
        throw new Error('Equipment with this serial number already exists');
      }
      item.serialNumber = serialNumber;
    }

    item.name = name || item.name;
    item.category = category || item.category;
    item.status = status || item.status;
    item.department = department || item.department;

    const updatedItem = await item.save();

    await logActivity(req.user._id, 'Equipment Updated', `Updated equipment ${updatedItem.name} (${updatedItem.serialNumber})`, req);

    res.json(updatedItem);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete equipment
// @route   DELETE /api/equipment/:id
// @access  Private (Admin/Staff only)
export const deleteEquipment = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'Super Admin') {
      query.hospital = req.user.hospital;
    }

    const item = await Equipment.findOne(query);

    if (!item) {
      res.status(404);
      throw new Error('Equipment not found or unauthorized');
    }

    if (item.status === 'Assigned') {
      res.status(400);
      throw new Error('Cannot delete currently assigned equipment');
    }

    await item.deleteOne();

    await logActivity(req.user._id, 'Equipment Deleted', `Deleted equipment ${item.name} (${item.serialNumber})`, req);

    res.json({ message: 'Equipment removed' });
  } catch (error) {
    next(error);
  }
};
