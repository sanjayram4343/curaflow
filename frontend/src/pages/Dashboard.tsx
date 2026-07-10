import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Card, CardHeader, CardContent, Button, Badge, Dialog } from '../components/ui';
import { useNavigate } from 'react-router-dom';
import {
  Users, Activity, Bed, Cpu, Plus, CheckCircle, Clock,
  AlertOctagon, Calendar, Heart, ShieldAlert, ArrowRight, UserPlus,
  DollarSign, FileText, Printer, Trash2, Coins, Receipt, Search,
  Building, Server, Wifi, ShieldCheck, RefreshCw
} from 'lucide-react';

interface Patient {
  _id: string;
  name: string;
  age: number;
  gender: string;
  admissionNumber: string;
  status: 'Registered' | 'Admission Pending' | 'Admitted' | 'Discharged';
  diagnosis?: string;
  isCritical?: boolean;
  needsIcu?: boolean;
  requestedEquipmentType?: string;
  assignedBed?: any;
  assignedNurse?: any;
  assignedDoctor?: any;
  nursingLogs?: any[];
  patientType?: 'OP' | 'IP';
  paymentStatus?: 'Paid' | 'Pending' | 'Partially Paid';
  admissionDate?: string;
  dischargeDate?: string;
}

interface DBBed {
  _id: string;
  bedNumber: string;
  bedType: string;
  status: string;
  ward: string;
  assignedPatient?: any;
  hospital?: any;
}

interface DBEquipment {
  _id: string;
  name: string;
  category: string;
  status: string;
  serialNumber: string;
  assignedPatient?: any;
}

interface DBNurse {
  _id: string;
  name: string;
}

