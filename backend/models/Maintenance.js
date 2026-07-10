import mongoose from 'mongoose';

const maintenanceSchema = new mongoose.Schema({
  equipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true,
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  technician: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Reported', 'In Progress', 'Completed'],
    default: 'Reported',
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    default: null,
  }
}, {
  timestamps: true
});

const Maintenance = mongoose.model('Maintenance', maintenanceSchema);
export default Maintenance;
