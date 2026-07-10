import mongoose from 'mongoose';

const patientActivitySchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    required: true
  },
  activityType: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  time: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    default: 0
  },
  remarks: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Active', 'Cancelled', 'Discharged'],
    default: 'Active'
  },
  isExtraCharge: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const PatientActivity = mongoose.model('PatientActivity', patientActivitySchema);
export default PatientActivity;
