import Maintenance from '../models/Maintenance.js';
import Equipment from '../models/Equipment.js';
import Notification from '../models/Notification.js';
import { logActivity } from '../utils/activityLogger.js';

// @desc    Get all maintenance requests
// @route   GET /api/maintenance
// @access  Private
export const getMaintenanceRequests = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role !== 'Super Admin') {
      // Filter by hospital of the equipment
      const hospitalEquipment = await Equipment.find({ hospital: req.user.hospital }).select('_id');
      const equipmentIds = hospitalEquipment.map(e => e._id);
      query.equipment = { $in: equipmentIds };
    }

    const requests = await Maintenance.find(query)
      .populate({
        path: 'equipment',
        populate: { path: 'hospital department' }
      })
      .populate('reportedBy')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a maintenance request
// @route   POST /api/maintenance
// @access  Private (Staff/Nurse/Doctor/Admin)
export const createMaintenanceRequest = async (req, res, next) => {
  const { equipment, technician, description } = req.body;

  try {
    const eqObj = await Equipment.findById(equipment);
    if (!eqObj) {
      res.status(404);
      throw new Error('Equipment not found');
    }

    // Check if already in maintenance
    if (eqObj.status === 'Maintenance') {
      res.status(400);
      throw new Error('Equipment is already undergoing maintenance');
    }

    // If assigned to a patient, remove from patient or throw error
    // In our system, let's allow setting it to maintenance and set assigned patient to null
    eqObj.status = 'Maintenance';
    eqObj.assignedPatient = null;
    await eqObj.save();

    const request = await Maintenance.create({
      equipment,
      reportedBy: req.user._id,
      technician,
      description,
      status: 'Reported',
      startDate: new Date()
    });

    // Create Notification
    await Notification.create({
      hospital: req.user.hospital || eqObj.hospital,
      title: 'Equipment Sent to Maintenance',
      message: `Equipment ${eqObj.name} (${eqObj.serialNumber}) reported for maintenance: ${description}`,
      type: 'Maintenance'
    });

    await logActivity(req.user._id, 'Maintenance Reported', `Reported maintenance for equipment ${eqObj.name} (${eqObj.serialNumber})`, req);

    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
};

// @desc    Update maintenance request status (In Progress, Completed)
// @route   PUT /api/maintenance/:id/status
// @access  Private (Staff/Nurse/Doctor/Admin)
export const updateMaintenanceStatus = async (req, res, next) => {
  const { status, technician } = req.body; // In Progress, Completed

  try {
    const request = await Maintenance.findById(req.params.id).populate('equipment');
    if (!request) {
      res.status(404);
      throw new Error('Maintenance request not found');
    }

    request.status = status;
    if (technician) request.technician = technician;

    if (status === 'Completed') {
      request.endDate = new Date();
      
      // Update Equipment back to Available
      await Equipment.findByIdAndUpdate(request.equipment._id, {
        status: 'Available'
      });

      // Create Notification
      await Notification.create({
        hospital: req.user.hospital || request.equipment.hospital,
        title: 'Maintenance Completed',
        message: `Maintenance completed for ${request.equipment.name} (${request.equipment.serialNumber})`,
        type: 'Maintenance'
      });

      await logActivity(req.user._id, 'Maintenance Completed', `Completed maintenance for equipment ${request.equipment.name}`, req);
    } else {
      await logActivity(req.user._id, 'Maintenance Progress Update', `Updated maintenance status to ${status} for equipment ${request.equipment.name}`, req);
    }

    await request.save();
    res.json(request);
  } catch (error) {
    next(error);
  }
};
