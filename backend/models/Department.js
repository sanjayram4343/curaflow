import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true,
  },
  code: {
    type: String,
    required: true,
    trim: true,
  }
}, {
  timestamps: true
});

// Compound index to ensure department code is unique per hospital
departmentSchema.index({ hospital: 1, code: 1 }, { unique: true });

const Department = mongoose.model('Department', departmentSchema);
export default Department;
