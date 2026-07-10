import PatientActivity from '../models/PatientActivity.js';
import Billing from '../models/Billing.js';
import Pricing from '../models/Pricing.js';
import Patient from '../models/Patient.js';
import Bed from '../models/Bed.js';
import Equipment from '../models/Equipment.js';

const DEFAULT_PRICES = {
  registration_fee: { price: 200, category: 'Registration', name: 'Registration Fee' },
  doctor_consultation: { price: 500, category: 'Consultation', name: 'Doctor Consultation' },
  bed_general: { price: 1200, category: 'Bed', name: 'General Bed Daily Charges' },
  bed_icu: { price: 3500, category: 'Bed', name: 'ICU Bed Daily Charges' },
  equipment_ventilator: { price: 500, category: 'Equipment', name: 'Ventilator Hourly Charges' },
  equipment_wheelchair: { price: 150, category: 'Equipment', name: 'Wheelchair Daily Charges' },
  bp_check: { price: 80, category: 'Vitals Check', name: 'Blood Pressure Check' },
  temp_check: { price: 50, category: 'Vitals Check', name: 'Temperature Check' },
  spo2_check: { price: 50, category: 'Vitals Check', name: 'SpO2 Check' },
  breakfast: { price: 120, category: 'Food', name: 'Breakfast Served' },
  lunch: { price: 180, category: 'Food', name: 'Lunch Served' },
  dinner: { price: 180, category: 'Food', name: 'Dinner Served' },
  ecg: { price: 600, category: 'Diagnostic', name: 'ECG Done' },
  blood_test: { price: 450, category: 'Diagnostic', name: 'Blood Test' }
};

// Helper to look up pricing
export const getPrice = async (key) => {
  try {
    const item = await Pricing.findOne({ key });
    if (item) return item.price;
  } catch (error) {
    console.error('Pricing lookup error:', error);
  }
  return DEFAULT_PRICES[key]?.price || 0;
};

// Helper to look up pricing record
export const getPriceRecord = async (key) => {
  try {
    const item = await Pricing.findOne({ key });
    if (item) return item;
  } catch (error) {
    console.error('Pricing lookup error:', error);
  }
  return DEFAULT_PRICES[key] ? { key, ...DEFAULT_PRICES[key] } : null;
};

// Log a patient activity and automatically update their bill
export const logPatientActivity = async ({
  patientId,
  performedBy,
  role,
  activityType,
  description,
  priceKey,
  amount,
  remarks = '',
  isExtraCharge = false
}) => {
  try {
    let finalAmount = 0;
    if (amount !== undefined) {
      finalAmount = amount;
    } else if (priceKey) {
      finalAmount = await getPrice(priceKey);
    }

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0].slice(0, 5); // "HH:MM"

    // Create the Activity
    const activity = await PatientActivity.create({
      patient: patientId,
      performedBy,
      role,
      activityType,
      description,
      amount: finalAmount,
      date: now,
      time: timeStr,
      remarks,
      isExtraCharge,
      status: 'Active'
    });

    // Update Billing
    let billing = await Billing.findOne({ patient: patientId });
    if (!billing) {
      // Get unique invoice sequence
      billing = await Billing.create({
        patient: patientId,
        activities: [activity._id],
        paymentStatus: 'Pending'
      });
    } else {
      billing.activities.push(activity._id);
    }

    // Refresh billing totals
    await updateBillingTotals(patientId);

    return activity;
  } catch (error) {
    console.error('Failed to log patient activity & billing:', error);
    throw error;
  }
};

// Update static/logged activity totals in the Billing document
export const updateBillingTotals = async (patientId) => {
  try {
    const billing = await Billing.findOne({ patient: patientId });
    if (!billing) return;

    // Load patient details to compute active bed and equipment stay charges dynamically
    const patient = await Patient.findById(patientId)
      .populate('assignedBed')
      .populate('assignedEquipment');

    const activities = await PatientActivity.find({
      _id: { $in: billing.activities },
      status: 'Active'
    });

    let totalAmount = 0;
    
    // Sum up logged activities
    activities.forEach(act => {
      totalAmount += act.amount;
    });

    // Compute dynamic stay charges for bed/equipment if patient is currently admitted (not yet discharged/frozen)
    if (patient && patient.status === 'Admitted' && patient.admissionDate) {
      const staySummary = await calculateStayCharges(patient);
      totalAmount += staySummary.bedCharge.amount;
      staySummary.equipmentCharges.forEach(eq => {
        totalAmount += eq.amount;
      });
    }

    billing.totalAmount = totalAmount;
    billing.pendingAmount = Math.max(0, totalAmount - billing.paidAmount);
    
    if (billing.pendingAmount === 0 && billing.totalAmount > 0) {
      billing.paymentStatus = 'Paid';
    } else {
      billing.paymentStatus = 'Pending';
    }

    await billing.save();
  } catch (error) {
    console.error('Error updating billing totals:', error);
  }
};

