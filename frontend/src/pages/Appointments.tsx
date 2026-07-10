import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Card, CardHeader, CardContent, Button, Badge, Dialog } from '../components/ui';
import { Calendar, Plus, Clock, User, UserCheck, Search, Filter, X } from 'lucide-react';

interface Patient {
  _id: string;
  name: string;
  admissionNumber: string;
}

interface Doctor {
  _id: string;
  name: string;
  role: string;
}

interface Appointment {
  _id: string;
  patient: Patient;
  doctor: Doctor;
  appointmentDate: string;
  timeSlot: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  type: 'OP' | 'IP';
  reason: string;
}

export const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Date filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('?')[0].slice(0, 10)); // "YYYY-MM-DD"
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('');

  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [searchPatient, setSearchPatient] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [type, setType] = useState<'OP' | 'IP'>('OP');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      let query = `?date=${selectedDate}`;
      if (selectedDoctorFilter) {
        query += `&doctor=${selectedDoctorFilter}`;
      }
      const data = await api.get(`/appointments${query}`);
      setAppointments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch appointments list.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormMetadata = async () => {
    try {
      const [patRes, usersRes] = await Promise.all([
        api.get('/patients?limit=200'),
        api.get('/auth/users')
      ]);
      setPatients(patRes.patients || []);
      setDoctors(usersRes.filter((u: any) => u.role === 'Doctor') || []);
    } catch (err) {
      console.error('Metadata fetch failed:', err);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate, selectedDoctorFilter]);

  useEffect(() => {
    fetchFormMetadata();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedDoctorId || !appointmentDate || !timeSlot) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/appointments', {
        patientId: selectedPatientId,
        doctorId: selectedDoctorId,
        appointmentDate,
        timeSlot,
        type,
        reason
      });
      setIsOpen(false);
      resetForm();
      fetchAppointments();
    } catch (err: any) {
      setError(err.message || 'Scheduling failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: 'Completed' | 'Cancelled') => {
    if (!window.confirm(`Are you sure you want to mark this appointment as ${status}?`)) return;
    try {
      await api.put(`/appointments/${id}/status`, { status });
      fetchAppointments();
    } catch (err: any) {
      alert(err.message || 'Update failed');
    }
  };

  const resetForm = () => {
    setSelectedPatientId('');
    setSelectedDoctorId('');
    setAppointmentDate('');
    setTimeSlot('');
    setType('OP');
    setReason('');
    setSearchPatient('');
    setError('');
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchPatient.toLowerCase()) || 
    p.admissionNumber.toLowerCase().includes(searchPatient.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Doctor Appointments Registry</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Schedule Outpatient (OP) consultations and pre-admissions diagnostics.
          </p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Book Appointment
        </Button>
      </div>

      {/* FILTER SHEET */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-400">Filter Date</label>
            <div className="relative">
              <input 
                type="date" 
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border rounded-lg outline-none bg-white dark:bg-[#151515] dark:border-[#262626] dark:text-white"
              />
              <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            </div>
          </div>

          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-400">Filter Doctor</label>
            <select
              value={selectedDoctorFilter}
              onChange={e => setSelectedDoctorFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border rounded-lg outline-none bg-white dark:bg-[#151515] dark:border-[#262626] dark:text-white"
            >
              <option value="">-- All Doctors --</option>
              {doctors.map(doc => (
                <option key={doc._id} value={doc._id}>Dr. {doc.name}</option>
              ))}
            </select>
          </div>

          <Button variant="outline" size="sm" onClick={() => { setSelectedDate(new Date().toISOString().split('T')[0]); setSelectedDoctorFilter(''); }} className="shrink-0">
            Reset Filters
          </Button>
        </CardContent>
      </Card>

      {/* LIST TABLE */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Scheduled Appointment Slots</h2>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-black border-b border-gray-100 dark:border-[#1f1f1f] text-gray-400 uppercase tracking-widest text-[9px] font-bold">
                  <th className="p-3">Time</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Consulting Doctor</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#1f1f1f]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <div className="w-5 h-5 border-2 border-t-black dark:border-t-white rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : appointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-450 italic font-medium">No appointments scheduled for this selection</td>
                  </tr>
                ) : (
                  appointments.map(app => (
                    <tr key={app._id} className="hover:bg-gray-50 dark:hover:bg-[#151515] transition-colors">
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-gray-450" /> {app.timeSlot}</span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{app.patient?.name}</div>
                        <div className="text-[10px] text-gray-450 mt-0.5">{app.patient?.admissionNumber}</div>
                      </td>
                      <td className="p-3 font-semibold text-gray-700 dark:text-gray-300">Dr. {app.doctor?.name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          app.type === 'IP' 
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' 
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400'
                        }`}>
                          {app.type}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 max-w-xs truncate" title={app.reason}>{app.reason || 'General Health Review'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                          app.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-450' :
                          app.status === 'Cancelled' ? 'bg-red-105 text-red-800 dark:bg-red-950/20 dark:text-red-450' :
                          'bg-sky-100 text-sky-850 dark:bg-sky-950/25 dark:text-sky-400'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        {app.status === 'Scheduled' && (
                          <>
                            <Button 
                              variant="outline" 
                              className="text-[10px] px-2 py-0.5 border-emerald-250 text-emerald-650 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              onClick={() => updateStatus(app._id, 'Completed')}
                            >
                              Done
                            </Button>
                            <Button 
                              variant="outline" 
                              className="text-[10px] px-2 py-0.5 border-red-250 text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20"
                              onClick={() => updateStatus(app._id, 'Cancelled')}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CREATE APPOINTMENT DIALOG */}
      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title="Schedule Doctor Appointment">
        {error && <div className="p-3 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg mb-4">{error}</div>}
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          
          {/* Patient Selector Search */}
          <div className="space-y-1.5">
            <label className="block font-bold text-gray-400 uppercase tracking-wider text-[9px]">Select Registered Patient</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search patient by name or ID..."
                value={searchPatient}
                onChange={e => setSearchPatient(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border rounded-lg outline-none bg-white dark:bg-[#151515] dark:border-[#262626] dark:text-white"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            </div>

            {searchPatient && (
              <div className="max-h-36 overflow-y-auto border border-gray-150 dark:border-[#262626] rounded-lg mt-1 divide-y divide-gray-100 bg-white dark:bg-[#1a1a1a]">
                {filteredPatients.map(pat => (
                  <button
                    key={pat._id}
                    type="button"
                    onClick={() => { setSelectedPatientId(pat._id); setSearchPatient(pat.name); }}
                    className={`w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors flex justify-between items-center ${
                      selectedPatientId === pat._id ? 'bg-gray-100 dark:bg-neutral-800 font-bold' : ''
                    }`}
                  >
                    <span>{pat.name}</span>
                    <span className="font-mono text-[10px] text-gray-400">{pat.admissionNumber}</span>
                  </button>
                ))}
                {filteredPatients.length === 0 && <p className="text-center py-4 text-gray-400 italic">No matching patient found</p>}
              </div>
            )}
            {selectedPatientId && (
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold mt-1">
                <UserCheck className="h-3.5 w-3.5" /> Selected patient successfully.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block font-bold text-gray-400 uppercase tracking-wider text-[9px]">Consulting Doctor</label>
              <select
                value={selectedDoctorId}
                onChange={e => setSelectedDoctorId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg outline-none bg-white dark:bg-[#151515] dark:border-[#262626] dark:text-white"
                required
              >
                <option value="">-- Choose Doctor --</option>
                {doctors.map(doc => (
                  <option key={doc._id} value={doc._id}>Dr. {doc.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-gray-400 uppercase tracking-wider text-[9px]">Entry Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-lg outline-none bg-white dark:bg-[#151515] dark:border-[#262626] dark:text-white"
              >
                <option value="OP">Outpatient (OP)</option>
                <option value="IP">Inpatient pre-admit (IP)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block font-bold text-gray-400 uppercase tracking-wider text-[9px]">Appointment Date</label>
              <input 
                type="date"
                value={appointmentDate}
                onChange={e => setAppointmentDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg outline-none bg-white dark:bg-[#151515] dark:border-[#262626] dark:text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-gray-400 uppercase tracking-wider text-[9px]">Preferred Time Slot</label>
              <select
                value={timeSlot}
                onChange={e => setTimeSlot(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg outline-none bg-white dark:bg-[#151515] dark:border-[#262626] dark:text-white"
                required
              >
                <option value="">-- Select Time Slot --</option>
                <option value="09:00 AM">09:00 AM</option>
                <option value="09:30 AM">09:30 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="10:30 AM">10:30 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="11:30 AM">11:30 AM</option>
                <option value="12:00 PM">12:00 PM</option>
                <option value="02:00 PM">02:00 PM</option>
                <option value="02:30 PM">02:30 PM</option>
                <option value="03:00 PM">03:00 PM</option>
                <option value="03:30 PM">03:30 PM</option>
                <option value="04:00 PM">04:00 PM</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-gray-400 uppercase tracking-wider text-[9px]">Reason / Health Concern</label>
            <textarea
              placeholder="Primary symptoms or concern..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg outline-none bg-white dark:bg-[#151515] dark:border-[#262626] dark:text-white h-20 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#1f1f1f]">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={submitting}>Schedule Slot</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
