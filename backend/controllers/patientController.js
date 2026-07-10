import Patient from '../models/Patient.js';
import Bed from '../models/Bed.js';
import Equipment from '../models/Equipment.js';
import User from '../models/User.js';
import { logActivity } from '../utils/activityLogger.js';
import { logPatientActivity, calculateStayCharges, finalizeDischargeBilling, updateBillingTotals } from '../utils/billingHelper.js';
import Billing from '../models/Billing.js';
import PatientActivity from '../models/PatientActivity.js';

const dailyChecklist = [
  { shift: 'Morning', taskName: 'Medicine Given' },
  { shift: 'Morning', taskName: 'Breakfast Given' },
  { shift: 'Morning', taskName: 'BP Checked' },
  { shift: 'Morning', taskName: 'Temperature Checked' },
  { shift: 'Morning', taskName: 'Oxygen Level Checked' },
  { shift: 'Morning', taskName: 'Water Intake' },
  { shift: 'Afternoon', taskName: 'Lunch' },
  { shift: 'Afternoon', taskName: 'Injection' },
  { shift: 'Afternoon', taskName: 'Medicine' },
  { shift: 'Afternoon', taskName: 'BP' },
  { shift: 'Afternoon', taskName: 'Temperature' },
  { shift: 'Evening', taskName: 'Dinner' },
  { shift: 'Evening', taskName: 'Medicine' },
  { shift: 'Evening', taskName: 'Night Vitals' }
];