export const Dashboard: React.FC = () => {
  const { user, activeDoctor, activeNurse } = useAuth();
  const navigate = useNavigate();

  // Common loading / error state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receptionData, setReceptionData] = useState<any>(null);

  // Billing Counter states
  const [patientsList, setPatientsList] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [billingDetails, setBillingDetails] = useState<any>(null);
  const [patientActivities, setPatientActivities] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [billFilter, setBillFilter] = useState<'All' | 'Pending' | 'Paid' | 'Partially Paid'>('All');

  // Custom charge form
  const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);
  const [chargeName, setChargeName] = useState('');
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargePriceKey, setChargePriceKey] = useState('');
  const [priceList, setPriceList] = useState<any[]>([]);

  // Payment input
  const [paymentAmtInput, setPaymentAmtInput] = useState('');
  const [isSubmittingBillAction, setIsSubmittingBillAction] = useState(false);

  // Doctor state
  const [docPatients, setDocPatients] = useState<Patient[]>([]);
  const [expandedPatientChecklist, setExpandedPatientChecklist] = useState<string | null>(null);

  // Nurse state
  const [nursePatients, setNursePatients] = useState<Patient[]>([]);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);

  // Admin state
  const [pendingAdmissions, setPendingAdmissions] = useState<Patient[]>([]);
  const [allBeds, setAllBeds] = useState<DBBed[]>([]);
  const [allEq, setAllEq] = useState<DBEquipment[]>([]);
  const [nursesList, setNursesList] = useState<DBNurse[]>([]);

  // Approval modal states
  const [selectedRequest, setSelectedRequest] = useState<Patient | null>(null);
  const [targetBed, setTargetBed] = useState('');
  const [targetNurse, setTargetNurse] = useState('');
  const [targetEq, setTargetEq] = useState<string[]>([]);
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // Track which analytics card was clicked for detail modal popup
  const [selectedAnalyticsType, setSelectedAnalyticsType] = useState<'ICU' | 'General' | 'Equipment' | null>(null);

  // Super Admin state
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [logSearch, setLogSearch] = useState('');

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      if (user.role === 'Doctor' && activeDoctor) {
        const res = await api.get(`/patients?assignedDoctor=${activeDoctor._id}`);
        setDocPatients(res.patients || []);
      } else if (user.role === 'Nurse' && activeNurse) {
        const res = await api.get(`/patients?assignedNurse=${activeNurse._id}`);
        const list: Patient[] = res.patients || [];
        setNursePatients(list);

        // Calculate shift tasks from assigned patients
        let pending = 0;
        let completed = 0;
        list.forEach((p: any) => {
          if (p.nursingLogs) {
            p.nursingLogs.forEach((log: any) => {
              if (log.completed) completed++;
              else pending++;
            });
          }
        });
        setPendingTasksCount(pending);
        setCompletedTasksCount(completed);
      } else if (user.role === 'Hospital Admin') {
        const [patientsRes, bedsRes, eqRes, usersRes] = await Promise.all([
          api.get('/patients?status=Admission Pending'),
          api.get('/beds?limit=100'),
          api.get('/equipment?limit=100'),
          api.get('/auth/users')
        ]);
        setPendingAdmissions(patientsRes.patients || []);
        setAllBeds(bedsRes.beds || []);
        setAllEq(eqRes.equipment || []);
        setNursesList(usersRes.filter((u: any) => u.role === 'Nurse'));
      } else if (user.role === 'Super Admin') {
        const [hospRes, logsRes] = await Promise.all([
          api.get('/hospitals').catch(() => []),
          api.get('/audit-logs?limit=1000').catch(() => ({ logs: [] }))
        ]);
        setHospitals(hospRes || []);
        setRecentLogs(logsRes.logs || []);
      } else if (user.role === 'Reception Staff') {
        const [repRes, patientsRes, pricingRes] = await Promise.all([
          api.get('/reports/reception'),
          api.get('/patients?limit=1000'),
          api.get('/pricing')
        ]);
        setReceptionData(repRes);
        setPatientsList(patientsRes.patients || []);
        setPriceList(pricingRes || []);
      }
    } catch (err: any) {
      setError('Failed to refresh workstation statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, activeDoctor, activeNurse]);

  const fetchSelectedPatientBilling = async (id: string) => {
    try {
      setLoading(true);
      const [billData, actData] = await Promise.all([
        api.get(`/patients/${id}/billing`),
        api.get(`/patients/${id}/activities`)
      ]);
      setBillingDetails(billData);
      setPatientActivities(actData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch billing ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'Reception Staff' && selectedPatientId) {
      fetchSelectedPatientBilling(selectedPatientId);
    } else {
      setBillingDetails(null);
      setPatientActivities([]);
    }
  }, [selectedPatientId]);

  const handleOpenApproval = (req: Patient) => {
    setSelectedRequest(req);
    setTargetBed('');
    setTargetNurse('');
    setTargetEq([]);
    setFormError('');
  };

  const [formError, setFormError] = useState('');

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !targetBed || !targetNurse) {
      setFormError('Please select both a bed and a nurse.');
      return;
    }
    setSubmittingApproval(true);
    setFormError('');
    try {
      await api.put(`/patients/${selectedRequest._id}/approve-admission`, {
        assignedBed: targetBed,
        assignedNurse: targetNurse,
        assignedEquipment: targetEq
      });
      setSelectedRequest(null);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Approval process failed.');
    } finally {
      setSubmittingApproval(false);
    }
  };

  const [selectedHospDetail, setSelectedHospDetail] = useState<any | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-7 h-7 border-2 border-gray-200 dark:border-[#333] border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // ==========================================
  // 1. DOCTOR WORKSTATION DASHBOARD
  // ==========================================
  if (user?.role === 'Doctor') {
    const waiting = docPatients.filter(p => p.status === 'Registered');
    const critical = docPatients.filter(p => p.isCritical && p.status === 'Admitted');
    const admitted = docPatients.filter(p => p.status === 'Admitted' && !p.isCritical);
    const pending = docPatients.filter(p => p.status === 'Admission Pending');

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Physician Workstation</h1>
          <p className="text-xs text-gray-550 mt-0.5">Active Doctor: <span className="font-semibold text-gray-700 dark:text-gray-300">{activeDoctor?.name}</span></p>
        </div>

        {error && <div className="p-3 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg">{error}</div>}

        {/* Status Counts cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Waiting List</span>
                <Clock className="h-4 w-4 text-gray-500" />
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{waiting.length}</p>
              <p className="text-xs text-gray-405 mt-1">Pending consultation</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Critical Roster</span>
                <AlertOctagon className="h-4 w-4 text-gray-950 dark:text-white" />
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{critical.length}</p>
              <p className="text-xs text-gray-405 mt-1">High monitoring need</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Admitted Patients</span>
                <Bed className="h-4 w-4 text-gray-500" />
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{admitted.length}</p>
              <p className="text-xs text-gray-405 mt-1">Active ward care</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Requested Adms</span>
                <Clock className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{pending.length}</p>
              <p className="text-xs text-gray-405 mt-1">Awaiting admin approval</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Worklist grids */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Waiting Patients */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Waiting & Consultations</h2>
              <Badge variant="default">{waiting.length} Waiting</Badge>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-gray-100 dark:divide-[#1f1f1f]">
              {waiting.length === 0 ? (
                <p className="text-center text-xs text-gray-450 py-10">No waiting patients registered today</p>
              ) : (
                waiting.map(p => (
                  <div key={p._id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
                    <div>
                      <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{p.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">ID: {p.admissionNumber} · Age: {p.age} · Gender: {p.gender}</p>
                      {p.diagnosis && <p className="text-xs italic text-gray-400 mt-1">Ref: {p.diagnosis}</p>}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/patients?id=${p._id}`)}>
                      Open EMR <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Admitted & Critical */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Admitted Patients</h2>
              <Badge variant="green">{admitted.length + critical.length} Active</Badge>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-gray-100 dark:divide-[#1f1f1f]">
              {admitted.length + critical.length === 0 ? (
                <p className="text-center text-xs text-gray-450 py-10">No patients currently admitted under your care</p>
              ) : (
                [...critical, ...admitted].map(p => {
                  const completedTasks = p.nursingLogs?.filter((t: any) => t.completed).length || 0;
                  const totalTasks = p.nursingLogs?.length || 0;
                  const isExpanded = expandedPatientChecklist === p._id;

                  return (
                    <div key={p._id} className="p-4 space-y-2 hover:bg-gray-50/50 dark:hover:bg-[#1a1a1a] transition-colors border-b last:border-b-0 border-gray-100 dark:border-[#1f1f1f]">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-gray-850 dark:text-gray-200">{p.name}</p>
                            {p.isCritical && <Badge variant="red">Critical</Badge>}
                          </div>
                          <p className="text-xs text-gray-550 mt-0.5">
                            Ward Bed: {p.assignedBed?.bedNumber || 'Assigned'} · Nurse: {p.assignedNurse?.name || 'TBD'}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/patients?id=${p._id}`)}>
                          Open EMR <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>

                      {totalTasks > 0 && (
                        <div className="pt-1 text-xs">
                          <button
                            onClick={() => setExpandedPatientChecklist(isExpanded ? null : p._id)}
                            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-semibold transition-colors flex items-center gap-1.5"
                          >
                            <span>Shift Checklist: {completedTasks} / {totalTasks} completed</span>
                            <span className="text-[10px] text-gray-400">({isExpanded ? 'click to collapse' : 'click to expand'})</span>
                          </button>

                          {isExpanded && (
                            <div className="mt-2 p-3 bg-gray-50 dark:bg-black rounded-xl border border-gray-150 dark:border-[#262626] space-y-2 animate-fade-in">
                              <span className="text-[10px] text-gray-450 font-bold uppercase tracking-wider block border-b border-gray-200 dark:border-[#1f1f1f] pb-1.5">Shift Log Check-offs (Vitals & Tasks)</span>
                              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                {p.nursingLogs?.map((t: any) => (
                                  <div key={t._id} className="flex justify-between items-start gap-3 text-[10px] text-gray-700 dark:text-gray-300">
                                    <span className={t.completed ? "line-through text-gray-400 font-medium font-mono" : "font-medium font-mono"}>
                                      {t.taskName} <span className="text-[9px] text-gray-400 font-normal">({t.shift})</span>
                                    </span>
                                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                                      t.completed 
                                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' 
                                        : 'bg-gray-100 text-gray-450 dark:bg-[#1a1a1a] dark:text-gray-500 border border-gray-200 dark:border-[#262626]'
                                    }`}>
                                      {t.completed ? `Done by ${t.nurseName}` : 'Pending'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. NURSE WORKSTATION DASHBOARD
  // ==========================================
  if (user?.role === 'Nurse') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Nursing Station Workspace</h1>
          <p className="text-xs text-gray-550 mt-0.5">Active Nurse: <span className="font-semibold text-gray-700 dark:text-gray-300">{activeNurse?.name}</span></p>
        </div>

        {error && <div className="p-3 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg">{error}</div>}

        {/* Task cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">My Patients</span>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{nursePatients.length}</p>
              <p className="text-xs text-gray-500 mt-1">Assigned roster</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Shift Tasks Pending</span>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{pendingTasksCount}</p>
              <p className="text-xs text-gray-500 mt-1">Checklists to complete</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Shift Tasks Completed</span>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{completedTasksCount}</p>
              <p className="text-xs text-gray-500 mt-1">Done this shift</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Shift Status</span>
              <p className="text-sm font-bold text-gray-900 dark:text-white mt-2">Active Duty</p>
              <p className="text-xs text-gray-500 mt-1">St. Mary's Ward</p>
            </CardContent>
          </Card>
        </div>

        {/* Assigned Patients details */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Assigned Patients Log</h2>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-gray-100 dark:divide-[#1f1f1f]">
            {nursePatients.length === 0 ? (
              <p className="text-center text-xs text-gray-450 py-10">No patients assigned to your station</p>
            ) : (
              nursePatients.map(p => (
                <div key={p._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-gray-950 dark:text-gray-250">{p.name}</p>
                      {p.isCritical && <Badge variant="red">Critical</Badge>}
                    </div>
                    <p className="text-xs text-gray-550 mt-1">
                      Bed: <span className="font-semibold text-gray-700 dark:text-gray-300">{p.assignedBed?.bedNumber || 'TBD'}</span> · Room: {p.assignedBed?.room || 'TBD'} · Ward: {p.assignedBed?.ward || 'TBD'}
                    </p>
                    <p className="text-[11px] text-gray-450 mt-0.5">Doctor: {p.assignedDoctor?.name}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/patients?id=${p._id}`)}>
                    Open Station Worklist <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==========================================
  // 3. HOSPITAL ADMIN REQUEST APPROVAL
  // ==========================================
  const icuBeds = allBeds.filter(b => b.bedType === 'ICU');
  const availableIcuBeds = icuBeds.filter(b => b.status === 'Available');
  const occupiedIcuBeds = icuBeds.filter(b => b.status === 'Occupied');
  const icuOccupancyRate = icuBeds.length > 0 ? Math.round((occupiedIcuBeds.length / icuBeds.length) * 100) : 0;

  const generalBeds = allBeds.filter(b => b.bedType !== 'ICU');
  const availableGeneralBeds = generalBeds.filter(b => b.status === 'Available');
  const occupiedGeneralBeds = generalBeds.filter(b => b.status === 'Occupied');
  const generalOccupancyRate = generalBeds.length > 0 ? Math.round((occupiedGeneralBeds.length / generalBeds.length) * 100) : 0;

  const totalEqCount = allEq.length;
  const assignedEqCount = allEq.filter(eq => eq.status === 'Assigned').length;
  const availableEq = allEq.filter(eq => eq.status === 'Available');
  const eqUtilizationRate = totalEqCount > 0 ? Math.round((assignedEqCount / totalEqCount) * 100) : 0;

  if (user?.role === 'Hospital Admin') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Admission Requests & Resource Allocations</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage patient admissions, assign beds, nurses, and medical equipment.</p>
        </div>

        {error && <div className="p-3 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg">{error}</div>}

        {/* Patients summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Total Admitted Patients</span>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{occupiedIcuBeds.length + occupiedGeneralBeds.length}</p>
              <p className="text-[10px] text-gray-500 mt-1">Currently in hospital beds</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">ICU Patients</span>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{occupiedIcuBeds.length}</p>
              <p className="text-[10px] text-gray-550 mt-1">Occupying ICU beds</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">General Wards Patients</span>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{occupiedGeneralBeds.length}</p>
              <p className="text-[10px] text-gray-550 mt-1">Occupying General beds</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Admission Requests</span>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{pendingAdmissions.length}</p>
              <p className="text-[10px] text-gray-550 mt-1">Pending approval</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Requests list */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Admission Requests Board</h2>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-gray-100 dark:divide-[#1f1f1f]">
                {pendingAdmissions.length === 0 ? (
                  <p className="text-center text-xs text-gray-450 py-10">No pending admission requests</p>
                ) : (
                  pendingAdmissions.map(p => (
                    <div key={p._id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-gray-950 dark:text-gray-200">{p.name}</p>
                          {p.needsIcu && <Badge variant="red">ICU Bed Needed</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Diagnosis: {p.diagnosis || 'None'}</p>
                        <p className="text-xs text-gray-450 mt-0.5">Requested By: {p.assignedDoctor?.name}</p>
                        {p.requestedEquipmentType && <p className="text-[11px] text-gray-450 mt-0.5">Equipment: {p.requestedEquipmentType}</p>}
                      </div>
                      <Button variant="primary" size="sm" onClick={() => handleOpenApproval(p)}>
                        Assign & Approve
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Side summaries */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Resource Availability</h3>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">ICU Beds Available</span>
                  <span className="font-bold text-gray-900 dark:text-white">{availableIcuBeds.length}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">General Beds Available</span>
                  <span className="font-bold text-gray-900 dark:text-white">{availableGeneralBeds.length}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">ECU Devices Available</span>
                  <span className="font-bold text-gray-900 dark:text-white">{availableEq.length}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Active Duty Nurses</span>
                  <span className="font-bold text-gray-900 dark:text-white">{nursesList.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ASSIGNMENT & APPROVAL DIALOG */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 dark:bg-black/60" onClick={() => setSelectedRequest(null)} />
            <div className="relative w-full max-w-2xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#262626] rounded-2xl shadow-xl p-6 animate-fade-up">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Admission & Resource Allocation</h3>
              <p className="text-xs text-gray-500 mb-4">Patient: <span className="font-semibold">{selectedRequest.name}</span></p>

              {formError && <div className="p-3 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg mb-4">{formError}</div>}

              <form onSubmit={handleApprove} className="space-y-4">
                <div>
                  <span className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Assign Bed</span>
                  <div className="grid grid-cols-2 gap-4">
                    {/* ICU Beds side */}
                    <div className="border border-gray-200 dark:border-[#262626] rounded-xl p-3 bg-gray-50 dark:bg-[#1a1a1a]">
                      <span className="text-[10px] font-bold text-gray-400 block mb-2 uppercase tracking-wide">ICU Wards</span>
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {availableIcuBeds.map(b => (
                          <button
                            type="button"
                            key={b._id}
                            onClick={() => setTargetBed(b._id)}
                            className={`w-full text-left p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                              targetBed === b._id
                                ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                                : 'border-gray-200 hover:border-gray-305 bg-white dark:bg-black dark:border-[#262626] dark:hover:border-gray-600 text-gray-800 dark:text-gray-300'
                            }`}
                          >
                            {b.bedNumber} ({b.ward})
                          </button>
                        ))}
                        {availableIcuBeds.length === 0 && <p className="text-xs text-gray-500 italic text-center py-4">No ICU beds free</p>}
                      </div>
                    </div>

                    {/* General Beds side */}
                    <div className="border border-gray-200 dark:border-[#262626] rounded-xl p-3 bg-gray-50 dark:bg-[#1a1a1a]">
                      <span className="text-[10px] font-bold text-gray-400 block mb-2 uppercase tracking-wide">General Wards</span>
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {availableGeneralBeds.map(b => (
                          <button
                            type="button"
                            key={b._id}
                            onClick={() => setTargetBed(b._id)}
                            className={`w-full text-left p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                              targetBed === b._id
                                ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                                : 'border-gray-200 hover:border-gray-305 bg-white dark:bg-black dark:border-[#262626] dark:hover:border-gray-600 text-gray-800 dark:text-gray-300'
                            }`}
                          >
                            {b.bedNumber} ({b.bedType} - {b.ward})
                          </button>
                        ))}
                        {availableGeneralBeds.length === 0 && <p className="text-xs text-gray-500 italic text-center py-4">No general beds free</p>}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Assign Nurse</label>
                  <select
                    value={targetNurse}
                    onChange={e => setTargetNurse(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white dark:bg-[#1a1a1a] dark:border-[#262626] dark:text-white outline-none"
                    required
                  >
                    <option value="">-- Select Duty Nurse --</option>
                    {nursesList.map(n => (
                      <option key={n._id} value={n._id}>{n.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Assign Medical Equipment (Optional)</label>
                  <div className="max-h-32 overflow-y-auto space-y-2 border border-gray-150 dark:border-[#262626] p-2.5 rounded-lg bg-gray-50 dark:bg-black">
                    {availableEq.map(eq => (
                      <label key={eq._id} className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          value={eq._id}
                          checked={targetEq.includes(eq._id)}
                          onChange={e => {
                            if (e.target.checked) setTargetEq(p => [...p, eq._id]);
                            else setTargetEq(p => p.filter(id => id !== eq._id));
                          }}
                          className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 h-3.5 w-3.5"
                        />
                        {eq.name} ({eq.category})
                      </label>
                    ))}
                    {availableEq.length === 0 && <p className="text-gray-400 italic">No equipment ready</p>}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#1f1f1f] mt-6">
                  <Button type="button" variant="outline" onClick={() => setSelectedRequest(null)}>Cancel</Button>
                  <Button type="submit" variant="primary" isLoading={submittingApproval}>Approve & Admit</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Monochromatic Resource Analytics Section */}
        <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-[#262626] mt-6">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Hospital Resource Utilization</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* ICU Bed Occupancy Rate */}
            <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedAnalyticsType('ICU')}>
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-widest">ICU Wards Occupancy</span>
                    <span className="text-2xl font-black text-gray-900 dark:text-white mt-1">{icuOccupancyRate}%</span>
                  </div>
                  <Badge variant={icuOccupancyRate > 75 ? 'red' : 'default'}>
                    {occupiedIcuBeds.length} / {icuBeds.length} Beds
                  </Badge>
                </div>
                
                {/* Monochromatic Neat Progress Bar */}
                <div className="w-full bg-gray-100 dark:bg-neutral-850 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gray-900 dark:bg-white h-full transition-all duration-500" 
                    style={{ width: `${icuOccupancyRate}%` }} 
                  />
                </div>
                
                <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold">
                  <span>Available: {availableIcuBeds.length}</span>
                  <span>Occupied: {occupiedIcuBeds.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* General Wards Bed Occupancy Rate */}
            <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedAnalyticsType('General')}>
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-gray-455 block uppercase font-bold tracking-widest">General Wards Occupancy</span>
                    <span className="text-2xl font-black text-gray-900 dark:text-white mt-1">{generalOccupancyRate}%</span>
                  </div>
                  <Badge variant={generalOccupancyRate > 75 ? 'red' : 'default'}>
                    {occupiedGeneralBeds.length} / {generalBeds.length} Beds
                  </Badge>
                </div>
                
                {/* Monochromatic Neat Progress Bar */}
                <div className="w-full bg-gray-100 dark:bg-neutral-855 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gray-900 dark:bg-white h-full transition-all duration-500" 
                    style={{ width: `${generalOccupancyRate}%` }} 
                  />
                </div>
                
                <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold">
                  <span>Available: {availableGeneralBeds.length}</span>
                  <span>Occupied: {occupiedGeneralBeds.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* Medical Equipment Utilization Rate */}
            <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedAnalyticsType('Equipment')}>
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-gray-455 block uppercase font-bold tracking-widest">Equipment Utilization</span>
                    <span className="text-2xl font-black text-gray-900 dark:text-white mt-1">{eqUtilizationRate}%</span>
                  </div>
                  <Badge variant={eqUtilizationRate > 75 ? 'red' : 'default'}>
                    {assignedEqCount} / {totalEqCount} Devices
                  </Badge>
                </div>
                
                {/* Monochromatic Neat Progress Bar */}
                <div className="w-full bg-gray-100 dark:bg-neutral-855 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gray-900 dark:bg-white h-full transition-all duration-500" 
                    style={{ width: `${eqUtilizationRate}%` }} 
                  />
                </div>
                
                <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold">
                  <span>Available: {availableEq.length}</span>
                  <span>Assigned: {assignedEqCount}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* RESOURCE DETAIL MODAL POPUP ON CARD TOUCH/CLICK */}
        <Dialog
          isOpen={!!selectedAnalyticsType}
          onClose={() => setSelectedAnalyticsType(null)}
          title={
            selectedAnalyticsType === 'ICU' ? 'ICU Beds Occupancy Details' :
            selectedAnalyticsType === 'General' ? 'General Wards Bed Directory' :
            'Medical Equipment Status Directory'
          }
        >
          {selectedAnalyticsType && (
            <div className="space-y-4 text-xs">
              <p className="text-[11px] text-gray-500 pb-2 border-b border-gray-100 dark:border-[#1f1f1f] font-semibold">
                {selectedAnalyticsType === 'ICU' && `Total ICU Beds: ${icuBeds.length} | Occupied: ${occupiedIcuBeds.length} Patients | Available: ${availableIcuBeds.length} Free`}
                {selectedAnalyticsType === 'General' && `Total General Beds: ${generalBeds.length} | Occupied: ${occupiedGeneralBeds.length} Patients | Available: ${availableGeneralBeds.length} Free`}
                {selectedAnalyticsType === 'Equipment' && `Total Devices: ${totalEqCount} | Assigned: ${assignedEqCount} Patients | Available: ${availableEq.length} Free`}
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* COLUMN 1: AVAILABLE / FREE */}
                <div className="space-y-2 border-r border-gray-100 dark:border-[#1f1f1f] pr-3">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-450 uppercase tracking-widest block mb-2">Available / Free</span>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {selectedAnalyticsType === 'ICU' && availableIcuBeds.map(b => (
                      <div key={b._id} className="p-2 border border-gray-150 dark:border-[#262626] rounded-lg bg-gray-50 dark:bg-black font-semibold">
                        {b.bedNumber} <span className="text-[10px] text-gray-400 font-normal">({b.ward})</span>
                      </div>
                    ))}
                    {selectedAnalyticsType === 'General' && availableGeneralBeds.map(b => (
                      <div key={b._id} className="p-2 border border-gray-150 dark:border-[#262626] rounded-lg bg-gray-50 dark:bg-black font-semibold">
                        {b.bedNumber} <span className="text-[10px] text-gray-400 font-normal">({b.bedType} - {b.ward})</span>
                      </div>
                    ))}
                    {selectedAnalyticsType === 'Equipment' && availableEq.map(eq => (
                      <div key={eq._id} className="p-2 border border-gray-150 dark:border-[#262626] rounded-lg bg-gray-50 dark:bg-black font-semibold">
                        {eq.name} <span className="text-[9px] text-gray-400 font-normal block mt-0.5">SN: {eq.serialNumber}</span>
                      </div>
                    ))}

                    {/* Fallback if empty */}
                    {selectedAnalyticsType === 'ICU' && availableIcuBeds.length === 0 && <p className="text-gray-400 italic">No free ICU beds</p>}
                    {selectedAnalyticsType === 'General' && availableGeneralBeds.length === 0 && <p className="text-gray-400 italic">No free General beds</p>}
                    {selectedAnalyticsType === 'Equipment' && availableEq.length === 0 && <p className="text-gray-400 italic">No free devices</p>}
                  </div>
                </div>

                {/* COLUMN 2: OCCUPIED */}
                <div className="space-y-2 pl-1">
                  <span className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-widest block mb-2">Occupied</span>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {selectedAnalyticsType === 'ICU' && allBeds.filter(b => b.bedType === 'ICU' && b.status === 'Occupied').map(b => (
                      <div key={b._id} className="p-2 border border-gray-150 dark:border-[#262626] rounded-lg bg-gray-50 dark:bg-black space-y-1">
                        <span className="font-bold">{b.bedNumber}</span>
                        <div className="text-[10px] text-gray-500 font-medium">
                          Patient: <span className="text-gray-900 dark:text-white font-bold">{b.assignedPatient?.name || 'Unknown'}</span>
                        </div>
                      </div>
                    ))}
                    {selectedAnalyticsType === 'General' && allBeds.filter(b => b.bedType !== 'ICU' && b.status === 'Occupied').map(b => (
                      <div key={b._id} className="p-2 border border-gray-150 dark:border-[#262626] rounded-lg bg-gray-50 dark:bg-black space-y-1">
                        <span className="font-bold">{b.bedNumber}</span>
                        <div className="text-[10px] text-gray-500 font-medium">
                          Patient: <span className="text-gray-900 dark:text-white font-bold">{b.assignedPatient?.name || 'Unknown'}</span>
                        </div>
                      </div>
                    ))}
                    {selectedAnalyticsType === 'Equipment' && allEq.filter(eq => eq.status === 'Assigned').map(eq => (
                      <div key={eq._id} className="p-2 border border-gray-150 dark:border-[#262626] rounded-lg bg-gray-50 dark:bg-black space-y-1">
                        <span className="font-bold">{eq.name}</span>
                        <div className="text-[9px] text-gray-400">SN: {eq.serialNumber}</div>
                        <div className="text-[10px] text-gray-500 font-medium">
                          Patient: <span className="text-gray-900 dark:text-white font-bold">{eq.assignedPatient?.name || 'Unknown'}</span>
                        </div>
                      </div>
                    ))}

                    {/* Fallback if empty */}
                    {selectedAnalyticsType === 'ICU' && allBeds.filter(b => b.bedType === 'ICU' && b.status === 'Occupied').length === 0 && <p className="text-gray-400 italic">No occupied ICU beds</p>}
                    {selectedAnalyticsType === 'General' && allBeds.filter(b => b.bedType !== 'ICU' && b.status === 'Occupied').length === 0 && <p className="text-gray-400 italic">No occupied General beds</p>}
                    {selectedAnalyticsType === 'Equipment' && allEq.filter(eq => eq.status === 'Assigned').length === 0 && <p className="text-gray-400 italic">No occupied devices</p>}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-[#1f1f1f] mt-4">
                <Button onClick={() => setSelectedAnalyticsType(null)}>Close</Button>
              </div>
            </div>
          )}
        </Dialog>
      </div>
    );
  }

  // ==========================================
  // 4. SUPER ADMIN NETWORKS DASHBOARD
  // ==========================================
  if (user?.role === 'Super Admin') {
    const userHospitalId = user?.hospital?._id || user?.hospital;
    const currentHospitalName = user?.hospital?.name || (hospitals.length > 0 ? hospitals[0].name : 'Hospital Facility');

    const filteredLogs = recentLogs.filter(log => {
      const matchesSearch = 
        log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.details.toLowerCase().includes(logSearch.toLowerCase()) ||
        (log.user?.name || '').toLowerCase().includes(logSearch.toLowerCase()) ||
        (log.ipAddress || '').toLowerCase().includes(logSearch.toLowerCase());

      if (userHospitalId) {
        const logHospId = typeof log.user?.hospital === 'object' ? log.user?.hospital?._id : log.user?.hospital;
        return matchesSearch && logHospId === userHospitalId;
      }
      return matchesSearch;
    });

    return (
      <div className="space-y-6 text-slate-900 dark:text-slate-100 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tight flex items-center">
              <ShieldAlert className="h-5 w-5 mr-2 text-gray-550" />
              Central Control Center — {currentHospitalName} Audit Logs
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Live, immutable security log transactions for the active hospital database console.
            </p>
          </div>
          <button
            onClick={loadData}
            className="p-2 border rounded-lg hover:bg-gray-55 dark:bg-black dark:border-[#222] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Toolbar */}
        <Card className="border border-gray-150 dark:border-[#222] bg-white dark:bg-[#0f0f0f] shadow-sm">
          <CardContent className="p-4">
            <div className="relative max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search logs by action, operator name, details, or IP address..."
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 border rounded-lg text-xs bg-white dark:bg-[#1a1a1a] dark:border-[#262626] text-gray-900 dark:text-white outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </CardContent>
        </Card>

        {/* Main Log Table */}
        <Card className="border border-gray-150 dark:border-[#222] shadow-sm overflow-hidden bg-white dark:bg-[#0f0f0f]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-150 dark:divide-[#222] text-left text-xs">
              <thead className="bg-gray-50 dark:bg-black text-[9px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-150 dark:border-[#1f1f1f]">
                <tr>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Operator</th>
                  <th className="px-6 py-3.5">Security Role</th>
                  <th className="px-6 py-3.5">Action Event</th>
                  <th className="px-6 py-3.5">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-[#1f1f1f] bg-white dark:bg-[#0f0f0f]">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic">
                      No security audit log transactions recorded.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const dateObj = new Date(log.createdAt);
                    return (
                      <tr key={log._id} className="hover:bg-gray-50/50 dark:hover:bg-[#1a1a1a]/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-slate-905 dark:text-white">{log.user?.name || 'Deleted User'}</div>
                          <div className="text-[10px] text-gray-450 mt-0.5">{log.user?.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-850 dark:text-slate-355 text-[10px] bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                            {log.user?.role || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <span className="inline-flex font-black text-slate-905 dark:text-white mb-0.5">
                              {log.action}
                            </span>
                            <span className="text-[10px] text-gray-400 block truncate max-w-xs" title={log.details}>
                              {log.details}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-gray-550 dark:text-gray-400">
                          {log.ipAddress || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  // Billing Counter Handlers
  const handleUpdatePaymentStatus = async (status: 'Pending' | 'Paid' | 'Partially Paid') => {
    if (!selectedPatientId) return;
    setIsSubmittingBillAction(true);
    try {
      await api.put(`/patients/${selectedPatientId}/billing/pay`, { status });
      await fetchSelectedPatientBilling(selectedPatientId);
      const patientsData = await api.get('/patients?limit=1000');
      setPatientsList(patientsData.patients || []);
      const repRes = await api.get('/reports/reception');
      setReceptionData(repRes);
    } catch (err: any) {
      alert(err.message || 'Failed to update payment status.');
    } finally {
      setIsSubmittingBillAction(false);
    }
  };

  const handleRecordPaymentAmount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !paymentAmtInput) return;
    setIsSubmittingBillAction(true);
    try {
      await api.put(`/patients/${selectedPatientId}/billing/pay`, { amount: Number(paymentAmtInput) });
      setPaymentAmtInput('');
      await fetchSelectedPatientBilling(selectedPatientId);
      const patientsData = await api.get('/patients?limit=1000');
      setPatientsList(patientsData.patients || []);
      const repRes = await api.get('/reports/reception');
      setReceptionData(repRes);
      alert('Payment recorded successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to record payment.');
    } finally {
      setIsSubmittingBillAction(false);
    }
  };

  const handleAddExtraCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    setIsSubmittingBillAction(true);
    try {
      let payload: any = {
        activityType: 'Other',
        description: chargeName,
        remarks: chargeDesc
      };
      if (chargePriceKey) {
        payload.priceKey = chargePriceKey;
        if (!chargeName) {
          const matched = priceList.find(p => p.key === chargePriceKey);
          if (matched) payload.description = matched.name;
        }
      } else {
        payload.amount = Number(chargeAmount);
      }

      await api.post(`/patients/${selectedPatientId}/activities`, payload);
      setIsAddChargeOpen(false);
      setChargeName('');
      setChargeDesc('');
      setChargeAmount('');
      setChargePriceKey('');
      await fetchSelectedPatientBilling(selectedPatientId);
      const repRes = await api.get('/reports/reception');
      setReceptionData(repRes);
      alert('Extra charge added successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to add extra charge.');
    } finally {
      setIsSubmittingBillAction(false);
    }
  };

  const handleRemoveExtraCharge = async (activityId: string) => {
    if (!selectedPatientId) return;
    if (!window.confirm('Are you sure you want to remove this extra charge?')) return;
    setIsSubmittingBillAction(true);
    try {
      await api.delete(`/patients/${selectedPatientId}/activities/${activityId}`);
      await fetchSelectedPatientBilling(selectedPatientId);
      const repRes = await api.get('/reports/reception');
      setReceptionData(repRes);
      alert('Extra charge removed successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to remove extra charge.');
    } finally {
      setIsSubmittingBillAction(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!selectedPatientId) return;
    setIsSubmittingBillAction(true);
    try {
      await api.post(`/patients/${selectedPatientId}/billing/discharge`, {});
      await fetchSelectedPatientBilling(selectedPatientId);
      const repRes = await api.get('/reports/reception');
      setReceptionData(repRes);
      alert('Invoice generated successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to generate invoice.');
    } finally {
      setIsSubmittingBillAction(false);
    }
  };

  const handlePrintInvoice = () => {
    if (!selectedPatientId || !billingDetails) return;
    const pat = patientsList.find(p => p._id === selectedPatientId);
    if (!pat) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const timelineHtml = patientActivities.map(act => `
      <div style="border-bottom: 1px solid #eee; padding: 6px 0; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>${new Date(act.date).toLocaleDateString()} ${act.time} - ${act.activityType}</span>
          <span>₹${act.amount}</span>
        </div>
        <div style="color: #555; margin-top: 2px;">${act.description}</div>
        ${act.remarks ? `<div style="color: #777; font-size: 10px; font-style: italic;">Remarks: ${act.remarks}</div>` : ''}
      </div>
    `).join('') || '<p style="font-size:11px; color:#555;">No ledger activities recorded.</p>';

    const billBreakdownHtml = `
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px;">
        <thead>
          <tr style="border-bottom: 2px solid #333; text-align: left; font-weight: bold; background: #f9f9f9;">
            <th style="padding: 6px;">Activity / Service</th>
            <th style="padding: 6px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${billingDetails.stayDetails?.bedCharge?.amount > 0 ? `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 6px;">
                <div style="font-weight: bold;">${billingDetails.stayDetails.bedCharge.name}</div>
                <div style="font-size: 9px; color: #555;">Duration: ${billingDetails.stayDetails.bedCharge.days} day(s) @ ₹${billingDetails.stayDetails.bedCharge.rate}/day</div>
              </td>
              <td style="padding: 6px; text-align: right; font-weight: bold;">₹${billingDetails.stayDetails.bedCharge.amount}</td>
            </tr>
          ` : ''}
          ${billingDetails.stayDetails?.equipmentCharges?.map((eq: any) => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 6px;">
                <div style="font-weight: bold;">${eq.name}</div>
                <div style="font-size: 9px; color: #555;">Duration: ${eq.hours ? `${eq.hours} hour(s) @ ₹${eq.rate}/hour` : `${eq.days} day(s) @ ₹${eq.rate}/day`}</div>
              </td>
              <td style="padding: 6px; text-align: right; font-weight: bold;">₹${eq.amount}</td>
            </tr>
          `).join('') || ''}
          ${(billingDetails.billing?.activities || []).map((act: any) => `
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
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Billing Invoice Summary - ${pat.name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #000; padding: 20px; line-height: 1.4; }
            h1, h2, h3 { margin-bottom: 4px; font-weight: 850; text-transform: uppercase; letter-spacing: -0.5px; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .header-table td { padding: 6px; font-size: 12px; }
            .section { margin-top: 30px; border-top: 2px solid #000; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #000; padding-bottom: 10px;">
            <div>
              <h1 style="margin: 0; font-size: 24px;">CURAFLOW MEDICAL CENTER</h1>
              <div style="font-size: 10px; color: #555; text-transform: uppercase;">Ledger Statement Invoice</div>
            </div>
            <div style="text-align: right; font-size: 11px; font-weight: bold;">
              Invoice: ${billingDetails.billing?.invoiceNumber || 'PENDING'}
            </div>
          </div>

          <table class="header-table" style="margin-top: 15px;">
            <tr>
              <td><strong>Patient Name:</strong> ${pat.name}</td>
              <td><strong>Patient ID:</strong> ${pat.admissionNumber}</td>
            </tr>
            <tr>
              <td><strong>Age/Gender:</strong> ${pat.age}y/o · ${pat.gender}</td>
              <td><strong>Attending Doctor:</strong> ${pat.assignedDoctor?.name || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Admission Date:</strong> ${pat.admissionDate ? new Date(pat.admissionDate).toLocaleString() : 'N/A'}</td>
              <td><strong>Discharge Date:</strong> ${pat.dischargeDate ? new Date(pat.dischargeDate).toLocaleString() : 'Active Stay'}</td>
            </tr>
            <tr>
              <td><strong>Invoice Date:</strong> ${new Date().toLocaleDateString()}</td>
              <td><strong>Payment Status:</strong> ${billingDetails.billing?.paymentStatus || 'Pending'}</td>
            </tr>
          </table>

          <div class="section">
             <h2>Chronological Event Timeline</h2>
             ${timelineHtml}
          </div>

          <div class="section">
             <h2>Account Invoice Breakdown</h2>
             ${billBreakdownHtml}
             
             <div style="margin-top: 15px; font-size: 11px; text-align: right; background: #f9f9f9; padding: 10px; border-radius: 6px;">
               <div>Total Billed: <strong>₹${billingDetails.billing?.totalAmount || 0}</strong></div>
               <div style="margin-top: 4px;">Amount Paid: <strong style="color: green;">₹${billingDetails.billing?.paidAmount || 0}</strong></div>
               <div style="margin-top: 4px; font-size: 13px; font-weight: bold;">Balance Due: <strong style="color: ${billingDetails.billing?.pendingAmount > 0 ? 'red' : 'black'};">₹${billingDetails.billing?.pendingAmount || 0}</strong></div>
             </div>
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

  // ==========================================
  // 5. RECEPTION WORKSTATION DASHBOARD
  // ==========================================
  if (user?.role === 'Reception Staff') {
    // Filter patients list by search text and selected payment status tab
    const filteredPatients = patientsList.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.diagnosis || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = billFilter === 'All' || p.paymentStatus === billFilter;
      return matchesSearch && matchesFilter;
    });

    const activePatient = patientsList.find(p => p._id === selectedPatientId);

    // Separate normal charges from manual extra charges
    const extraCharges = patientActivities.filter(act => act.isExtraCharge === true);
    const standardActivities = patientActivities.filter(act => act.isExtraCharge !== true);

    return (
      <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Billing Counter Desk</h1>
            <p className="text-xs text-gray-500 mt-0.5">Lookup patients, apply manual charges, and manage invoices.</p>
          </div>
        </div>

        {error && <div className="p-3 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT PANEL: Directory Search */}
          <div className="space-y-4">
            <Card className="border border-gray-150 dark:border-[#222]">
              <CardHeader className="pb-3 border-b border-gray-100 dark:border-[#1f1f1f] bg-gray-50/50 dark:bg-black/30">
                <h2 className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Ledger Registry Directory</h2>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search by name, ID or symptom..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 border rounded-lg text-xs bg-white dark:bg-[#1a1a1a] dark:border-[#262626] text-gray-900 dark:text-white outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[9px] font-bold uppercase tracking-wider">
                  {(['All', 'Pending', 'Paid', 'Partially Paid'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setBillFilter(status)}
                      className={`px-2 py-2 rounded transition-all border ${
                        billFilter === status
                          ? 'bg-slate-950 text-white border-slate-950 dark:bg-neutral-800 dark:border-neutral-800'
                          : 'bg-white text-gray-500 border-gray-200 dark:bg-black dark:border-[#222] dark:text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Registry list */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredPatients.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-10 italic bg-gray-50/50 dark:bg-black/30 border border-dashed rounded-lg border-gray-200 dark:border-[#222]">
                  No patients match criteria.
                </p>
              ) : (
                filteredPatients.map(p => {
                  const isSelected = p._id === selectedPatientId;
                  return (
                    <div
                      key={p._id}
                      onClick={() => setSelectedPatientId(p._id)}
                      className={`cursor-pointer transition-all p-3.5 border rounded-lg flex justify-between items-center text-xs ${
                        isSelected 
                          ? 'bg-slate-950 text-white border-slate-950 dark:bg-neutral-800 dark:border-neutral-800 shadow-md transform translate-x-1' 
                          : 'bg-white border-gray-150 hover:bg-gray-50/50 dark:bg-[#1a1a1a] dark:border-[#262626] dark:hover:bg-neutral-900/50'
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="font-bold">{p.name}</p>
                        <p className={`text-[9px] font-mono uppercase ${isSelected ? 'text-slate-300' : 'text-gray-400'}`}>
                          {p.admissionNumber} · {p.patientType || 'OP'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                          p.paymentStatus === 'Paid' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' 
                            : p.paymentStatus === 'Partially Paid'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}>
                          {p.paymentStatus || 'Pending'}
                        </span>
                        <span className={`text-[9px] font-medium ${isSelected ? 'text-slate-300' : 'text-gray-500'}`}>{p.status}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Ledger Details & Invoicing */}
          <div className="lg:col-span-2 space-y-4">
            {!activePatient ? (
              <Card className="min-h-[460px] flex items-center justify-center border-dashed border-2 border-gray-200 dark:border-[#222]">
                <CardContent className="text-center p-8 space-y-3">
                  <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-neutral-900 flex items-center justify-center mx-auto text-gray-400">
                    <Receipt className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Select Patient to View Bill Statement</p>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                    Click on a patient file in the left directory registry to inspect EMR timeline charges, dynamic stays, and record payments.
                  </p>
                </CardContent>
              </Card>
            ) : loading ? (
              <Card className="min-h-[460px] flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <div className="w-6 h-6 border-2 border-t-black dark:border-t-white rounded-full animate-spin mx-auto mb-2" />
                  <span className="text-xs text-gray-400 font-medium">Retrieving transaction statement...</span>
                </CardContent>
              </Card>
            ) : !billingDetails ? (
              <Card className="min-h-[460px] flex items-center justify-center">
                <CardContent className="text-center p-8 space-y-2">
                  <AlertOctagon className="h-8 w-8 text-amber-500 mx-auto animate-pulse" />
                  <p className="text-sm font-bold">Ledger Absent</p>
                  <p className="text-xs text-gray-400">Unable to retrieve billing ledger metrics for this patient.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                
                {/* Billing Details Core View */}
                <Card className="border border-gray-150 dark:border-[#222] shadow-sm">
                  
                  {/* Ledger Header */}
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-150 dark:border-[#1f1f1f] pb-4 bg-gray-50/50 dark:bg-black/20">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">{activePatient.name}</h2>
                        <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest bg-slate-900 text-white dark:bg-neutral-850">
                          {activePatient.patientType || 'OP'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-455 mt-1 font-mono uppercase">
                        ID: {activePatient.admissionNumber} · {activePatient.age} y/o · {activePatient.gender}
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={handlePrintInvoice} className="text-xs font-bold py-1.5 border-gray-300 dark:border-[#333]">
                        <Printer className="h-3.5 w-3.5 mr-1 text-gray-450" /> Print Statement
                      </Button>
                      {!billingDetails.billing?.invoiceNumber && activePatient.status === 'Discharged' && (
                        <Button variant="primary" size="sm" onClick={handleGenerateInvoice} isLoading={isSubmittingBillAction} className="text-xs font-bold py-1.5">
                          <Receipt className="h-3.5 w-3.5 mr-1" /> Generate Invoice
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-6 text-xs">
                    
                    {/* Stay Metadata Info Row */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 dark:bg-[#111] rounded-lg text-[10px] border border-gray-100 dark:border-[#1a1a1a]">
                      <div>
                        <span className="text-gray-450 block font-bold uppercase tracking-wider mb-0.5">Admission Date</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {activePatient.admissionDate ? new Date(activePatient.admissionDate).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-455 block font-bold uppercase tracking-wider mb-0.5">Discharge Date</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {activePatient.dischargeDate ? new Date(activePatient.dischargeDate).toLocaleString() : 'Active Stay'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-450 block font-bold uppercase tracking-wider mb-0.5">Stay Duration</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {billingDetails.stayDetails?.bedCharge?.days !== undefined
                            ? `${billingDetails.stayDetails.bedCharge.days} day(s)`
                            : 'N/A (Outpatient)'}
                        </span>
                      </div>
                    </div>

                    {/* Unified Ledger Items Table */}
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-bold text-gray-455 uppercase tracking-widest">Account Ledger Statement</h3>
                      <div className="border border-gray-155 dark:border-[#222] rounded-lg overflow-hidden">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-black border-b border-gray-150 dark:border-[#222] text-gray-400 font-bold uppercase tracking-wider text-[9px]">
                              <th className="p-2.5">Billing Item / Service</th>
                              <th className="p-2.5">Category</th>
                              <th className="p-2.5 text-right">Price</th>
                              <th className="p-2.5 text-center w-12">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-150 dark:divide-[#1f1f1f]">
                            
                            {/* Standard Stay charges */}
                            {billingDetails.stayDetails?.bedCharge?.amount > 0 && (
                              <tr className="hover:bg-gray-50/30 dark:hover:bg-neutral-900/10">
                                <td className="p-2.5">
                                  <p className="font-bold text-slate-900 dark:text-slate-100">{billingDetails.stayDetails.bedCharge.name}</p>
                                  <p className="text-[9px] text-gray-400 mt-0.5">Stay: {billingDetails.stayDetails.bedCharge.days} day(s) @ ₹{billingDetails.stayDetails.bedCharge.rate}/day</p>
                                </td>
                                <td className="p-2.5">
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide bg-slate-100 text-slate-700 dark:bg-neutral-900 dark:text-neutral-400">
                                    Bed Stay
                                  </span>
                                </td>
                                <td className="p-2.5 text-right font-black text-slate-900 dark:text-slate-100">₹{billingDetails.stayDetails.bedCharge.amount}</td>
                                <td className="p-2 text-center text-gray-300 font-bold">-</td>
                              </tr>
                            )}

                            {/* Equipment Stay Charges */}
                            {billingDetails.stayDetails?.equipmentCharges?.map((eq: any, idx: number) => (
                              <tr key={`eq-${idx}`} className="hover:bg-gray-50/30 dark:hover:bg-neutral-900/10">
                                <td className="p-2.5">
                                  <p className="font-bold text-slate-900 dark:text-slate-100">{eq.name}</p>
                                  <p className="text-[9px] text-gray-400 mt-0.5">
                                    Allocated: {eq.hours ? `${eq.hours} hour(s) @ ₹${eq.rate}/hour` : `${eq.days} day(s) @ ₹${eq.rate}/day`}
                                  </p>
                                </td>
                                <td className="p-2.5">
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide bg-slate-100 text-slate-700 dark:bg-neutral-900 dark:text-neutral-400">
                                    Equipment Stay
                                  </span>
                                </td>
                                <td className="p-2.5 text-right font-black text-slate-900 dark:text-slate-100">₹{eq.amount}</td>
                                <td className="p-2 text-center text-gray-300 font-bold">-</td>
                              </tr>
                            ))}

                            {/* Other Clinical & Extra activities */}
                            {(billingDetails.billing?.activities || []).length === 0 && !billingDetails.stayDetails?.bedCharge?.amount ? (
                              <tr>
                                <td colSpan={4} className="text-center py-6 text-gray-400 italic">No transactions posted to statement.</td>
                              </tr>
                            ) : (
                              (billingDetails.billing?.activities || []).map((act: any) => (
                                <tr key={act._id} className="hover:bg-gray-50/30 dark:hover:bg-neutral-900/10">
                                  <td className="p-2.5">
                                    <p className="font-bold text-slate-900 dark:text-slate-100">{act.description}</p>
                                    <p className="text-[9px] text-gray-400 mt-0.5">
                                      {new Date(act.date).toLocaleDateString()} · By: {act.performedBy?.name || 'System'}
                                    </p>
                                  </td>
                                  <td className="p-2.5">
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide ${
                                      act.isExtraCharge 
                                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-955/20 dark:text-amber-450 border border-amber-200/20' 
                                        : 'bg-slate-100 text-slate-700 dark:bg-neutral-900 dark:text-neutral-400'
                                    }`}>
                                      {act.isExtraCharge ? 'Extra Charge' : act.activityType}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-right font-black text-slate-900 dark:text-slate-100">₹{act.amount}</td>
                                  <td className="p-2 text-center">
                                    {act.isExtraCharge ? (
                                      <button 
                                        disabled={isSubmittingBillAction}
                                        onClick={() => handleRemoveExtraCharge(act._id)}
                                        className="text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors p-1"
                                        title="Remove manual charge"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    ) : (
                                      <span className="text-gray-300 font-bold">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Inline Type-and-Add Extra Charge Form */}
                    <div className="p-4 bg-gray-50 dark:bg-black rounded-lg border border-gray-150 dark:border-[#222] space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-450 uppercase tracking-widest block">Type-to-Add Extra Charge</span>
                        {priceList.length > 0 && (
                          <select
                            value={chargePriceKey}
                            onChange={e => {
                              const key = e.target.value;
                              setChargePriceKey(key);
                              if (key) {
                                const matched = priceList.find(p => p.key === key);
                                if (matched) {
                                  setChargeName(matched.name);
                                  setChargeAmount(String(matched.price));
                                  setChargeDesc(matched.category || 'Preset');
                                }
                              } else {
                                setChargeName('');
                                setChargeAmount('');
                                setChargeDesc('');
                              }
                            }}
                            className="p-1 px-2 border rounded text-[9px] bg-white dark:bg-[#1a1a1a] dark:border-[#262626] dark:text-white outline-none text-gray-700 dark:text-gray-300"
                          >
                            <option value="">-- Load Pricing Preset --</option>
                            {priceList.map(pr => (
                              <option key={pr.key} value={pr.key}>{pr.name} (₹{pr.price})</option>
                            ))}
                          </select>
                        )}
                      </div>
                      
                      <form onSubmit={handleAddExtraCharge} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                        <div className="sm:col-span-1">
                          <label className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Charge Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Visitor Pass"
                            value={chargeName}
                            onChange={e => setChargeName(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded border border-gray-205 bg-white dark:bg-[#1a1a1a] dark:border-[#262626] dark:text-white outline-none"
                            required
                            disabled={isSubmittingBillAction}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Description / Remarks</label>
                          <input
                            type="text"
                            placeholder="e.g. Extra visitor pass card"
                            value={chargeDesc}
                            onChange={e => setChargeDesc(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded border border-gray-205 bg-white dark:bg-[#1a1a1a] dark:border-[#262626] dark:text-white outline-none"
                            disabled={isSubmittingBillAction}
                          />
                        </div>
                        <div className="flex gap-2">
                          <div className="w-24 shrink-0">
                            <label className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Amount (₹)</label>
                            <input
                              type="number"
                              placeholder="150"
                              value={chargeAmount}
                              onChange={e => setChargeAmount(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs rounded border border-gray-205 bg-white dark:bg-[#1a1a1a] dark:border-[#262626] dark:text-white outline-none"
                              required
                              disabled={isSubmittingBillAction}
                            />
                          </div>
                          <Button 
                            type="submit" 
                            size="sm" 
                            isLoading={isSubmittingBillAction} 
                            className="px-3 text-xs font-bold shrink-0 self-end"
                          >
                            <Plus className="h-3.5 w-3.5 mr-0.5" /> Add
                          </Button>
                        </div>
                      </form>
                    </div>

                    {/* Grand Totals Section */}
                    <div className="grid grid-cols-3 gap-4 border-t border-gray-150 dark:border-[#1f1f1f] pt-4 text-xs font-semibold">
                      <div className="p-3 bg-gray-50/50 dark:bg-black/30 border border-gray-100 dark:border-[#222] rounded-lg">
                        <span className="text-gray-400 text-[10px] block uppercase font-bold tracking-wide">Gross Total Charge</span>
                        <span className="text-lg font-black text-gray-900 dark:text-white mt-0.5 block">
                          ₹{(billingDetails.billing?.totalAmount || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-3 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/30 rounded-lg text-emerald-600">
                        <span className="text-emerald-500 text-[10px] block uppercase font-bold tracking-wide">Amount Paid</span>
                        <span className="text-lg font-black mt-0.5 block">
                          ₹{(billingDetails.billing?.paidAmount || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-3 bg-gray-50/50 dark:bg-black/30 border border-gray-100 dark:border-[#222] rounded-lg">
                        <span className="text-gray-400 text-[10px] block uppercase font-bold tracking-wide">Balance Due</span>
                        <span className={`text-lg font-black mt-0.5 block ${billingDetails.billing?.pendingAmount > 0 ? 'text-red-500' : 'text-slate-650'}`}>
                          ₹{(billingDetails.billing?.pendingAmount || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Change Payment Status & Record Payment Entry */}
                    <div className="border-t border-gray-155 dark:border-[#1f1f1f] pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                      
                      {/* Mark Status */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-455 uppercase tracking-widest block">Mark Payment Status</label>
                        <div className="flex gap-1.5">
                          {(['Pending', 'Paid', 'Partially Paid'] as const).map(status => (
                            <button
                              key={status}
                              disabled={isSubmittingBillAction}
                              onClick={() => handleUpdatePaymentStatus(status)}
                              className={`flex-1 py-2 px-2.5 rounded font-bold text-[9px] uppercase tracking-wider border transition-all ${
                                billingDetails.billing?.paymentStatus === status
                                  ? 'bg-slate-955 text-white border-slate-955 dark:bg-neutral-800 dark:border-neutral-800 shadow-sm'
                                  : 'bg-white text-gray-500 border-gray-200 dark:bg-black dark:border-[#222] dark:text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Log payment entries form */}
                      {billingDetails.billing?.pendingAmount > 0 && (
                        <form onSubmit={handleRecordPaymentAmount} className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-455 uppercase tracking-widest block">Log Ledger Payment</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              placeholder="₹ Enter amount to record..."
                              value={paymentAmtInput}
                              onChange={e => setPaymentAmtInput(e.target.value)}
                              className="w-full px-2.5 py-2 text-xs rounded border border-gray-205 bg-white dark:bg-[#1a1a1a] dark:border-[#262626] dark:text-white outline-none"
                              required
                              disabled={isSubmittingBillAction}
                            />
                            <Button type="submit" size="sm" isLoading={isSubmittingBillAction} className="px-4 font-bold">
                              <Coins className="h-3.5 w-3.5 mr-1" /> Record
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>

                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
export default Dashboard;
