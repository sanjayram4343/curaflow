import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, Button, Input, Select, Dialog } from '../components/ui';
import { Plus, Search, Edit2, Trash2, ShieldAlert, Wrench } from 'lucide-react';

interface Department {
  _id: string;
  name: string;
  code: string;
}

interface Equipment {
  _id: string;
  name: string;
  category: 'Oxygen Cylinder' | 'Wheelchair' | 'Ventilator' | 'ECG Machine' | 'Defibrillator' | 'Infusion Pump' | 'Monitor';
  serialNumber: string;
  status: 'Available' | 'Reserved' | 'Assigned' | 'Maintenance' | 'Broken';
  department: Department;
  assignedPatient?: {
    _id: string;
    name: string;
  };
}

export const EquipmentPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  
  // Data State
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters & Paging
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [sortBy, setSortBy] = useState('serialNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Dialog State (Equipment CRUD)
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  
  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Equipment['category']>('Oxygen Cylinder');
  const [serialNumber, setSerialNumber] = useState('');
  const [status, setStatus] = useState<Equipment['status']>('Available');
  const [deptId, setDeptId] = useState('');
  const [formError, setFormError] = useState('');

  // Maintenance Dialog state
  const [isMaintDialogOpen, setIsMaintDialogOpen] = useState(false);
  const [maintItem, setMaintItem] = useState<Equipment | null>(null);
  const [maintTechnician, setMaintTechnician] = useState('');
  const [maintDescription, setMaintDescription] = useState('');
  const [maintError, setMaintError] = useState('');

  // Equipment detail modal state for row click details
  const [selectedEquipmentDetail, setSelectedEquipmentDetail] = useState<any | null>(null);

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const data = await api.get('/departments');
      setDepartments(data);
    } catch (err) {
      console.error('Error departments:', err);
    }
  };

  // Fetch Equipment
  const fetchEquipment = async () => {
    try {
      setLoading(true);
      setError('');
      
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '8',
        search,
        sortBy,
        sortOrder
      });

      if (filterStatus) queryParams.append('status', filterStatus);
      if (filterCategory) queryParams.append('category', filterCategory);
      if (filterDept) queryParams.append('department', filterDept);

      const data = await api.get(`/equipment?${queryParams.toString()}`);
      setEquipmentList(data.equipment);
      setPage(data.page);
      setTotalPages(data.pages);
      setTotalItems(data.total);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch equipment roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchEquipment();
  }, [page, search, filterStatus, filterCategory, filterDept, sortBy, sortOrder]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setName('');
    setCategory('Oxygen Cylinder');
    setSerialNumber('');
    setStatus('Available');
    setDeptId(departments[0]?._id || '');
    setFormError('');
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: Equipment) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setSerialNumber(item.serialNumber);
    setStatus(item.status);
    setDeptId(item.department._id);
    setFormError('');
    setIsDialogOpen(true);
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !serialNumber || !deptId) {
      setFormError('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        name,
        category,
        serialNumber,
        status,
        department: deptId
      };

      if (editingItem) {
        await api.put(`/equipment/${editingItem._id}`, payload);
      } else {
        await api.post('/equipment', payload);
      }

      setIsDialogOpen(false);
      fetchEquipment();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Failed to save equipment');
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this equipment record?')) return;
    try {
      await api.delete(`/equipment/${id}`);
      fetchEquipment();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to remove equipment');
    }
  };

  // Open maintenance dialog
  const handleOpenMaintenance = (item: Equipment) => {
    setMaintItem(item);
    setMaintTechnician('');
    setMaintDescription('');
    setMaintError('');
    setIsMaintDialogOpen(true);
  };

  // File maintenance ticket
  const handleReportMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintItem || !maintTechnician || !maintDescription) {
      setMaintError('Please enter technician and problem description');
      return;
    }

    try {
      await api.post('/maintenance', {
        equipment: maintItem._id,
        technician: maintTechnician,
        description: maintDescription
      });

      setIsMaintDialogOpen(false);
      fetchEquipment();
    } catch (err: any) {
      console.error(err);
      setMaintError(err.message || 'Failed to file maintenance request');
    }
  };

  const canEdit = hasRole(['Super Admin', 'Hospital Admin']);
  const canDelete = hasRole(['Super Admin', 'Hospital Admin']);

  return (
    <div className="space-y-6">
      
      {/* Page Title & Add New button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Medical Equipment Register</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track ventilators, ECG machines, oxygen cylinders, and biomedical maintenance tickets.
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleOpenCreate} className="sm:self-start">
            <Plus className="h-4 w-4 mr-2" /> Register Equipment
          </Button>
        )}
      </div>

      {/* Roster-wide Error logs */}
      {error && (
        <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/40">
          {error}
        </div>
      )}

      {/* Filters Card */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Search Box */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-450">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search device name, SN..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3.5 py-2 border rounded-lg text-sm bg-white dark:bg-slate-850 border-slate-355 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 transition-all"
              />
            </div>

            {/* Filter Status */}
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-850 border-slate-355 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
            >
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Reserved">Reserved</option>
              <option value="Assigned">Assigned</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Broken">Broken</option>
            </select>

            {/* Filter Category */}
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-850 border-slate-355 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
            >
              <option value="">All Categories</option>
              <option value="Oxygen Cylinder">Oxygen Cylinder</option>
              <option value="Wheelchair">Wheelchair</option>
              <option value="Ventilator">Ventilator</option>
              <option value="ECG Machine">ECG Machine</option>
              <option value="Defibrillator">Defibrillator</option>
              <option value="Infusion Pump">Infusion Pump</option>
              <option value="Monitor">Monitor</option>
            </select>

            {/* Filter Department */}
            <select
              value={filterDept}
              onChange={(e) => { setFilterDept(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-850 border-slate-355 dark:border-slate-700 text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
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
                className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-850 border-slate-355 dark:border-slate-700 text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
              >
                <option value="name">Device Name</option>
                <option value="serialNumber">Serial Number</option>
                <option value="category">Category</option>
                <option value="status">Status</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-655 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-750">
            <thead className="bg-slate-50 dark:bg-slate-800/40">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-450 uppercase tracking-wider">Device / Serial</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-450 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-450 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-450 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-450 uppercase tracking-wider">Assigned Patient</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-450 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-750">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-medical-600"></div>
                  </td>
                </tr>
              ) : equipmentList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-450">
                    No medical equipment registered.
                  </td>
                </tr>
              ) : (
                equipmentList.map((item) => (
                  <tr
                    key={item._id}
                    onClick={() => setSelectedEquipmentDetail(item)}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4.5 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-850 dark:text-white">{item.name}</div>
                      <div className="text-xs text-slate-450 font-medium mt-0.5">SN: {item.serialNumber}</div>
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {item.category}
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap text-sm text-slate-600 dark:text-slate-350 font-medium">
                      {item.department?.name || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        item.status === 'Available' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' :
                        item.status === 'Assigned' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400' :
                        item.status === 'Reserved' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' :
                        item.status === 'Maintenance' ? 'bg-orange-100 text-orange-850 dark:bg-orange-950/40 dark:text-orange-400' :
                        'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap text-sm text-slate-600 dark:text-slate-350">
                      {item.assignedPatient ? (
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.assignedPatient.name}</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm font-medium space-x-2" onClick={e => e.stopPropagation()}>
                      {item.status !== 'Maintenance' && item.status !== 'Assigned' && (
                        <button
                          onClick={() => handleOpenMaintenance(item)}
                          className="inline-flex p-1.5 rounded-lg text-slate-400 hover:bg-orange-50 hover:text-orange-650 dark:hover:bg-orange-950/30 dark:hover:text-orange-400 transition-all"
                          title="Report Damage / File Ticket"
                        >
                          <Wrench className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className={`inline-flex p-1.5 rounded-lg text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-850 dark:hover:text-white transition-all ${
                          !canEdit ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                        disabled={!canEdit}
                        title="Edit Details"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEquipment(item._id)}
                        className={`inline-flex p-1.5 rounded-lg text-slate-455 hover:bg-red-50 hover:text-red-650 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-all ${
                          !canDelete || item.status === 'Assigned' ? 'opacity-35 cursor-not-allowed' : ''
                        }`}
                        disabled={!canDelete || item.status === 'Assigned'}
                        title={item.status === 'Assigned' ? 'Cannot delete assigned equipment' : 'Delete Equipment'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Showing page {page} of {totalPages} ({totalItems} total items)
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
      </Card>

      {/* CREATE / EDIT EQUIPMENT DIALOG */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingItem ? 'Edit Equipment Details' : 'Register Medical Equipment'}
      >
        <form onSubmit={handleSaveEquipment} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs text-red-800 rounded-lg bg-red-50 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/30">
              {formError}
            </div>
          )}

          <Input
            label="Device / Model Name"
            placeholder="e.g. Nellcor Oxygen O2-Max"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Equipment Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              options={[
                { value: 'Oxygen Cylinder', label: 'Oxygen Cylinder' },
                { value: 'Wheelchair', label: 'Wheelchair' },
                { value: 'Ventilator', label: 'Ventilator' },
                { value: 'ECG Machine', label: 'ECG Machine' },
                { value: 'Defibrillator', label: 'Defibrillator' },
                { value: 'Infusion Pump', label: 'Infusion Pump' },
                { value: 'Monitor', label: 'Monitor' }
              ]}
            />
            <Input
              label="Serial Number (Unique)"
              placeholder="e.g. OX-8821"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              required
              disabled={!!editingItem} // lock serial modification for existing items
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Device Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              options={[
                { value: 'Available', label: 'Available' },
                { value: 'Reserved', label: 'Reserved' },
                { value: 'Assigned', label: 'Assigned' },
                { value: 'Maintenance', label: 'Maintenance' },
                { value: 'Broken', label: 'Broken' }
              ]}
              disabled={editingItem?.status === 'Assigned'} // Block manual state change here if assigned
            />
            <Select
              label="Assigned Department"
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              options={departments.map(d => ({ value: d._id, label: `${d.name} (${d.code})` }))}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingItem ? 'Save Changes' : 'Register'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* REPORT MAINTENANCE DIALOG */}
      <Dialog
        isOpen={isMaintDialogOpen}
        onClose={() => setIsMaintDialogOpen(false)}
        title="Report Damaged Equipment"
      >
        <form onSubmit={handleReportMaintenance} className="space-y-4">
          {maintError && (
            <div className="p-3 text-xs text-red-800 rounded-lg bg-red-50 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/30">
              {maintError}
            </div>
          )}

          <div>
            <p className="text-sm text-slate-650 dark:text-slate-350">
              You are reporting <strong>{maintItem?.name} (SN: {maintItem?.serialNumber})</strong> for repair/maintenance. 
              Its status will automatically transition to <strong>Maintenance</strong>.
            </p>
          </div>

          <Input
            label="Assigned Technician / Department"
            placeholder="e.g. John Miller (Biomedical Eng.)"
            value={maintTechnician}
            onChange={(e) => setMaintTechnician(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Damage / Failure Description
            </label>
            <textarea
              rows={3}
              placeholder="Detail the failure triggers or battery alerts..."
              value={maintDescription}
              onChange={(e) => setMaintDescription(e.target.value)}
              className="w-full px-3.5 py-2 border rounded-lg text-sm bg-white dark:bg-slate-850 border-slate-355 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsMaintDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger">
              Send to Maintenance
            </Button>
          </div>
        </form>
      </Dialog>

      {/* EQUIPMENT DETAILS MODAL */}
      <Dialog
        isOpen={!!selectedEquipmentDetail}
        onClose={() => setSelectedEquipmentDetail(null)}
        title="Equipment Status & Allocation Detail"
      >
        {selectedEquipmentDetail && (
          <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <span className="text-[10px] text-gray-450 block uppercase font-bold tracking-wider">Device name</span>
              <span className="text-base font-bold text-gray-900 dark:text-white">{selectedEquipmentDetail.name}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-gray-455 block uppercase font-bold tracking-wider">Serial Number</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedEquipmentDetail.serialNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-455 block uppercase font-bold tracking-wider">Category</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedEquipmentDetail.category}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-[#1f1f1f] pt-3">
              <div>
                <span className="text-[10px] text-gray-455 block uppercase font-bold tracking-wider">Current Location</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedEquipmentDetail.department?.name || 'Unassigned'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-455 block uppercase font-bold tracking-wider">Device Status</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedEquipmentDetail.status}</span>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-[#1f1f1f] pt-3 space-y-2">
              <span className="text-[10px] text-gray-455 block uppercase font-bold tracking-wider">Allocation Status Details</span>
              {selectedEquipmentDetail.status === 'Available' ? (
                <div className="p-3 bg-emerald-50/40 border border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                  This device is fully available and ready to be assigned to active patients.
                </div>
              ) : selectedEquipmentDetail.status === 'Assigned' && selectedEquipmentDetail.assignedPatient ? (
                <div className="p-3.5 border border-gray-200 dark:border-[#262626] rounded-xl bg-gray-50 dark:bg-black space-y-2">
                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                    <div>
                      <span className="text-gray-450 block font-medium">Occupied Patient</span>
                      <span className="font-bold text-gray-950 dark:text-white">{selectedEquipmentDetail.assignedPatient.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-450 block font-medium">Admission ID</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-250">{selectedEquipmentDetail.assignedPatient.admissionNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-455 block font-medium">Occupied Since</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-250">
                        {new Date(selectedEquipmentDetail.assignedPatient.admissionDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-455 block font-medium">Estimated Return</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-250">
                        {selectedEquipmentDetail.assignedPatient.dischargeDate 
                          ? new Date(selectedEquipmentDetail.assignedPatient.dischargeDate).toLocaleDateString()
                          : 'Upon Patient Discharge'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : selectedEquipmentDetail.status === 'Maintenance' ? (
                <div className="p-3 bg-orange-50/40 border border-orange-100 dark:bg-orange-950/10 dark:border-orange-900/30 rounded-xl text-orange-850 dark:text-orange-400 text-xs font-semibold">
                  This device is currently checked out for biomedical maintenance/repairs.
                </div>
              ) : (
                <div className="p-3 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-150 dark:border-[#262626] rounded-xl text-xs text-gray-500 italic">
                  Device status is currently: {selectedEquipmentDetail.status}. No active patient assignments.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-[#1f1f1f] mt-4">
              <Button onClick={() => setSelectedEquipmentDetail(null)}>Close</Button>
            </div>
          </div>
        )}
      </Dialog>

    </div>
  );
};
export default EquipmentPage;