// @desc    Get all patients with search, filtering, pagination, sorting
// @route   GET /api/patients
// @access  Private
export const getPatients = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      assignedDoctor,
      assignedNurse,
      isCritical,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Scoped by hospital if not Super Admin
    if (req.user.role !== 'Super Admin') {
      query.hospital = req.user.hospital;
    }

    if (status) query.status = status;
    if (assignedDoctor) query.assignedDoctor = assignedDoctor;
    if (assignedNurse) query.assignedNurse = assignedNurse;
    if (isCritical !== undefined) query.isCritical = isCritical === 'true';

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } },
        { diagnosis: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skipIndex = (parseInt(page) - 1) * parseInt(limit);

    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .populate('hospital assignedDoctor assignedBed assignedEquipment assignedNurse')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skipIndex);

    const patientIds = patients.map(p => p._id);
    const billings = await Billing.find({ patient: { $in: patientIds } });
    const billingMap = billings.reduce((acc, b) => {
      acc[b.patient.toString()] = b.paymentStatus;
      return acc;
    }, {});

    const patientsWithBilling = patients.map(p => {
      const pObj = p.toObject();
      pObj.paymentStatus = billingMap[p._id.toString()] || 'Pending';
      return pObj;
    });

    res.json({
      patients: patientsWithBilling,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single patient
// @route   GET /api/patients/:id
// @access  Private
export const getPatientById = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'Super Admin') {
      query.hospital = req.user.hospital;
    }

    const patient = await Patient.findOne(query)
      .populate('hospital assignedDoctor assignedBed assignedEquipment assignedNurse');
    if (patient) {
      res.json(patient);
    } else {
      res.status(404);
      throw new Error('Patient not found or unauthorized');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Register a patient (Patient Admission Intake)
// @route   POST /api/patients
// @access  Private (Doctor/Nurse/Admin only)
export const admitPatient = async (req, res, next) => {
  const {
    name,
    age,
    gender,
    admissionNumber,
    diagnosis,
    assignedDoctor,
    hospital,
    patientType,
    assignedBed,
    assignedNurse,
    status
  } = req.body;

  try {
    let finalHospital = hospital;
    if (req.user.role !== 'Super Admin') {
      finalHospital = req.user.hospital;
    }

    if (!finalHospital) {
      res.status(400);
      throw new Error('Hospital is required');
    }

    // Check duplicate admissionNumber
    const duplicate = await Patient.findOne({ admissionNumber });
    if (duplicate) {
      res.status(400);
      throw new Error('Admission number already exists');
    }

    // Validation for Admitted status
    let bedObj = null;
    let nurseObj = null;
    const isAdmitting = status === 'Admitted';
    if (isAdmitting) {
      if (!assignedDoctor || !assignedNurse || !assignedBed) {
        res.status(400);
        throw new Error('Doctor, Nurse, and Bed must be assigned to admit the patient');
      }

      // Verify bed is available
      bedObj = await Bed.findById(assignedBed);
      if (!bedObj) {
        res.status(404);
        throw new Error('Assigned bed not found');
      }
      if (bedObj.status !== 'Available') {
        res.status(400);
        throw new Error('Assigned bed is not available');
      }

      // Verify nurse exists
      nurseObj = await User.findById(assignedNurse);
      if (!nurseObj || nurseObj.role !== 'Nurse') {
        res.status(400);
        throw new Error('Assigned nurse not found or invalid');
      }
    }

    // Create Patient
    const patientData = {
      name,
      age,
      gender,
      admissionNumber,
      diagnosis,
      assignedDoctor,
      hospital: finalHospital,
      status: status || 'Registered',
      patientType: patientType || (isAdmitting ? 'IP' : 'OP'),
      assignedBed: isAdmitting ? assignedBed : null,
      assignedNurse: isAdmitting ? assignedNurse : null,
      admissionDate: isAdmitting ? new Date() : null,
      nursingLogs: isAdmitting ? dailyChecklist : [],
      medicalTimeline: [{
        time: new Date(),
        event: isAdmitting ? 'Patient Registered & Admitted' : `Patient Registered (${patientType || 'OP'})`,
        userType: req.user.role,
        userName: req.user.name
      }]
    };

    const patient = await Patient.create(patientData);

    // If admitted, update bed status
    if (isAdmitting) {
      await Bed.findByIdAndUpdate(assignedBed, {
        status: 'Occupied',
        assignedPatient: patient._id
      });
    }

    // Create the billing registration activity
    await logPatientActivity({
      patientId: patient._id,
      performedBy: req.user._id,
      role: req.user.role,
      activityType: 'Registration',
      description: `Patient Registered (${patient.patientType})`,
      priceKey: 'registration_fee'
    });

    if (isAdmitting) {
      await logPatientActivity({
        patientId: patient._id,
        performedBy: req.user._id,
        role: req.user.role,
        activityType: 'Other',
        description: `Admission Approved & Bed Assigned (${bedObj.bedNumber})`,
        amount: 0,
        remarks: `Assigned Nurse: ${nurseObj.name}`
      });
    }

    await logActivity(req.user._id, 'Patient Registered', `Registered patient ${patient.name} (${patient.admissionNumber})`, req);

    res.status(201).json(patient);
  } catch (error) {
    next(error);
  }
};

// @desc    Update patient information
// @route   PUT /api/patients/:id
// @access  Private
export const updatePatient = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'Super Admin') {
      query.hospital = req.user.hospital;
    }

    const patient = await Patient.findOne(query);

    if (!patient) {
      res.status(404);
      throw new Error('Patient not found or unauthorized');
    }

    const oldStatus = patient.status;
    const oldBed = patient.assignedBed;
    const oldNurse = patient.assignedNurse;

    const newStatus = req.body.status !== undefined ? req.body.status : oldStatus;
    const newBed = req.body.assignedBed !== undefined ? req.body.assignedBed : oldBed;
    const newNurse = req.body.assignedNurse !== undefined ? req.body.assignedNurse : oldNurse;
    const newDoctor = req.body.assignedDoctor !== undefined ? req.body.assignedDoctor : patient.assignedDoctor;

    // Enforce validation for Admitted status
    if (newStatus === 'Admitted') {
      if (!newDoctor || !newNurse || !newBed) {
        res.status(400);
        throw new Error('Doctor, Nurse, and Bed must be assigned to admit the patient');
      }

      // Verify doctor role
      const docUser = await User.findById(newDoctor);
      if (!docUser || docUser.role !== 'Doctor') {
        res.status(400);
        throw new Error('Assigned doctor is invalid');
      }

      // Verify nurse role
      const nurseUser = await User.findById(newNurse);
      if (!nurseUser || nurseUser.role !== 'Nurse') {
        res.status(400);
        throw new Error('Assigned nurse is invalid');
      }

      // Handle Bed status transition if bed has changed or patient status is now Admitted
      if (oldStatus !== 'Admitted' || String(oldBed) !== String(newBed)) {
        // Verify new bed is available
        const targetBedObj = await Bed.findById(newBed);
        if (!targetBedObj) {
          res.status(404);
          throw new Error('Assigned bed not found');
        }
        if (targetBedObj.status !== 'Available') {
          res.status(400);
          throw new Error('Assigned bed is not available');
        }

        // Occupy the new bed
        targetBedObj.status = 'Occupied';
        targetBedObj.assignedPatient = patient._id;
        await targetBedObj.save();

        // Release the old bed if they were admitted and changing bed
        if (oldStatus === 'Admitted' && oldBed) {
          await Bed.findByIdAndUpdate(oldBed, {
            status: 'Available',
            assignedPatient: null
          });
        }
      }
    } else {
      // If patient status is changed FROM Admitted to something else (e.g. Discharged, Registered)
      if (oldStatus === 'Admitted' && newStatus !== 'Admitted') {
        // Release bed
        if (oldBed) {
          await Bed.findByIdAndUpdate(oldBed, {
            status: 'Available',
            assignedPatient: null
          });
        }
        // Release equipment
        if (patient.assignedEquipment?.length > 0) {
          await Equipment.updateMany(
            { _id: { $in: patient.assignedEquipment } },
            { status: 'Available', assignedPatient: null }
          );
          patient.assignedEquipment = [];
        }
      }
    }

    // Apply updates
    const fields = ['name', 'age', 'gender', 'diagnosis', 'assignedDoctor', 'assignedBed', 'assignedNurse', 'status', 'patientType', 'treatmentPlan', 'testsOrdered', 'followUpNotes'];
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        patient[field] = req.body[field];
      }
    });

    if (newStatus !== 'Admitted') {
      patient.assignedBed = null;
      patient.assignedNurse = null;
    }

    // Special fields handling on new admission
    if (oldStatus !== 'Admitted' && newStatus === 'Admitted') {
      patient.admissionDate = new Date();
      patient.nursingLogs = dailyChecklist;
      
      const nurseUser = await User.findById(newNurse);
      const bedObj = await Bed.findById(newBed);
      patient.medicalTimeline.push({
        time: new Date(),
        event: `Admission Approved via details update. Bed: ${bedObj.bedNumber}, Nurse: ${nurseUser.name}`,
        userType: req.user.role,
        userName: req.user.name
      });
      
      await logPatientActivity({
        patientId: patient._id,
        performedBy: req.user._id,
        role: req.user.role,
        activityType: 'Other',
        description: `Admission Approved & Bed Assigned (${bedObj.bedNumber})`,
        amount: 0,
        remarks: `Assigned Nurse: ${nurseUser.name}`
      });
    } else if (oldStatus === 'Admitted' && newStatus === 'Admitted') {
      // Timeline logging for changes during admission
      if (String(oldBed) !== String(newBed)) {
        const bedObj = await Bed.findById(newBed);
        patient.medicalTimeline.push({
          time: new Date(),
          event: `Bed Transfer. Assigned Bed: ${bedObj.bedNumber}`,
          userType: req.user.role,
          userName: req.user.name
        });
      }
      if (String(oldNurse) !== String(newNurse)) {
        const nurseUser = await User.findById(newNurse);
        patient.medicalTimeline.push({
          time: new Date(),
          event: `Nurse Assignment Changed. Assigned Nurse: ${nurseUser.name}`,
          userType: req.user.role,
          userName: req.user.name
        });
      }
    }

    const updatedPatient = await patient.save();
    res.json(updatedPatient);
  } catch (error) {
    next(error);
  }
};

