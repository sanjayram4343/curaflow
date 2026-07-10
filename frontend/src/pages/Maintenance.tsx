import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, Button, Select, Dialog, Input } from '../components/ui';
import { Wrench, CheckCircle, Clock, ShieldAlert } from 'lucide-react';

interface Equipment {
  _id: string;
  name: string;
  serialNumber: string;
  category: string;
}

interface Maintenance {
  _id: string;
  equipment: Equipment;
  reportedBy: {
    _id: string;
    name: string;
  };
  technician: string;
  description: string;
  status: 'Reported' | 'In Progress' | 'Completed';
  startDate: string;
  endDate?: string;
}

export const MaintenancePage: React.FC = () => {
  const { user } = useAuth();
  
  // Data lists
  const [requests, setRequests] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog State (Update Status)
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<Maintenance | null>(null);
  
  // Form status edit fields
  const [status, setStatus] = useState<'Reported' | 'In Progress' | 'Completed'>('Reported');
  const [technician, setTechnician] = useState('');
  const [formError, setFormError] = useState('');

  const fetchMaintenance = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/maintenance');
      setRequests(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch maintenance registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenance();
  }, []);

  const handleOpenStatusDialog = (req: Maintenance) => {
    setSelectedReq(req);
    setStatus(req.status);
    setTechnician(req.technician);
    setFormError('');
    setIsDialogOpen(true);
  };

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    if (!technician) {
      setFormError('Please enter the technician name');
      return;
    }

    try {
      await api.put(`/maintenance/${selectedReq._id}/status`, {
        status,
        technician
      });
      setIsDialogOpen(false);
      fetchMaintenance();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Failed to update maintenance log');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Biomedical Maintenance Register</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Monitor medical device damage reports, assign technicians, and track equipment restoration schedules.
        </p>
      </div>

      {/* error list */}
      {error && (
        <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/40">
          {error}
        </div>
      )}

      {/* Main logs Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-750">
            <thead className="bg-slate-50 dark:bg-slate-800/40">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-455 uppercase tracking-wider">Equipment Details</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-455 uppercase tracking-wider">Reported Issue</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-455 uppercase tracking-wider">Timeline</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-455 uppercase tracking-wider">Technician</th>
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
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-450">
                    No active maintenance orders in register.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors">
                    <td className="px-6 py-4.5 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-850 dark:text-white">
                        {req.equipment?.name || <span className="text-red-500 font-semibold">Deleted Device</span>}
                      </div>
                      <div className="text-xs text-slate-455 mt-0.5 font-medium">
                        SN: {req.equipment?.serialNumber} • {req.equipment?.category}
                      </div>
                    </td>
                    <td className="px-6 py-4.5 text-sm text-slate-655 dark:text-slate-300 max-w-[220px] truncate" title={req.description}>
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{req.description}</div>
                      <div className="text-xs text-slate-400 mt-0.5">By {req.reportedBy?.name}</div>
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap">
                      <div className="text-xs text-slate-600 dark:text-slate-350">
                        Started: {new Date(req.startDate).toLocaleDateString()}
                      </div>
                      {req.endDate && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          Restored: {new Date(req.endDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap text-sm text-slate-600 dark:text-slate-350 font-semibold">
                      {req.technician || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        req.status === 'Reported' ? 'bg-red-50 text-red-805 dark:bg-red-950/20 dark:text-red-400 border border-red-100' :
                        req.status === 'In Progress' ? 'bg-amber-50 text-amber-805 dark:bg-amber-955/20 dark:text-amber-400 border border-amber-100' :
                        'bg-emerald-50 text-emerald-805 dark:bg-emerald-955/20 dark:text-emerald-400 border border-emerald-105'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm font-medium">
                      {req.status !== 'Completed' && (
                        <button
                          onClick={() => handleOpenStatusDialog(req)}
                          className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-slate-250 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                        >
                          <Wrench className="h-3.5 w-3.5 mr-1" /> Update Status
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* UPDATE STATUS DIALOG */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Update Repair Order Status"
      >
        <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs text-red-800 rounded-lg bg-red-50 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/30">
              {formError}
            </div>
          )}

          <div>
            <p className="text-sm text-slate-655 dark:text-slate-350">
              Update details and states for <strong>{selectedReq?.equipment?.name} (SN: {selectedReq?.equipment?.serialNumber})</strong>.
            </p>
          </div>

          <Input
            label="Assigned Technician"
            value={technician}
            onChange={(e) => setTechnician(e.target.value)}
            placeholder="e.g. John Miller (Biomedical Eng.)"
            required
          />

          <Select
            label="Repair Job Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            options={[
              { value: 'Reported', label: 'Reported / Backlog' },
              { value: 'In Progress', label: 'In Progress / Review' },
              { value: 'Completed', label: 'Completed (Restore Device)' }
            ]}
          />

          {status === 'Completed' && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 rounded-lg">
              <p className="text-xs text-emerald-800 dark:text-emerald-400 font-semibold">
                Note: Marking this job as completed will set the device status to 'Available' in the register automatically.
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Update Order
            </Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
export default MaintenancePage;
