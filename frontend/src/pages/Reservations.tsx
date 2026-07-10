import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, Button, Input, Select, Dialog } from '../components/ui';
import { CalendarRange, Plus, XCircle, Ban, CheckCircle } from 'lucide-react';

interface Bed {
  _id: string;
  bedNumber: string;
  ward: string;
  bedType: string;
}

interface Equipment {
  _id: string;
  name: string;
  category: string;
  serialNumber: string;
}

interface Reserver {
  _id: string;
  name: string;
}

interface Reservation {
  _id: string;
  itemType: 'Bed' | 'Equipment';
  bed?: Bed;
  equipment?: Equipment;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Completed' | 'Cancelled';
  reserver: Reserver;
}

export const Reservations: React.FC = () => {
  const { user } = useAuth();
  
  // Data lists
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog & Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [itemType, setItemType] = useState<'Bed' | 'Equipment'>('Bed');
  const [bedId, setBedId] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formError, setFormError] = useState('');

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/reservations');
      setReservations(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch reservations list');
    } finally {
      setLoading(false);
    }
  };

  const fetchReserveResources = async () => {
    try {
      // Fetch all beds (or limit=100)
      const bedData = await api.get('/beds?limit=100');
      setBeds(bedData.beds);

      // Fetch all equipment
      const eqData = await api.get('/equipment?limit=100');
      setEquipmentList(eqData.equipment);
    } catch (err) {
      console.error('Failed to load reservation resources:', err);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleOpenCreate = () => {
    fetchReserveResources();
    setItemType('Bed');
    setBedId('');
    setEquipmentId('');
    // Defaults: start date tomorrow, end date day after tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    
    setStartDate(tomorrow.toISOString().split('T')[0] + 'T09:00');
    setEndDate(dayAfter.toISOString().split('T')[0] + 'T17:00');
    setFormError('');
    setIsDialogOpen(true);
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemType === 'Bed' && !bedId) {
      setFormError('Please select a bed to reserve');
      return;
    }
    if (itemType === 'Equipment' && !equipmentId) {
      setFormError('Please select an equipment to reserve');
      return;
    }
    if (!startDate || !endDate) {
      setFormError('Please choose start and end timestamps');
      return;
    }

    try {
      const payload = {
        itemType,
        bed: itemType === 'Bed' ? bedId : null,
        equipment: itemType === 'Equipment' ? equipmentId : null,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      };

      await api.post('/reservations', payload);
      setIsDialogOpen(false);
      fetchReservations();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Double booking collision or database issue');
    }
  };

  const handleCancelReservation = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;
    try {
      await api.put(`/reservations/${id}/cancel`, {});
      fetchReservations();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to cancel reservation');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Resource Reservations</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pre-book general beds, ICU units, and diagnostic machines. Overlaps are automatically validated to prevent conflicts.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="sm:self-start">
          <Plus className="h-4 w-4 mr-2" /> Make a Reservation
        </Button>
      </div>

      {/* error list */}
      {error && (
        <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/40">
          {error}
        </div>
      )}

      {/* Main reservations grid/list */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-750">
            <thead className="bg-slate-50 dark:bg-slate-800/40">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-450 uppercase tracking-wider">Reserved Item</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-450 uppercase tracking-wider">Item Type</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-450 uppercase tracking-wider">Time Interval</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-450 uppercase tracking-wider">Reserved By</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-450 uppercase tracking-wider">Status</th>
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
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-450">
                    No active or past reservations found.
                  </td>
                </tr>
              ) : (
                reservations.map((res) => (
                  <tr key={res._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors">
                    <td className="px-6 py-4.5 whitespace-nowrap">
                      {res.itemType === 'Bed' ? (
                        <div>
                          <span className="font-bold text-slate-850 dark:text-white">{res.bed?.bedNumber}</span>
                          <span className="text-xs text-slate-400 block">{res.bed?.ward} ward ({res.bed?.bedType})</span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-bold text-slate-850 dark:text-white">{res.equipment?.name}</span>
                          <span className="text-xs text-slate-405 block">SN: {res.equipment?.serialNumber} ({res.equipment?.category})</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap text-sm text-slate-600 dark:text-slate-350 font-medium">
                      {res.itemType}
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap">
                      <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        Start: {new Date(res.startDate).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-450 mt-0.5">
                        End: {new Date(res.endDate).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap text-sm text-slate-600 dark:text-slate-350">
                      {res.reserver?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        res.status === 'Active' ? 'bg-indigo-100 text-indigo-805 dark:bg-indigo-950/40 dark:text-indigo-400' :
                        res.status === 'Completed' ? 'bg-emerald-100 text-emerald-805 dark:bg-emerald-950/40 dark:text-emerald-400' :
                        'bg-slate-100 text-slate-750 dark:bg-slate-700 dark:text-slate-400'
                      }`}>
                        {res.status}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm font-medium">
                      {res.status === 'Active' && (
                        <button
                          onClick={() => handleCancelReservation(res._id)}
                          className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-colors"
                          title="Cancel Reservation"
                        >
                          <Ban className="h-3.5 w-3.5 mr-1" /> Cancel
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

      {/* CREATE RESERVATION DIALOG */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Schedule Resource Reservation"
      >
        <form onSubmit={handleCreateReservation} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs text-red-800 rounded-lg bg-red-50 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/30">
              {formError}
            </div>
          )}

          <Select
            label="Resource Category"
            value={itemType}
            onChange={(e) => setItemType(e.target.value as any)}
            options={[
              { value: 'Bed', label: 'Bed Allocation' },
              { value: 'Equipment', label: 'Biomedical Equipment' }
            ]}
          />

          {itemType === 'Bed' ? (
            <Select
              label="Select Bed Unit"
              value={bedId}
              onChange={(e) => setBedId(e.target.value)}
              options={[
                { value: '', label: 'Select a Bed' },
                ...beds.map(b => ({ value: b._id, label: `${b.bedNumber} - ${b.bedType} (${b.ward})` }))
              ]}
              required
            />
          ) : (
            <Select
              label="Select Medical Device"
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
              options={[
                { value: '', label: 'Select Equipment' },
                ...equipmentList.map(eq => ({ value: eq._id, label: `${eq.name} (SN: ${eq.serialNumber})` }))
              ]}
              required
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Starts From"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="Ends On"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Reserve Resource
            </Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
export default Reservations;