// Calculate stay charges dynamically
export const calculateStayCharges = async (patient) => {
  const admissionDate = patient.admissionDate || patient.createdAt;
  const endDate = patient.dischargeDate || new Date();
  
  const stayMs = endDate - admissionDate;
  // Minimum 1 day stay
  const stayDays = Math.ceil(stayMs / (1000 * 60 * 60 * 24)) || 1;
  const stayHours = Math.ceil(stayMs / (1000 * 60 * 60)) || 1;

  let bedCharge = { name: 'No Bed Assigned', days: 0, rate: 0, amount: 0 };
  let equipmentCharges = [];

  // Bed pricing calculation
  if (patient.assignedBed) {
    const bedType = patient.assignedBed.bedType;
    const isIcu = bedType === 'ICU';
    const rateKey = isIcu ? 'bed_icu' : 'bed_general';
    const rate = await getPrice(rateKey);
    const amount = stayDays * rate;

    bedCharge = {
      name: `${bedType} Bed Stay Charge (${patient.assignedBed.bedNumber} - ${patient.assignedBed.ward})`,
      days: stayDays,
      rate,
      amount
    };
  }

  // Equipment pricing calculation
  if (patient.assignedEquipment && patient.assignedEquipment.length > 0) {
    for (const eq of patient.assignedEquipment) {
      const isVentilator = eq.category === 'Ventilator' || eq.name.toLowerCase().includes('ventilator');
      if (isVentilator) {
        // Hourly rate
        const rate = await getPrice('equipment_ventilator');
        const amount = stayHours * rate;
        equipmentCharges.push({
          name: `${eq.name} Usage Charge (Hourly)`,
          hours: stayHours,
          rate,
          amount
        });
      } else {
        // Daily rate for wheelchair / others
        const rate = await getPrice('equipment_wheelchair');
        const amount = stayDays * rate;
        equipmentCharges.push({
          name: `${eq.name} Usage Charge (Daily)`,
          days: stayDays,
          rate,
          amount
        });
      }
    }
  }

  return {
    admissionDate,
    endDate,
    stayDays,
    stayHours,
    bedCharge,
    equipmentCharges
  };
};

// Freeze bed and equipment stay charges as permanent activity logs at discharge
export const finalizeDischargeBilling = async (patient, performedBy, role) => {
  try {
    if (!patient.admissionDate) return;

    const staySummary = await calculateStayCharges(patient);
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0].slice(0, 5);

    let billing = await Billing.findOne({ patient: patient._id });
    if (!billing) {
      billing = await Billing.create({
        patient: patient._id,
        activities: [],
        paymentStatus: 'Pending'
      });
    }

    // Save permanent activity for Bed stay
    if (staySummary.bedCharge.amount > 0) {
      const bedAct = await PatientActivity.create({
        patient: patient._id,
        performedBy,
        role,
        activityType: 'Bed Charge',
        description: staySummary.bedCharge.name,
        amount: staySummary.bedCharge.amount,
        date: now,
        time: timeStr,
        remarks: `Duration: ${staySummary.bedCharge.days} day(s) @ ₹${staySummary.bedCharge.rate}/day`,
        status: 'Active'
      });
      billing.activities.push(bedAct._id);
    }

    // Save permanent activities for Equipment stays
    for (const eq of staySummary.equipmentCharges) {
      const remarks = eq.hours 
        ? `Duration: ${eq.hours} hour(s) @ ₹${eq.rate}/hour`
        : `Duration: ${eq.days} day(s) @ ₹${eq.rate}/day`;

      const eqAct = await PatientActivity.create({
        patient: patient._id,
        performedBy,
        role,
        activityType: 'Equipment Charge',
        description: eq.name,
        amount: eq.amount,
        date: now,
        time: timeStr,
        remarks,
        status: 'Active'
      });
      billing.activities.push(eqAct._id);
    }

    // Set Invoice properties
    const count = await Billing.countDocuments({ invoiceNumber: { $exists: true } });
    const invoiceNum = `INV-${now.getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;
    
    billing.invoiceNumber = invoiceNum;
    billing.generatedDate = now;

    await billing.save();
    
    // Final recalculation of billing totals (without dynamic stay overlay, since stays are now pre-logged)
    await updateBillingTotals(patient._id);

    return billing;
  } catch (error) {
    console.error('Failed to finalize discharge billing:', error);
    throw error;
  }
};
