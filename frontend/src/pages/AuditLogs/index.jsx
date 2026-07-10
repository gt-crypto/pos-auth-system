import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Calendar, 
  Layers, 
  User, 
  Building2, 
  Download, 
  RefreshCw, 
  Eye, 
  X,
  FileCode,
  Globe,
  Terminal
} from 'lucide-react';
import api from '../../services/api.js';
import Button from '../../components/Button.jsx';

export const AuditLogs = ({ user, showToast }) => {
  const [logs, setLogs] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Search & Filters state
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    performedByRole: '',
    branchId: '',
    performedBy: '',
    entityType: '',
    entityId: '',
    startDate: '',
    endDate: ''
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1
  });

  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Common sensitive actions for filter dropdown
  const actionOptions = [
    { value: 'LOGIN', label: 'Login (Success)' },
    { value: 'LOGOUT', label: 'Logout' },
    { value: 'FAILED_LOGIN', label: 'Failed Login' },
    { value: 'ACCOUNT_LOCKED', label: 'Account Locked' },
    { value: 'PASSWORD_CHANGED', label: 'Password Changed' },
    { value: 'PASSWORD_RESET', label: 'Password Reset' },
    { value: 'CREATE_USER', label: 'User Created' },
    { value: 'UPDATE_USER', label: 'User Updated' },
    { value: 'DEACTIVATE_USER', label: 'User Deactivated' },
    { value: 'INGREDIENTS_ACCESS_GRANTED', label: 'Ingredients Access Granted' },
    { value: 'INGREDIENTS_ACCESS_REVOKED', label: 'Ingredients Access Revoked' },
    { value: 'DISCOUNT_OVERRIDE', label: 'Discount Override' },
    { value: 'CREATE_ORDER', label: 'Order Created' },
    { value: 'VOID_ORDER', label: 'Order Voided' },
    { value: 'REFUND_ORDER', label: 'Order Refunded' },
    { value: 'INGREDIENT_CREATED', label: 'Ingredient Created' },
    { value: 'INGREDIENT_UPDATED', label: 'Ingredient Updated' },
    { value: 'INGREDIENT_DELETED', label: 'Ingredient Deleted' },
    { value: 'STOCK_INCREASED', label: 'Stock Restocked' },
    { value: 'STOCK_ADJUSTED', label: 'Stock Adjusted' },
    { value: 'STOCK_TRANSFER', label: 'Stock Transferred' },
    { value: 'LOW_STOCK_ALERT', label: 'Low Stock Alert' },
    { value: 'OUT_OF_STOCK_ALERT', label: 'Out of Stock Alert' }
  ];

  // Load supporting lists
  useEffect(() => {
    const fetchSupportData = async () => {
      try {
        const [branchesRes, usersRes] = await Promise.all([
          api.get('/branches'),
          api.get('/users')
        ]);
        setBranches(branchesRes.data?.data?.branches || []);
        setUsers(usersRes.data?.data?.users || []);
      } catch (err) {
        console.error('Failed to load support lists:', err);
      }
    };
    fetchSupportData();
  }, []);

  // Fetch Audit Logs
  const fetchLogs = async (pageNumber = pagination.page) => {
    setLoading(true);
    try {
      const params = {
        page: pageNumber,
        limit: pagination.limit,
        ...filters
      };
      
      // Clean empty params
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });

      const res = await api.get('/audit', { params });
      if (res.data?.success) {
        setLogs(res.data.data.logs || []);
        setPagination({
          page: res.data.data.pagination.page,
          limit: res.data.data.pagination.limit,
          total: res.data.data.pagination.total,
          totalPages: res.data.data.pagination.totalPages
        });
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to retrieve audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      action: '',
      performedByRole: '',
      branchId: '',
      performedBy: '',
      entityType: '',
      entityId: '',
      startDate: '',
      endDate: ''
    });
  };

  // Export File (CSV / JSON)
  const handleExport = async (type) => {
    try {
      const params = {
        export: type,
        ...filters
      };
      // Clean empty params
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });

      // API request with blob output
      const res = await api.get('/audit', { 
        params, 
        responseType: 'blob' 
      });

      const blob = new Blob([res.data], { type: type === 'csv' ? 'text/csv' : 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_logs_${Date.now()}.${type}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast(`Exported ${type.toUpperCase()} file successfully`, 'success');
    } catch (err) {
      showToast('Failed to export audit logs', 'error');
    }
  };

  const getRoleBadgeColor = (role) => {
    if (role === 'SUPER_ADMIN') return 'border-rose-200 bg-rose-50 text-rose-700';
    if (role === 'ADMIN') return 'border-amber-200 bg-amber-50 text-amber-800';
    return 'border-sky-200 bg-sky-50 text-sky-700';
  };

  const getActionBadgeColor = (action) => {
    if (action.includes('LOCK') || action.includes('FAILED') || action.includes('DELETED')) {
      return 'bg-rose-50 text-rose-700 border-rose-100';
    }
    if (action.includes('CREATED') || action.includes('GRANTED') || action.includes('RESTORE')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    }
    if (action.includes('UPDATE') || action.includes('ADJUST') || action.includes('OVERRIDE')) {
      return 'bg-amber-50 text-amber-700 border-amber-100';
    }
    return 'bg-slate-50 text-slate-700 border-slate-100';
  };

  const handleOpenDetails = (logItem) => {
    setSelectedLog(logItem);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-blue-600 shrink-0" />
            Audit Logs System
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Immutable logs recording sensitive database mutations, access elevations, and user logins.
          </p>
        </div>

        {/* Exports */}
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={() => handleExport('csv')}
            className="text-xs font-bold border-slate-200 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => handleExport('json')}
            className="text-xs font-bold border-slate-200 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" /> Export JSON
          </Button>
          <Button 
            variant="primary" 
            onClick={() => fetchLogs(pagination.page)}
            className="text-xs font-bold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </header>

      {/* Grid Layout: Sidebar Filter & Logs Table */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* Sidebar Filters */}
        <div className="glass-card rounded-3xl border border-slate-200/80 p-6 bg-white xl:col-span-1 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            Filters & Criteria
          </h3>

          {/* Search bar */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Fuzzy Search</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search action, role, ID..."
                className="w-full text-xs font-semibold pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
              />
            </div>
          </div>

          {/* Action selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Action Type</label>
            <select
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
              className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl outline-none"
            >
              <option value="">All Actions</option>
              {actionOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* User selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Actor</label>
            <select
              name="performedBy"
              value={filters.performedBy}
              onChange={handleFilterChange}
              className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl outline-none"
            >
              <option value="">All Users</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>@{u.username} ({u.name})</option>
              ))}
            </select>
          </div>

          {/* Role selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Actor Role</label>
            <select
              name="performedByRole"
              value={filters.performedByRole}
              onChange={handleFilterChange}
              className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl outline-none"
            >
              <option value="">All Roles</option>
              <option value="SUPER_ADMIN">SUPER ADMIN</option>
              <option value="ADMIN">ADMIN</option>
              <option value="CASHIER">CASHIER</option>
              <option value="SYSTEM">SYSTEM</option>
            </select>
          </div>

          {/* Branch context */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Branch Location</label>
            <select
              name="branchId"
              value={filters.branchId}
              onChange={handleFilterChange}
              className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl outline-none"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Entity type and entity ID */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Entity Type</label>
              <input
                type="text"
                name="entityType"
                value={filters.entityType}
                onChange={handleFilterChange}
                placeholder="e.g. Order"
                className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Entity ID</label>
              <input
                type="text"
                name="entityId"
                value={filters.entityId}
                onChange={handleFilterChange}
                placeholder="ObjectId"
                className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl outline-none"
              />
            </div>
          </div>

          {/* Date range filters */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Date Range</label>
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="w-full text-xs font-semibold pl-9 pr-3 py-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="w-full text-xs font-semibold pl-9 pr-3 py-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>
            </div>
          </div>

          <Button 
            variant="secondary" 
            onClick={clearFilters}
            className="w-full justify-center text-xs mt-2"
          >
            Clear All Criteria
          </Button>
        </div>

        {/* Audit Logs Table Panel */}
        <div className="glass-card rounded-3xl border border-slate-200/80 p-6 bg-white xl:col-span-3 flex flex-col gap-4 min-h-[400px]">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 py-12">
              <ShieldCheck className="h-12 w-12 text-slate-300" />
              <p className="font-bold text-sm">No audit logs matching selection</p>
            </div>
          ) : (
            <div className="flex flex-col justify-between h-full flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Entity</th>
                      <th className="py-3 px-4">Branch</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-semibold text-slate-700">
                    {logs.map((logItem) => (
                      <tr 
                        key={logItem._id} 
                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-all cursor-pointer"
                        onClick={() => handleOpenDetails(logItem)}
                      >
                        <td className="py-3 px-4 font-medium text-slate-500">
                          {new Date(logItem.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                              <User className="h-3 w-3 text-slate-500" />
                            </div>
                            <span className="truncate max-w-[120px]">
                              {logItem.performedBy?.username || 'SYSTEM'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 border text-[9px] font-extrabold rounded-full ${getRoleBadgeColor(logItem.performedByRole)}`}>
                            {logItem.performedByRole || 'SYSTEM'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 border text-[9px] font-bold rounded-md uppercase ${getActionBadgeColor(logItem.action)}`}>
                            {logItem.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-[10px]">{logItem.entityType}</span>
                            <span className="text-slate-400 text-[9px]">{logItem.entityId || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-medium">
                          {logItem.branchId?.name || (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                              <Globe className="h-3 w-3 text-slate-300" /> Global
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenDetails(logItem)}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                            title="View log metadata details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Section */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-4">
                <span className="text-xs text-slate-500 font-semibold">
                  Showing Page <strong className="text-slate-800">{pagination.page}</strong> of <strong className="text-slate-800">{pagination.totalPages}</strong> ({pagination.total} records)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => fetchLogs(pagination.page - 1)}
                    disabled={pagination.page <= 1 || loading}
                    className="text-xs font-bold border-slate-200 py-1.5"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => fetchLogs(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages || loading}
                    className="text-xs font-bold border-slate-200 py-1.5"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Audit Detail Modal */}
      {isModalOpen && selectedLog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-scaleIn">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2 text-slate-800">
                <FileCode className="h-5 w-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 font-display">Audit Log Entry</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6 scrollbar-thin">
              {/* Profile Details */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Log ID</span>
                  <span className="font-mono">{selectedLog._id}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Timestamp</span>
                  <span>{new Date(selectedLog.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block">User Actor</span>
                  <span>@{selectedLog.performedBy?.username || 'SYSTEM'} ({selectedLog.performedBy?.name || 'System Auto'})</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Role</span>
                  <span className={`px-2 py-0.5 border text-[9px] font-extrabold rounded-full ${getRoleBadgeColor(selectedLog.performedByRole)}`}>
                    {selectedLog.performedByRole}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Action</span>
                  <span className={`px-2.5 py-0.5 border text-[9px] font-bold rounded-md uppercase ${getActionBadgeColor(selectedLog.action)}`}>
                    {selectedLog.action.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Branch</span>
                  <span>{selectedLog.branchId?.name || 'Global (Corporate System)'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block">IP Address</span>
                  <span className="font-mono">{selectedLog.ipAddress || 'Internal Loopback'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block">User Agent</span>
                  <span className="truncate block max-w-[200px]" title={selectedLog.userAgent}>
                    {selectedLog.userAgent || 'Unknown Agent'}
                  </span>
                </div>
              </div>

              {/* Entity Context */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Target Entity Context</h4>
                <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-500" />
                    <span>{selectedLog.entityType}</span>
                  </div>
                  <span className="font-mono text-slate-400 font-medium">{selectedLog.entityId || 'N/A'}</span>
                </div>
              </div>

              {/* JSON Metadata Inspector */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="h-4 w-4 text-slate-400" />
                    Metadata Payload
                  </h4>
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-mono">
                    IMMUTABLE
                  </span>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto text-[10px] text-emerald-400 font-mono max-h-48 scrollbar-thin">
                  <pre>{JSON.stringify(selectedLog.metadata || {}, null, 2)}</pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <Button
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-bold border-slate-200"
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
