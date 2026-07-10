import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, Button, Select, Dialog, Input } from '../components/ui';
import { ArrowLeftRight, Check, X, ShieldAlert, Sparkles, Send } from 'lucide-react';

interface Hospital {
  _id: string;
  name: string;
  city: string;
}

interface Patient {
  _id: string;
  name: string;
  admissionNumber: string;
  diagnosis: string;
}

interface Transfer {
  _id: string;
  patient: Patient;
  sourceHospital: Hospital;
  targetHospital: Hospital;
  status: 'Pending' | 'Approved' | 'Completed' | 'Rejected';
  reason: string;
  requestedBy: {
    _id: string;
    name: string;
  };
}

interface Suggestion {
  hospital: Hospital;
  availableIcuBeds: number;
  availableEquipmentCount: number;
  score: number;
}

export const Transfers: React.FC = () => {
  const { user } = useAuth();
  
  // Data lists
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggLoading, setSuggLoading] = useState(false);
  const [error, setError] = useState('');

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // New Transfer Form State
  const [patientId, setPatientId] = useState('');
  const [equipCategory, setEquipCategory] = useState('');
  const [targetHospId, setTargetHospId] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/transfers');
      setTransfers(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to retrieve transfer database');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivePatients = async () => {
    try {
      const data = await api.get('/patients?limit=100&status=Admitted');
      setPatients(data.patients);
    } catch (err) {
      console.error('Error patients:', err);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const handleOpenTransferModal = () => {
    fetchActivePatients();
    setPatientId('');
    setEquipCategory('');
    setTargetHospId('');
    setReason('');
    setSuggestions([]);
    setFormError('');
    setIsDialogOpen(true);
  };

  // Fetch suggestions when equipment category changes or query is run
  const handleQuerySuggestions = async () => {
    if (!equipCategory) {
      alert('Please select an equipment category for ICU routing suggestions.');
      return;
    }
    try {
      setSuggLoading(true);
      const data = await api.get(`/transfers/suggestions?equipmentCategory=${equipCategory}`);
      setSuggestions(data);
    } catch (err) {
      console.error(err);
      alert('Failed to calculate logistics recommendations.');
    } finally {
      setSuggLoading(false);
    }
  };

  const handleInitiateTransfer = async (targetHospitalId: string) => {
    if (!patientId || !reason) {
      setFormError('Please select a patient and enter a reason for transfer');
      return;
    }

    try {
      await api.post('/transfers', {
        patient: patientId,
        targetHospital: targetHospitalId,
        reason
      });
      setIsDialogOpen(false);
      fetchTransfers();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Failed to send transfer request');
    }
  };

  const handleUpdateStatus = async (id: string, status: 'Approved' | 'Rejected' | 'Completed') => {
    if (!window.confirm(`Are you sure you want to mark this transfer request as ${status}?`)) return;
    try {
      await api.put(`/transfers/${id}/status`, { status });
      fetchTransfers();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Action denied');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Patient Logistics & Transfers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Coordinate patient migrations. The routing advisor recommends target hospitals with open ICU beds and matching equipment.
          </p>
        </div>
        <Button onClick={handleOpenTransferModal} className="sm:self-start">
          <ArrowLeftRight className="h-4 w-4 mr-2" /> Coordinate Transfer
        </Button>
      </div>

      {/* error label */}
      {error && (
        <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/40">
          {error}
        </div>
      )}

      {/* Main Transfer Requests logs */}
      <Card>
        <CardHeader>
          <h3 className="font-bold text-base text-slate-800 dark:text-white">Logistics & Active Migration Requests</h3>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-750">
            <thead className="bg-slate-50 dark:bg-slate-800/40">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-455 uppercase tracking-wider">Patient Details</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-455 uppercase tracking-wider">Routing Details</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-455 uppercase tracking-wider">Reason for Transfer</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-455 uppercase tracking-wider">Requested By</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-455 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-455 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-750">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-medical-600"></div>
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-455">
                    No active or historical transfer files found.
                  </td>
                </tr>
              ) : (
                transfers.map((tr) => {
                  // Determine if our hospital is the target (and therefore can approve/reject/complete)
                  const isTargetHosp = String(tr.targetHospital._id) === String(user?.hospital?._id);
                  return (
                    <tr key={tr._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors">
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <span className="text-sm font-bold text-slate-850 dark:text-white">{tr.patient?.name}</span>
                        <span className="text-xs text-slate-400 block mt-0.5">{tr.patient?.admissionNumber}</span>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <div className="text-xs text-slate-700 dark:text-slate-250 font-semibold">
                          From: {tr.sourceHospital?.name}
                        </div>
                        <div className="text-xs text-slate-450 mt-0.5 font-medium">
                          To: {tr.targetHospital?.name}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-sm text-slate-600 dark:text-slate-350 max-w-[200px] truncate" title={tr.reason}>
                        {tr.reason}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-sm text-slate-600 dark:text-slate-350">
                        {tr.requestedBy?.name || 'Central Coordinator'}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          tr.status === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-955/40 dark:text-amber-400' :
                          tr.status === 'Approved' ? 'bg-blue-105 text-blue-805 dark:bg-blue-955/40 dark:text-blue-400' :
                          tr.status === 'Completed' ? 'bg-emerald-100 text-emerald-805 dark:bg-emerald-955/40 dark:text-emerald-400' :
                          'bg-red-100 text-red-800 dark:bg-red-955/40 dark:text-red-400'
                        }`}>
                          {tr.status}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-right text-xs font-medium space-x-1.5">
                        {isTargetHosp && tr.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(tr._id, 'Approved')}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(tr._id, 'Rejected')}
                              className="px-2 py-1 bg-red-650 hover:bg-red-700 text-white rounded-md font-semibold"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {isTargetHosp && tr.status === 'Approved' && (
                          <button
                            onClick={() => handleUpdateStatus(tr._id, 'Completed')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold"
                          >
                            Mark Completed
                          </button>
                        )}
                        {!isTargetHosp && tr.status === 'Pending' && (
                          <span className="text-slate-400 text-xs italic">Awaiting target approval</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* TRANSFER COORDINATION MODAL */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Coordinate Patient Migration"
      >
        <div className="space-y-5">
          {formError && (
            <div className="p-3 text-xs text-red-805 rounded-lg bg-red-50 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/30">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <Select
              label="Select Patient to Transfer"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              options={[
                { value: '', label: 'Select Admitted Patient' },
                ...patients.map(p => ({ value: p._id, label: `${p.name} (${p.admissionNumber})` }))
              ]}
              required
            />

            <Input
              label="Reason for Relocation"
              placeholder="e.g. Critical escalation, specialized care requirements..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />

            <div className="border-t border-slate-200 dark:border-slate-700/60 pt-4 space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Logistics Advisor: Query Recommendations
              </label>
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={equipCategory}
                    onChange={(e) => setEquipCategory(e.target.value)}
                    options={[
                      { value: '', label: 'Required Medical Equipment' },
                      { value: 'Oxygen Cylinder', label: 'Oxygen Cylinder' },
                      { value: 'Wheelchair', label: 'Wheelchair' },
                      { value: 'Ventilator', label: 'Ventilator' },
                      { value: 'ECG Machine', label: 'ECG Machine' },
                      { value: 'Defibrillator', label: 'Defibrillator' },
                      { value: 'Infusion Pump', label: 'Infusion Pump' },
                      { value: 'Monitor', label: 'Monitor' }
                    ]}
                  />
                </div>
                <Button type="button" variant="outline" onClick={handleQuerySuggestions} disabled={suggLoading}>
                  <Sparkles className="h-4 w-4 mr-1 text-amber-500" /> Recommend
                </Button>
              </div>
            </div>
          </div>

          {/* Suggested Hospitals Cards list */}
          {suggestions.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-455 dark:text-slate-400">
                Ranked Target Hospitals (ICU beds & Devices availability):
              </span>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {suggestions.map((sugg) => (
                  <div 
                    key={sugg.hospital._id}
                    className="p-3.5 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/10 hover:border-medical-500 transition-colors"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-250">{sugg.hospital.name}</h4>
                      <p className="text-xs text-slate-450 mt-0.5">Location: {sugg.hospital.city}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-xs text-slate-600 dark:text-slate-350">
                          🟢 ICU Beds: <strong>{sugg.availableIcuBeds}</strong>
                        </span>
                        <span className="text-xs text-slate-655 dark:text-slate-350">
                          🔵 Selected Devices: <strong>{sugg.availableEquipmentCount}</strong>
                        </span>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handleInitiateTransfer(sugg.hospital._id)}
                      disabled={sugg.availableIcuBeds === 0}
                      title={sugg.availableIcuBeds === 0 ? 'No ICU beds available' : 'Initiate transfer'}
                    >
                      <Send className="h-3.5 w-3.5 mr-1" /> Send
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700/60 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>

    </div>
  );
};
export default Transfers;
