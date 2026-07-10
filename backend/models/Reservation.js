import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  reserver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true,
  },
  itemType: {
    type: String,
    enum: ['Bed', 'Equipment'],
    required: true,
  },
  bed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bed',
    default: null,
  },
  equipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    default: null,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Cancelled'],
    default: 'Active',
  }
}, {
  timestamps: true
});

const Reservation = mongoose.model('Reservation', reservationSchema);
export default Reservation;
