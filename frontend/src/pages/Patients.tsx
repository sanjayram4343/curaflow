import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, Button, Input, Select, Badge, Dialog } from '../components/ui';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Edit2, Trash2, Heart, Check, X, ArrowLeft,
  Activity, FileText, CheckSquare, Clock, Calendar, AlertOctagon, User, RefreshCw
} from 'lucide-react';

interface Doctor {
  _id: string;
  name: string;
}

interface Bed {
  _id: string;
  bedNumber: string;
  bedType: string;
  ward: string;
  room: string;
  status?: string;
}

interface Equipment {
  _id: string;
  name: string;
  category: string;
}

interface Vitals {
  bloodPressure: string;
  heartRate: number;
  temperature: number;
  spo2: number;
  respirationRate: number;
  weight: number;
  recordedAt: string;
  nurseName: string;
}

interface NurseNote {
  note: string;
  recordedAt: string;
  nurseName: string;
}

interface NursingTask {
  _id: string;
  shift: 'Morning' | 'Afternoon' | 'Evening';
  taskName: string;
  completed: boolean;
  completedAt?: string;
  nurseName?: string;
  notes?: string;
}

interface TimelineEvent {
  _id: string;
  time: string;
  event: string;
  userType: string;
  userName: string;
}

interface Patient {
  _id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  admissionNumber: string;
  diagnosis: string;
  admissionDate: string;
  dischargeDate?: string;
  status: 'Registered' | 'Admission Pending' | 'Admitted' | 'Discharged';
  assignedDoctor: Doctor;
  assignedBed?: Bed;
  assignedEquipment: Equipment[];
  assignedNurse?: { _id: string; name: string };
  clinicalNotes?: string;
  prescription?: string;
  treatmentPlan?: string;
  testsOrdered?: string;
  followUpNotes?: string;
  isCritical?: boolean;
  needsIcu?: boolean;
  requestedEquipmentType?: string;
  followUpDate?: string;
  patientType?: 'OP' | 'IP';
  vitalsHistory: Vitals[];
  nurseNotes: NurseNote[];
  nursingLogs: NursingTask[];
  medicalTimeline: TimelineEvent[];
}

const isSameDate = (date1: Date, date2: Date) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

const parseProgressDate = (dateStr: string) => {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const parts = dateStr.split(' ');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const monthIndex = months.indexOf(parts[1]);
    const year = parseInt(parts[2]);
    if (monthIndex !== -1) {
      return new Date(year, monthIndex, day);
    }
  }
  return new Date(dateStr);
};

const getPatientDates = (patient: Patient) => {
  const dates: string[] = [];
  const start = patient.admissionDate ? new Date(patient.admissionDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const end = new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  let current = new Date(start);
  while (current <= end) {
    dates.push(current.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }));
    current.setDate(current.getDate() + 1);
  }
  return dates.reverse();
};

const getNurseDatesList = (patient: Patient) => {
  const dates = getPatientDates(patient);
  const todayStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const pastDates = dates.filter(d => d !== todayStr);
  return ['Today', ...pastDates];
};