// @desc    Doctor consultation (Updates clinical details, notes, prescriptions)
// @route   PUT /api/patients/:id/consult
// @access  Private (Doctor only)
export const consultPatient = async (req, res, next) => {
  const { diagnosis, clinicalNotes, prescription, isCritical, followUpDate, treatmentPlan, testsOrdered, followUpNotes } = req.body;

  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      res.status(404);
      throw new Error('Patient not found');
    }

    patient.diagnosis = diagnosis !== undefined ? diagnosis : patient.diagnosis;
    patient.clinicalNotes = clinicalNotes !== undefined ? clinicalNotes : patient.clinicalNotes;
    patient.prescription = prescription !== undefined ? prescription : patient.prescription;
    patient.isCritical = isCritical !== undefined ? isCritical : patient.isCritical;
    patient.followUpDate = followUpDate !== undefined ? followUpDate : patient.followUpDate;
    patient.treatmentPlan = treatmentPlan !== undefined ? treatmentPlan : patient.treatmentPlan;
    patient.testsOrdered = testsOrdered !== undefined ? testsOrdered : patient.testsOrdered;
    patient.followUpNotes = followUpNotes !== undefined ? followUpNotes : patient.followUpNotes;

    // Check if status is Registered -> update to Consulted (or keep active)
    if (patient.status === 'Registered') {
      // Just flag that a consultation happened
      patient.status = 'Registered'; // keeps journey aligned or updates
    }

    // Add consultation event to timeline
    patient.medicalTimeline.push({
      time: new Date(),
      event: `Doctor Consultation & Prescription Added ${isCritical ? '(Patient Critical)' : ''}`,
      userType: 'Doctor',
      userName: req.user.name
    });

    await patient.save();

    // Log the Doctor Consultation activity & billing
    await logPatientActivity({
      patientId: patient._id,
      performedBy: req.user._id,
      role: 'Doctor',
      activityType: 'Consultation',
      description: `Doctor Consultation & Prescription: ${patient.diagnosis || 'General Checkup'}`,
      priceKey: 'doctor_consultation',
      remarks: `Notes: ${patient.clinicalNotes || 'None'}. Follow-up: ${followUpDate || 'None'}`
    });

    await logActivity(req.user._id, 'Consultation Logged', `Logged consultation details for ${patient.name}`, req);

    res.json(patient);
  } catch (error) {
    next(error);
  }
};

