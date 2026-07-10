import Bed from '../models/Bed.js';
import Equipment from '../models/Equipment.js';
import Patient from '../models/Patient.js';
import Reservation from '../models/Reservation.js';
import Transfer from '../models/Transfer.js';
import Maintenance from '../models/Maintenance.js';
import Department from '../models/Department.js';
import Appointment from '../models/Appointment.js';
import Billing from '../models/Billing.js';

// @desc    Get dashboard summary counters
// @route   GET /api/reports/dashboard
// @access  Private
export const getDashboardSummary = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role !== 'Super Admin') {
      query.hospital = req.user.hospital;
    }

    // Beds counts
    const totalBeds = await Bed.countDocuments(query);
    const availableBeds = await Bed.countDocuments({ ...query, status: 'Available' });
    const occupiedBeds = await Bed.countDocuments({ ...query, status: 'Occupied' });
    const icuBeds = await Bed.countDocuments({ ...query, bedType: 'ICU' });
    const icuBedsAvailable = await Bed.countDocuments({ ...query, bedType: 'ICU', status: 'Available' });

    // Equipment counts
    const totalEquipment = await Equipment.countDocuments(query);
    const availableEquipment = await Equipment.countDocuments({ ...query, status: 'Available' });
    const maintenanceEquipment = await Equipment.countDocuments({ ...query, status: 'Maintenance' });

    // Patient count
    const activePatients = await Patient.countDocuments({ ...query, status: 'Admitted' });

    // Reservations
    const activeReservations = await Reservation.countDocuments({ ...query, status: 'Active' });

    // Transfers (either source or target for the hospital)
    let transferQuery = {};
    if (req.user.role !== 'Super Admin') {
      transferQuery.$or = [
        { sourceHospital: req.user.hospital },
        { targetHospital: req.user.hospital }
      ];
    }
    const totalTransfers = await Transfer.countDocuments(transferQuery);
    const pendingTransfers = await Transfer.countDocuments({ ...transferQuery, status: 'Pending' });

    // Maintenance requests
    let maintenanceQuery = {};
    if (req.user.role !== 'Super Admin') {
      const hospitalEquipment = await Equipment.find({ hospital: req.user.hospital }).select('_id');
      maintenanceQuery.equipment = { $in: hospitalEquipment.map(e => e._id) };
    }
    const activeMaintenance = await Maintenance.countDocuments({ ...maintenanceQuery, status: { $ne: 'Completed' } });

    res.json({
      beds: {
        total: totalBeds,
        available: availableBeds,
        occupied: occupiedBeds,
        icuTotal: icuBeds,
        icuAvailable: icuBedsAvailable,
      },
      equipment: {
        total: totalEquipment,
        available: availableEquipment,
        maintenance: maintenanceEquipment
      },
      activePatients,
      activeReservations,
      transfers: {
        total: totalTransfers,
        pending: pendingTransfers
      },
      maintenance: {
        active: activeMaintenance
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed analytical report data for charts
// @route   GET /api/reports/analytics
// @access  Private
export const getAnalyticsData = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role !== 'Super Admin') {
      query.hospital = req.user.hospital;
    }

    // 1. Bed status aggregation
    const bedStatusData = await Bed.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 2. Equipment utilization status aggregation
    const equipmentStatusData = await Equipment.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 3. Department utilization aggregation (beds count per department)
    const departments = await Department.find(query).populate('hospital');
    const departmentUtilization = [];
    for (const dept of departments) {
      const bedsCount = await Bed.countDocuments({ department: dept._id });
      const occupiedCount = await Bed.countDocuments({ department: dept._id, status: 'Occupied' });
      const equipCount = await Equipment.countDocuments({ department: dept._id });

      departmentUtilization.push({
        department: dept.name,
        code: dept.code,
        totalBeds: bedsCount,
        occupiedBeds: occupiedCount,
        totalEquipment: equipCount
      });
    }

    // 4. Transfers stats (by month or total count by status)
    let transferQuery = {};
    if (req.user.role !== 'Super Admin') {
      transferQuery.$or = [
        { sourceHospital: req.user.hospital },
        { targetHospital: req.user.hospital }
      ];
    }
    const transferStats = await Transfer.aggregate([
      { $match: transferQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 5. Maintenance status breakdown
    let maintenanceQuery = {};
    if (req.user.role !== 'Super Admin') {
      const hospitalEquipment = await Equipment.find({ hospital: req.user.hospital }).select('_id');
      maintenanceQuery.equipment = { $in: hospitalEquipment.map(e => e._id) };
    }
    const maintenanceStats = await Maintenance.aggregate([
      { $match: maintenanceQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      bedStatus: bedStatusData.map(d => ({ name: d._id, value: d.count })),
      equipmentStatus: equipmentStatusData.map(d => ({ name: d._id, value: d.count })),
      departmentUtilization,
      transfers: transferStats.map(d => ({ status: d._id, count: d.count })),
      maintenance: maintenanceStats.map(d => ({ status: d._id, count: d.count }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get receptionist dashboard summary statistics
// @route   GET /api/reports/reception
// @access  Private
export const getReceptionSummary = async (req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const query = {};
    if (req.user.role !== 'Super Admin') {
      query.hospital = req.user.hospital;
    }

    // Registrations count today
    const todayRegistrations = await Patient.countDocuments({
      ...query,
      createdAt: { $gte: startOfToday, $lte: endOfToday }
    });

    // Admissions count today
    const todayAdmissions = await Patient.countDocuments({
      ...query,
      admissionDate: { $gte: startOfToday, $lte: endOfToday }
    });

    // Discharges count today
    const todayDischarges = await Patient.countDocuments({
      ...query,
      dischargeDate: { $gte: startOfToday, $lte: endOfToday }
    });

    // Appointments count today
    const appointmentsToday = await Appointment.countDocuments({
      ...query,
      appointmentDate: { $gte: startOfToday, $lte: endOfToday }
    });

    // Billing queries
    let billingQuery = {};
    if (req.user.role !== 'Super Admin') {
      const patientIds = await Patient.find({ hospital: req.user.hospital }).select('_id');
      billingQuery.patient = { $in: patientIds.map(p => p._id) };
    }

    const pendingBillsList = await Billing.find({ ...billingQuery, paymentStatus: 'Pending' });
    const pendingCount = pendingBillsList.length;
    const pendingSum = pendingBillsList.reduce((acc, b) => acc + (b.pendingAmount || 0), 0);

    const paidBillsList = await Billing.find({ ...billingQuery, paymentStatus: 'Paid' });
    const paidCount = paidBillsList.length;
    const paidSum = paidBillsList.reduce((acc, b) => acc + (b.paidAmount || 0), 0);

    // Recent patients
    const recentPatients = await Patient.find(query)
      .populate('assignedDoctor', 'name')
      .populate('assignedBed', 'bedNumber ward')
      .sort({ createdAt: -1 })
      .limit(8);

    res.json({
      todayRegistrations,
      todayAdmissions,
      todayDischarges,
      appointmentsToday,
      billing: {
        pendingCount,
        pendingSum,
        paidCount,
        paidSum
      },
      recentPatients
    });
  } catch (error) {
    next(error);
  }
};
