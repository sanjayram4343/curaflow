import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  contactNumber: {
    type: String,
    trim: true,
  },
  totalBedsCount: {
    type: Number,
    default: 0,
  }
}, {
  timestamps: true
});

const Hospital = mongoose.model('Hospital', hospitalSchema);
export default Hospital;
