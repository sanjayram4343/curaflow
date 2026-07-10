import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, Button, Input, Select, Dialog, Badge } from '../components/ui';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';

interface Department {
  _id: string;
  name: string;
  code: string;
}

interface Bed {
  _id: string;
  bedNumber: string;
  ward: string;
  room: string;
  floor: number;
  bedType: 'General' | 'ICU' | 'Emergency' | 'Ventilator';
  status: 'Available' | 'Occupied' | 'Reserved' | 'Cleaning';
  department: Department;
  assignedPatient?: {
    _id: string;
    name: string;
  };
}

export const Beds: React.FC = () => {
  const { user, hasRole } = useAuth();
  
  // State for data
  const [beds, setBeds] = useState<Bed[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination & Filters State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBeds, setTotalBeds] = useState(0);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [sortBy, setSortBy] = useState('bedNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  
  // Field values
  const [bedNumber, setBedNumber] = useState('');
  const [ward, setWard] = useState('');
  const [room, setRoom] = useState('');
  const [floor, setFloor] = useState(1);
  const [bedType, setBedType] = useState<'General' | 'ICU' | 'Emergency' | 'Ventilator'>('General');
  const [status, setStatus] = useState<'Available' | 'Occupied' | 'Reserved' | 'Cleaning'>('Available');
  const [deptId, setDeptId] = useState('');
  const [formError, setFormError] = useState('');

  // Fetch departments for form options
  const fetchDepartments = async () => {
    try {
      const data = await api.get('/departments');
      setDepartments(data);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  // Fetch beds listing
  const fetchBeds = async () => {
    try {
      setLoading(true);
      setError('');
      
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '8',
        search,
        sortBy,
        sortOrder,
      });

      if (filterStatus) queryParams.append('status', filterStatus);
      if (filterType) queryParams.append('bedType', filterType);
      if (filterDept) queryParams.append('department', filterDept);

      const data = await api.get(`/beds?${queryParams.toString()}`);
      setBeds(data.beds);
      setPage(data.page);
      setTotalPages(data.pages);
      setTotalBeds(data.total);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch bed directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchBeds();
  }, [page, search, filterStatus, filterType, filterDept, sortBy, sortOrder]);

  const handleOpenCreate = () => {
    setEditingBed(null);
    setBedNumber('');
    setWard('');
    setRoom('');
    setFloor(1);
    setBedType('General');
    setStatus('Available');
    setDeptId(departments[0]?._id || '');
    setFormError('');
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (bed: Bed) => {
    setEditingBed(bed);
    setBedNumber(bed.bedNumber);
    setWard(bed.ward);
    setRoom(bed.room);
    setFloor(bed.floor);
    setBedType(bed.bedType);
    setStatus(bed.status);
    setDeptId(bed.department._id);
    setFormError('');
    setIsDialogOpen(true);
  };

  const handleSaveBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bedNumber || !ward || !room || !deptId) {
      setFormError('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        bedNumber,
        ward,
        room,
        floor: Number(floor),
        bedType,
        status,
        department: deptId
      };

      if (editingBed) {
        await api.put(`/beds/${editingBed._id}`, payload);
      } else {
        await api.post('/beds', payload);
      }

      setIsDialogOpen(false);
      fetchBeds();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Failed to save bed record');
    }
  };

  const handleDeleteBed = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bed record?')) return;
    try {
      await api.delete(`/beds/${id}`);
      fetchBeds();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete bed');
    }
  };

  const canEdit = hasRole(['Super Admin', 'Hospital Admin']);
  const canDelete = hasRole(['Super Admin', 'Hospital Admin']);

  return (
    <div className="space-y-6">
      
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bed Directory Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Maintain ward allocations, room tracking, and bed cleaning states.
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleOpenCreate} className="sm:self-start">
            <Plus className="h-4 w-4 mr-2" /> Add New Bed
          </Button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/40">
          {error}
        </div>
      )}

      {/* Search and Filters panel */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search bed, room, ward..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3.5 py-2 border rounded-lg text-sm bg-white dark:bg-slate-850 border-slate-350 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 transition-all"
              />
            </div>

            {/* Filter Status */}
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-850 border-slate-350 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
            >
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Reserved">Reserved</option>
              <option value="Cleaning">Cleaning</option>
            </select>

            {/* Filter Type */}
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-850 border-slate-350 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
            >
              <option value="">All Bed Types</option>
              <option value="General">General</option>
              <option value="ICU">ICU</option>
              <option value="Emergency">Emergency</option>
              <option value="Ventilator">Ventilator</option>
            </select>

            {/* Filter Department */}
            <select
              value={filterDept}
              onChange={(e) => { setFilterDept(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-850 border-slate-350 dark:border-slate-700 text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
              ))}
            </select>

            {/* Sort Control */}
            <div className="flex space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-850 border-slate-350 dark:border-slate-700 text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
              >
                <option value="bedNumber">Bed Number</option>
                <option value="room">Room</option>
                <option value="floor">Floor</option>
                <option value="bedType">Type</option>
                <option value="status">Status</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                title="Toggle sort direction"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Main Beds Tables Split */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-gray-200 dark:border-[#333] border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ICU Wards Bed Directory */}
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">ICU Wards Bed Directory</h2>
              <Badge variant="red">{beds.filter(b => b.bedType === 'ICU').length} Wards</Badge>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-750">
                <thead className="bg-slate-50 dark:bg-slate-800/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-450 uppercase tracking-wider">Bed</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-450 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-450 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-450 uppercase tracking-wider">Patient</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-450 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-750">
                  {beds.filter(b => b.bedType === 'ICU').length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-500">No active ICU beds matching parameters</td>
                    </tr>
                  ) : (
                    beds.filter(b => b.bedType === 'ICU').map(bed => (
                      <tr key={bed._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors text-xs">
                        <td className="px-4 py-3.5 whitespace-nowrap font-bold text-slate-850 dark:text-white">{bed.bedNumber}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-700 dark:text-slate-300">Room {bed.room}</div>
                          <div className="text-[10px] text-slate-400">Floor {bed.floor} · {bed.ward}</div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <Badge variant={
                            bed.status === 'Available' ? 'green' :
                            bed.status === 'Occupied' ? 'red' :
                            bed.status === 'Reserved' ? 'amber' :
                            'blue'
                          }>
                            {bed.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-350">
                          {bed.assignedPatient ? (
                            <span className="font-bold text-slate-800 dark:text-slate-200">{bed.assignedPatient.name}</span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right font-medium space-x-1.5">
                          <button onClick={() => handleOpenEdit(bed)} className={`inline-flex p-1 rounded-lg text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white transition-all ${!canEdit ? 'opacity-30' : ''}`} disabled={!canEdit}><Edit2 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => handleDeleteBed(bed._id)} className={`inline-flex p-1 rounded-lg text-slate-455 hover:bg-red-50 hover:text-red-650 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-all ${!canDelete || bed.status === 'Occupied' ? 'opacity-30' : ''}`} disabled={!canDelete || bed.status === 'Occupied'}><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* General Wards Bed Directory */}
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">General Wards Bed Directory</h2>
              <Badge variant="default">{beds.filter(b => b.bedType !== 'ICU').length} Beds</Badge>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-750">
                <thead className="bg-slate-50 dark:bg-slate-800/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-450 uppercase tracking-wider">Bed</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-450 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-450 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-450 uppercase tracking-wider">Patient</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-450 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-750">
                  {beds.filter(b => b.bedType !== 'ICU').length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-500">No active general beds matching parameters</td>
                    </tr>
                  ) : (
                    beds.filter(b => b.bedType !== 'ICU').map(bed => (
                      <tr key={bed._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors text-xs">
                        <td className="px-4 py-3.5 whitespace-nowrap font-bold text-slate-850 dark:text-white">{bed.bedNumber}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-700 dark:text-slate-300">Room {bed.room} <span className="text-[10px] text-gray-400 font-normal">({bed.bedType})</span></div>
                          <div className="text-[10px] text-slate-400">Floor {bed.floor} · {bed.ward}</div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <Badge variant={
                            bed.status === 'Available' ? 'green' :
                            bed.status === 'Occupied' ? 'red' :
                            bed.status === 'Reserved' ? 'amber' :
                            'blue'
                          }>
                            {bed.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-350">
                          {bed.assignedPatient ? (
                            <span className="font-bold text-slate-800 dark:text-slate-200">{bed.assignedPatient.name}</span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right font-medium space-x-1.5">
                          <button onClick={() => handleOpenEdit(bed)} className={`inline-flex p-1 rounded-lg text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-805 dark:hover:text-white transition-all ${!canEdit ? 'opacity-30' : ''}`} disabled={!canEdit}><Edit2 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => handleDeleteBed(bed._id)} className={`inline-flex p-1 rounded-lg text-slate-455 hover:bg-red-50 hover:text-red-650 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-all ${!canDelete || bed.status === 'Occupied' ? 'opacity-30' : ''}`} disabled={!canDelete || bed.status === 'Occupied'}><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Pagination bar */}
      {!loading && totalPages > 1 && (
        <div className="px-6 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl flex items-center justify-between">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Showing page {page} of {totalPages} ({totalBeds} total beds)
          </span>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* CREATE / EDIT DIALOG */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingBed ? 'Modify Bed Record' : 'Register New Bed'}
      >
        <form onSubmit={handleSaveBed} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs text-red-800 rounded-lg bg-red-50 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/30">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Bed Number"
              placeholder="e.g. B-ICU-105"
              value={bedNumber}
              onChange={(e) => setBedNumber(e.target.value)}
              required
            />
            <Input
              label="Room"
              placeholder="e.g. Room 101"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Ward Name"
              placeholder="e.g. Intensive Care"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              required
            />
            <Input
              label="Floor Level"
              type="number"
              value={floor}
              onChange={(e) => setFloor(Number(e.target.value))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Bed Type"
              value={bedType}
              onChange={(e) => setBedType(e.target.value as any)}
              options={[
                { value: 'General', label: 'General' },
                { value: 'ICU', label: 'ICU' },
                { value: 'Emergency', label: 'Emergency' },
                { value: 'Ventilator', label: 'Ventilator' }
              ]}
            />
            <Select
              label="Initial Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              options={[
                { value: 'Available', label: 'Available' },
                { value: 'Occupied', label: 'Occupied' },
                { value: 'Reserved', label: 'Reserved' },
                { value: 'Cleaning', label: 'Cleaning' }
              ]}
              disabled={editingBed?.status === 'Occupied'} // Block changing status here if occupied
            />
          </div>

          <Select
            label="Assigned Department"
            value={deptId}
            onChange={(e) => setDeptId(e.target.value)}
            options={departments.map(d => ({ value: d._id, label: `${d.name} (${d.code})` }))}
          />

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingBed ? 'Save Changes' : 'Create Bed'}
            </Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
export default Beds;
