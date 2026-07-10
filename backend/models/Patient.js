import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  age: {
    type: Number,
    required: true,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true,
  },
  admissionNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  diagnosis: {
    type: String,
    trim: true,
  },
  admissionDate: {
    type: Date,
    default: null,
  },
  dischargeDate: {
    type: Date,
    default: null,
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true,
  },
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignedBed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bed',
    default: null,
  },
  assignedEquipment: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment'
  }],
  status: {
    type: String,
    enum: ['Registered', 'Admission Pending', 'Admitted', 'Discharged'],
    default: 'Registered',
  },
  patientType: {
    type: String,
    enum: ['OP', 'IP'],
    default: 'OP',
  },
  // Refactored EMR/Workflow fields
  clinicalNotes: {
    type: String,
    default: '',
  },
  prescription: {
    type: String,
    default: '',
  },
  treatmentPlan: {
    type: String,
    default: '',
  },
  testsOrdered: {
    type: String,
    default: '',
  },
  followUpNotes: {
    type: String,
    default: '',
  },
  isCritical: {
    type: Boolean,
    default: false,
  },
  needsIcu: {
    type: Boolean,
    default: false,
  },
  requestedEquipmentType: {
    type: String,
    default: '',
  },
  assignedNurse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  followUpDate: {
    type: Date,
    default: null,
  },
  vitalsHistory: [{
    bloodPressure: String,
    heartRate: Number,
    temperature: Number,
    spo2: Number,
    respirationRate: Number,
    weight: Number,
    recordedAt: {
      type: Date,
      default: Date.now,
    },
    nurseName: String,
  }],
  nurseNotes: [{
    note: String,
    recordedAt: {
      type: Date,
      default: Date.now,
    },
    nurseName: String,
  }],
  nursingLogs: [{
    shift: {
      type: String,
      enum: ['Morning', 'Afternoon', 'Evening'],
    },
    taskName: String,
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: Date,
    nurseName: String,
    notes: String,
  }],
  medicalTimeline: [{
    time: {
      type: Date,
      default: Date.now,
    },
    event: String,
    userType: String,
    userName: String,
  }],
}, {
  timestamps: true
});

const Patient = mongoose.model('Patient', patientSchema);
export default Patient;
