import Bed from '../models/Bed.js';
import { logActivity } from '../utils/activityLogger.js';

// @desc    Get all beds with search, filtering, pagination, sorting
// @route   GET /api/beds
// @access  Private
export const getBeds = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status,
      bedType,
      department,
      ward,
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
    if (bedType) query.bedType = bedType;
    if (department) query.department = department;
    if (ward) query.ward = ward;

    // Search query
    if (search) {
      query.$or = [
        { bedNumber: { $regex: search, $options: 'i' } },
        { room: { $regex: search, $options: 'i' } },
        { ward: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skipIndex = (parseInt(page) - 1) * parseInt(limit);

    const total = await Bed.countDocuments(query);
    const beds = await Bed.find(query)
      .populate('hospital department assignedPatient')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skipIndex);

    res.json({
      beds,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single bed
// @route   GET /api/beds/:id
// @access  Private
export const getBedById = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'Super Admin') {
      query.hospital = req.user.hospital;
    }

    const bed = await Bed.findOne(query).populate('hospital department assignedPatient');
    if (bed) {
      res.json(bed);
    } else {
      res.status(404);
      throw new Error('Bed not found or unauthorized');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create a bed
// @route   POST /api/beds
// @access  Private (Admin/Staff only)
export const createBed = async (req, res, next) => {
  const { bedNumber, ward, room, floor, bedType, status, department, hospital } = req.body;

  try {
    let finalHospital = hospital;
    if (req.user.role !== 'Super Admin') {
      finalHospital = req.user.hospital;
    }

    if (!finalHospital) {
      res.status(400);
      throw new Error('Hospital is required');
    }

    // Check for duplicate bed number in this hospital
    const duplicate = await Bed.findOne({ hospital: finalHospital, bedNumber });
    if (duplicate) {
      res.status(400);
      throw new Error('Bed number already exists in this hospital');
    }

    const bed = await Bed.create({
      bedNumber,
      ward,
      room,
      floor,
      bedType,
      status: status || 'Available',
      hospital: finalHospital,
      department,
    });

    await logActivity(req.user._id, 'Bed Created', `Created bed ${bed.bedNumber} in ${bed.ward} ward`, req);

    res.status(201).json(bed);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a bed
// @route   PUT /api/beds/:id
// @access  Private (Admin/Staff only)
export const updateBed = async (req, res, next) => {
  const { bedNumber, ward, room, floor, bedType, status, department } = req.body;

  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'Super Admin') {
      query.hospital = req.user.hospital;
    }

    const bed = await Bed.findOne(query);

    if (!bed) {
      res.status(404);
      throw new Error('Bed not found or unauthorized');
    }

    // Check duplicate if bed number is changing
    if (bedNumber && bedNumber !== bed.bedNumber) {
      const duplicate = await Bed.findOne({ hospital: bed.hospital, bedNumber });
      if (duplicate) {
        res.status(400);
        throw new Error('Bed number already exists in this hospital');
      }
      bed.bedNumber = bedNumber;
    }

    bed.ward = ward || bed.ward;
    bed.room = room || bed.room;
    bed.floor = floor !== undefined ? floor : bed.floor;
    bed.bedType = bedType || bed.bedType;
    bed.status = status || bed.status;
    bed.department = department || bed.department;

    const updatedBed = await bed.save();

    await logActivity(req.user._id, 'Bed Updated', `Updated bed ${updatedBed.bedNumber} details`, req);

    res.json(updatedBed);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a bed
// @route   DELETE /api/beds/:id
// @access  Private (Admin/Staff only)
export const deleteBed = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'Super Admin') {
      query.hospital = req.user.hospital;
    }

    const bed = await Bed.findOne(query);

    if (!bed) {
      res.status(404);
      throw new Error('Bed not found or unauthorized');
    }

    if (bed.status === 'Occupied') {
      res.status(400);
      throw new Error('Cannot delete an occupied bed');
    }

    await bed.deleteOne();

    await logActivity(req.user._id, 'Bed Deleted', `Deleted bed ${bed.bedNumber}`, req);

    res.json({ message: 'Bed removed' });
  } catch (error) {
    next(error);
  }
};