export const Patients: React.FC = () => {
  const { user, hasRole, activeDoctor, activeNurse } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const patientParamId = searchParams.get('id');

  // Directory List State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [nurses, setNurses] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [myPatientsOnly, setMyPatientsOnly] = useState(user?.role === 'Doctor');

  // Selected EMR Patient State
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [loadingEMR, setLoadingEMR] = useState(false);

  // Doctor Consultation Form state
  const [diag, setDiag] = useState('');
  const [clinNotes, setClinNotes] = useState('');
  const [prescr, setPrescr] = useState('');
  const [critVal, setCritVal] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [testsOrdered, setTestsOrdered] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  // Admission request dialog
  const [icuReq, setIcuReq] = useState(false);
  const [equipReqType, setEquipReqType] = useState('');
  const [dialogAdmOpen, setDialogAdmOpen] = useState(false);

  // Selected date for Nurse Dashboard Workstation
  const [selectedNurseDate, setSelectedNurseDate] = useState<string>('Today');

  // Vitals form state
  const [bp, setBp] = useState('');
  const [hr, setHr] = useState('');
  const [temp, setTemp] = useState('');
  const [o2, setO2] = useState('');
  const [resp, setResp] = useState('');
  const [wt, setWt] = useState('');

  // Nurse note state
  const [nNote, setNNote] = useState('');

  // Patient Registration Modal State
  const [isRegOpen, setIsRegOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regAge, setRegAge] = useState(30);
  const [regGender, setRegGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [regDoctor, setRegDoctor] = useState('');
  const [regDiagnosis, setRegDiagnosis] = useState('');
  const [regError, setRegError] = useState('');
  const [regPatientType, setRegPatientType] = useState<'OP' | 'IP'>('OP');
  const [regBed, setRegBed] = useState('');
  const [regNurse, setRegNurse] = useState('');

  // Patient Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState(30);
  const [editGender, setEditGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [editDoctor, setEditDoctor] = useState('');
  const [editPatientType, setEditPatientType] = useState<'OP' | 'IP'>('OP');
  const [editStatus, setEditStatus] = useState<string>('Registered');
  const [editBed, setEditBed] = useState('');
  const [editNurse, setEditNurse] = useState('');
  const [editDiagnosis, setEditDiagnosis] = useState('');
  const [editError, setEditError] = useState('');

  // New billing & timeline tabs state
  const [activeTab, setActiveTab] = useState<'care' | 'timeline' | 'billing' | 'progress'>('care');
  const [billingData, setBillingData] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(false);

  // Custom activity form state
  const [isCustomActOpen, setIsCustomActOpen] = useState(false);
  const [customActType, setCustomActType] = useState('Diagnostic');
  const [customActDesc, setCustomActDesc] = useState('');
  const [customActAmount, setCustomActAmount] = useState('');
  const [customActRemarks, setCustomActRemarks] = useState('');
  const [customActPriceKey, setCustomActPriceKey] = useState('');
  const [priceList, setPriceList] = useState<any[]>([]);

  // Payment Form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  const fetchBilling = async (id: string) => {
    try {
      setIsBillingLoading(true);
      const data = await api.get(`/patients/${id}/billing`);
      setBillingData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsBillingLoading(false);
    }
  };

  const fetchActivities = async (id: string) => {
    try {
      setIsActivitiesLoading(true);
      const data = await api.get(`/patients/${id}/activities`);
      setActivities(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsActivitiesLoading(false);
    }
  };

  const fetchPriceList = async () => {
    try {
      const data = await api.get('/pricing');
      setPriceList(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activePatient) {
      if (activeTab === 'billing') {
        fetchBilling(activePatient._id);
        fetchPriceList();
      } else if (activeTab === 'timeline') {
        fetchActivities(activePatient._id);
        fetchPriceList();
      }
    }
  }, [activePatient?._id, activeTab]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError('');
      let url = `/patients?search=${search}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      if (myPatientsOnly && user?.role === 'Doctor' && activeDoctor) {
        url += `&assignedDoctor=${activeDoctor._id}`;
      }
      const data = await api.get(url);
      setPatients(data.patients || []);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve patient registry');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const allUsers = await api.get('/auth/users');
      setDoctors(allUsers.filter((u: any) => u.role === 'Doctor'));
    } catch {}
  };

  const fetchEMR = async (id: string) => {
    try {
      setLoadingEMR(true);
      const data = await api.get(`/patients/${id}`);
      setActivePatient(data);
      setDiag(data.diagnosis || '');
      setClinNotes(data.clinicalNotes || '');
      setPrescr(data.prescription || '');
      setCritVal(data.isCritical || false);
      setFollowUp(data.followUpDate ? data.followUpDate.split('T')[0] : '');
      setTreatmentPlan(data.treatmentPlan || '');
      setTestsOrdered(data.testsOrdered || '');
      setFollowUpNotes(data.followUpNotes || '');

      setSelectedNurseDate('Today');
      
      // Load billing and timeline events
      fetchBilling(id);
      fetchActivities(id);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve EMR data.');
    } finally {
      setLoadingEMR(false);
    }
  };

  const fetchBedsAndNurses = async () => {
    try {
      const bedsData = await api.get('/beds?limit=100');
      setBeds(bedsData.beds || []);
      
      const allUsers = await api.get('/auth/users');
      setNurses(allUsers.filter((u: any) => u.role === 'Nurse'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDoctors();
    fetchBedsAndNurses();
  }, []);

  useEffect(() => {
    if (patientParamId) {
      fetchEMR(patientParamId);
    } else {
      setActivePatient(null);
      fetchPatients();
    }
  }, [patientParamId, search, filterStatus, myPatientsOnly]);

  // Doctor Consultation submit
  const handleConsultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;
    try {
      const updated = await api.put(`/patients/${activePatient._id}/consult`, {
        diagnosis: diag,
        clinicalNotes: clinNotes,
        prescription: prescr,
        isCritical: critVal,
        followUpDate: followUp || null,
        treatmentPlan,
        testsOrdered,
        followUpNotes
      });
      setActivePatient(updated);
      alert('Consultation report saved successfully.');
      fetchEMR(activePatient._id);
    } catch (err: any) {
      alert(err.message || 'Consultation saving failed.');
    }
  };

  // Doctor requests admission
  const handleAdmissionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;
    try {
      const updated = await api.put(`/patients/${activePatient._id}/request-admission`, {
        needsIcu: icuReq,
        requestedEquipmentType: equipReqType
      });
      setActivePatient(updated);
      setDialogAdmOpen(false);
      alert('Admission request sent to Hospital Administrator.');
      fetchEMR(activePatient._id);
    } catch (err: any) {
      alert(err.message || 'Admission request failed.');
    }
  };

  // Nurse logs vitals
  const handleVitalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;
    try {
      const updated = await api.put(`/patients/${activePatient._id}/vitals`, {
        bloodPressure: bp,
        heartRate: hr,
        temperature: temp,
        spo2: o2,
        respirationRate: resp,
        weight: wt
      });
      setActivePatient(updated);
      setBp(''); setHr(''); setTemp(''); setO2(''); setResp(''); setWt('');
      alert('Vitals saved to patient health log.');
      fetchEMR(activePatient._id);
    } catch (err: any) {
      alert(err.message || 'Vitals logging failed.');
    }
  };

  // Nurse note submit
  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient || !nNote) return;
    try {
      const updated = await api.put(`/patients/${activePatient._id}/nurse-notes`, { note: nNote });
      setActivePatient(updated);
      setNNote('');
      alert('Shift observation logged.');
      fetchEMR(activePatient._id);
    } catch (err: any) {
      alert(err.message || 'Observations logging failed.');
    }
  };

  // Checklist Task toggle
  const handleToggleTask = async (taskId: string, completed: boolean) => {
    if (!activePatient) return;
    try {
      const updated = await api.put(`/patients/${activePatient._id}/nursing-task`, {
        taskId,
        completed
      });
      setActivePatient(updated);
      fetchEMR(activePatient._id);
    } catch (err: any) {
      alert(err.message || 'Task checklist logging failed.');
    }
  };

  // Patient Registration Submit (Hospital Admin only)
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regDoctor) {
      setRegError('Please provide patient name and attending doctor.');
      return;
    }
    const isIP = regPatientType === 'IP';
    if (isIP && (!regBed || !regNurse)) {
      setRegError('Bed and Nurse must be assigned for Inpatient admission.');
      return;
    }
    setRegError('');
    try {
      const randomAdm = `ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await api.post('/patients', {
        name: regName,
        age: regAge,
        gender: regGender,
        admissionNumber: randomAdm,
        diagnosis: regDiagnosis,
        assignedDoctor: regDoctor,
        patientType: regPatientType,
        status: isIP ? 'Admitted' : 'Registered',
        assignedBed: isIP ? regBed : null,
        assignedNurse: isIP ? regNurse : null
      });
      setIsRegOpen(false);
      setRegName(''); setRegDiagnosis('');
      setRegBed(''); setRegNurse('');
      fetchPatients();
    } catch (err: any) {
      setRegError(err.message || 'Registration failed.');
    }
  };

  const handleOpenEdit = () => {
    if (!activePatient) return;
    setEditName(activePatient.name);
    setEditAge(activePatient.age);
    setEditGender(activePatient.gender);
    setEditDoctor(activePatient.assignedDoctor?._id || '');
    setEditPatientType(activePatient.patientType || 'OP');
    setEditStatus(activePatient.status);
    setEditBed(activePatient.assignedBed?._id || '');
    setEditNurse(activePatient.assignedNurse?._id || '');
    setEditDiagnosis(activePatient.diagnosis || '');
    setEditError('');
    fetchBedsAndNurses();
    setIsEditOpen(true);
  };

  const handleEditPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;
    
    if (editStatus === 'Admitted' && (!editDoctor || !editNurse || !editBed)) {
      setEditError('Doctor, Nurse, and Bed must be assigned to admit the patient.');
      return;
    }
    
    setEditError('');
    try {
      const updated = await api.put(`/patients/${activePatient._id}`, {
        name: editName,
        age: editAge,
        gender: editGender,
        assignedDoctor: editDoctor,
        patientType: editPatientType,
        status: editStatus,
        assignedBed: editStatus === 'Admitted' ? editBed : null,
        assignedNurse: editStatus === 'Admitted' ? editNurse : null,
        diagnosis: editDiagnosis
      });
      setIsEditOpen(false);
      alert('Patient details updated successfully.');
      fetchEMR(activePatient._id);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update patient details.');
    }
  };

  // Discharge Patient
  const handleDischargePatient = async () => {
    if (!activePatient) return;
    if (!window.confirm('Are you sure you want to discharge this patient? Bed and devices will be released.')) return;
    try {
      const updated = await api.put(`/patients/${activePatient._id}/discharge`, {});
      setActivePatient(updated);
      alert('Patient discharged successfully.');
      fetchEMR(activePatient._id);
    } catch (err: any) {
      alert(err.message || 'Discharge process failed.');
    }
  };

  // Delete Patient Record
  const handleDeletePatient = async (id: string) => {
    if (!window.confirm('Delete this patient record permanently?')) return;
    try {
      await api.delete(`/patients/${id}`);
      setSearchParams({});
      fetchPatients();
    } catch (err: any) {
      alert(err.message || 'Deletion failed.');
    }
  };

  // Custom billing activity submit
  const handleAddCustomActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;
    try {
      let payload: any = {
        activityType: customActType,
        description: customActDesc,
        remarks: customActRemarks
      };

      if (customActPriceKey) {
        payload.priceKey = customActPriceKey;
        if (!customActDesc) {
          const matched = priceList.find(p => p.key === customActPriceKey);
          if (matched) payload.description = matched.name;
        }
      } else {
        payload.amount = Number(customActAmount);
      }

      await api.post(`/patients/${activePatient._id}/activities`, payload);
      setIsCustomActOpen(false);
      setCustomActDesc('');
      setCustomActAmount('');
      setCustomActRemarks('');
      setCustomActPriceKey('');
      fetchActivities(activePatient._id);
      fetchBilling(activePatient._id);
      alert('Custom activity logged successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to log custom activity.');
    }
  };

  // Generate invoice / discharge billing
  const handleGenerateInvoice = async () => {
    if (!activePatient) return;
    try {
      const data = await api.post(`/patients/${activePatient._id}/billing/discharge`, {});
      fetchBilling(activePatient._id);
      alert('Discharge billing finalized. Invoice generated successfully.');
    } catch (err: any) {
      alert(err.message || 'Invoice generation failed.');
    }
  };

  // Record payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient || !paymentAmount) return;
    setRecordingPayment(true);
    try {
      await api.put(`/patients/${activePatient._id}/billing/pay`, { amount: Number(paymentAmount) });
      setPaymentAmount('');
      fetchBilling(activePatient._id);
      alert('Payment recorded successfully.');
    } catch (err: any) {
      alert(err.message || 'Payment recording failed.');
    } finally {
      setRecordingPayment(false);
    }
  };

  // Print Summary
  const handlePrintSummary = () => {
    if (!activePatient) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const timelineHtml = activities.map(act => `
      <div style="border-bottom: 1px solid #eee; padding: 8px 0; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>${new Date(act.date).toLocaleDateString()} ${act.time} - ${act.activityType}</span>
          <span>₹${act.amount}</span>
        </div>
        <div style="color: #555; margin-top: 2px;">${act.description}</div>
        ${act.remarks ? `<div style="color: #777; font-size: 10px; font-style: italic;">Remarks: ${act.remarks}</div>` : ''}
        <div style="color: #888; font-size: 9px; margin-top: 2px;">Performed by: ${act.performedBy?.name || 'System'} (${act.role})</div>
      </div>
    `).join('') || '<p style="font-size:11px; color:#555;">No timeline events recorded.</p>';

    const billBreakdownHtml = billingData ? `
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px;">
        <thead>
          <tr style="border-bottom: 2px solid #333; text-align: left; font-weight: bold; background: #f9f9f9;">
            <th style="padding: 6px;">Activity / Service</th>
            <th style="padding: 6px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${(billingData.billing?.activities || []).map((act: any) => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 6px;">
                <div style="font-weight: bold;">${act.description}</div>
                <div style="font-size: 9px; color: #555;">${new Date(act.date).toLocaleDateString()} · ${act.activityType}</div>
              </td>
              <td style="padding: 6px; text-align: right; font-weight: bold;">₹${act.amount}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p style="font-size:11px; color:#555;">No billed activities found.</p>';

    printWindow.document.write(`
      <html>
        <head>
          <title>Patient Medical & Billing Summary - ${activePatient.name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #000; padding: 20px; line-height: 1.4; }
            h1, h2, h3 { margin-bottom: 4px; font-weight: 850; text-transform: uppercase; letter-spacing: -0.5px; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .header-table td { padding: 6px; font-size: 12px; }
            .section { margin-top: 30px; border-top: 2px solid #000; padding-top: 10px; }
            .grand-total { font-size: 16px; font-weight: 900; border-top: 2px double #000; padding-top: 8px; margin-top: 15px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #000; padding-bottom: 10px;">
            <div>
              <h1 style="margin: 0; font-size: 24px;">CURAFLOW MEDICAL CENTER</h1>
              <div style="font-size: 10px; color: #555; text-transform: uppercase;">EMR Summary & Ledger Statement</div>
            </div>
            <div style="text-align: right; font-size: 11px; font-weight: bold;">
              Generated Date: ${new Date().toLocaleDateString()}
            </div>
          </div>

          <table class="header-table" style="margin-top: 15px;">
            <tr>
              <td><strong>Patient Name:</strong> ${activePatient.name}</td>
              <td><strong>Patient ID:</strong> ${activePatient.admissionNumber}</td>
            </tr>
            <tr>
              <td><strong>Age/Gender:</strong> ${activePatient.age}y/o · ${activePatient.gender}</td>
              <td><strong>Attending Doctor:</strong> ${activePatient.assignedDoctor?.name || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Admission Date:</strong> ${activePatient.admissionDate ? new Date(activePatient.admissionDate).toLocaleString() : 'N/A'}</td>
              <td><strong>Discharge Date:</strong> ${activePatient.dischargeDate ? new Date(activePatient.dischargeDate).toLocaleString() : 'Active Stay'}</td>
            </tr>
            <tr>
              <td><strong>Patient Type:</strong> ${activePatient.patientType || 'OP'}</td>
              <td><strong>Stay Status:</strong> ${activePatient.status}</td>
            </tr>
          </table>

          <div class="section">
            <h2>Chronological Timeline</h2>
            ${timelineHtml}
          </div>

          <div class="section">
            <h2>Account Ledger Statement</h2>
            ${billBreakdownHtml}
            
            ${billingData ? `
              <div style="margin-top: 15px; font-size: 11px; text-align: right; background: #f9f9f9; padding: 10px; border-radius: 6px;">
                <div>Total Billed: <strong>₹${billingData.billing?.totalAmount || 0}</strong></div>
                <div style="margin-top: 4px;">Amount Paid: <strong style="color: green;">₹${billingData.billing?.paidAmount || 0}</strong></div>
                <div style="margin-top: 4px; font-size: 13px; font-weight: bold;">Balance Due: <strong style="color: ${billingData.billing?.pendingAmount > 0 ? 'red' : 'black'};">₹${billingData.billing?.pendingAmount || 0}</strong></div>
              </div>
            ` : ''}
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const closeEMR = () => {
    setSearchParams({});
  };

  // ==========================================
  // VIEW: SINGLE EMR WORKSTATION
  // ==========================================
  if (activePatient) {
    if (loadingEMR) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-6 w-6 text-gray-500 animate-spin" />
        </div>
      );
    }

    const showDocConsult = user?.role === 'Doctor';
    const showNurseLog = user?.role === 'Nurse';
    const showAdminAction = user?.role === 'Hospital Admin' || user?.role === 'Super Admin';
    const isNurseToday = selectedNurseDate === 'Today';
    const parsedNurseSelDate = selectedNurseDate !== 'Today' ? parseProgressDate(selectedNurseDate) : new Date();

    return (
      <div className="space-y-6">
        {/* Back and title bar */}
        <div className="flex items-center justify-between border-b border-gray-250 dark:border-[#262626] pb-4">
          <button onClick={closeEMR} className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> EMR Directory
          </button>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handlePrintSummary}>Print Summary</Button>
            <Badge variant={
              activePatient.status === 'Admitted' ? 'green' :
              activePatient.status === 'Admission Pending' ? 'amber' :
              activePatient.status === 'Discharged' ? 'gray' : 'default'
            }>
              {activePatient.status}
            </Badge>
            {activePatient.isCritical && <Badge variant="red">Critical Alert</Badge>}
            {showAdminAction && (
              <Button variant="outline" size="sm" onClick={handleOpenEdit}>Edit Details</Button>
            )}
            {showAdminAction && activePatient.status === 'Admitted' && (
              <Button variant="danger" size="sm" onClick={handleDischargePatient}>Discharge</Button>
            )}
            {showAdminAction && (
              <Button variant="outline" size="sm" onClick={() => handleDeletePatient(activePatient._id)}>Delete Record</Button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-[#262626] gap-2 pb-px text-xs font-semibold">
          <button
            onClick={() => setActiveTab('care')}
            className={`px-4 py-2 border-b-2 transition-all ${
              activeTab === 'care'
                ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                : 'border-transparent text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            EMR Care Station
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 border-b-2 transition-all ${
              activeTab === 'timeline'
                ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                : 'border-transparent text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Patient Activity Timeline
          </button>
          {user?.role !== 'Doctor' && (
            <button
              onClick={() => setActiveTab('billing')}
              className={`px-4 py-2 border-b-2 transition-all ${
                activeTab === 'billing'
                  ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Billing & Invoices
            </button>
          )}
        </div>

        {activeTab === 'care' && (
          /* EMR Grid */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Column 1: Patient details & Timeline */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* EMR Demographics Card */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gray-150 dark:bg-[#1f1f1f] flex items-center justify-center text-gray-600 dark:text-gray-300">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-white">{activePatient.name}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Admission ID: {activePatient.admissionNumber}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400 block mb-0.5">Age / Gender</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{activePatient.age}y/o · {activePatient.gender}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Attending Doctor</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{activePatient.assignedDoctor?.name || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Bed Assignment</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {activePatient.assignedBed ? `${activePatient.assignedBed.bedNumber} (Ward: ${activePatient.assignedBed.ward})` : 'Unassigned'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Duty Nurse</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{activePatient.assignedNurse?.name || 'Unassigned'}</span>
                    </div>
                  </div>

                  {activePatient.diagnosis && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#1f1f1f] text-xs">
                      <span className="text-gray-400 block mb-1">Admitting Diagnosis</span>
                      <p className="text-gray-800 dark:text-gray-300 bg-gray-50 dark:bg-[#1a1a1a] p-2.5 rounded-lg border border-gray-100 dark:border-[#262626] font-medium leading-relaxed">{activePatient.diagnosis}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timeline Feed */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Patient Journey (Internal Timeline Log)</h3>
                  </div>
                </CardHeader>
                <CardContent className="p-5 max-h-[300px] overflow-y-auto">
                  <div className="space-y-4 relative border-l border-gray-200 dark:border-[#262626] pl-4 ml-2.5">
                    {activePatient.medicalTimeline?.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No events logged in patient journey.</p>
                    ) : (
                      activePatient.medicalTimeline.map(ev => (
                        <div key={ev._id} className="relative text-xs">
                          {/* Dot indicator */}
                          <div className="absolute -left-[22px] top-1.5 w-2 h-2 rounded-full bg-gray-900 dark:bg-white border-2 border-white dark:border-[#0a0a0a]" />
                          <span className="text-gray-450 block text-[10px]">{new Date(ev.time).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
                          <p className="text-gray-800 dark:text-gray-300 font-semibold mt-0.5">{ev.event}</p>
                          <span className="text-[10px] text-gray-500">By: {ev.userName} ({ev.userType})</span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Doctor Consultation Action Panel */}
              {showDocConsult && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Physician Consultation Workspace</h3>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleConsultSubmit} className="space-y-4">
                      <Input
                        label="Admitting Diagnosis"
                        value={diag}
                        onChange={e => setDiag(e.target.value)}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Clinical Notes / Symptoms</label>
                          <textarea
                            rows={3}
                            value={clinNotes}
                            onChange={e => setClinNotes(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white dark:bg-[#1a1a1a] dark:border-[#262626] dark:text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Treatment Plan</label>
                          <textarea
                            rows={3}
                            value={treatmentPlan}
                            onChange={e => setTreatmentPlan(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white dark:bg-[#1a1a1a] dark:border-[#262626] dark:text-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Prescription Plan</label>
                          <textarea
                            rows={3}
                            value={prescr}
                            onChange={e => setPrescr(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white dark:bg-[#1a1a1a] dark:border-[#262626] dark:text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Tests Ordered</label>
                          <textarea
                            rows={3}
                            value={testsOrdered}
                            onChange={e => setTestsOrdered(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white dark:bg-[#1a1a1a] dark:border-[#262626] dark:text-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-gray-100 dark:border-[#1f1f1f]">
                        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                            <input
                              type="checkbox"
                              checked={critVal}
                              onChange={e => setCritVal(e.target.checked)}
                              className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 h-4 w-4"
                            />
                            Mark Patient Critical
                          </label>
                          <Input
                            label="Follow-Up Schedule"
                            type="date"
                            value={followUp}
                            onChange={e => setFollowUp(e.target.value)}
                            className="text-xs"
                          />
                          <div className="flex-1 min-w-[200px]">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Follow-up Notes</label>
                            <input
                              type="text"
                              value={followUpNotes}
                              onChange={e => setFollowUpNotes(e.target.value)}
                              placeholder="e.g. Bring scan reports"
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-205 bg-white dark:bg-[#1a1a1a] dark:border-[#262626] dark:text-white outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {activePatient.status === 'Registered' && (
                            <Button type="button" variant="outline" onClick={() => setDialogAdmOpen(true)}>
                              Request Admission
                            </Button>
                          )}
                          <Button type="submit" variant="primary">Save Consultation Plan</Button>
                        </div>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
                   {/* Column 2: Nurse Station / Tasks */}
            <div className="space-y-6">
              
              {/* Date Selector for Nurse dashboard */}
              {activePatient.status === 'Admitted' && (
                <Card className="border border-gray-250 dark:border-[#262626]">
                  <CardContent className="p-3 flex items-center justify-between gap-4 text-xs font-semibold">
                    <span className="text-[10px] font-bold text-gray-455 uppercase tracking-widest font-mono">Select Work Date</span>
                    <select
                      value={selectedNurseDate}
                      onChange={e => setSelectedNurseDate(e.target.value)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white dark:bg-[#1a1a1a] dark:border-[#262626] dark:text-white outline-none cursor-pointer focus:border-gray-900"
                    >
                      {getNurseDatesList(activePatient).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </CardContent>
                </Card>
              )}

              {/* Admitted Patient Live Vitals */}
              {activePatient.status === 'Admitted' && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-gray-500 animate-pulse text-red-500" />
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Active Vitals Monitoring</h3>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    
                    {/* Vitals Form */}
                    {showNurseLog && isNurseToday ? (
                      <form onSubmit={handleVitalsSubmit} className="grid grid-cols-2 gap-2 text-xs">
                        <Input placeholder="BP (e.g. 120/80)" value={bp} onChange={e => setBp(e.target.value)} />
                        <Input placeholder="Pulse (bpm)" type="number" value={hr} onChange={e => setHr(e.target.value)} />
                        <Input placeholder="Temp (°C)" type="number" step="0.1" value={temp} onChange={e => setTemp(e.target.value)} />
                        <Input placeholder="SpO2 (%)" type="number" value={o2} onChange={e => setO2(e.target.value)} />
                        <Input placeholder="Resp (bpm)" type="number" value={resp} onChange={e => setResp(e.target.value)} />
                        <Input placeholder="Weight (kg)" type="number" value={wt} onChange={e => setWt(e.target.value)} />
                        <Button type="submit" variant="outline" className="col-span-2 text-xs py-1.5 mt-1.5">Save Vitals Log</Button>
                      </form>
                    ) : (
                      !isNurseToday && (
                        <div className="p-2 text-center text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-black rounded-lg border border-gray-150 dark:border-neutral-900">
                          Read-Only Historical Logs
                        </div>
                      )
                    )}

                    {/* Vitals History list */}
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      <span className="font-bold text-gray-555 block text-[10px] uppercase tracking-wider">Vitals History for {selectedNurseDate}:</span>
                      {(() => {
                        const filteredVitals = activePatient.vitalsHistory?.filter((v: any) => 
                          isSameDate(new Date(v.recordedAt), parsedNurseSelDate)
                        ) || [];

                        if (filteredVitals.length === 0) {
                          return <p className="text-gray-400 italic text-center py-6 text-[11px]">No vitals recorded on this date.</p>;
                        }

                        return filteredVitals.slice().reverse().map((v, i) => (
                          <div key={i} className="p-2 border border-gray-150 dark:border-[#1f1f1f] rounded-lg text-[10px] bg-gray-50 dark:bg-black font-semibold space-y-1">
                            <div className="flex justify-between items-center text-gray-450 text-[9px]">
                              <span>{new Date(v.recordedAt).toLocaleString()}</span>
                              <span>By: {v.nurseName}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100 dark:border-neutral-900">
                              {v.bloodPressure && <span>BP: <span className="text-slate-800 dark:text-slate-200">{v.bloodPressure}</span></span>}
                              {v.heartRate && <span>HR: <span className="text-slate-800 dark:text-slate-200">{v.heartRate}</span></span>}
                              {v.temperature && <span>Temp: <span className="text-slate-800 dark:text-slate-200">{v.temperature}°C</span></span>}
                              {v.spo2 && <span>SpO2: <span className="text-slate-800 dark:text-slate-200">{v.spo2}%</span></span>}
                              {v.respirationRate && <span>Resp: <span className="text-slate-800 dark:text-slate-200">{v.respirationRate}</span></span>}
                              {v.weight && <span>Wt: <span className="text-slate-800 dark:text-slate-200">{v.weight}kg</span></span>}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Nurse daily Checklist tasks */}
              {activePatient.status === 'Admitted' && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-gray-500" />
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Duty Nursing Checklist</h3>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[320px] overflow-y-auto text-xs pr-1">
                      {activePatient.nursingLogs?.length === 0 ? (
                        <p className="text-gray-400 italic text-center py-6">Checklist tasks empty.</p>
                      ) : (
                        ['Morning', 'Afternoon', 'Evening'].map(shift => {
                          const shiftTasks = activePatient.nursingLogs.filter(t => t.shift === shift);
                          if (shiftTasks.length === 0) return null;

                          return (
                            <div key={shift} className="space-y-1.5">
                              <span className="font-bold text-gray-400 block text-[9px] uppercase tracking-widest">{shift} Shift Checklist</span>
                              <div className="space-y-1">
                                {shiftTasks.map(task => {
                                  const isTaskCompletedOnDate = !!(task.completed && task.completedAt && isSameDate(new Date(task.completedAt), parsedNurseSelDate));
                                  return (
                                    <label key={task._id} className="flex items-center gap-2 text-slate-800 dark:text-slate-350 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        disabled={!showNurseLog || !isNurseToday}
                                        checked={isTaskCompletedOnDate}
                                        onChange={e => handleToggleTask(task._id, e.target.checked)}
                                        className="rounded border-gray-305 text-gray-900 focus:ring-gray-900 h-3.5 w-3.5"
                                      />
                                      <span className={isTaskCompletedOnDate ? "line-through text-gray-400 font-medium" : "font-medium"}>{task.taskName}</span>
                                      {isTaskCompletedOnDate && <span className="text-[9px] text-gray-400 font-normal">({task.nurseName})</span>}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Nurse Shift Observations / Notes Log Card */}
              {activePatient.status === 'Admitted' && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Observations Log</h3>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {showNurseLog && isNurseToday && (
                      <form onSubmit={handleNoteSubmit} className="space-y-2">
                        <textarea
                          rows={2}
                          value={nNote}
                          onChange={e => setNNote(e.target.value)}
                          placeholder="Add shift clinical observations..."
                          className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white dark:bg-[#1a1a1a] dark:border-[#262626] dark:text-white outline-none placeholder-gray-550"
                          required
                        />
                        <Button type="submit" variant="primary" className="w-full text-xs py-1.5">Save Log</Button>
                      </form>
                    )}

                    {/* Observations history */}
                    <div className="space-y-2 max-h-[160px] overflow-y-auto text-xs pr-1">
                      <span className="font-bold text-gray-555 block">Shift Notes history for {selectedNurseDate}:</span>
                      {(() => {
                        const filteredNotes = activePatient.nurseNotes?.filter((n: any) => 
                          isSameDate(new Date(n.recordedAt), parsedNurseSelDate)
                        ) || [];

                        if (filteredNotes.length === 0) {
                          return <p className="text-gray-400 italic text-center py-6">No observations logged on this date.</p>;
                        }

                        return filteredNotes.map((note, index) => (
                          <div key={index} className="p-2 border border-gray-150 dark:border-[#1f1f1f] rounded-lg space-y-1 bg-gray-50 dark:bg-black">
                            <div className="flex justify-between items-center text-[10px] text-gray-450">
                              <span>{new Date(note.recordedAt).toLocaleString()}</span>
                              <span>Nurse: {note.nurseName}</span>
                            </div>
                            <p className="text-gray-800 dark:text-gray-300 font-medium leading-relaxed">"{note.note}"</p>
                          </div>
                        ));
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Patient Activity Timeline</h3>
              {user?.role !== 'Doctor' && (
                <Button onClick={() => setIsCustomActOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Log Custom Activity
                </Button>
              )}
            </div>

            <Card>
              <CardContent className="p-5">
                <div className="space-y-6 relative border-l border-gray-200 dark:border-[#262626] pl-6 ml-4">
                  {isActivitiesLoading ? (
                    <div className="py-8 text-center">
                      <RefreshCw className="h-5 w-5 text-gray-555 animate-spin mx-auto" />
                    </div>
                  ) : activities.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-6">No activities recorded in the timeline.</p>
                  ) : (
                    activities.map((act) => (
                      <div key={act._id} className="relative text-xs">
                        {/* Bullet indicators based on type */}
                        <div className="absolute -left-[30px] top-1.5 w-3.5 h-3.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-2 border-white dark:border-[#0a0a0a] flex items-center justify-center text-[8px] font-bold">
                          {act.activityType[0]}
                        </div>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-1">
                          <div>
                            <span className="text-gray-455 text-[10px] font-mono font-semibold">
                              {new Date(act.date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })} · {act.time}
                            </span>
                            <p className="text-sm font-bold text-gray-850 dark:text-gray-250 mt-0.5">{act.description}</p>
                            {act.remarks && <p className="text-xs italic text-gray-400 mt-1">Remarks: {act.remarks}</p>}
                            <span className="text-[10px] text-gray-555 block mt-1">
                              Logged by: <span className="font-semibold">{act.performedBy?.name || 'System'}</span> ({act.role})
                            </span>
                          </div>
                          {user?.role !== 'Doctor' && (
                            <div className="text-right shrink-0 mt-1 sm:mt-0">
                              <span className="text-sm font-black text-gray-900 dark:text-white">₹{act.amount}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Custom Activity Dialog */}
            <Dialog isOpen={isCustomActOpen} onClose={() => setIsCustomActOpen(false)} title="Log Custom Patient Activity / Service">
              <form onSubmit={handleAddCustomActivity} className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Activity Category</label>
                  <select
                    value={customActType}
                    onChange={e => setCustomActType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white dark:bg-[#1a1a1a] dark:border-[#262626] dark:text-white outline-none"
                  >
                    <option value="Consultation">Consultation / Physician Visit</option>
                    <option value="Vitals Check">Vitals Checked</option>
                    <option value="Diagnostic">Diagnostic Scan / Lab Test</option>
                    <option value="Food">Food / Hospitality</option>
                    <option value="Medicine">Medication Administered</option>
                    <option value="Other">Other Miscellaneous Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Select Service Template (Optional)</label>
                  <select
                    value={customActPriceKey}
                    onChange={e => {
                      setCustomActPriceKey(e.target.value);
                      const matched = priceList.find(p => p.key === e.target.value);
                      if (matched) {
                        setCustomActDesc(matched.name);
                        setCustomActAmount(String(matched.price));
                      } else {
                        setCustomActDesc('');
                        setCustomActAmount('');
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white dark:bg-[#1a1a1a] dark:border-[#262626] dark:text-white outline-none"
                  >
                    <option value="">-- Custom Price Input --</option>
                    {priceList
                      .filter(p => p.price > 0)
                      .map(p => (
                        <option key={p.key} value={p.key}>{p.name} (₹{p.price})</option>
                      ))}
                  </select>
                </div>

                <Input
                  label="Description / Service Name"
                  placeholder="e.g. Blood Test, Chest X-Ray"
                  value={customActDesc}
                  onChange={e => setCustomActDesc(e.target.value)}
                  required
                />

                {!customActPriceKey && (
                  <Input
                    label="Amount (INR)"
                    type="number"
                    placeholder="₹ Charge amount"
                    value={customActAmount}
                    onChange={e => setCustomActAmount(e.target.value)}
                    required
                  />
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Remarks / Details</label>
                  <textarea
                    placeholder="Diagnostic report number, medicine brand name..."
                    value={customActRemarks}
                    onChange={e => setCustomActRemarks(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white dark:bg-[#1a1a1a] dark:border-[#262626] dark:text-white outline-none h-16 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#1f1f1f]">
                  <Button type="button" variant="outline" onClick={() => setIsCustomActOpen(false)}>Cancel</Button>
                  <Button type="submit">Log Activity & Update Bill</Button>
                </div>
              </form>
            </Dialog>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              
              {/* Account statement invoice box */}
              <Card className="border border-gray-250 dark:border-[#262626] shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-[#1f1f1f] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Hospital Ledger Invoice</h3>
                    {billingData?.billing?.invoiceNumber ? (
                      <p className="text-[10px] text-gray-450 font-mono mt-0.5">Invoice: {billingData.billing.invoiceNumber} (Finalized)</p>
                    ) : (
                      <p className="text-[10px] text-amber-600 dark:text-amber-550 font-bold mt-0.5">Active Billing Session (Unfinalized)</p>
                    )}
                  </div>
                  <Badge variant={billingData?.billing?.paymentStatus === 'Paid' ? 'green' : 'amber'}>
                    {billingData?.billing?.paymentStatus || 'Pending'}
                  </Badge>
                </CardHeader>
                <CardContent className="p-5 space-y-6">
                  
                  {/* Stay details metrics */}
                  <div className="grid grid-cols-3 gap-4 text-xs bg-gray-50 dark:bg-black p-3.5 rounded-xl border border-gray-155 dark:border-[#1f1f1f]">
                    <div>
                      <span className="text-gray-400 block mb-0.5">Admission Date</span>
                      <span className="font-semibold">{activePatient.admissionDate ? new Date(activePatient.admissionDate).toLocaleString() : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Discharge Date</span>
                      <span className="font-semibold">{activePatient.dischargeDate ? new Date(activePatient.dischargeDate).toLocaleString() : 'Active Stay'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Current Stay Duration</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {billingData?.stayDetails 
                          ? `${billingData.stayDetails.stayDays} Day(s)`
                          : activePatient.admissionDate 
                            ? `${Math.ceil((new Date(activePatient.dischargeDate || Date.now()).getTime() - new Date(activePatient.admissionDate).getTime()) / (1000 * 60 * 60 * 24)) || 1} Day(s)`
                            : 'N/A'
                        }
                      </span>
                    </div>
                  </div>

                  {/* Itemized bill details */}
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block border-b border-gray-100 dark:border-[#1f1f1f] pb-2">Itemized Ledger Accounts</span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-gray-155 dark:border-[#262626] text-gray-400 text-[10px] font-bold">
                            <th className="pb-2">Details</th>
                            <th className="pb-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-[#1f1f1f]">
                          {/* Static pre-calculated active stays if currently admitted */}
                          {billingData?.stayDetails?.bedCharge?.amount > 0 && (
                            <tr>
                              <td className="py-2.5">
                                <p className="font-bold text-slate-900 dark:text-slate-100">{billingData.stayDetails.bedCharge.name}</p>
                                <p className="text-[10px] text-gray-455 mt-0.5">Stay: {billingData.stayDetails.bedCharge.days} day(s) @ ₹{billingData.stayDetails.bedCharge.rate}/day</p>
                              </td>
                              <td className="py-2.5 text-right font-bold text-slate-900 dark:text-slate-100">₹{billingData.stayDetails.bedCharge.amount}</td>
                            </tr>
                          )}
                          
                          {billingData?.stayDetails?.equipmentCharges?.map((eq: any, idx: number) => (
                            <tr key={idx}>
                              <td className="py-2.5">
                                <p className="font-bold text-slate-900 dark:text-slate-100">{eq.name}</p>
                                <p className="text-[10px] text-gray-455 mt-0.5">
                                  Duration: {eq.hours ? `${eq.hours} hour(s) @ ₹${eq.rate}/hour` : `${eq.days} day(s) @ ₹${eq.rate}/day`}
                                </p>
                              </td>
                              <td className="py-2.5 text-right font-bold text-slate-900 dark:text-slate-100">₹{eq.amount}</td>
                            </tr>
                          ))}
                          {/* Logged Activities */}
                          {isBillingLoading ? (
                            <tr>
                              <td colSpan={2} className="text-center py-4">
                                <RefreshCw className="h-4 w-4 animate-spin mx-auto text-gray-500" />
                              </td>
                            </tr>
                          ) : (billingData?.billing?.activities || []).length === 0 && !billingData?.stayDetails?.bedCharge?.amount ? (
                            <tr>
                              <td colSpan={2} className="text-center py-4 text-gray-400 italic">No billed services logged yet.</td>
                            </tr>
                          ) : (
                            (billingData?.billing?.activities || []).map((act: any) => (
                              <tr key={act._id}>
                                <td className="py-2.5">
                                  <p className="font-bold text-slate-900 dark:text-slate-100">{act.description}</p>
                                  <p className="text-[10px] text-gray-455 mt-0.5">{new Date(act.date).toLocaleDateString()} · {act.activityType} · By: {act.performedBy?.name || 'System'}</p>
                                </td>
                                <td className="py-2.5 text-right font-bold text-slate-900 dark:text-slate-100">₹{act.amount}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Column 2: Sticky bill summary card on the right */}
            <div className="space-y-4">
              <Card className="sticky top-6">
                <CardHeader className="bg-gray-50 dark:bg-black border-b border-gray-150 dark:border-[#1f1f1f] pb-3">
                  <h4 className="text-xs font-bold text-gray-450 uppercase tracking-widest">Account summary</h4>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Gross Total Charge</span>
                      <span className="font-bold">₹{billingData?.billing?.totalAmount || 0}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Amount Paid</span>
                      <span>₹{billingData?.billing?.paidAmount || 0}</span>
                    </div>
                    <div className="border-t border-gray-100 dark:border-[#1f1f1f] pt-2 flex justify-between text-sm font-black text-gray-900 dark:text-white">
                      <span>Balance Due</span>
                      <span className={billingData?.billing?.pendingAmount > 0 ? "text-red-500" : ""}>₹{billingData?.billing?.pendingAmount || 0}</span>
                    </div>
                  </div>

                  {/* Actions for Reception Staff & Admins */}
                  {(user?.role === 'Reception Staff' || user?.role === 'Hospital Admin' || user?.role === 'Super Admin') && (
                    <div className="pt-4 border-t border-gray-100 dark:border-[#1f1f1f] space-y-3">
                      
                      {/* Discharge Billing Finalization */}
                      {!billingData?.billing?.invoiceNumber && activePatient.status === 'Discharged' && (
                        <Button className="w-full text-xs font-bold py-2.5" onClick={handleGenerateInvoice}>
                          Generate Final Invoice
                        </Button>
                      )}

                      {/* Payment Recorder form */}
                      {billingData?.billing?.pendingAmount > 0 && (
                        <form onSubmit={handleRecordPayment} className="space-y-2">
                          <label className="block text-[10px] font-bold text-gray-455 uppercase tracking-wide">Record Payment Entry</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              placeholder="₹ Amount"
                              value={paymentAmount}
                              onChange={e => setPaymentAmount(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-205 bg-white dark:bg-[#1a1a1a] dark:border-[#262626] dark:text-white outline-none"
                              required
                            />
                            <Button type="submit" size="sm" isLoading={recordingPayment}>Pay</Button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  <Button variant="outline" className="w-full text-xs py-2" onClick={handlePrintSummary}>
                    Print Summary Statement
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      {/* PATIENT EDIT / DETAILS DIALOG (Admin only) */}
      <Dialog isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Patient Details">
        <form onSubmit={handleEditPatient} className="space-y-4">
          {editError && <div className="p-3 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg">{editError}</div>}
          
          <Input
            label="Patient Name"
            placeholder="e.g. Bruce Banner"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Age"
              type="number"
              value={editAge}
              onChange={e => setEditAge(Number(e.target.value))}
              required
            />
            <Select
              label="Gender"
              value={editGender}
              onChange={e => setEditGender(e.target.value as any)}
              options={[
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' }
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Attending Doctor"
              value={editDoctor}
              onChange={e => setEditDoctor(e.target.value)}
              options={[
                { value: '', label: '-- Choose Doctor --' },
                ...doctors.map(d => ({ value: d._id, label: d.name }))
              ]}
              required
            />
            <Select
              label="Patient Entry Type"
              value={editPatientType}
              onChange={e => {
                setEditPatientType(e.target.value as any);
                if (e.target.value === 'OP') {
                  setEditBed('');
                  setEditNurse('');
                  if (editStatus === 'Admitted') {
                    setEditStatus('Registered');
                  }
                }
              }}
              options={[
                { value: 'OP', label: 'Outpatient (OP)' },
                { value: 'IP', label: 'Inpatient (IP)' }
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Patient Status"
              value={editStatus}
              onChange={e => {
                setEditStatus(e.target.value);
                if (e.target.value !== 'Admitted') {
                  setEditBed('');
                  setEditNurse('');
                }
              }}
              options={[
                { value: 'Registered', label: 'Registered' },
                { value: 'Admission Pending', label: 'Admission Pending' },
                { value: 'Admitted', label: 'Admitted' },
                { value: 'Discharged', label: 'Discharged' }
              ]}
              required
            />
            <Input
              label="Admitting Diagnosis / Notes"
              placeholder="e.g. Regular checkup"
              value={editDiagnosis}
              onChange={e => setEditDiagnosis(e.target.value)}
            />
          </div>

          {editStatus === 'Admitted' && (
            <div className="grid grid-cols-2 gap-4 animate-fade-in bg-gray-50 dark:bg-black p-3.5 rounded-xl border border-gray-155 dark:border-[#1f1f1f]">
              <Select
                label="Assign Bed"
                value={editBed}
                onChange={e => setEditBed(e.target.value)}
                options={[
                  { value: '', label: '-- Select Bed --' },
                  ...beds
                    .filter(b => b.status === 'Available' || b._id === (activePatient?.assignedBed?._id || activePatient?.assignedBed))
                    .map(b => ({ value: b._id, label: `${b.bedNumber} (${b.bedType} - ${b.ward})` }))
                ]}
                required
              />
              <Select
                label="Assign Nurse"
                value={editNurse}
                onChange={e => setEditNurse(e.target.value)}
                options={[
                  { value: '', label: '-- Select Nurse --' },
                  ...nurses.map(n => ({ value: n._id, label: n.name }))
                ]}
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#1f1f1f] mt-6">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Changes</Button>
          </div>
        </form>
      </Dialog>
      </div>
    );
  }

  // ==========================================
  // VIEW: PATIENT SEARCH DIRECTORY LIST
  // ==========================================
  const canRegister = hasRole(['Hospital Admin', 'Super Admin', 'Reception Staff']);
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">EMR Directory Search</h1>
          <p className="text-xs text-gray-500 mt-0.5">Access electronic medical health files and coordinate patient intake registers.</p>
        </div>
        {canRegister && (
          <Button onClick={() => setIsRegOpen(true)} className="sm:self-start">
            <Plus className="h-4 w-4 mr-1.5" /> Patient Intake Register
          </Button>
        )}
      </div>

      {error && <div className="p-3 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg">{error}</div>}

      {/* Directory Search controls */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:max-w-xl items-start sm:items-center">
            <div className="relative w-full sm:max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search by name, ID, or diagnosis..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 border rounded-lg text-sm bg-white dark:bg-[#1a1a1a] dark:border-[#262626] text-gray-900 dark:text-white outline-none transition-colors focus:border-gray-900 dark:focus:border-white focus:ring-1 focus:ring-gray-900"
              />
            </div>

            {user?.role === 'Doctor' && (
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  checked={myPatientsOnly}
                  onChange={e => setMyPatientsOnly(e.target.checked)}
                  className="rounded border-gray-350 text-gray-900 focus:ring-gray-900 h-4 w-4"
                />
                My Patients Only
              </label>
            )}
          </div>

          <div className="flex bg-gray-100 dark:bg-[#141414] p-1 rounded-lg gap-1 self-stretch sm:self-auto text-xs">
            {['', 'Registered', 'Admission Pending', 'Admitted', 'Discharged'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 font-semibold rounded-md transition-all ${
                  filterStatus === status
                    ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {status || 'All'}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Directory list of Patients */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="py-12 flex justify-center">
            <RefreshCw className="h-6 w-6 text-gray-550 animate-spin" />
          </div>
        ) : patients.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-12">No patient files found</p>
        ) : (
          patients.map(p => (
            <Card key={p._id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSearchParams({ id: p._id })}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-gray-905 dark:text-gray-250">{p.name}</p>
                    <Badge variant={
                      p.status === 'Admitted' ? 'green' :
                      p.status === 'Admission Pending' ? 'amber' :
                      p.status === 'Discharged' ? 'gray' : 'default'
                    }>
                      {p.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-gray-455 font-semibold">
                    {p.admissionNumber} · {p.age}y/o · {p.gender} · Attending Doc: {p.assignedDoctor?.name || 'TBD'}
                  </p>
                  {p.diagnosis && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{p.diagnosis}</p>}
                </div>
                <div className="text-[10px] text-gray-500 shrink-0 self-end sm:self-center font-mono">
                  Timeline: {p.medicalTimeline?.length || 0} events
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* PATIENT REGISTRATION / INTAKE DIALOG (Admin only) */}
      <Dialog isOpen={isRegOpen} onClose={() => setIsRegOpen(false)} title="Patient Intake Registration">
        <form onSubmit={handleRegisterPatient} className="space-y-4">
          {regError && <div className="p-3 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg">{regError}</div>}
          
          <Input
            label="Patient Name"
            placeholder="e.g. Bruce Banner"
            value={regName}
            onChange={e => setRegName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Age"
              type="number"
              value={regAge}
              onChange={e => setRegAge(Number(e.target.value))}
              required
            />
            <Select
              label="Gender"
              value={regGender}
              onChange={e => setRegGender(e.target.value as any)}
              options={[
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' }
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Attending Doctor"
              value={regDoctor}
              onChange={e => setRegDoctor(e.target.value)}
              options={[
                { value: '', label: '-- Choose Doctor --' },
                ...doctors.map(d => ({ value: d._id, label: d.name }))
              ]}
              required
            />
            <Select
              label="Patient Entry Type"
              value={regPatientType}
              onChange={e => {
                setRegPatientType(e.target.value as any);
                if (e.target.value === 'OP') {
                  setRegBed('');
                  setRegNurse('');
                }
              }}
              options={[
                { value: 'OP', label: 'Outpatient (OP)' },
                { value: 'IP', label: 'Inpatient (IP)' }
              ]}
              required
            />
          </div>

          {regPatientType === 'IP' && (
            <div className="grid grid-cols-2 gap-4 animate-fade-in bg-gray-50 dark:bg-black p-3.5 rounded-xl border border-gray-155 dark:border-[#1f1f1f]">
              <Select
                label="Assign Bed"
                value={regBed}
                onChange={e => setRegBed(e.target.value)}
                options={[
                  { value: '', label: '-- Select Bed --' },
                  ...beds
                    .filter(b => b.status === 'Available')
                    .map(b => ({ value: b._id, label: `${b.bedNumber} (${b.bedType} - ${b.ward})` }))
                ]}
                required
              />
              <Select
                label="Assign Nurse"
                value={regNurse}
                onChange={e => setRegNurse(e.target.value)}
                options={[
                  { value: '', label: '-- Select Nurse --' },
                  ...nurses.map(n => ({ value: n._id, label: n.name }))
                ]}
                required
              />
            </div>
          )}

          <Input
            label="Admitting Notes / Main Symptom"
            placeholder="e.g. Regular health examination, routine lab tests"
            value={regDiagnosis}
            onChange={e => setRegDiagnosis(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#1f1f1f] mt-6">
            <Button type="button" variant="outline" onClick={() => setIsRegOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Register Patient</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
export default Patients;
