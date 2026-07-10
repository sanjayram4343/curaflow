# CuraFlow — Hospital Operations & Shift Tracking Platform

CuraFlow is a modern, monochromatic, high-end Hospital Operations Management and shift-wise progress tracking application. Designed to simplify clinical workflows, bed allocations, medical equipment assignments, and nurse shift checklist compliance.

---

## 🚀 Key Features

### 1. Clinical Shift Logging & Reports
- **Dynamic Shift Division**: Automatically groups logs and observations into three distinct daily shifts:
  - **Morning Shift** (06:00 AM - 12:00 PM)
  - **Afternoon (Noon) Shift** (12:00 PM - 05:00 PM)
  - **Evening & Night Shift** (05:00 PM - 06:00 AM)
- **Interactive Checklists**: Nurses can toggle checklist tasks (such as Breakfast, Lunch, Medicine, Injections) directly from the shift report or EMR station.
- **Vitals Monitoring**: Simple vital signs logging (Blood Pressure, Temp, SpO₂, Pulse, Weight, Water Intake) directly linked to shifts.
- **Nurse Observations**: Shift notes can be logged on-the-fly and aggregated.

### 2. Clinical Station Date Constraints
- **Today Mode**: Full create/update privileges for active checklists, vitals, and notes logs.
- **Past History Mode**: Automatically locks checkboxes and logging forms, showing a read-only historical timeline view for past dates.
- **Future Constraints**: Prevents future dates selection automatically.

### 3. Role-Based Access Control (RBAC)
- **Doctor**: Physician Consult Station (Diagnosis, Treatment Plans, Prescriptions, Test Orders, Follow-ups). Full access to reports. Zero billing/pricing interactions.
- **Nurse**: Patient care workstation, vitals entry, shift observation logs, checklist updates.
- **Hospital Admin / Super Admin**: Bed assignments, equipment allocation, patient intake registrations, audit trails.
- **Reception Staff**: Checkout, invoices, ledger calculations.

### 4. Interactive Dashboards & UI
- Monochromatic UI styling.
- Native system dark theme and light theme toggles working flawlessly via Tailwind class selectors.
- Auto-calculated real-time statistics for beds, equipment, and occupancy.

---

## 📁 Repository Structure

```
curaflow/
├── backend/            # Express, Node, MongoDB API
│   ├── config/         # DB configurations
│   ├── controllers/    # Route controllers (patients, transfers, beds)
│   ├── models/         # Database Schemas (Patient, User, Bed, etc.)
│   ├── routes/         # Express endpoint definitions
│   └── server.js       # Main server entrypoint
├── frontend/           # React, TypeScript, Tailwind, Vite Webapp
│   ├── src/
│   │   ├── components/ # Custom UI elements and layout containers
│   │   ├── context/    # Auth context wrappers
│   │   ├── pages/      # Route pages (EMR, Reports, Dashboard, Login)
│   │   └── services/   # Axios API Client service
│   ├── index.html      # Document wrapper
│   └── tailwind.config.js # Custom styling rules
└── README.md           # Main documentation
```

---

## 🛠️ Setup & Running Locally

### Prerequisites
- Node.js (v18+)
- MongoDB running locally or a connection URI string.

### 1. Run the Backend Server
```bash
cd backend
npm install
# Configure your variables in .env (PORT, MONGO_URI, JWT_SECRET)
npm run dev
```

### 2. Run the Frontend Application
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🔒 Default Test Accounts
- **Doctor**: `doctor@stmarys.com` / `doctor123`
- **Nurse**: `nurse@stmarys.com` / `nurse123`
- **Hospital Admin**: `admin@stmarys.com` / `admin123`
