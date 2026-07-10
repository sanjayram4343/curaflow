import mongoose from 'mongoose';

const equipmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: [
      'Oxygen Cylinder',
      'Wheelchair',
      'Ventilator',
      'ECG Machine',
      'Defibrillator',
      'Infusion Pump',
      'Monitor'
    ],
    required: true,
  },
  serialNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Available', 'Reserved', 'Assigned', 'Maintenance', 'Broken'],
    default: 'Available',
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
  },
  assignedPatient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    default: null,
  }
}, {
  timestamps: true
});

const Equipment = mongoose.model('Equipment', equipmentSchema);
export default Equipment;
