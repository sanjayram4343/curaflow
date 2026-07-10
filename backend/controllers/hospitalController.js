import Hospital from '../models/Hospital.js';
import { logActivity } from '../utils/activityLogger.js';

// @desc    Get all hospitals
// @route   GET /api/hospitals
// @access  Public
export const getHospitals = async (req, res, next) => {
  try {
    const hospitals = await Hospital.find({}).sort({ name: 1 });
    res.json(hospitals);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single hospital
// @route   GET /api/hospitals/:id
// @access  Public
export const getHospitalById = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (hospital) {
      res.json(hospital);
    } else {
      res.status(404);
      throw new Error('Hospital not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create a hospital
// @route   POST /api/hospitals
// @access  Private (Super Admin only)
export const createHospital = async (req, res, next) => {
  const { name, address, city, contactNumber, totalBedsCount } = req.body;

  try {
    const hospital = await Hospital.create({
      name,
      address,
      city,
      contactNumber,
      totalBedsCount,
    });

    await logActivity(req.user._id, 'Hospital Created', `Created hospital: ${hospital.name}`, req);

    res.status(201).json(hospital);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a hospital
// @route   PUT /api/hospitals/:id
// @access  Private (Super Admin only)
export const updateHospital = async (req, res, next) => {
  const { name, address, city, contactNumber, totalBedsCount } = req.body;

  try {
    const hospital = await Hospital.findById(req.params.id);

    if (hospital) {
      hospital.name = name || hospital.name;
      hospital.address = address || hospital.address;
      hospital.city = city || hospital.city;
      hospital.contactNumber = contactNumber || hospital.contactNumber;
      hospital.totalBedsCount = totalBedsCount !== undefined ? totalBedsCount : hospital.totalBedsCount;

      const updatedHospital = await hospital.save();

      await logActivity(req.user._id, 'Hospital Updated', `Updated hospital: ${updatedHospital.name}`, req);

      res.json(updatedHospital);
    } else {
      res.status(404);
      throw new Error('Hospital not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a hospital
// @route   DELETE /api/hospitals/:id
// @access  Private (Super Admin only)
export const deleteHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (hospital) {
      await hospital.deleteOne();
      await logActivity(req.user._id, 'Hospital Deleted', `Deleted hospital: ${hospital.name}`, req);
      res.json({ message: 'Hospital removed' });
    } else {
      res.status(404);
      throw new Error('Hospital not found');
    }
  } catch (error) {
    next(error);
  }
};