// @desc    Doctor requests patient admission
// @route   PUT /api/patients/:id/request-admission
// @access  Private (Doctor only)
export const requestAdmission = async (req, res, next) => {
  const { needsIcu, requestedEquipmentType } = req.body;

  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      res.status(404);
      throw new Error('Patient not found');
    }

    patient.status = 'Admission Pending';
    patient.patientType = 'IP';
    patient.needsIcu = needsIcu === true;
    patient.requestedEquipmentType = requestedEquipmentType || '';

    patient.medicalTimeline.push({
      time: new Date(),
      event: `Admission Requested${needsIcu ? ' (ICU bed needed)' : ''}${requestedEquipmentType ? ` (Equipment: ${requestedEquipmentType} requested)` : ''}`,
      userType: 'Doctor',
      userName: req.user.name
    });

    await patient.save();

    await logPatientActivity({
      patientId: patient._id,
      performedBy: req.user._id,
      role: 'Doctor',
      activityType: 'Other',
      description: `Inpatient Admission Requested${needsIcu ? ' (ICU Bed Needed)' : ''}`,
      amount: 0,
      remarks: requestedEquipmentType ? `Requested Equipment: ${requestedEquipmentType}` : ''
    });

    await logActivity(req.user._id, 'Admission Requested', `Requested admission for patient ${patient.name}`, req);

    res.json(patient);
  } catch (error) {
    next(error);
  }
};

