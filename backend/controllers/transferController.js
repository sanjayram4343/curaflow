import Transfer from '../models/Transfer.js';
import Hospital from '../models/Hospital.js';
import Bed from '../models/Bed.js';
import Equipment from '../models/Equipment.js';
import Patient from '../models/Patient.js';
import Notification from '../models/Notification.js';
import { logActivity } from '../utils/activityLogger.js';

// @desc    Get all transfers (source or target for the hospital)
// @route   GET /api/transfers
// @access  Private
export const getTransfers = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role !== 'Super Admin') {
      // Return transfers where the user's hospital is either source or target
      query.$or = [
        { sourceHospital: req.user.hospital },
        { targetHospital: req.user.hospital }
      ];
    }

    const transfers = await Transfer.find(query)
      .populate('patient sourceHospital targetHospital requestedBy')
      .sort({ createdAt: -1 });

    res.json(transfers);
  } catch (error) {
    next(error);
  }
};

// @desc    Suggest hospitals for patient transfer (ICU beds and required equipment)
// @route   GET /api/transfers/suggestions
// @access  Private
export const getTransferSuggestions = async (req, res, next) => {
  const { equipmentCategory } = req.query;

  try {
    const currentHospitalId = req.user.hospital;

    // Get all other hospitals
    const otherHospitals = await Hospital.find({
      _id: { $ne: currentHospitalId }
    });

    const suggestions = [];

    for (const hosp of otherHospitals) {
      // Count available ICU beds
      const availableIcuBeds = await Bed.countDocuments({
        hospital: hosp._id,
        bedType: 'ICU',
        status: 'Available'
      });

      // Count available specified equipment (if any specified)
      let availableEquipmentCount = 0;
      if (equipmentCategory) {
        availableEquipmentCount = await Equipment.countDocuments({
          hospital: hosp._id,
          category: equipmentCategory,
          status: 'Available'
        });
      }

      suggestions.push({
        hospital: hosp,
        availableIcuBeds,
        availableEquipmentCount,
        score: availableIcuBeds + (equipmentCategory ? availableEquipmentCount : 0)
      });
    }

    // Sort by bed availability/score descending
    suggestions.sort((a, b) => b.score - a.score);

    res.json(suggestions);
  } catch (error) {
    next(error);
  }
};

// @desc    Initiate a transfer
// @route   POST /api/transfers
// @access  Private (Doctor/Nurse/Admin)
export const createTransfer = async (req, res, next) => {
  const { patient, targetHospital, reason } = req.body;

  try {
    const patientObj = await Patient.findById(patient);
    if (!patientObj) {
      res.status(404);
      throw new Error('Patient not found');
    }

    const transfer = await Transfer.create({
      patient,
      sourceHospital: req.user.hospital || patientObj.hospital,
      targetHospital,
      reason,
      requestedBy: req.user._id,
      status: 'Pending'
    });

    // Notify target hospital Admins/Doctors
    await Notification.create({
      hospital: targetHospital,
      title: 'Incoming Patient Transfer Request',
      message: `Transfer requested for patient ${patientObj.name}. Reason: ${reason}`,
      type: 'Transfer'
    });

    await logActivity(req.user._id, 'Transfer Requested', `Requested transfer of patient ${patientObj.name} to target hospital ${targetHospital}`, req);

    res.status(201).json(transfer);
  } catch (error) {
    next(error);
  }
};

// @desc    Update transfer status (Approve, Reject, Complete)
// @route   PUT /api/transfers/:id/status
// @access  Private (Admin/Doctor/Nurse)
export const updateTransferStatus = async (req, res, next) => {
  const { status } = req.body; // Approved, Rejected, Completed

  try {
    const transfer = await Transfer.findById(req.params.id).populate('patient sourceHospital targetHospital');
    if (!transfer) {
      res.status(404);
      throw new Error('Transfer not found');
    }

    // Check permissions (only target hospital can approve/reject/complete, or superadmin)
    if (req.user.role !== 'Super Admin' && String(transfer.targetHospital._id) !== String(req.user.hospital)) {
      res.status(403);
      throw new Error('Only the target hospital can manage this transfer request');
    }

    transfer.status = status;
    await transfer.save();

    // Notify source hospital about status change
    await Notification.create({
      hospital: transfer.sourceHospital._id,
      title: `Transfer Request ${status}`,
      message: `The transfer request for patient ${transfer.patient.name} has been ${status.toLowerCase()}`,
      type: 'Transfer'
    });

    // If completed, update patient hospital and release current bed/equipment
    if (status === 'Completed') {
      const patient = await Patient.findById(transfer.patient._id);

      // Release Bed at Source
      if (patient.assignedBed) {
        await Bed.findByIdAndUpdate(patient.assignedBed, {
          status: 'Cleaning',
          assignedPatient: null
        });
        patient.assignedBed = null;
      }

      // Release Equipment at Source
      if (patient.assignedEquipment && patient.assignedEquipment.length > 0) {
        await Equipment.updateMany(
          { _id: { $in: patient.assignedEquipment } },
          { status: 'Available', assignedPatient: null }
        );
        patient.assignedEquipment = [];
      }

      // Assign to target hospital and reset admission status for incoming intake
      patient.hospital = transfer.targetHospital._id;
      patient.status = 'Admission Pending';
      patient.assignedNurse = null;
      await patient.save();

      await logActivity(req.user._id, 'Transfer Completed', `Patient ${patient.name} successfully transferred to ${transfer.targetHospital.name}`, req);
    } else {
      await logActivity(req.user._id, `Transfer ${status}`, `Transfer request for ${transfer.patient.name} was ${status.toLowerCase()}`, req);
    }

    res.json(transfer);
  } catch (error) {
    next(error);
  }
};
