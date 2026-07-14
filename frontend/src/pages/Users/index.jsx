import React, { useState, useEffect } from 'react';
import { 
  Users as UsersIcon, 
  Plus, 
  Search, 
  User, 
  Phone, 
  Mail, 
  Shield, 
  Building2, 
  Check, 
  X, 
  Edit3, 
  Trash2, 
  Power,
  Lock,
  RefreshCw,
  AlertTriangle,
  Clock
} from 'lucide-react';
import api from '../../services/api.js';
import Button from '../../components/Button.jsx';
import Input from '../../components/Input.jsx';

export const Users = ({ user: currentUser, showToast }) => {
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL or PENDING
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form state
  const [formValues, setFormValues] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'CASHIER',
    branchId: '',
    status: 'ACTIVE'
  });
  
  const [submitting, setSubmitting] = useState(false);

  const getErrorMessage = (err, fallback) => {
    return err?.message || err?.response?.data?.message || fallback;
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.data.users || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingUsers = async () => {
    if (currentUser?.role !== 'SUPER_ADMIN') return;
    try {
      const res = await api.get('/users/pending');
      setPendingUsers(res.data.data.users || []);
    } catch (err) {
      // Silently fail — non-critical
    }
  };

  const fetchBranches = async () => {
    if (currentUser?.role === 'SUPER_ADMIN') {
      try {
        const res = await api.get('/branches');
        const activeBranches = (res.data.data.branches || []).filter(b => b.status === 'ACTIVE');
        setBranches(activeBranches);
      } catch (err) {
        showToast('Failed to fetch active branches list', 'error');
      }
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchBranches();
    fetchPendingUsers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openCreateModal = () => {
    setFormValues({
      username: '',
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'CASHIER',
      branchId: currentUser?.role === 'ADMIN' ? currentUser.branchId : (branches[0]?._id || ''),
      status: 'ACTIVE'
    });
    setShowCreateModal(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormValues({
      name: user.name,
      phone: user.phone || '',
      password: '', // leave empty to not modify password
      role: user.role,
      branchId: user.branchId?._id || user.branchId || '',
      status: user.status
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...formValues };
      payload.branchId = payload.branchId ? String(payload.branchId) : null;

      // Admin: role is always CASHIER, branchId is admin's branchId
      if (currentUser?.role === 'ADMIN') {
        payload.role = 'CASHIER';
        payload.branchId = currentUser.branchId?._id || currentUser.branchId || null;
      }
      if (payload.role === 'SUPER_ADMIN') {
        delete payload.branchId;
      }

      if ((payload.role === 'ADMIN' || payload.role === 'CASHIER') && !payload.branchId) {
        showToast('Please select a branch for this user.', 'error');
        setSubmitting(false);
        return;
      }

      await api.post('/users', payload);
      showToast('User created successfully', 'success');
      setShowCreateModal(false);
      fetchUsers();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to create user'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...formValues };
      payload.branchId = payload.branchId ? String(payload.branchId) : null;

      if (!payload.password) {
        delete payload.password; // Do not send empty password
      }
      if (currentUser?.role === 'ADMIN') {
        // Admin cannot modify these anyway
        delete payload.role;
        delete payload.branchId;
      }
      if (payload.role === 'SUPER_ADMIN') {
        delete payload.branchId;
      }

      await api.patch(`/users/${selectedUser._id}`, payload);
      showToast('User details updated successfully', 'success');
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to update user'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (userRecord) => {
    // Toggles between ACTIVE and INACTIVE
    const newStatus = userRecord.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.patch(`/users/${userRecord._id}/status`, { status: newStatus });
      showToast(`User status updated to ${newStatus}`, 'success');
      fetchUsers();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to update user status'), 'error');
    }
  };

  const handleDeleteSubmit = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/users/${selectedUser._id}/deactivate`);
      showToast('User account deactivated (soft-deleted) successfully', 'success');
      setShowDeleteModal(false);
      fetchUsers();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to deactivate user'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveUser = async (userRecord) => {
    try {
      await api.post(`/users/${userRecord._id}/approve`);
      showToast(`${userRecord.name} approved and activated successfully`, 'success');
      fetchPendingUsers();
      fetchUsers();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to approve user'), 'error');
    }
  };

  const handleRejectUser = async (userRecord) => {
    try {
      await api.post(`/users/${userRecord._id}/reject`);
      showToast(`${userRecord.name}'s application rejected`, 'success');
      fetchPendingUsers();
      fetchUsers();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to reject user'), 'error');
    }
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && u.status === statusFilter;
  });

  const getRoleBadgeColor = (role) => {
    if (role === 'SUPER_ADMIN') return 'border-rose-200 bg-rose-50 text-rose-700';
    if (role === 'ADMIN') return 'border-amber-200 bg-amber-50 text-amber-800';
    return 'border-sky-200 bg-sky-50 text-sky-700';
  };

  const getStatusBadgeColor = (status) => {
    if (status === 'ACTIVE') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'SUSPENDED') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">User Management</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {currentUser?.role === 'SUPER_ADMIN' 
              ? 'Manage all employee roles, branches, and status permissions.' 
              : 'Add and manage cashier accounts for your branch.'}
          </p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="h-4.5 w-4.5" /> Create User
        </Button>
      </header>

      {/* Tab Bar — Super Admin only shows Pending tab */}
      {currentUser?.role === 'SUPER_ADMIN' && (
        <div className="flex border-b border-slate-200 select-none">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`py-3 px-6 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'ALL'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <UsersIcon className="h-4 w-4" /> All Users
          </button>
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`py-3 px-6 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'PENDING'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="h-4 w-4" /> Pending Approvals
            {pendingUsers.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-white">
                {pendingUsers.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* PENDING APPROVALS TAB */}
      {activeTab === 'PENDING' && currentUser?.role === 'SUPER_ADMIN' && (
        <div className="flex flex-col gap-4">
          {pendingUsers.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 border border-slate-200/80 text-center text-slate-400">
              <Clock className="h-8 w-8 mx-auto mb-3 opacity-30" />
              No pending user account applications.
            </div>
          ) : (
            <div className="overflow-x-auto w-full glass-card rounded-2xl border border-amber-200/60 shadow-md">
              <div className="px-6 py-3 bg-amber-50/80 border-b border-amber-200/50 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-700">{pendingUsers.length} user account(s) awaiting review</span>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-4 pl-6">User</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Branch</th>
                    <th className="p-4">Requested</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700 bg-white/40">
                  {pendingUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-amber-50 flex items-center justify-center border border-amber-200 shrink-0 text-amber-600">
                            <User className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-slate-900 block">{u.name}</span>
                            <span className="text-[11px] text-slate-400 font-mono">@{u.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-slate-400" /> {u.email}</span>
                          {u.phone && <span className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-slate-400" /> {u.phone}</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getRoleBadgeColor(u.role)}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        {u.branchId ? (
                          <span className="flex items-center gap-1.5 text-slate-800">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            {u.branchId.name || 'Branch'}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApproveUser(u)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-sm"
                            title="Approve this user"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleRejectUser(u)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                            title="Reject this user"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ALL USERS TAB */}
      {activeTab === 'ALL' && (
        <>
          {/* Filter and Search Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search users by name, username, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold text-slate-700"
              />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto select-none">
              {['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    statusFilter === status
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="overflow-x-auto w-full glass-card rounded-2xl border border-slate-200/80 shadow-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Username / Name</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Role</th>
                <th className="p-4">Branch Location</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700 bg-white/40">
              {filteredUsers.map((u) => (
                <tr key={u._id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 text-slate-600">
                        <User className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-900 block">{u.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">@{u.username}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-slate-400" /> {u.email}</span>
                      {u.phone && <span className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-slate-400" /> {u.phone}</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getRoleBadgeColor(u.role)}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    {u.branchId ? (
                      <span className="flex items-center gap-1.5 text-slate-800">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        {u.branchId.name || 'Branch'}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">None (Super Admin)</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getStatusBadgeColor(u.status)}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                        title="Edit User"
                      >
                        <Edit3 className="h-4.5 w-4.5" />
                      </button>
                      
                      {currentUser?.role === 'SUPER_ADMIN' || (currentUser?.role === 'ADMIN' && u.role === 'CASHIER') ? (
                        <>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              u.status === 'ACTIVE'
                                ? 'border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100'
                                : 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                            title={u.status === 'ACTIVE' ? 'Deactivate Status' : 'Activate Status'}
                          >
                            <Power className="h-4.5 w-4.5" />
                          </button>
                          
                          <button
                            onClick={() => openDeleteModal(u)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Soft Delete / Resign User"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-12 border border-slate-200/80 text-center text-slate-400">
          No users found.
        </div>
      )}
        </>
      )}

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowCreateModal(false)} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
          <div className="glass-card rounded-3xl w-full max-w-xl p-8 relative z-10 border border-slate-200/80 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 font-display">Create User Account</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name" name="name" placeholder="Full name" required value={formValues.name} onChange={handleInputChange} />
              <Input label="Username" name="username" placeholder="Choose username" required value={formValues.username} onChange={handleInputChange} />
              <Input label="Email" name="email" type="email" placeholder="Email address" required value={formValues.email} onChange={handleInputChange} />
              <Input label="Phone Number" name="phone" placeholder="Contact number" value={formValues.phone} onChange={handleInputChange} />
              <Input label="Password" name="password" type="password" placeholder="Min 8 characters" required value={formValues.password} onChange={handleInputChange} />
              
              {currentUser?.role === 'SUPER_ADMIN' ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Role</label>
                    <select
                      name="role"
                      value={formValues.role}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/40 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-bold text-slate-800"
                    >
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="ADMIN">Admin</option>
                      <option value="CASHIER">Cashier</option>
                    </select>
                  </div>
                  
                  {formValues.role !== 'SUPER_ADMIN' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Assign Branch</label>
                      <select
                        name="branchId"
                        value={formValues.branchId}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/40 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-bold text-slate-800"
                      >
                        <option value="">Select Branch</option>
                        {branches.map(b => (
                          <option key={b._id} value={b._id}>{b.name} ({b.branchCode})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              ) : null}
              
              <div className="md:col-span-2 flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
                <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" loading={submitting}>Save User</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowEditModal(false)} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
          <div className="glass-card rounded-3xl w-full max-w-xl p-8 relative z-10 border border-slate-200/80 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 font-display">Edit User Profile</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name" name="name" required value={formValues.name} onChange={handleInputChange} />
              <Input label="Phone Number" name="phone" value={formValues.phone} onChange={handleInputChange} />
              
              <div className="md:col-span-2">
                <Input label="Change Password (Optional)" name="password" type="password" placeholder="Leave empty to keep current password" value={formValues.password} onChange={handleInputChange} />
              </div>
              
              {currentUser?.role === 'SUPER_ADMIN' ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Role</label>
                    <select
                      name="role"
                      value={formValues.role}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/40 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-bold text-slate-800"
                    >
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="ADMIN">Admin</option>
                      <option value="CASHIER">Cashier</option>
                    </select>
                  </div>
                  
                  {formValues.role !== 'SUPER_ADMIN' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Assign Branch</label>
                      <select
                        name="branchId"
                        value={formValues.branchId}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/40 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-bold text-slate-800"
                      >
                        <option value="">Select Branch</option>
                        {branches.map(b => (
                          <option key={b._id} value={b._id}>{b.name} ({b.branchCode})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Account Status</label>
                    <select
                      name="status"
                      value={formValues.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/40 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-bold text-slate-800"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Account Status</label>
                  <select
                    name="status"
                    value={formValues.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/40 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-bold text-slate-800"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              )}
              
              <div className="md:col-span-2 flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
                <Button variant="secondary" type="button" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button type="submit" loading={submitting}>Update Profile</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SOFT DELETE / DEACTIVATE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowDeleteModal(false)} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
          <div className="glass-card rounded-3xl w-full max-w-md p-6 relative z-10 border border-slate-200/80 shadow-2xl text-center flex flex-col items-center gap-4 bg-white">
            <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-display">Deactivate Account</h3>
              <p className="text-xs text-slate-500 font-semibold mt-2 leading-relaxed">
                Are you sure you want to deactivate (soft-delete) **{selectedUser?.name}**? This user will immediately be blocked from logging in.
              </p>
            </div>
            <div className="flex gap-3 w-full mt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
              <button
                onClick={handleDeleteSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