// @desc    Admin approves admission, assigns resources (Bed, Nurse, Equipment)
// @route   PUT /api/patients/:id/approve-admission
// @access  Private (Hospital Admin only)
export const approveAdmission = async (req, res, next) => {
  const { assignedBed, assignedEquipment = [], assignedNurse } = req.body;

  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      res.status(404);
      throw new Error('Patient not found');
    }

    if (!assignedBed || !assignedNurse) {
      res.status(400);
      throw new Error('Bed and Nurse assignments are required');
    }

    if (!patient.assignedDoctor) {
      res.status(400);
      throw new Error('Attending doctor must be assigned to admit the patient');
    }

    // Verify bed is available
    const bed = await Bed.findById(assignedBed);
    if (!bed) {
      res.status(404);
      throw new Error('Assigned bed not found');
    }
    if (bed.status !== 'Available') {
      res.status(400);
      throw new Error('Assigned bed is not available');
    }

    // Verify equipment is available
    if (assignedEquipment.length > 0) {
      const equipmentList = await Equipment.find({ _id: { $in: assignedEquipment } });
      for (const eq of equipmentList) {
        if (eq.status !== 'Available') {
          res.status(400);
          throw new Error(`Equipment ${eq.name} is not available`);
        }
      }
    }

    // Verify nurse exists
    const nurse = await User.findById(assignedNurse);
    if (!nurse || nurse.role !== 'Nurse') {
      res.status(400);
      throw new Error('Assigned nurse not found or invalid');
    }

    // Update Bed status
    bed.status = 'Occupied';
    bed.assignedPatient = patient._id;
    await bed.save();

    // Update Equipment statuses
    if (assignedEquipment.length > 0) {
      await Equipment.updateMany(
        { _id: { $in: assignedEquipment } },
        { status: 'Assigned', assignedPatient: patient._id }
      );
    }

    // Update Patient
    patient.status = 'Admitted';
    patient.assignedBed = assignedBed;
    patient.assignedEquipment = assignedEquipment;
    patient.assignedNurse = assignedNurse;
    patient.admissionDate = new Date();

    // Seed default daily nursing checklist tasks
    patient.nursingLogs = dailyChecklist;

    patient.medicalTimeline.push({
      time: new Date(),
      event: `Admission Approved. Assigned Bed: ${bed.bedNumber}, Assigned Nurse: ${nurse.name}`,
      userType: 'Hospital Admin',
      userName: req.user.name
    });

    await patient.save();

    await logPatientActivity({
      patientId: patient._id,
      performedBy: req.user._id,
      role: 'Hospital Admin',
      activityType: 'Other',
      description: `Admission Approved & Bed Assigned (${bed.bedNumber})`,
      amount: 0,
      remarks: `Assigned Nurse: ${nurse.name}. Assigned Equipment Count: ${assignedEquipment.length}`
    });

    await logActivity(req.user._id, 'Admission Approved', `Approved admission for ${patient.name}. Bed: ${bed.bedNumber}`, req);

    res.json(patient);
  } catch (error) {
    next(error);
  }
};

// @desc    Nurse records vitals
// @route   PUT /api/patients/:id/vitals
// @access  Private (Nurse only)
export const logVitals = async (req, res, next) => {
  const { bloodPressure, heartRate, temperature, spo2, respirationRate, weight } = req.body;

  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      res.status(404);
      throw new Error('Patient not found');
    }

    const vitalsRecord = {
      bloodPressure,
      heartRate: Number(heartRate),
      temperature: Number(temperature),
      spo2: Number(spo2),
      respirationRate: Number(respirationRate),
      weight: Number(weight),
      recordedAt: new Date(),
      nurseName: req.user.name
    };

    patient.vitalsHistory.push(vitalsRecord);

    patient.medicalTimeline.push({
      time: new Date(),
      event: `Vitals Logged: BP ${bloodPressure || 'N/A'}, HR ${heartRate || 'N/A'}, Temp ${temperature || 'N/A'}°C, SpO2 ${spo2 || 'N/A'}%`,
      userType: 'Nurse',
      userName: req.user.name
    });

    await patient.save();

    // Log the automatic vitals checks billing
    if (bloodPressure) {
      await logPatientActivity({
        patientId: patient._id,
        performedBy: req.user._id,
        role: 'Nurse',
        activityType: 'Vitals Check',
        description: `Blood Pressure Checked: ${bloodPressure}`,
        priceKey: 'bp_check'
      });
    }
    if (temperature) {
      await logPatientActivity({
        patientId: patient._id,
        performedBy: req.user._id,
        role: 'Nurse',
        activityType: 'Vitals Check',
        description: `Temperature Checked: ${temperature}°C`,
        priceKey: 'temp_check'
      });
    }
    if (spo2) {
      await logPatientActivity({
        patientId: patient._id,
        performedBy: req.user._id,
        role: 'Nurse',
        activityType: 'Vitals Check',
        description: `SpO2 Oxygen Checked: ${spo2}%`,
        priceKey: 'spo2_check'
      });
    }

    await logActivity(req.user._id, 'Vitals Logged', `Logged vitals for patient ${patient.name}`, req);

    res.json(patient);
  } catch (error) {
    next(error);
  }
};

