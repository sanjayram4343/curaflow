import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Card, CardContent, Button } from '../components/ui';
import { Search, ShieldAlert, History, RefreshCw } from 'lucide-react';

interface HospitalRecord {
  _id: string;
  name: string;
  city: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  hospital?: string | { _id: string; name: string } | null;
}

interface LogEntry {
  _id: string;
  user: User;
  action: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [hospitals, setHospitals] = useState<HospitalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination, search, and filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [hospFilter, setHospFilter] = useState('');

  const fetchHospitals = async () => {
    try {
      const data = await api.get('/hospitals');
      setHospitals(data || []);
    } catch (err) {
      console.error('Failed to load hospitals for log lookup:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '12',
        search
      });

      const data = await api.get(`/audit-logs?${queryParams.toString()}`);
      setLogs(data.logs || []);
      setPage(data.page || 1);
      setTotalPages(data.pages || 1);
      setTotalLogs(data.total || 0);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to retrieve system audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, search]);

  const handleRefresh = () => {
    fetchHospitals();
    fetchLogs();
  };

  // Local helper to resolve hospital name from ID/Object in log.user
  const getHospitalName = (userObj: User) => {
    if (!userObj.hospital) return 'Central Administrative';
    
    // If it's already an object
    if (typeof userObj.hospital === 'object' && 'name' in userObj.hospital) {
      return userObj.hospital.name;
    }
    
    // If it is a string ID
    const match = hospitals.find(h => h._id === userObj.hospital);
    return match ? match.name : 'Regional Hospital';
  };

  // Perform client-side role and hospital filtering on the retrieved logs page
  // Note: the backend handles pagination and search. We apply additional filters in UI for precise navigation.
  const filteredLogs = logs.filter(log => {
    const matchesRole = !roleFilter || (log.user?.role === roleFilter);
    
    let matchesHosp = true;
    if (hospFilter) {
      if (hospFilter === 'Central') {
        matchesHosp = !log.user?.hospital;
      } else {
        const userHospId = typeof log.user?.hospital === 'object' ? log.user?.hospital?._id : log.user?.hospital;
        matchesHosp = userHospId === hospFilter;
      }
    }

    return matchesRole && matchesHosp;
  });

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 animate-fade-in">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight flex items-center">
            <History className="h-5 w-5 mr-2 text-gray-550" />
            Security Audit Trail Logs
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Chronological registry of hospital database transactions, administrator registrations, and user access records.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 border rounded-lg hover:bg-gray-50 dark:bg-black dark:border-[#222] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          title="Refresh audit logs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {error && (
        <div className="p-3 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* Filter and Search Card */}
      <Card className="border border-gray-150 dark:border-[#222] bg-white dark:bg-[#0f0f0f] shadow-sm">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
          {/* Search box */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-400">Search details</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search action details, operator, or IP..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3.5 py-2 border rounded-lg text-xs bg-white dark:bg-[#1a1a1a] dark:border-[#262626] text-gray-900 dark:text-white outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-400">Role Filter</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3.5 py-2 border rounded-lg text-xs bg-white dark:bg-[#1a1a1a] dark:border-[#262626] text-gray-900 dark:text-white outline-none text-slate-800 dark:text-slate-200"
            >
              <option value="">-- All Security Roles --</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Hospital Admin">Hospital Admin</option>
              <option value="Doctor">Doctor</option>
              <option value="Nurse">Nurse</option>
              <option value="Reception Staff">Reception Staff</option>
            </select>
          </div>

          {/* Hospital Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-400">Hospital Filter</label>
            <select
              value={hospFilter}
              onChange={(e) => setHospFilter(e.target.value)}
              className="w-full px-3.5 py-2 border rounded-lg text-xs bg-white dark:bg-[#1a1a1a] dark:border-[#262626] text-gray-900 dark:text-white outline-none text-slate-800 dark:text-slate-200"
            >
              <option value="">-- All Hospital Nodes --</option>
              <option value="Central">Central Administrative Node</option>
              {hospitals.map(h => (
                <option key={h._id} value={h._id}>{h.name}</option>
              ))}
            </select>
          </div>

        </CardContent>
      </Card>

      {/* Main Table Card */}
      <Card className="border border-gray-150 dark:border-[#222] shadow-sm overflow-hidden bg-white dark:bg-[#0f0f0f]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-150 dark:divide-[#222] text-left text-xs">
            <thead className="bg-gray-50 dark:bg-black text-[9px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-150 dark:border-[#1f1f1f]">
              <tr>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Time</th>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Action</th>
                <th className="px-6 py-3.5">Hospital Center</th>
                <th className="px-6 py-3.5">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-[#1f1f1f] bg-white dark:bg-[#0f0f0f]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900 dark:border-white"></div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-400 italic">
                    No matching audit trail logs recorded.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const dateObj = new Date(log.createdAt);
                  return (
                    <tr key={log._id} className="hover:bg-gray-50/50 dark:hover:bg-[#1a1a1a]/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {dateObj.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white">{log.user?.name || 'Deleted User'}</div>
                        <div className="text-[10px] text-gray-450 mt-0.5">{log.user?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 dark:text-slate-355 text-[10px] bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                          {log.user?.role || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="inline-flex font-black text-slate-900 dark:text-white mb-0.5">
                            {log.action}
                          </span>
                          <span className="text-[10px] text-gray-400 block truncate max-w-xs" title={log.details}>
                            {log.details}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                        {log.user ? getHospitalName(log.user) : '—'}
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-500 dark:text-gray-400">
                        {log.ipAddress || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paging controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-black border-t border-gray-150 dark:border-[#222] flex items-center justify-between text-xs">
            <span className="text-gray-400">
              Showing page {page} of {totalPages} ({totalLogs} audit logs)
            </span>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="font-bold py-1 border-gray-300 dark:border-[#333]"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className="font-bold py-1 border-gray-300 dark:border-[#333]"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

    </div>
  );
};
export default AuditLogs;
