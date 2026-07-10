import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Check, 
  X, 
  Edit3, 
  Power,
  TrendingUp,
  Activity,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api.js';
import Button from '../../components/Button.jsx';
import Input from '../../components/Input.jsx';

export const Branches = ({ user, showToast }) => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  
  // Form state
  const [formValues, setFormValues] = useState({
    name: '',
    branchCode: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    managerName: '',
    status: 'ACTIVE'
  });
  
  const [submitting, setSubmitting] = useState(false);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await api.get('/branches');
      setBranches(res.data.data.branches || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch branches', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
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
      name: '',
      branchCode: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      country: '',
      pincode: '',
      managerName: '',
      status: 'ACTIVE'
    });
    setShowCreateModal(true);
  };

  const openEditModal = (branch) => {
    setSelectedBranch(branch);
    setFormValues({
      name: branch.name,
      branchCode: branch.branchCode,
      phone: branch.phone,
      email: branch.email,
      address: branch.address,
      city: branch.city,
      state: branch.state,
      country: branch.country,
      pincode: branch.pincode,
      managerName: branch.managerName,
      status: branch.status
    });
    setShowEditModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/branches', formValues);
      showToast('Branch created successfully', 'success');
      setShowCreateModal(false);
      fetchBranches();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create branch', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/branches/${selectedBranch._id}`, formValues);
      showToast('Branch updated successfully', 'success');
      setShowEditModal(false);
      fetchBranches();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update branch', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (branch) => {
    const newStatus = branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.patch(`/branches/${branch._id}/status`, { status: newStatus });
      showToast(`Branch status updated to ${newStatus}`, 'success');
      fetchBranches();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update branch status', 'error');
    }
  };

  // Filter branches
  const filteredBranches = branches.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.branchCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && b.status === statusFilter;
  });

  const getStatusBadgeColor = (status) => {
    return status === 'ACTIVE'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-rose-50 text-rose-700 border-rose-200';
  };

  // If user is Admin or Cashier, render details panel
  if (user?.role !== 'SUPER_ADMIN') {
    const branch = branches[0];
    return (
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">Branch Details</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Information about your assigned active location.</p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : branch ? (
          <div className="glass-card rounded-3xl p-8 border border-slate-200/80 shadow-xl max-w-2xl bg-white/60 backdrop-blur-md">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Building2 className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{branch.name}</h2>
                  <p className="text-sm font-mono text-slate-500 font-semibold">{branch.branchCode}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeColor(branch.status)}`}>
                {branch.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-semibold text-slate-700 mt-8 border-t border-slate-100 pt-6">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-slate-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Manager</span>
                  <span>{branch.managerName}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-slate-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Phone</span>
                  <span>{branch.phone}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-slate-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Email</span>
                  <span className="truncate block max-w-[200px]">{branch.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-slate-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Address</span>
                  <span>{branch.address}, {branch.city}, {branch.state}, {branch.country} - {branch.pincode}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-8 border border-slate-200/80 shadow-md text-center max-w-md">
            <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-4" />
            <p className="text-sm font-semibold text-slate-500">No branch assignment found. Please contact administration.</p>
          </div>
        )}
      </div>
    );
  }

  // Super Admin view
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">Branch Management</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Configure and manage physical POS outlets.</p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="h-4.5 w-4.5" /> Create Branch
        </Button>
      </header>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by branch name, code, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold text-slate-700"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto select-none">
          {['ALL', 'ACTIVE', 'INACTIVE'].map((status) => (
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
      ) : filteredBranches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBranches.map((branch) => (
            <div key={branch._id} className="glass-card rounded-2xl p-6 border border-slate-200/80 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">{branch.name}</h3>
                      <p className="text-xs font-mono text-slate-400 font-bold uppercase">{branch.branchCode}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeColor(branch.status)}`}>
                    {branch.status}
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 text-xs font-semibold text-slate-600 mt-4 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span>Manager: {branch.managerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{branch.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span className="truncate">{branch.city}, {branch.state} ({branch.pincode})</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-6 border-t border-slate-100 pt-4">
                <Button 
                  variant="secondary" 
                  onClick={() => openEditModal(branch)} 
                  className="flex-1 !py-2 text-xs font-bold gap-1 border-slate-200"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </Button>
                <button
                  onClick={() => handleToggleStatus(branch)}
                  className={`flex items-center justify-center p-2 rounded-xl border transition-all ${
                    branch.status === 'ACTIVE'
                      ? 'border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100'
                      : 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                  title={branch.status === 'ACTIVE' ? 'Deactivate Branch' : 'Activate Branch'}
                >
                  <Power className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-12 border border-slate-200/80 text-center text-slate-400">
          No branches found.
        </div>
      )}

      {/* CREATE BRANCH MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowCreateModal(false)} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
          <div className="glass-card rounded-3xl w-full max-w-xl p-8 relative z-10 border border-slate-200/80 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 font-display">Create New Branch</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Branch Name" name="name" placeholder="e.g. Koramangala Outlet" required value={formValues.name} onChange={handleInputChange} />
              <Input label="Branch Code" name="branchCode" placeholder="e.g. KOR001" required value={formValues.branchCode} onChange={handleInputChange} />
              <Input label="Manager Name" name="managerName" placeholder="Manager full name" required value={formValues.managerName} onChange={handleInputChange} />
              <Input label="Phone Number" name="phone" placeholder="Phone number" required value={formValues.phone} onChange={handleInputChange} />
              <Input label="Email" name="email" type="email" placeholder="Branch contact email" required value={formValues.email} onChange={handleInputChange} />
              <Input label="Pincode" name="pincode" placeholder="6-digit ZIP/Pincode" required value={formValues.pincode} onChange={handleInputChange} />
              <div className="md:col-span-2">
                <Input label="Street Address" name="address" placeholder="Address street details" required value={formValues.address} onChange={handleInputChange} />
              </div>
              <Input label="City" name="city" placeholder="City" required value={formValues.city} onChange={handleInputChange} />
              <Input label="State" name="state" placeholder="State" required value={formValues.state} onChange={handleInputChange} />
              <Input label="Country" name="country" placeholder="Country" required value={formValues.country} onChange={handleInputChange} />
              
              <div className="md:col-span-2 flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
                <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" loading={submitting}>Save Branch</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BRANCH MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowEditModal(false)} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
          <div className="glass-card rounded-3xl w-full max-w-xl p-8 relative z-10 border border-slate-200/80 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 font-display">Edit Branch Details</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Branch Name" name="name" required value={formValues.name} onChange={handleInputChange} />
              <Input label="Branch Code (Read Only)" name="branchCode" disabled required value={formValues.branchCode} />
              <Input label="Manager Name" name="managerName" required value={formValues.managerName} onChange={handleInputChange} />
              <Input label="Phone Number" name="phone" required value={formValues.phone} onChange={handleInputChange} />
              <Input label="Email" name="email" type="email" required value={formValues.email} onChange={handleInputChange} />
              <Input label="Pincode" name="pincode" required value={formValues.pincode} onChange={handleInputChange} />
              <div className="md:col-span-2">
                <Input label="Street Address" name="address" required value={formValues.address} onChange={handleInputChange} />
              </div>
              <Input label="City" name="city" required value={formValues.city} onChange={handleInputChange} />
              <Input label="State" name="state" required value={formValues.state} onChange={handleInputChange} />
              <Input label="Country" name="country" required value={formValues.country} onChange={handleInputChange} />
              
              <div className="md:col-span-2 flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
                <Button variant="secondary" type="button" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button type="submit" loading={submitting}>Update Branch</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
