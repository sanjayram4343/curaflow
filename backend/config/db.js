import mongoose from 'mongoose';
import Pricing from '../models/Pricing.js';

const DEFAULT_PRICES = [
  { key: 'registration_fee', name: 'Registration Fee', price: 200, category: 'Registration' },
  { key: 'doctor_consultation', name: 'Doctor Consultation', price: 500, category: 'Consultation' },
  { key: 'bed_general', name: 'General Bed Daily Charges', price: 1200, category: 'Bed' },
  { key: 'bed_icu', name: 'ICU Bed Daily Charges', price: 3500, category: 'Bed' },
  { key: 'equipment_ventilator', name: 'Ventilator Hourly Charges', price: 500, category: 'Equipment' },
  { key: 'equipment_wheelchair', name: 'Wheelchair Daily Charges', price: 150, category: 'Equipment' },
  { key: 'bp_check', name: 'Blood Pressure Check', price: 80, category: 'Vitals Check' },
  { key: 'temp_check', name: 'Temperature Check', price: 50, category: 'Vitals Check' },
  { key: 'spo2_check', name: 'SpO2 Check', price: 50, category: 'Vitals Check' },
  { key: 'breakfast', name: 'Breakfast Served', price: 120, category: 'Food' },
  { key: 'lunch', name: 'Lunch Served', price: 180, category: 'Food' },
  { key: 'dinner', name: 'Dinner Served', price: 180, category: 'Food' },
  { key: 'ecg', name: 'ECG Done', price: 600, category: 'Diagnostic' },
  { key: 'blood_test', name: 'Blood Test', price: 450, category: 'Diagnostic' }
];

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://localhost:27017/hosp_mgmt';
    const conn = await mongoose.connect(connStr);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Check and seed pricing table
    const count = await Pricing.countDocuments();
    if (count === 0) {
      console.log('Seeding default pricing config...');
      await Pricing.insertMany(DEFAULT_PRICES);
      console.log('Default pricing seeded successfully!');
    }
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
