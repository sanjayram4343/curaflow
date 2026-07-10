import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import Models
import Hospital from '../models/Hospital.js';
import Department from '../models/Department.js';
import User from '../models/User.js';
import Bed from '../models/Bed.js';
import Equipment from '../models/Equipment.js';
import Patient from '../models/Patient.js';
import Reservation from '../models/Reservation.js';
import Transfer from '../models/Transfer.js';
import Maintenance from '../models/Maintenance.js';
import Notification from '../models/Notification.js';
import ActivityLog from '../models/ActivityLog.js';
import Appointment from '../models/Appointment.js';
import PatientActivity from '../models/PatientActivity.js';
import Billing from '../models/Billing.js';
import Pricing from '../models/Pricing.js';

dotenv.config();

const seedDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://localhost:27017/hosp_mgmt';
    await mongoose.connect(connStr);
    console.log('Seeder Connected to Database');

    // Clear existing data
    await Hospital.deleteMany({});
    await Department.deleteMany({});
    await User.deleteMany({});
    await Bed.deleteMany({});
    await Equipment.deleteMany({});
    await Patient.deleteMany({});
    await Reservation.deleteMany({});
    await Transfer.deleteMany({});
    await Maintenance.deleteMany({});
    await Notification.deleteMany({});
    await ActivityLog.deleteMany({});
    await Appointment.deleteMany({});
    await PatientActivity.deleteMany({});
    await Billing.deleteMany({});
    await Pricing.deleteMany({});

    console.log('Cleared existing collections');

    // 1. Create Hospitals
    const stMarys = await Hospital.create({
      name: "St. Mary's General Hospital",
      address: "123 Healthcare Blvd",
      city: "Chicago",
      contactNumber: "312-555-0199",
      totalBedsCount: 50
    });

    const metroHosp = await Hospital.create({
      name: "Metro Medical Center",
      address: "456 City Center Dr",
      city: "Chicago",
      contactNumber: "312-555-0244",
      totalBedsCount: 80
    });

    const suburbanHosp = await Hospital.create({
      name: "Suburban Health Pavilion",
      address: "789 Quiet Pkwy",
      city: "Naperville",
      contactNumber: "630-555-0377",
      totalBedsCount: 30
    });

    console.log('Created Hospitals');

    // 2. Create Departments for St. Mary's
    const icuStMarys = await Department.create({
      name: "Intensive Care Unit",
      code: "ICU",
      hospital: stMarys._id
    });

    const erStMarys = await Department.create({
      name: "Emergency Department",
      code: "ER",
      hospital: stMarys._id
    });

    const pedsStMarys = await Department.create({
      name: "Pediatrics Ward",
      code: "PED",
      hospital: stMarys._id
    });

    // Departments for Metro Medical
    const icuMetro = await Department.create({
      name: "Intensive Care Unit",
      code: "ICU",
      hospital: metroHosp._id
    });

    const erMetro = await Department.create({
      name: "Emergency Department",
      code: "ER",
      hospital: metroHosp._id
    });

    console.log('Created Departments');

    // 3. Create Users
    // Super Admin (no hospital tied)
    const superAdmin = await User.create({
      name: "System Super Admin",
      email: "superadmin@hospital.com",
      password: "admin123", // Will be hashed by pre-save hook
      role: "Super Admin",
      status: "Active"
    });

    // St. Mary's Admin
    const stMarysAdmin = await User.create({
      name: "Jane Doe (St. Mary Admin)",
      email: "admin@stmarys.com",
      password: "admin123",
      role: "Hospital Admin",
      hospital: stMarys._id,
      status: "Active"
    });

    // St. Mary's Doctor
    const doctorStMarys = await User.create({
      name: "Dr. Alice Smith",
      email: "doctor@stmarys.com",
      password: "doctor123",
      role: "Doctor",
      hospital: stMarys._id,
      department: icuStMarys._id,
      status: "Active"
    });

    const doctorKeerthi = await User.create({
      name: "Dr. Keerthi Nair",
      email: "keerthi@stmarys.com",
      password: "doctor123",
      role: "Doctor",
      hospital: stMarys._id,
      department: icuStMarys._id,
      status: "Active"
    });

    const doctorRahul = await User.create({
      name: "Dr. Rahul Verma",
      email: "rahul@stmarys.com",
      password: "doctor123",
      role: "Doctor",
      hospital: stMarys._id,
      department: icuStMarys._id,
      status: "Active"
    });

    // St. Mary's Nurse
    const nurseStMarys = await User.create({
      name: "Nurse Bob Johnson",
      email: "nurse@stmarys.com",
      password: "nurse123",
      role: "Nurse",
      hospital: stMarys._id,
      department: erStMarys._id,
      status: "Active"
    });

    const nursePriya = await User.create({
      name: "Nurse Priya Sharma",
      email: "priya@stmarys.com",
      password: "nurse123",
      role: "Nurse",
      hospital: stMarys._id,
      department: erStMarys._id,
      status: "Active"
    });

    const nurseDivya = await User.create({
      name: "Nurse Divya Rao",
      email: "divya@stmarys.com",
      password: "nurse123",
      role: "Nurse",
      hospital: stMarys._id,
      department: erStMarys._id,
      status: "Active"
    });

    // St. Mary's Staff
    const staffStMarys = await User.create({
      name: "Reception Staff Carol",
      email: "staff@stmarys.com",
      password: "staff123",
      role: "Reception Staff",
      hospital: stMarys._id,
      department: pedsStMarys._id,
      status: "Active"
    });

    // Metro Admin
    const metroAdmin = await User.create({
      name: "Mark Davis (Metro Admin)",
      email: "admin@metro.com",
      password: "admin123",
      role: "Hospital Admin",
      hospital: metroHosp._id,
      status: "Active"
    });

    console.log('Created Users');

    // 4. Create Beds
    // St. Mary's Beds
    const b1 = await Bed.create({
      bedNumber: "B-ICU-101",
      ward: "Intensive Care",
      room: "Room 101",
      floor: 1,
      bedType: "ICU",
      status: "Occupied",
      hospital: stMarys._id,
      department: icuStMarys._id
    });

    const b2 = await Bed.create({
      bedNumber: "B-ICU-102",
      ward: "Intensive Care",
      room: "Room 102",
      floor: 1,
      bedType: "ICU",
      status: "Available",
      hospital: stMarys._id,
      department: icuStMarys._id
    });

    const b3 = await Bed.create({
      bedNumber: "B-ER-201",
      ward: "Emergency Room",
      room: "Bay A",
      floor: 2,
      bedType: "Emergency",
      status: "Occupied",
      hospital: stMarys._id,
      department: erStMarys._id
    });

    const b4 = await Bed.create({
      bedNumber: "B-ER-202",
      ward: "Emergency Room",
      room: "Bay B",
      floor: 2,
      bedType: "Emergency",
      status: "Cleaning",
      hospital: stMarys._id,
      department: erStMarys._id
    });

    const b5 = await Bed.create({
      bedNumber: "B-GEN-301",
      ward: "General Ward",
      room: "Room 301",
      floor: 3,
      bedType: "General",
      status: "Available",
      hospital: stMarys._id,
      department: pedsStMarys._id
    });

    const b6 = await Bed.create({
      bedNumber: "B-VENT-103",
      ward: "Intensive Care",
      room: "Room 103",
      floor: 1,
      bedType: "Ventilator",
      status: "Reserved",
      hospital: stMarys._id,
      department: icuStMarys._id
    });

    // Metro ICU Beds (For testing transfer suggestions)
    await Bed.create({
      bedNumber: "B-ICU-201",
      ward: "Intensive Care",
      room: "Room 201",
      floor: 2,
      bedType: "ICU",
      status: "Available",
      hospital: metroHosp._id,
      department: icuMetro._id
    });

    await Bed.create({
      bedNumber: "B-ICU-202",
      ward: "Intensive Care",
      room: "Room 202",
      floor: 2,
      bedType: "ICU",
      status: "Available",
      hospital: metroHosp._id,
      department: icuMetro._id
    });

    console.log('Created Beds');

    // 5. Create Equipments
    // St. Mary's Equipment
    const eq1 = await Equipment.create({
      name: "Ventilator",
      category: "Ventilator",
      serialNumber: "V-88129",
      status: "Assigned",
      hospital: stMarys._id,
      department: icuStMarys._id
    });

    const eq2 = await Equipment.create({
      name: "Oxygen Cylinder",
      category: "Oxygen Cylinder",
      serialNumber: "OX-4552",
      status: "Available",
      hospital: stMarys._id,
      department: erStMarys._id
    });

    const eq3 = await Equipment.create({
      name: "Defibrillator",
      category: "Defibrillator",
      serialNumber: "DEF-2309",
      status: "Maintenance",
      hospital: stMarys._id,
      department: erStMarys._id
    });

    const eq4 = await Equipment.create({
      name: "Infusion Pump",
      category: "Infusion Pump",
      serialNumber: "INF-9921",
      status: "Available",
      hospital: stMarys._id,
      department: pedsStMarys._id
    });

    const eq5 = await Equipment.create({
      name: "Patient Monitor",
      category: "Monitor",
      serialNumber: "MON-1188",
      status: "Assigned",
      hospital: stMarys._id,
      department: icuStMarys._id
    });

    // Metro Equipment
    await Equipment.create({
      name: "Metro Ventilator X1",
      category: "Ventilator",
      serialNumber: "V-9999",
      status: "Available",
      hospital: metroHosp._id,
      department: icuMetro._id
    });

    console.log('Created Equipment');

    // 6. Create Patients
    // Patient 1: Occupying Bed 1 & Equipment 1, 5
    const defaultChecklist = [
      { shift: 'Morning', taskName: 'Medicine Given', completed: false },
      { shift: 'Morning', taskName: 'Breakfast Given', completed: false },
      { shift: 'Morning', taskName: 'BP Checked', completed: false },
      { shift: 'Morning', taskName: 'Temperature Checked', completed: false },
      { shift: 'Morning', taskName: 'Oxygen Level Checked', completed: false },
      { shift: 'Morning', taskName: 'Water Intake', completed: false },
      { shift: 'Afternoon', taskName: 'Lunch', completed: false },
      { shift: 'Afternoon', taskName: 'Injection', completed: false },
      { shift: 'Afternoon', taskName: 'Medicine', completed: false },
      { shift: 'Afternoon', taskName: 'BP', completed: false },
      { shift: 'Afternoon', taskName: 'Temperature', completed: false },
      { shift: 'Evening', taskName: 'Dinner', completed: false },
      { shift: 'Evening', taskName: 'Medicine', completed: false },
      { shift: 'Evening', taskName: 'Night Vitals', completed: false }
    ];

    // Patient 1: Occupying Bed 1 & Equipment 1, 5
    const pat1 = await Patient.create({
      name: "Robert Downey",
      age: 55,
      gender: "Male",
      admissionNumber: "ADM-2026-0001",
      diagnosis: "Acute Respiratory Distress Syndrome",
      admissionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      hospital: stMarys._id,
      assignedDoctor: doctorStMarys._id,
      assignedBed: b1._id,
      assignedEquipment: [eq1._id, eq5._id],
      assignedNurse: nurseStMarys._id,
      status: "Admitted",
      nursingLogs: defaultChecklist.map((task, idx) => {
        if (idx < 3) {
          return {
            ...task,
            completed: true,
            completedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
            nurseName: "Nurse Bob Johnson"
          };
        }
        return task;
      })
    });

    // Bind Bed 1 and Equipment 1, 5 to Patient 1
    b1.assignedPatient = pat1._id;
    await b1.save();

    eq1.assignedPatient = pat1._id;
    await eq1.save();

    eq5.assignedPatient = pat1._id;
    await eq5.save();

    // Patient 2: Occupying Bed 3
    const pat2 = await Patient.create({
      name: "Scarlett Johansson",
      age: 38,
      gender: "Female",
      admissionNumber: "ADM-2026-0002",
      diagnosis: "Compound Tibia Fracture",
      admissionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      hospital: stMarys._id,
      assignedDoctor: doctorStMarys._id,
      assignedBed: b3._id,
      assignedEquipment: [],
      assignedNurse: nurseStMarys._id,
      status: "Admitted",
      nursingLogs: defaultChecklist.map(t => ({ ...t }))
    });

    b3.assignedPatient = pat2._id;
    await b3.save();

    // Patient 3: Discharged
    const pat3 = await Patient.create({
      name: "Tony Stark",
      age: 48,
      gender: "Male",
      admissionNumber: "ADM-2026-0003",
      diagnosis: "Mild Concussion & Fatigue",
      admissionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      dischargeDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Discharged 1 day ago
      hospital: stMarys._id,
      assignedDoctor: doctorStMarys._id,
      status: "Discharged"
    });

    // Patient 4: Registered (Waiting for Doctor Consultation)
    const pat4 = await Patient.create({
      name: "Bruce Banner",
      age: 45,
      gender: "Male",
      admissionNumber: "ADM-2026-0004",
      diagnosis: "Gamma radiation exposure follow-up",
      hospital: stMarys._id,
      assignedDoctor: doctorKeerthi._id,
      status: "Registered"
    });

    // Patient 5: Admission Pending (Waiting for Admin approval/assignment)
    const pat5 = await Patient.create({
      name: "Steve Rogers",
      age: 98,
      gender: "Male",
      admissionNumber: "ADM-2026-0005",
      diagnosis: "Severe physical fatigue & respiratory congestion",
      hospital: stMarys._id,
      assignedDoctor: doctorRahul._id,
      status: "Admission Pending",
      needsIcu: true,
      requestedEquipmentType: "Ventilator"
    });

    // Patient 6: Registered (Waiting for Doctor Consultation)
    const pat6 = await Patient.create({
      name: "Natasha Romanoff",
      age: 34,
      gender: "Female",
      admissionNumber: "ADM-2026-0006",
      diagnosis: "Routine toxicity scan",
      hospital: stMarys._id,
      assignedDoctor: doctorStMarys._id,
      status: "Registered"
    });

    console.log('Created Patients');

    // Seed default pricing
    const defaultPricing = [
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
    await Pricing.insertMany(defaultPricing);
    console.log('Seeded Pricing Configurations');

    // Create Patient Timeline Activities & Bills
    // pat1 (Robert Downey)
    const act1 = await PatientActivity.create({
      patient: pat1._id, performedBy: staffStMarys._id, role: 'Reception Staff',
      activityType: 'Registration', description: 'Patient Registered', amount: 200,
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), time: '09:00', status: 'Active'
    });
    const act2 = await PatientActivity.create({
      patient: pat1._id, performedBy: doctorStMarys._id, role: 'Doctor',
      activityType: 'Consultation', description: 'Doctor Consultation & Prescription: Acute Respiratory Distress Syndrome', amount: 500,
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), time: '10:15', status: 'Active'
    });
    const act3 = await PatientActivity.create({
      patient: pat1._id, performedBy: nurseStMarys._id, role: 'Nurse',
      activityType: 'Vitals Check', description: 'Blood Pressure Checked', amount: 80,
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), time: '11:00', status: 'Active'
    });
    const act4 = await PatientActivity.create({
      patient: pat1._id, performedBy: nurseStMarys._id, role: 'Nurse',
      activityType: 'Food', description: 'Lunch Served', amount: 180,
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), time: '13:00', remarks: 'Normal Diet', status: 'Active'
    });

    const bill1 = await Billing.create({
      patient: pat1._id,
      activities: [act1._id, act2._id, act3._id, act4._id],
      totalAmount: 200 + 500 + 80 + 180 + (5 * 1200) + (5 * 24 * 500) + (5 * 150), // dynamically stay calculations check: general bed + ventilator + wheelchair
      paidAmount: 200 + 500,
      pendingAmount: 80 + 180 + (5 * 1200) + (5 * 24 * 500) + (5 * 150),
      paymentStatus: 'Pending'
    });

    // pat3 (Tony Stark, discharged)
    const act3_1 = await PatientActivity.create({
      patient: pat3._id, performedBy: staffStMarys._id, role: 'Reception Staff',
      activityType: 'Registration', description: 'Patient Registered', amount: 200,
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), time: '08:30', status: 'Active'
    });
    const act3_2 = await PatientActivity.create({
      patient: pat3._id, performedBy: doctorStMarys._id, role: 'Doctor',
      activityType: 'Consultation', description: 'Doctor Consultation: Concussion', amount: 500,
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), time: '09:00', status: 'Active'
    });
    const act3_3 = await PatientActivity.create({
      patient: pat3._id, performedBy: doctorStMarys._id, role: 'Doctor',
      activityType: 'Bed Charge', description: 'General Bed Stay Charge (B-ER-201 - Emergency Room)', amount: 2 * 1200,
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), time: '11:00', remarks: 'Stay: 2 days', status: 'Active'
    });

    const bill3 = await Billing.create({
      patient: pat3._id,
      activities: [act3_1._id, act3_2._id, act3_3._id],
      totalAmount: 200 + 500 + 2400,
      paidAmount: 200 + 500 + 2400,
      pendingAmount: 0,
      paymentStatus: 'Paid',
      invoiceNumber: 'INV-2026-00001',
      generatedDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
    });

    console.log('Created Activities and Billing records');

    // Create doctor appointments for today
    const appDateToday = new Date();
    await Appointment.create({
      patient: pat4._id, doctor: doctorKeerthi._id, hospital: stMarys._id,
      appointmentDate: appDateToday, timeSlot: '10:00 AM', status: 'Scheduled', type: 'OP', reason: 'Gamma Radiation consultation'
    });
    await Appointment.create({
      patient: pat6._id, doctor: doctorStMarys._id, hospital: stMarys._id,
      appointmentDate: appDateToday, timeSlot: '11:30 AM', status: 'Scheduled', type: 'OP', reason: 'Routine toxicity scan follow-up'
    });

    console.log('Created Scheduled Appointments');

    // 7. Create Reservations
    const r1 = await Reservation.create({
      reserver: doctorStMarys._id,
      hospital: stMarys._id,
      itemType: "Bed",
      bed: b6._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      status: "Active"
    });

    console.log('Created Reservations');

    // 8. Create Maintenance request
    const maint1 = await Maintenance.create({
      equipment: eq3._id,
      reportedBy: nurseStMarys._id,
      technician: "John Tech (Biomedical Department)",
      description: "Battery charging failure. Defibrillator screen shuts down intermittently on battery power.",
      status: "Reported",
      startDate: new Date()
    });

    console.log('Created Maintenance');

    // 9. Create Notifications
    await Notification.create({
      hospital: stMarys._id,
      title: "System Update Complete",
      message: "Database seed records successfully initialized for Hospital Bed & Equipment Coordination System.",
      type: "System"
    });

    await Notification.create({
      hospital: stMarys._id,
      title: "Low Inventory Warning",
      message: "Oxygen Cylinders at 1 available unit. Please coordinate restock.",
      type: "System"
    });

    await Notification.create({
      hospital: stMarys._id,
      title: "Equipment Maintenance Reported",
      message: `Equipment ${eq3.name} has been reported for maintenance by Nurse Bob Johnson`,
      type: "Maintenance"
    });

    console.log('Created Notifications');

    // 10. Log Activity Logs
    await ActivityLog.create({
      user: superAdmin._id,
      action: "Database Seed",
      details: "Initial database seed successfully populated.",
      ipAddress: "127.0.0.1"
    });

    await ActivityLog.create({
      user: stMarysAdmin._id,
      action: "System Audit",
      details: "Performed initial database configuration audit",
      ipAddress: "127.0.0.1"
    });

    console.log('Created Activity Logs');
    console.log('Database Seeding Successful!');
    process.exit(0);

  } catch (error) {
    console.error('Seeder execution error:', error);
    process.exit(1);
  }
};

seedDB();
