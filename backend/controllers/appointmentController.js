import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import { logActivity } from '../utils/activityLogger.js';

// @desc    Create appointment
// @route   POST /api/appointments
// @access  Private (Admin / Reception Staff)
export const createAppointment = async (req, res, next) => {
  const { patientId, doctorId, appointmentDate, timeSlot, type, reason } = req.body;

  try {
    const patient = await Patient.findById(patientId);
    if (!patient) {
      res.status(404);
      throw new Error('Patient not found');
    }

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'Doctor') {
      res.status(400);
      throw new Error('Invalid doctor assigned');
    }

    const appointment = await Appointment.create({
      patient: patientId,
      doctor: doctorId,
      hospital: req.user.role === 'Super Admin' ? patient.hospital : req.user.hospital,
      appointmentDate: new Date(appointmentDate),
      timeSlot,
      type: type || 'OP',
      reason: reason || ''
    });

    await logActivity(
      req.user._id, 
      'Appointment Scheduled', 
      `Scheduled appointment for ${patient.name} with Dr. ${doctor.name} on ${appointmentDate}`, 
      req
    );

    res.status(201).json(appointment);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private
export const getAppointments = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role !== 'Super Admin') {
      query.hospital = req.user.hospital;
    }

    // Filter by doctor
    if (req.query.doctor) {
      query.doctor = req.query.doctor;
    }

    // Filter by date
    if (req.query.date) {
      const searchDate = new Date(req.query.date);
      const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));
      query.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const appointments = await Appointment.find(query)
      .populate('patient', 'name admissionNumber age gender')
      .populate('doctor', 'name email')
      .sort({ appointmentDate: 1, timeSlot: 1 });

    res.json(appointments);
  } catch (error) {
    next(error);
  }
};

// @desc    Update appointment status
// @route   PUT /api/appointments/:id/status
// @access  Private
export const updateAppointmentStatus = async (req, res, next) => {
  const { status } = req.body;

  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      res.status(404);
      throw new Error('Appointment not found');
    }

    // Check hospital tenant boundary
    if (req.user.role !== 'Super Admin' && String(appointment.hospital) !== String(req.user.hospital)) {
      res.status(403);
      throw new Error('Access denied to other hospital data');
    }

    appointment.status = status;
    await appointment.save();

    await logActivity(req.user._id, 'Appointment Updated', `Updated appointment status to ${status}`, req);

    res.json(appointment);
  } catch (error) {
    next(error);
  }
};
