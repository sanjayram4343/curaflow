import mongoose from 'mongoose';

const pricingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const Pricing = mongoose.model('Pricing', pricingSchema);
export default Pricing;
