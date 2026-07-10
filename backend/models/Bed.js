import mongoose from 'mongoose';

const bedSchema = new mongoose.Schema({
  bedNumber: {
    type: String,
    required: true,
    trim: true,
  },
  ward: {
    type: String,
    required: true,
    trim: true,
  },
  room: {
    type: String,
    required: true,
    trim: true,
  },
  floor: {
    type: Number,
    required: true,
  },
  bedType: {
    type: String,
    enum: ['General', 'ICU', 'Emergency', 'Ventilator'],
    required: true,
  },
  status: {
    type: String,
    enum: ['Available', 'Occupied', 'Reserved', 'Cleaning'],
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

// Ensure bedNumber is unique per hospital
bedSchema.index({ hospital: 1, bedNumber: 1 }, { unique: true });

const Bed = mongoose.model('Bed', bedSchema);
export default Bed;