// @desc    Nurse logs shift observations / notes
// @route   PUT /api/patients/:id/nurse-notes
// @access  Private (Nurse only)
export const logNurseNote = async (req, res, next) => {
  const { note } = req.body;

  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      res.status(404);
      throw new Error('Patient not found');
    }

    patient.nurseNotes.push({
      note,
      recordedAt: new Date(),
      nurseName: req.user.name
    });

    patient.medicalTimeline.push({
      time: new Date(),
      event: `Nurse Observation Added: "${note}"`,
      userType: 'Nurse',
      userName: req.user.name
    });

    await patient.save();
    await logActivity(req.user._id, 'Nurse Note Added', `Logged observations note for patient ${patient.name}`, req);

    res.json(patient);
  } catch (error) {
    next(error);
  }
};

// @desc    Nurse logs completed checklist tasks
// @route   PUT /api/patients/:id/nursing-task
// @access  Private (Nurse only)
export const updateNursingTask = async (req, res, next) => {
  const { taskId, completed, notes } = req.body;

  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      res.status(404);
      throw new Error('Patient not found');
    }

    const task = patient.nursingLogs.id(taskId);
    if (!task) {
      res.status(404);
      throw new Error('Checklist task not found');
    }

    task.completed = completed;
    task.completedAt = completed ? new Date() : null;
    task.nurseName = req.user.name;
    task.notes = notes || '';

    if (completed) {
      patient.medicalTimeline.push({
        time: new Date(),
        event: `Task Completed: ${task.taskName} (${task.shift} shift)`,
        userType: 'Nurse',
        userName: req.user.name
      });

      // Map task name to automatic billing
      let priceKey = null;
      let activityType = 'Other';
      let actDesc = `Checklist Task Completed: ${task.taskName}`;

      const nameLower = task.taskName.toLowerCase();
      if (nameLower.includes('breakfast')) {
        priceKey = 'breakfast';
        activityType = 'Food';
        actDesc = 'Breakfast Served';
      } else if (nameLower.includes('lunch')) {
        priceKey = 'lunch';
        activityType = 'Food';
        actDesc = 'Lunch Served';
      } else if (nameLower.includes('dinner')) {
        priceKey = 'dinner';
        activityType = 'Food';
        actDesc = 'Dinner Served';
      } else if (nameLower.includes('bp') || nameLower.includes('pressure')) {
        priceKey = 'bp_check';
        activityType = 'Vitals Check';
        actDesc = 'Blood Pressure Checked';
      } else if (nameLower.includes('temp')) {
        priceKey = 'temp_check';
        activityType = 'Vitals Check';
        actDesc = 'Temperature Checked';
      } else if (nameLower.includes('oxygen') || nameLower.includes('spo2')) {
        priceKey = 'spo2_check';
        activityType = 'Vitals Check';
        actDesc = 'SpO2 Checked';
      } else if (nameLower.includes('medicine')) {
        priceKey = 'medicine';
        activityType = 'Medicine';
        actDesc = 'Medicine Administered';
      } else if (nameLower.includes('injection')) {
        priceKey = 'injection';
        activityType = 'Medicine';
        actDesc = 'Injection Administered';
      }

      // Check for dynamic numeric pricing in the notes (e.g. "Charged 150") for Medicine and Injection
      let amountVal = undefined;
      if (activityType === 'Medicine' || activityType === 'Injection') {
        const matches = notes && notes.match(/\b\d+\b/);
        if (matches) {
          amountVal = Number(matches[0]);
        } else {
          amountVal = nameLower.includes('injection') ? 150 : 50; // default fallbacks
        }
      }

      await logPatientActivity({
        patientId: patient._id,
        performedBy: req.user._id,
        role: 'Nurse',
        activityType,
        description: actDesc,
        priceKey,
        amount: amountVal,
        remarks: notes || `Shift: ${task.shift}`
      });
    }

    await patient.save();
    res.json(patient);
  } catch (error) {
    next(error);
  }
};

