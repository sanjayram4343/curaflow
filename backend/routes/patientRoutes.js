import express from 'express';
import {
  getPatients,
  getPatientById,
  admitPatient,
  updatePatient,
  dischargePatient,
  deletePatient,
  consultPatient,
  requestAdmission,
  approveAdmission,
  logVitals,
  logNurseNote,
  updateNursingTask,
  getPatientBilling,
  finalizeBilling,
  payBilling,
  getPatientActivities,
  createCustomActivity,
  deleteCustomActivity,
} from '../controllers/patientController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getPatients)
  .post(protect, authorizeRoles('Super Admin', 'Hospital Admin', 'Doctor', 'Nurse', 'Reception Staff'), admitPatient);

router.route('/:id')
  .get(protect, getPatientById)
  .put(protect, authorizeRoles('Super Admin', 'Hospital Admin', 'Doctor', 'Nurse', 'Reception Staff'), updatePatient)
  .delete(protect, authorizeRoles('Super Admin', 'Hospital Admin'), deletePatient);

router.put('/:id/consult', protect, authorizeRoles('Doctor'), consultPatient);
router.put('/:id/request-admission', protect, authorizeRoles('Doctor'), requestAdmission);
router.put('/:id/approve-admission', protect, authorizeRoles('Hospital Admin'), approveAdmission);

router.put('/:id/vitals', protect, authorizeRoles('Nurse'), logVitals);
router.put('/:id/nurse-notes', protect, authorizeRoles('Nurse'), logNurseNote);
router.put('/:id/nursing-task', protect, authorizeRoles('Nurse'), updateNursingTask);

router.put('/:id/discharge', protect, authorizeRoles('Super Admin', 'Hospital Admin', 'Doctor', 'Nurse', 'Reception Staff'), dischargePatient);

// Billing & Activity Timeline endpoints
router.get('/:id/billing', protect, getPatientBilling);
router.post('/:id/billing/discharge', protect, authorizeRoles('Super Admin', 'Hospital Admin', 'Reception Staff'), finalizeBilling);
router.put('/:id/billing/pay', protect, authorizeRoles('Super Admin', 'Hospital Admin', 'Reception Staff'), payBilling);

router.get('/:id/activities', protect, getPatientActivities);
router.post('/:id/activities', protect, createCustomActivity);
router.delete('/:id/activities/:activityId', protect, authorizeRoles('Super Admin', 'Hospital Admin', 'Reception Staff'), deleteCustomActivity);

export default router;
