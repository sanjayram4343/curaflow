import Reservation from '../models/Reservation.js';
import Bed from '../models/Bed.js';
import Equipment from '../models/Equipment.js';
import Notification from '../models/Notification.js';
import { logActivity } from '../utils/activityLogger.js';

// @desc    Get all reservations
// @route   GET /api/reservations
// @access  Private
export const getReservations = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role !== 'Super Admin') {
      query.hospital = req.user.hospital;
    }

    const reservations = await Reservation.find(query)
      .populate('reserver bed equipment hospital')
      .sort({ createdAt: -1 });

    res.json(reservations);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a reservation
// @route   POST /api/reservations
// @access  Private (Staff/Nurse/Doctor/Admin)
export const createReservation = async (req, res, next) => {
  const { itemType, bed, equipment, startDate, endDate, hospital } = req.body;

  try {
    let finalHospital = hospital;
    if (req.user.role !== 'Super Admin') {
      finalHospital = req.user.hospital;
    }

    if (!finalHospital) {
      res.status(400);
      throw new Error('Hospital is required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      res.status(400);
      throw new Error('Start date must be before end date');
    }

    if (itemType === 'Bed') {
      if (!bed) {
        res.status(400);
        throw new Error('Bed ID is required for bed reservation');
      }

      // Check double booking: overlap of active reservations
      const overlap = await Reservation.findOne({
        itemType: 'Bed',
        bed,
        status: 'Active',
        startDate: { $lt: end },
        endDate: { $gt: start }
      });

      if (overlap) {
        res.status(400);
        throw new Error('This bed is already reserved during the requested time period');
      }

      // Verify bed exists
      const bedObj = await Bed.findById(bed);
      if (!bedObj) {
        res.status(404);
        throw new Error('Bed not found');
      }

      // Create reservation
      const reservation = await Reservation.create({
        reserver: req.user._id,
        hospital: finalHospital,
        itemType: 'Bed',
        bed,
        startDate: start,
        endDate: end,
        status: 'Active'
      });

      // Update bed status to Reserved
      await Bed.findByIdAndUpdate(bed, { status: 'Reserved' });

      // Create Notification
      await Notification.create({
        hospital: finalHospital,
        title: 'New Bed Reservation',
        message: `Bed ${bedObj.bedNumber} has been reserved from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
        type: 'Reservation'
      });

      await logActivity(req.user._id, 'Bed Reserved', `Reserved bed ${bedObj.bedNumber} from ${startDate} to ${endDate}`, req);
      res.status(201).json(reservation);

    } else if (itemType === 'Equipment') {
      if (!equipment) {
        res.status(400);
        throw new Error('Equipment ID is required for equipment reservation');
      }

      // Check double booking: overlap of active reservations
      const overlap = await Reservation.findOne({
        itemType: 'Equipment',
        equipment,
        status: 'Active',
        startDate: { $lt: end },
        endDate: { $gt: start }
      });

      if (overlap) {
        res.status(400);
        throw new Error('This equipment is already reserved during the requested time period');
      }

      // Verify equipment exists
      const eqObj = await Equipment.findById(equipment);
      if (!eqObj) {
        res.status(404);
        throw new Error('Equipment not found');
      }

      // Create reservation
      const reservation = await Reservation.create({
        reserver: req.user._id,
        hospital: finalHospital,
        itemType: 'Equipment',
        equipment,
        startDate: start,
        endDate: end,
        status: 'Active'
      });

      // Update equipment status to Reserved
      await Equipment.findByIdAndUpdate(equipment, { status: 'Reserved' });

      // Create Notification
      await Notification.create({
        hospital: finalHospital,
        title: 'New Equipment Reservation',
        message: `Equipment ${eqObj.name} (${eqObj.serialNumber}) has been reserved from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
        type: 'Reservation'
      });

      await logActivity(req.user._id, 'Equipment Reserved', `Reserved equipment ${eqObj.name} from ${startDate} to ${endDate}`, req);
      res.status(201).json(reservation);
    } else {
      res.status(400);
      throw new Error('Invalid reservation item type');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a reservation
// @route   PUT /api/reservations/:id/cancel
// @access  Private (Staff/Nurse/Doctor/Admin)
export const cancelReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      res.status(404);
      throw new Error('Reservation not found');
    }

    if (reservation.status !== 'Active') {
      res.status(400);
      throw new Error('Reservation is not active and cannot be cancelled');
    }

    reservation.status = 'Cancelled';
    await reservation.save();

    // Release Bed or Equipment
    if (reservation.itemType === 'Bed') {
      await Bed.findByIdAndUpdate(reservation.bed, { status: 'Available' });
    } else if (reservation.itemType === 'Equipment') {
      await Equipment.findByIdAndUpdate(reservation.equipment, { status: 'Available' });
    }

    // Create Notification
    await Notification.create({
      hospital: reservation.hospital,
      title: 'Reservation Cancelled',
      message: `A reservation for a ${reservation.itemType} has been cancelled`,
      type: 'Reservation'
    });

    await logActivity(req.user._id, 'Reservation Cancelled', `Cancelled reservation ${reservation._id}`, req);

    res.json(reservation);
  } catch (error) {
    next(error);
  }
};