// @desc    Discharge patient (release bed to Cleaning and equipment to Available)
// @route   PUT /api/patients/:id/discharge
// @access  Private (Doctor/Admin/Nurse only)
export const dischargePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      res.status(404);
      throw new Error('Patient not found');
    }

    if (patient.status === 'Discharged') {
      res.status(400);
      throw new Error('Patient is already discharged');
    }

    // Populate stay details to calculate final bed and equipment stay charges
    await patient.populate('assignedBed assignedEquipment');

    // Freeze stay charges as permanent billing activities and auto-generate invoice sequence
    await finalizeDischargeBilling(patient, req.user._id, req.user.role);

    // Release Bed
    if (patient.assignedBed) {
      await Bed.findByIdAndUpdate(patient.assignedBed, {
        status: 'Cleaning',
        assignedPatient: null
      });
      patient.assignedBed = null;
    }

    // Release Equipment
    if (patient.assignedEquipment?.length > 0) {
      await Equipment.updateMany(
        { _id: { $in: patient.assignedEquipment } },
        { status: 'Available', assignedPatient: null }
      );
      patient.assignedEquipment = [];
    }

    patient.status = 'Discharged';
    patient.dischargeDate = new Date();

    patient.medicalTimeline.push({
      time: new Date(),
      event: 'Patient Discharged',
      userType: req.user.role,
      userName: req.user.name
    });

    const updatedPatient = await patient.save();

    await logActivity(req.user._id, 'Patient Discharged', `Discharged patient ${updatedPatient.name}`, req);

    res.json(updatedPatient);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete patient record
