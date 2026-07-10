import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Check, 
  X, 
  Edit3, 
  Power,
  Users,
  Building2,
  Folder,
  ShoppingBag,
  History,
  Phone,
  Mail,
  MapPin,
  FileText
} from 'lucide-react';
import api from '../../services/api.js';
import Button from '../../components/Button.jsx';
import Input from '../../components/Input.jsx';

export const Suppliers = ({ user, showToast }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [sortBy, setSortBy] = useState('companyName');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [paginationInfo, setPaginationInfo] = useState({
    totalRecords: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false
  });

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierDetails, setSupplierDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form values
  const [formValues, setFormValues] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstNumber: '',
    address: '',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);

  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      fetchSuppliers();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Refetch when filters or pagination changes
  useEffect(() => {
    fetchSuppliers();
  }, [page, limit, statusFilter, sortBy]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchTerm,
        status: statusFilter,
        sortBy,
        page,
        limit
      };
      const res = await api.get('/suppliers', { params });
      const { suppliers: fetchedList, pagination } = res.data.data;
      setSuppliers(fetchedList || []);
      setPaginationInfo(pagination);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch suppliers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openCreateModal = () => {
    setFormValues({
      companyName: '',
      contactPerson: '',
      phone: '',
      email: '',
      gstNumber: '',
      address: '',
      notes: ''
    });
    setShowCreateModal(true);
  };

  const openEditModal = (supplier) => {
    setSelectedSupplier(supplier);
    setFormValues({
      companyName: supplier.companyName,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      gstNumber: supplier.gstNumber || '',
      address: supplier.address,
      notes: supplier.notes || ''
    });
    setShowEditModal(true);
  };

  const openDetailsPanel = async (supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailsPanel(true);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/suppliers/${supplier._id}`);
      setSupplierDetails(res.data.data);
    } catch (err) {
      showToast('Failed to load supplier profile details', 'error');
      setShowDetailsPanel(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/suppliers', formValues);
      showToast('Supplier profile created successfully', 'success');
      setShowCreateModal(false);
      fetchSuppliers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create supplier profile', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/suppliers/${selectedSupplier._id}`, formValues);
      showToast('Supplier profile updated successfully', 'success');
      setShowEditModal(false);
      fetchSuppliers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update supplier profile', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (supplier) => {
    const isArchived = supplier.status === 'INACTIVE';
    try {
      if (isArchived) {
        await api.post(`/suppliers/${supplier._id}/restore`);
        showToast('Supplier restored successfully', 'success');
      } else {
        await api.delete(`/suppliers/${supplier._id}`);
        showToast('Supplier archived successfully', 'success');
      }
      fetchSuppliers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update supplier status', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">Suppliers Management</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Configure external vendors, purchase orders, and supplied goods catalog.</p>
        </div>
        {user?.role !== 'CASHIER' && (
          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <Plus className="h-4.5 w-4.5" /> Add Supplier
          </Button>
        )}
      </header>

      {/* Filters and Search Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by vendor company, contact, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold text-slate-700"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto select-none">
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 focus:outline-none"
            >
              <option value="companyName">Sort: Company (A-Z)</option>
              <option value="companyName_desc">Sort: Company (Z-A)</option>
              <option value="newest">Sort: Newest Added</option>
              <option value="oldest">Sort: Oldest Added</option>
              <option value="status">Sort: Status</option>
            </select>
          </div>
        </div>

        {/* Status filter badges */}
        <div className="flex gap-2 items-center text-xs font-bold select-none">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider px-2">Status:</span>
          {['ALL', 'ACTIVE', 'INACTIVE'].map(filterStatus => (
            <button
              key={filterStatus}
              onClick={() => { setStatusFilter(filterStatus); setPage(1); }}
              className={`px-4 py-1.5 rounded-xl border transition-all ${
                statusFilter === filterStatus
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {filterStatus === 'ALL' ? 'All Vendors' : filterStatus === 'ACTIVE' ? 'Active Only' : 'Archived'}
            </button>
          ))}
        </div>
      </div>

      {/* Datagrid */}
      {loading ? (
        <div className="flex flex-col gap-3 py-12">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 w-full rounded-2xl bg-slate-200/40 animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : suppliers.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto w-full glass-card rounded-2xl border border-slate-200/80 shadow-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 pl-6">Company</th>
                  <th className="p-4">Contact Person</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Email</th>
                  <th className="p-4 text-center">Supplied Products</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700 bg-white/40">
                {suppliers.map((sup) => (
                  <tr key={sup._id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-4 pl-6 font-bold text-slate-900 cursor-pointer hover:text-blue-600" onClick={() => openDetailsPanel(sup)}>
                      {sup.companyName}
                    </td>
                    <td className="p-4">{sup.contactPerson}</td>
                    <td className="p-4 font-mono">{sup.phone}</td>
                    <td className="p-4">{sup.email}</td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {sup.productsSuppliedCount || 0} items
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                        sup.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {sup.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDetailsPanel(sup)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          title="View Details"
                        >
                          <Building2 className="h-4 w-4" />
                        </button>
                        
                        {user?.role !== 'CASHIER' && (
                          <>
                            <button
                              onClick={() => openEditModal(sup)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                              title="Edit Supplier"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            
                            <button
                              onClick={() => handleToggleStatus(sup)}
                              className={`p-1.5 rounded-lg border transition-all ${
                                sup.status === 'ACTIVE'
                                  ? 'border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100'
                                  : 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                              }`}
                              title={sup.status === 'ACTIVE' ? 'Archive Supplier' : 'Restore Supplier'}
                            >
                              <Power className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs font-semibold text-slate-500">
              Showing page {page} of {paginationInfo.totalPages || 1} ({paginationInfo.totalRecords} total records)
            </span>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                disabled={!paginationInfo.hasPrevious} 
                onClick={() => setPage(p => p - 1)}
                className="!py-1.5 text-xs"
              >
                Previous
              </Button>
              <Button 
                disabled={!paginationInfo.hasNext} 
                onClick={() => setPage(p => p + 1)}
                className="!py-1.5 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-12 border border-slate-200/80 text-center text-slate-400">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-500">No suppliers found matching filters.</p>
        </div>
      )}

      {/* CREATE & EDIT MODALS */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
          <div className="glass-card rounded-3xl w-full max-w-lg p-8 relative z-10 border border-slate-200/80 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 font-display">
                {showCreateModal ? 'Add New Supplier' : 'Edit Supplier Details'}
              </h2>
              <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={showCreateModal ? handleCreateSubmit : handleEditSubmit} className="flex flex-col gap-4">
              <Input label="Company Name" name="companyName" placeholder="e.g. ABC Foods Ltd" required value={formValues.companyName} onChange={handleInputChange} />
              <Input label="Contact Person" name="contactPerson" placeholder="e.g. John Doe" required value={formValues.contactPerson} onChange={handleInputChange} />
              
              <div className="grid grid-cols-2 gap-4">
                <Input label="Phone Number" name="phone" placeholder="e.g. 9876543210" required value={formValues.phone} onChange={handleInputChange} />
                <Input label="Email Address" name="email" type="email" placeholder="e.g. contact@domain.com" required value={formValues.email} onChange={handleInputChange} />
              </div>

              <Input label="GST Number (Optional)" name="gstNumber" placeholder="e.g. 22AAAAA0000A1Z5" value={formValues.gstNumber} onChange={handleInputChange} />
              <Input label="Full Address" name="address" placeholder="e.g. 123 Industrial Area, Phase 1" required value={formValues.address} onChange={handleInputChange} />
              <Input label="Internal Notes" name="notes" placeholder="e.g. Delivers every Tuesday morning" value={formValues.notes} onChange={handleInputChange} />

              <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
                <Button variant="secondary" type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}>Cancel</Button>
                <Button type="submit" loading={submitting}>
                  {showCreateModal ? 'Create Supplier' : 'Update Supplier'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS SLIDEOVER PANEL */}
      {showDetailsPanel && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div onClick={() => setShowDetailsPanel(false)} className="absolute inset-0 bg-slate-950/20 backdrop-blur-xs transition-opacity" />
          
          <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
            <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between p-6">
              
              <div className="flex flex-col gap-6 overflow-y-auto flex-1 pr-1 scrollbar-thin">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 font-display">{selectedSupplier?.companyName}</h2>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">Supplier Details</span>
                  </div>
                  <button onClick={() => setShowDetailsPanel(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {loadingDetails ? (
                  <div className="flex flex-col gap-4 py-8 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-10 bg-slate-200 rounded-xl" />
                    <div className="h-20 bg-slate-200 rounded-2xl" />
                  </div>
                ) : supplierDetails ? (
                  <div className="flex flex-col gap-6">
                    
                    {/* General Profile */}
                    <div className="flex flex-col gap-3.5 bg-slate-50 p-4.5 rounded-2xl border border-slate-200/50">
                      <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                        <Users className="h-4 w-4 text-slate-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Contact Person</span>
                          <span className="text-slate-800 font-bold">{supplierDetails.supplier?.contactPerson}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-semibold text-slate-700 border-t border-slate-200/40 pt-2.5">
                        <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Phone</span>
                          <span className="text-slate-800 font-bold font-mono">{supplierDetails.supplier?.phone}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-semibold text-slate-700 border-t border-slate-200/40 pt-2.5">
                        <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Email</span>
                          <span className="text-slate-800 font-bold">{supplierDetails.supplier?.email}</span>
                        </div>
                      </div>

                      {supplierDetails.supplier?.gstNumber && (
                        <div className="flex items-center gap-3 text-xs font-semibold text-slate-700 border-t border-slate-200/40 pt-2.5">
                          <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">GST Number</span>
                            <span className="text-slate-800 font-bold font-mono">{supplierDetails.supplier?.gstNumber}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-xs font-semibold text-slate-700 border-t border-slate-200/40 pt-2.5">
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Address</span>
                          <span className="text-slate-800 font-bold">{supplierDetails.supplier?.address}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats overview */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border border-slate-200 p-4 rounded-2xl bg-white text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Purchase History</span>
                        <h4 className="text-lg font-black text-slate-900 mt-1">${supplierDetails.totalValuePurchased?.toFixed(2)}</h4>
                      </div>
                      <div className="border border-slate-200 p-4 rounded-2xl bg-white text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Branches Served</span>
                        <h4 className="text-lg font-black text-slate-900 mt-1">{supplierDetails.branchesServed?.length || 0} loc.</h4>
                      </div>
                    </div>

                    {/* Supplied Items Catalog */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 font-display mb-3 flex items-center gap-1.5">
                        <ShoppingBag className="h-4 w-4 text-slate-500" /> Catalog Products Supplied
                      </h3>
                      {supplierDetails.productsSupplied && supplierDetails.productsSupplied.length > 0 ? (
                        <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                          {supplierDetails.productsSupplied.map((prod, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                              <div>
                                <span className="font-bold text-slate-900 block">{prod.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">SKU: {prod.sku} • {prod.branchName}</span>
                              </div>
                              <span className="font-bold text-slate-700">{prod.quantity} {prod.unit}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No products currently assigned to this supplier.</p>
                      )}
                    </div>

                    {/* Recent Restocks logs */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 font-display mb-3 flex items-center gap-1.5">
                        <History className="h-4 w-4 text-slate-500" /> Recent Restock Deliveries
                      </h3>
                      {supplierDetails.recentRestocks && supplierDetails.recentRestocks.length > 0 ? (
                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                          {supplierDetails.recentRestocks.map((log, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs flex flex-col gap-1">
                              <div className="flex justify-between font-bold text-slate-800">
                                <span>{log.productId?.name}</span>
                                <span className="text-blue-600 font-mono">+{log.quantity}</span>
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                                <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                                <span>Inv: {log.invoiceNumber || 'N/A'}</span>
                              </div>
                              {log.notes && (
                                <p className="text-[10px] text-slate-500 italic mt-0.5 border-t border-slate-200/40 pt-1">
                                  Note: {log.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No recent restock delivery entries found.</p>
                      )}
                    </div>

                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic text-center">Failed to load supplier profile.</p>
                )}
              </div>

              <div className="border-t border-slate-200 pt-4 mt-6">
                <Button variant="secondary" onClick={() => setShowDetailsPanel(false)} className="w-full">
                  Close Details Panel
                </Button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Suppliers;
