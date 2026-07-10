import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Card, CardContent, CardHeader, Badge } from '../components/ui';
import { FileText, User, Heart, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Doctor {
  _id: string;
  name: string;
}

interface Patient {
  _id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  admissionNumber: string;
  diagnosis: string;
  admissionDate: string;
  status: 'Registered' | 'Admission Pending' | 'Admitted' | 'Discharged';
  assignedDoctor?: Doctor;
  assignedBed?: { _id: string; bedNumber: string; bedType: string; ward: string };
  assignedNurse?: { _id: string; name: string };
  clinicalNotes?: string;
  prescription?: string;
  treatmentPlan?: string;
  testsOrdered?: string;
  followUpNotes?: string;
  followUpDate?: string;
  vitalsHistory: any[];
  nurseNotes: any[];
  nursingLogs: any[];
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

const isSelectedDateToday = (dateStr: string) => {
  const parsedDate = parseProgressDate(dateStr);
  return isSameDate(parsedDate, new Date());
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

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');

  // Vitals inputs
  const [bp, setBp] = useState('');
  const [hr, setHr] = useState('');
  const [temp, setTemp] = useState('');
  const [o2, setO2] = useState('');
  const [wt, setWt] = useState('');

  // Observations notes input
  const [nNote, setNNote] = useState('');

  // Fetch all patients on mount
  useEffect(() => {
    const fetchPatientsList = async () => {
      try {
        setLoadingPatients(true);
        setError('');
        const res = await api.get('/patients?limit=500');
        const sorted = (res.patients || []).sort((a: Patient, b: Patient) => {
          if (a.status === 'Admitted' && b.status !== 'Admitted') return -1;
          if (a.status !== 'Admitted' && b.status === 'Admitted') return 1;
          return a.name.localeCompare(b.name);
        });
        setPatients(sorted);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to fetch patients list.');
      } finally {
        setLoadingPatients(false);
      }
    };
    fetchPatientsList();
  }, []);

  // Fetch complete EMR details when selected patient changes
  useEffect(() => {
    if (!selectedPatientId) {
      setSelectedPatient(null);
      setSelectedDate('');
      return;
    }

    const fetchPatientEMR = async () => {
      try {
        setLoadingDetails(true);
        setError('');
        const details = await api.get(`/patients/${selectedPatientId}`);
        setSelectedPatient(details);

        const dates = getPatientDates(details);
        if (dates.length > 0) {
          setSelectedDate(dates[0]);
        } else {
          setSelectedDate(new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          }));
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load patient records.');
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchPatientEMR();
  }, [selectedPatientId]);

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    if (!selectedPatient) return;
    try {
      setError('');
      const updated = await api.put(`/patients/${selectedPatient._id}/nursing-task`, {
        taskId,
        completed
      });
      setSelectedPatient(updated);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Task checklist logging failed.');
    }
  };

  const handleVitalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    try {
      setError('');
      const updated = await api.put(`/patients/${selectedPatient._id}/vitals`, {
        bloodPressure: bp,
        heartRate: hr ? Number(hr) : undefined,
        temperature: temp ? Number(temp) : undefined,
        spo2: o2 ? Number(o2) : undefined,
        weight: wt ? Number(wt) : undefined
      });
      setSelectedPatient(updated);
      setBp('');
      setHr('');
      setTemp('');
      setO2('');
      setWt('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to log vitals.');
    }
  };

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    try {
      setError('');
      const updated = await api.put(`/patients/${selectedPatient._id}/nurse-notes`, {
        note: nNote
      });
      setSelectedPatient(updated);
      setNNote('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to log observation.');
    }
  };

  const isToday = selectedDate ? isSelectedDateToday(selectedDate) : false;

  return (
    <div className="space-y-6 animate-fade-in text-gray-800 dark:text-gray-200">
      <div>
        <h1 className="text-lg font-bold text-gray-950 dark:text-white flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-500" />
          Clinical shift progress reports
        </h1>
        <p className="text-xs text-gray-555 mt-0.5">Select a patient and a date to inspect the shift-wise nursing checklist, vitals, and notes.</p>
      </div>

      {error && <div className="p-3 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg">{error}</div>}

      {/* Selectors Card */}
      <Card className="border border-gray-250 dark:border-[#262626]">
        <CardContent className="p-4 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-widest mb-1.5 font-mono">Select Patient</label>
            {loadingPatients ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading patients...
              </div>
            ) : (
              <select
                value={selectedPatientId}
                onChange={e => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 bg-white dark:bg-[#1a1a1a] dark:border-[#262626] dark:text-white outline-none cursor-pointer focus:border-gray-900"
              >
                <option value="">-- Choose Patient --</option>
                {patients.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.admissionNumber}) [{p.status}]
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedPatient && (
            <div className="min-w-[180px]">
              <label className="block text-[10px] font-bold text-gray-455 uppercase tracking-widest mb-1.5 font-mono font-semibold">Select Date</label>
              <select
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 bg-white dark:bg-[#1a1a1a] dark:border-[#262626] dark:text-white outline-none cursor-pointer focus:border-gray-900"
              >
                {getPatientDates(selectedPatient).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Report Area */}
      {loadingDetails ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-black border border-gray-150 dark:border-[#1f1f1f] rounded-2xl">
          <RefreshCw className="h-6 w-6 text-gray-550 animate-spin mb-2" />
          <p className="text-xs text-gray-500 font-semibold">Generating clinical logs report...</p>
        </div>
      ) : !selectedPatient ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-black border border-dashed border-gray-250 dark:border-[#262626] rounded-2xl text-center">
          <User className="h-10 w-10 text-gray-300 dark:text-gray-700 mb-2" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">No Patient Selected</h3>
          <p className="text-xs text-gray-500 max-w-xs mt-1">Please select an active patient from the dropdown above to view their shift-wise medical logs.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Patient Header Summary */}
          <div className="bg-gray-50 dark:bg-black p-4 rounded-xl border border-gray-155 dark:border-[#1f1f1f] flex flex-wrap gap-6 text-xs font-semibold">
            <div>
              <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-mono">Patient Name</span>
              <span className="text-slate-900 dark:text-white font-bold">{selectedPatient.name}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-mono">Age / Gender</span>
              <span>{selectedPatient.age} · {selectedPatient.gender}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-mono">Admission No</span>
              <span className="font-mono">{selectedPatient.admissionNumber}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-mono">Bed / Room</span>
              <span>{selectedPatient.assignedBed ? `${selectedPatient.assignedBed.bedNumber} (${selectedPatient.assignedBed.ward})` : 'None Assigned'}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-mono">Duty Nurse</span>
              <span>{selectedPatient.assignedNurse?.name || 'Unassigned'}</span>
            </div>
            {selectedPatient.assignedDoctor && (
              <div>
                <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-mono">Attending Doctor</span>
                <span>{selectedPatient.assignedDoctor.name}</span>
              </div>
            )}
          </div>

          {/* Shift Report Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Shifts mapping */}
            {([
              { key: 'Morning', label: 'Morning Shift', hours: '06:00 AM - 12:00 PM', dbShift: 'Morning' },
              { key: 'Afternoon', label: 'Afternoon (Noon) Shift', hours: '12:00 PM - 05:00 PM', dbShift: 'Afternoon' },
              { key: 'Night', label: 'Evening & Night Shift', hours: '05:00 PM - 06:00 AM', dbShift: 'Evening' }
            ] as const).map(shift => {
              const parsedSelDate = parseProgressDate(selectedDate);

              // 1. Filter Checklist logs for this shift on selected date
              const defaultShiftTasks = selectedPatient.nursingLogs?.length > 0 ? selectedPatient.nursingLogs : [];
              const shiftTasks = defaultShiftTasks.filter((t: any) => t.shift === shift.dbShift);

              // Check if completed on this date
              const tasksWithCompletion = shiftTasks.map((t: any) => {
                const completed = !!(t.completed && t.completedAt && isSameDate(new Date(t.completedAt), parsedSelDate));
                const completedTime = completed ? new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                return { ...t, completed, completedTime };
              });

              // 2. Filter vitals recorded during this shift on selected date
              const shiftVitals = selectedPatient.vitalsHistory?.filter((v: any) => {
                const recordedDate = new Date(v.recordedAt);
                if (!isSameDate(recordedDate, parsedSelDate)) return false;
                const hours = recordedDate.getHours();
                if (shift.key === 'Morning') return hours >= 6 && hours < 12;
                if (shift.key === 'Afternoon') return hours >= 12 && hours < 17;
                return hours >= 17 || hours < 6;
              }) || [];

              const latestVitals = shiftVitals.length > 0 ? shiftVitals[shiftVitals.length - 1] : null;

              // Extract water intake from notes on this shift and date
              const waterTask = selectedPatient.nursingLogs?.find((l: any) => 
                l.shift === shift.dbShift &&
                l.taskName.toLowerCase().includes('water') &&
                l.completed &&
                l.completedAt &&
                isSameDate(new Date(l.completedAt), parsedSelDate)
              );
              const waterIntakeVal = waterTask?.notes || '';

              // 3. Filter nurse observations recorded during this shift on selected date
              const shiftNotes = selectedPatient.nurseNotes?.filter((n: any) => {
                const recordedDate = new Date(n.recordedAt);
                if (!isSameDate(recordedDate, parsedSelDate)) return false;
                const hours = recordedDate.getHours();
                if (shift.key === 'Morning') return hours >= 6 && hours < 12;
                if (shift.key === 'Afternoon') return hours >= 12 && hours < 17;
                return hours >= 17 || hours < 6;
              }) || [];

              return (
                <Card key={shift.key} className="border border-gray-200 dark:border-[#262626]">
                  <CardHeader className="bg-gray-50 dark:bg-[#141414] border-b border-gray-150 dark:border-[#1f1f1f] pb-3.5">
                    <span className="text-[9px] uppercase font-bold tracking-widest text-gray-400 block mb-0.5 font-mono">{shift.hours}</span>
                    <h3 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-wider">{shift.label}</h3>
                  </CardHeader>
                  <CardContent className="p-4 space-y-5 text-xs font-semibold">
                    
                    {/* Shift Vitals */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-gray-455 uppercase tracking-widest flex items-center gap-1 font-mono">
                        <Heart className="h-3.5 w-3.5 text-red-500 animate-pulse" />
                        Vitals Metrics
                      </h4>
                      
                      {/* Vitals Form for Nurse directly on Report screen */}
                      {user?.role === 'Nurse' && isToday && (
                        <form onSubmit={handleVitalsSubmit} className="grid grid-cols-2 gap-1.5 bg-gray-50 dark:bg-black p-2 rounded border border-gray-150 dark:border-[#1f1f1f] mb-3">
                          <input placeholder="BP" value={bp} onChange={e => setBp(e.target.value)} className="px-2 py-1 text-[10px] rounded border bg-white dark:bg-[#1a1a1a] dark:border-[#262626] outline-none" />
                          <input placeholder="Pulse" type="number" value={hr} onChange={e => setHr(e.target.value)} className="px-2 py-1 text-[10px] rounded border bg-white dark:bg-[#1a1a1a] dark:border-[#262626] outline-none" />
                          <input placeholder="Temp" type="number" step="0.1" value={temp} onChange={e => setTemp(e.target.value)} className="px-2 py-1 text-[10px] rounded border bg-white dark:bg-[#1a1a1a] dark:border-[#262626] outline-none" />
                          <input placeholder="SpO2" type="number" value={o2} onChange={e => setO2(e.target.value)} className="px-2 py-1 text-[10px] rounded border bg-white dark:bg-[#1a1a1a] dark:border-[#262626] outline-none" />
                          <input placeholder="Weight" type="number" value={wt} onChange={e => setWt(e.target.value)} className="px-2 py-1 text-[10px] rounded border bg-white dark:bg-[#1a1a1a] dark:border-[#262626] outline-none col-span-2" />
                          <button type="submit" className="col-span-2 text-[10px] py-1 bg-slate-900 text-white rounded font-bold hover:bg-slate-850 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors">
                            Save Vitals
                          </button>
                        </form>
                      )}

                      {latestVitals ? (
                        <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-black p-2.5 rounded-lg border border-gray-155 dark:border-[#1f1f1f]">
                          <div>
                            <span className="text-gray-455 block text-[9px]">BP</span>
                            <span className="text-slate-900 dark:text-white font-bold">{latestVitals.bloodPressure || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-455 block text-[9px]">Temp</span>
                            <span className="text-slate-900 dark:text-white font-bold">{latestVitals.temperature ? `${latestVitals.temperature}°C` : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-455 block text-[9px]">SpO₂</span>
                            <span className="text-slate-900 dark:text-white font-bold">{latestVitals.spo2 ? `${latestVitals.spo2}%` : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-455 block text-[9px]">Pulse</span>
                            <span className="text-slate-900 dark:text-white font-bold">{latestVitals.heartRate ? `${latestVitals.heartRate} bpm` : 'N/A'}</span>
                          </div>
                          {waterIntakeVal && (
                            <div className="col-span-2 border-t border-gray-100 dark:border-[#1f1f1f] pt-1.5 mt-1">
                              <span className="text-gray-455 block text-[9px]">Water Intake</span>
                              <span className="text-slate-900 dark:text-white font-bold">{waterIntakeVal}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic font-medium">No vitals logged for this shift.</p>
                      )}
                    </div>

                    {/* Shift Tasks */}
                    <div className="space-y-2 pt-1">
                      <h4 className="text-[10px] font-bold text-gray-455 uppercase tracking-widest font-mono">Shift Activity Checklist</h4>
                      {tasksWithCompletion.length === 0 ? (
                        <p className="text-xs text-gray-400 italic font-medium">No tasks scheduled for this shift.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {tasksWithCompletion.map((t: any, i: number) => (
                            <label key={i} className="flex justify-between items-center p-2 rounded-lg border border-gray-150 dark:border-[#1f1f1f] bg-gray-50/50 dark:bg-[#141414] cursor-pointer select-none">
                              <span className="text-gray-800 dark:text-gray-200 font-medium">{t.taskName}</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  disabled={user?.role !== 'Nurse' || !isToday}
                                  checked={t.completed}
                                  onChange={e => handleToggleTask(t._id, e.target.checked)}
                                  className="rounded border-gray-305 text-gray-900 focus:ring-gray-900 h-3.5 w-3.5"
                                />
                                {t.completed && t.completedTime && (
                                  <span className="text-[9px] text-gray-400 font-normal">({t.completedTime})</span>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Shift Observations */}
                    <div className="space-y-2 pt-1">
                      <h4 className="text-[10px] font-bold text-gray-455 uppercase tracking-widest font-mono font-semibold">Nurse Observations</h4>
                      
                      {/* Observations form for Nurse directly on Report screen */}
                      {user?.role === 'Nurse' && isToday && (
                        <form onSubmit={handleNoteSubmit} className="space-y-1 mb-3">
                          <textarea
                            rows={2}
                            value={nNote}
                            onChange={e => setNNote(e.target.value)}
                            placeholder="Add shift observations..."
                            className="w-full px-2 py-1 text-[10px] rounded border bg-white dark:bg-[#1a1a1a] dark:border-[#262626] outline-none placeholder-gray-500 resize-none"
                            required
                          />
                          <button type="submit" className="w-full text-[10px] py-1 bg-slate-900 text-white rounded font-bold hover:bg-slate-850 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors">
                            Save Observation
                          </button>
                        </form>
                      )}

                      {shiftNotes.length === 0 ? (
                        <p className="text-xs text-gray-405 italic font-medium">No clinical notes recorded during this shift.</p>
                      ) : (
                        <div className="space-y-2">
                          {shiftNotes.map((n: any, idx: number) => (
                            <div key={idx} className="p-2.5 rounded-lg border border-gray-150 dark:border-[#1f1f1f] bg-gray-50 dark:bg-black leading-relaxed">
                              <p className="text-gray-850 dark:text-gray-300 font-medium">"{n.note}"</p>
                              <span className="text-[9px] text-gray-455 block text-right mt-1 font-semibold font-mono">
                                At {new Date(n.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Nurse: {n.nurseName}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Doctor Clinical Progress notes */}
          <Card className="border border-gray-200 dark:border-[#262626]">
            <CardHeader className="bg-gray-50 dark:bg-black border-b border-gray-150 dark:border-[#1f1f1f] pb-3">
              <h4 className="text-xs font-bold text-gray-450 uppercase tracking-widest font-mono">Doctor Clinical Progress</h4>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-xs font-semibold">
              <div className="p-3 rounded-lg border bg-white dark:bg-black border-gray-205 dark:border-[#262626] space-y-1">
                <span className="text-gray-455 block uppercase tracking-wider text-[9px] font-mono">Diagnosis</span>
                <p className="font-medium text-slate-800 dark:text-slate-200 whitespace-pre-line">{selectedPatient.diagnosis || 'None entered'}</p>
              </div>
              <div className="p-3 rounded-lg border bg-white dark:bg-black border-gray-250 dark:border-[#262626] space-y-1">
                <span className="text-gray-455 block uppercase tracking-wider text-[9px] font-mono">Treatment Plan</span>
                <p className="font-medium text-slate-800 dark:text-slate-200 whitespace-pre-line">{selectedPatient.treatmentPlan || 'None entered'}</p>
              </div>
              <div className="p-3 rounded-lg border bg-white dark:bg-black border-gray-250 dark:border-[#262626] space-y-1">
                <span className="text-gray-455 block uppercase tracking-wider text-[9px] font-mono">Prescription</span>
                <p className="font-medium text-slate-800 dark:text-slate-200 whitespace-pre-line">{selectedPatient.prescription || 'None entered'}</p>
              </div>
              <div className="p-3 rounded-lg border bg-white dark:bg-black border-gray-250 dark:border-[#262626] space-y-1">
                <span className="text-gray-455 block uppercase tracking-wider text-[9px] font-mono">Tests Ordered</span>
                <p className="font-medium text-slate-800 dark:text-slate-200 whitespace-pre-line">{selectedPatient.testsOrdered || 'None entered'}</p>
              </div>
              <div className="p-3 rounded-lg border bg-white dark:bg-black border-gray-250 dark:border-[#262626] space-y-1 md:col-span-2 lg:col-span-1">
                <span className="text-gray-455 block uppercase tracking-wider text-[9px] font-mono">Follow-up Notes</span>
                <p className="font-medium text-slate-800 dark:text-slate-200 whitespace-pre-line">
                  {selectedPatient.followUpDate ? `Schedule Date: ${new Date(selectedPatient.followUpDate).toLocaleDateString()}\n` : ''}
                  {selectedPatient.followUpNotes || 'None entered'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
export default Reports;