// @route   DELETE /api/patients/:id
// @access  Private (Admin only)
export const deletePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      res.status(404);
      throw new Error('Patient not found');
    }

    // Release resources first if admitted
    if (patient.status === 'Admitted') {
      if (patient.assignedBed) {
        await Bed.findByIdAndUpdate(patient.assignedBed, {
          status: 'Available',
          assignedPatient: null
        });
      }
      if (patient.assignedEquipment?.length > 0) {
        await Equipment.updateMany(
          { _id: { $in: patient.assignedEquipment } },
          { status: 'Available', assignedPatient: null }
        );
      }
    }

    await patient.deleteOne();
    await logActivity(req.user._id, 'Patient Record Deleted', `Deleted patient record of ${patient.name}`, req);

    res.json({ message: 'Patient record removed' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get patient billing information (dynamic breakdown & stay overlay)
// @route   GET /api/patients/:id/billing
// @access  Private
export const getPatientBilling = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('assignedBed')
      .populate('assignedEquipment');
      
    if (!patient) {
      res.status(404);
      throw new Error('Patient not found');
    }

    let billing = await Billing.findOne({ patient: patient._id }).populate({
      path: 'activities',
      populate: { path: 'performedBy', select: 'name' }
    });

    if (!billing) {
      billing = await Billing.create({
        patient: patient._id,
        activities: [],
        paymentStatus: 'Pending'
      });
    }

    // Dynamic stay calculations if currently admitted
    let stayDetails = null;
    if (patient.status === 'Admitted' && patient.admissionDate) {
      stayDetails = await calculateStayCharges(patient);
    }

    res.json({
      billing,
      stayDetails,
      patientStatus: patient.status,
      admissionDate: patient.admissionDate,
      dischargeDate: patient.dischargeDate
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate / Finalize billing (discharge invoice sequence)
// @route   POST /api/patients/:id/billing/discharge
// @access  Private (Admin / Reception Staff)
export const finalizeBilling = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('assignedBed')
      .populate('assignedEquipment');

    if (!patient) {
      res.status(404);
      throw new Error('Patient not found');
    }

    let billing = await Billing.findOne({ patient: patient._id });
    if (billing && billing.invoiceNumber) {
      return res.json(billing); // already finalized
    }

    const updatedBilling = await finalizeDischargeBilling(patient, req.user._id, req.user.role);
    res.json(updatedBilling);
  } catch (error) {
    next(error);
  }
};

// @desc    Log billing payments
// @route   PUT /api/patients/:id/billing/pay
// @access  Private (Admin / Reception Staff)
export const payBilling = async (req, res, next) => {
  const { amount, status } = req.body;

  try {
    const billing = await Billing.findOne({ patient: req.params.id });
    if (!billing) {
      res.status(404);
      throw new Error('Billing record not found');
    }

    if (amount !== undefined) {
      const payAmt = Number(amount);
      billing.paidAmount += payAmt;
      billing.pendingAmount = Math.max(0, billing.totalAmount - billing.paidAmount);
    }
    
    if (status && ['Paid', 'Pending', 'Partially Paid'].includes(status)) {
      billing.paymentStatus = status;
    } else {
      if (billing.pendingAmount === 0 && billing.totalAmount > 0) {
        billing.paymentStatus = 'Paid';
      } else if (billing.paidAmount > 0 && billing.pendingAmount > 0) {
        billing.paymentStatus = 'Partially Paid';
      } else {
        billing.paymentStatus = 'Pending';
      }
    }

    await billing.save();
    res.json(billing);
  } catch (error) {
    next(error);
  }
};

// @desc    Get patient activity timeline
// @route   GET /api/patients/:id/activities
// @access  Private
export const getPatientActivities = async (req, res, next) => {
  try {
    const activities = await PatientActivity.find({ patient: req.params.id })
      .populate('performedBy', 'name email')
      .sort({ date: -1, createdAt: -1 });

    res.json(activities);
  } catch (error) {
    next(error);
  }
};

// @desc    Create manual / custom activity entry
// @route   POST /api/patients/:id/activities
// @access  Private
export const createCustomActivity = async (req, res, next) => {
  const { activityType, description, amount, remarks, priceKey } = req.body;

  try {
    const activity = await logPatientActivity({
      patientId: req.params.id,
      performedBy: req.user._id,
      role: req.user.role,
      activityType,
      description,
      priceKey,
      amount: amount !== undefined ? Number(amount) : undefined,
      remarks: remarks || '',
      isExtraCharge: true // Flag manually added extra charges
    });

    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a manually added extra charge
// @route   DELETE /api/patients/:id/activities/:activityId
// @access  Private
export const deleteCustomActivity = async (req, res, next) => {
  try {
    const activity = await PatientActivity.findById(req.params.activityId);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    if (!activity.isExtraCharge) {
      return res.status(403).json({ message: 'Only manually added extra charges can be removed.' });
    }

    // Remove reference from Billing
    const billing = await Billing.findOne({ patient: req.params.id });
    if (billing) {
      billing.activities = billing.activities.filter(actId => actId.toString() !== req.params.activityId);
      await billing.save();
    }

    await PatientActivity.findByIdAndDelete(req.params.activityId);

    // Refresh totals
    await updateBillingTotals(req.params.id);

    res.json({ message: 'Extra charge removed successfully' });
  } catch (error) {
    next(error);
  }
};
