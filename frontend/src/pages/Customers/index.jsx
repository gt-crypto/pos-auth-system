import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Plus, X, ChevronLeft, ChevronRight,
  Phone, Mail, Building2, ShoppingBag, TrendingUp,
  UserCheck, UserPlus, Star, RotateCcw, Archive,
  Calendar, Clock, CreditCard, Package, Edit2, Check,
  AlertCircle, Loader2, ArrowUpDown, Eye
} from 'lucide-react';
import api from '../../services/api.js';

// ---------- Helpers ----------
const fmt = (n) => n !== undefined && n !== null ? `$${parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
    status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-500'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
    {status}
  </span>
);

const PaymentBadge = ({ method }) => {
  const colors = { CASH: 'bg-emerald-50 text-emerald-700 border-emerald-200', CARD: 'bg-blue-50 text-blue-700 border-blue-200', UPI: 'bg-violet-50 text-violet-700 border-violet-200', OTHER: 'bg-slate-50 text-slate-600 border-slate-200' };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors[method] || colors.OTHER}`}>{method}</span>;
};

const MetricCard = ({ icon: Icon, label, value, color = 'blue', sub }) => (
  <div className={`bg-white border border-slate-200/80 rounded-2xl p-5 flex items-start gap-4`}>
    <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 bg-${color}-50 border border-${color}-100 text-${color}-600`}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ---------- Add/Edit Customer Modal ----------
const CustomerModal = ({ open, onClose, onSave, initial, user, showToast }) => {
  const [form, setForm] = useState({ name: '', phoneNumber: '', email: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(initial ? { name: initial.name, phoneNumber: initial.phoneNumber, email: initial.email || '', notes: initial.notes || '' } : { name: '', phoneNumber: '', email: '', notes: '' });
  }, [open, initial]);

  const handleSave = async () => {
    if (!form.name.trim()) return showToast('Name is required.', 'error');
    if (!form.phoneNumber.trim()) return showToast('Phone number is required.', 'error');
    setSaving(true);
    try {
      if (initial) {
        await api.put(`/customers/${initial._id}`, form);
        showToast('Customer updated successfully.', 'success');
      } else {
        await api.post('/customers', form);
        showToast('Customer created successfully.', 'success');
      }
      onSave();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save customer.', 'error');
    } finally { setSaving(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-md p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">{initial ? 'Edit Customer' : 'Add Customer'}</h2>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { label: 'Full Name *', key: 'name', placeholder: 'e.g. Sarah Johnson' },
                { label: 'Phone Number *', key: 'phoneNumber', placeholder: 'e.g. +91 98765 43210' },
                { label: 'Email (optional)', key: 'email', placeholder: 'e.g. sarah@example.com' },
                { label: 'Notes (optional)', key: 'notes', placeholder: 'Any special notes...' }
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{label}</label>
                  <input
                    type="text" value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {initial ? 'Save Changes' : 'Create Customer'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ---------- Customer Detail Panel ----------
const CustomerPanel = ({ customer, onClose, onEdit, onArchive, onRestore, user, showToast }) => {
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [tab, setTab] = useState('profile');

  const canManage = user?.role !== 'CASHIER';

  useEffect(() => {
    if (!customer) return;
    setTab('profile');
    setHistory([]);
  }, [customer?._id]);

  const loadHistory = async () => {
    if (history.length > 0 || !customer) return;
    setHistLoading(true);
    try {
      const res = await api.get(`/customers/${customer._id}/history?limit=20`);
      setHistory(res.data.data?.orders || []);
    } catch { showToast('Failed to load history.', 'error'); }
    finally { setHistLoading(false); }
  };

  useEffect(() => { if (tab === 'history') loadHistory(); }, [tab]);

  if (!customer) return null;

  return (
    <motion.aside
      key={customer._id}
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-slate-200/80 z-40 flex flex-col shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
            {customer.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">{customer.name}</p>
            <p className="text-xs text-slate-500">{customer.phoneNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={customer.status} />
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-100">
        {['profile', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${tab === t ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'profile' && (
          <div className="flex flex-col gap-5">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Orders</p>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">{customer.totalOrders || 0}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                <p className="text-[10px] text-emerald-600 uppercase font-bold">Spent</p>
                <p className="text-lg font-extrabold text-emerald-700 mt-0.5">{fmt(customer.totalSpent)}</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                <p className="text-[10px] text-blue-500 uppercase font-bold">Avg</p>
                <p className="text-lg font-extrabold text-blue-700 mt-0.5">{fmt(customer.avgOrderValue)}</p>
              </div>
            </div>

            {/* Info */}
            <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-4 flex flex-col gap-3">
              {[
                { icon: Phone, label: 'Phone', value: customer.phoneNumber },
                { icon: Mail, label: 'Email', value: customer.email || '—' },
                { icon: Building2, label: 'Branch', value: customer.branchId?.name || '—' },
                { icon: Calendar, label: 'Joined', value: fmtDate(customer.createdAt) },
                { icon: Clock, label: 'Last Purchase', value: fmtDate(customer.lastPurchase) }
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="text-slate-400 text-xs w-24 shrink-0">{label}</span>
                  <span className="font-semibold text-slate-800 truncate">{value}</span>
                </div>
              ))}
            </div>

            {/* Top products */}
            {customer.topProducts?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Top Products</p>
                <div className="flex flex-col gap-2">
                  {customer.topProducts.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                      <span className="text-[10px] font-bold text-slate-400 w-4">#{i + 1}</span>
                      <span className="flex-1 text-xs font-semibold text-slate-700 truncate">{p.name}</span>
                      <span className="text-xs font-bold text-slate-500">{p.totalQty} units</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {canManage && (
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 mt-2">
                <button onClick={() => onEdit(customer)} className="w-full py-2.5 rounded-xl border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-50 flex items-center justify-center gap-2 transition-colors">
                  <Edit2 className="h-3.5 w-3.5" /> Edit Customer
                </button>
                {customer.status === 'ACTIVE' ? (
                  <button onClick={() => onArchive(customer._id)} className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50 flex items-center justify-center gap-2 transition-colors">
                    <Archive className="h-3.5 w-3.5" /> Archive Customer
                  </button>
                ) : (
                  <button onClick={() => onRestore(customer._id)} className="w-full py-2.5 rounded-xl border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-50 flex items-center justify-center gap-2 transition-colors">
                    <RotateCcw className="h-3.5 w-3.5" /> Restore Customer
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div>
            {histLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : history.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No purchase history yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {history.map((order) => (
                  <div key={order._id} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs font-bold text-slate-800 font-mono">{order.orderNumber}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{fmtDateTime(order.orderDate)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PaymentBadge method={order.paymentMethod} />
                        <p className="text-sm font-extrabold text-emerald-700">{fmt(order.totalAmount)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
                      {order.items?.slice(0, 3).map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs text-slate-600">
                          <span className="truncate flex-1 font-medium">{item.name}</span>
                          <span className="font-semibold text-slate-500 ml-2">×{item.quantity} — {fmt(item.totalPrice)}</span>
                        </div>
                      ))}
                      {order.items?.length > 3 && <p className="text-[10px] text-slate-400 mt-1">+{order.items.length - 3} more items</p>}
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
                      <span>Cashier: <span className="font-semibold text-slate-600">{order.cashierId?.username || '—'}</span></span>
                      <span>·</span>
                      <span>Branch: <span className="font-semibold text-slate-600">{order.branchId?.name || '—'}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.aside>
  );
};

// ---------- Main Customers Page ----------
export const Customers = ({ user, showToast }) => {
  const [customers, setCustomers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [fullCustomer, setFullCustomer] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const canManage = user?.role !== 'CASHIER';
  const limit = 15;

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await api.get('/customers/metrics');
      setMetrics(res.data.data?.metrics);
    } catch {}
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit, ...(search && { search }), ...(status && { status }) });
      const res = await api.get(`/customers?${params}`);
      setCustomers(res.data.data?.customers || []);
      setPagination(res.data.data?.pagination || {});
    } catch { showToast('Failed to load customers.', 'error'); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { fetchMetrics(); }, []);

  const openCustomer = async (c) => {
    setSelectedCustomer(c);
    try {
      const res = await api.get(`/customers/${c._id}`);
      setFullCustomer(res.data.data?.customer);
    } catch { setFullCustomer(c); }
  };

  const closePanel = () => { setSelectedCustomer(null); setFullCustomer(null); };

  const handleArchive = async (id) => {
    try {
      await api.delete(`/customers/${id}`);
      showToast('Customer archived.', 'success');
      fetchCustomers(); fetchMetrics(); closePanel();
    } catch (err) { showToast(err.response?.data?.message || 'Failed to archive.', 'error'); }
  };

  const handleRestore = async (id) => {
    try {
      await api.patch(`/customers/${id}/restore`);
      showToast('Customer restored.', 'success');
      fetchCustomers(); fetchMetrics(); closePanel();
    } catch (err) { showToast(err.response?.data?.message || 'Failed to restore.', 'error'); }
  };

  const handleEdit = (c) => {
    setEditTarget(c);
    setModalOpen(true);
  };

  const onModalSave = () => { fetchCustomers(); fetchMetrics(); };

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage customer profiles and purchase history.</p>
        </div>
        {canManage && (
          <button onClick={() => { setEditTarget(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
            <Plus className="h-4 w-4" /> Add Customer
          </button>
        )}
      </header>

      {/* Metric Cards */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={Users} label="Total Customers" value={metrics.totalCustomers} color="blue" />
          <MetricCard icon={UserPlus} label="New Today" value={metrics.newToday} color="emerald" />
          <MetricCard icon={UserCheck} label="Returning" value={metrics.returning} color="violet" />
          <MetricCard icon={Star} label="Top Spender" value={metrics.topSpenders?.[0]?.name || '—'} color="amber" sub={metrics.topSpenders?.[0] ? fmt(metrics.topSpenders[0].totalSpent) : ''} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, phone, or email..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[130px]">
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200/60">
              <tr>
                {['Customer', 'Phone', 'Orders', 'Total Spent', 'Last Purchase', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-16 text-center">
                    <Users className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-medium text-slate-500">No customers found</p>
                  </td>
                </tr>
              ) : customers.map((c) => (
                <tr key={c._id} onClick={() => openCustomer(c)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors group">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                        {c.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{c.name}</p>
                        <p className="text-[11px] text-slate-400">{c.email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm font-medium text-slate-600">{c.phoneNumber}</td>
                  <td className="px-4 py-3.5 text-sm font-bold text-slate-800">{c.totalOrders}</td>
                  <td className="px-4 py-3.5 text-sm font-bold text-emerald-700">{fmt(c.totalSpent)}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-500">{fmtDate(c.lastPurchase)}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3.5">
                    <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 transition-all">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-500">
              Showing {((pagination.page - 1) * limit) + 1}–{Math.min(pagination.page * limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30 transition-colors">
                <ChevronLeft className="h-4 w-4 text-slate-500" />
              </button>
              <span className="text-xs font-bold text-slate-600 px-2">{page} / {pagination.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30 transition-colors">
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Panel */}
      <AnimatePresence>
        {selectedCustomer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closePanel}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-30" />
            <CustomerPanel
              customer={fullCustomer || selectedCustomer}
              onClose={closePanel}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onRestore={handleRestore}
              user={user}
              showToast={showToast}
            />
          </>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <CustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={onModalSave}
        initial={editTarget}
        user={user}
        showToast={showToast}
      />
    </div>
  );
};

export default Customers;
