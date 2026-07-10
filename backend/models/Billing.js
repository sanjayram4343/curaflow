import mongoose from 'mongoose';

const billingSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  activities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatientActivity'
  }],
  totalAmount: {
    type: Number,
    default: 0
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  pendingAmount: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending', 'Partially Paid'],
    default: 'Pending'
  },
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  generatedDate: {
    type: Date
  }
}, {
  timestamps: true
});

const Billing = mongoose.model('Billing', billingSchema);
export default Billing;
