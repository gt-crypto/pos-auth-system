import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Search, Plus, X, Edit2, Archive, RotateCcw,
  Truck, ArrowUpDown, ChevronLeft, ChevronRight, Activity,
  AlertTriangle, ArrowLeftRight, Check, Loader2, Calendar, FileText,
  User, ShieldCheck, Info, History, Layers
} from 'lucide-react';
import api from '../../services/api.js';
import Button from '../../components/Button.jsx';

// ---------- Helpers ----------
const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;
const fmtDateTime = (d) => d ? new Date(d).toLocaleString() : '—';

const MetricCard = ({ icon: Icon, label, value, sub, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-600',
    rose: 'bg-rose-50 border-rose-100 text-rose-600',
    violet: 'bg-violet-50 border-violet-100 text-violet-600'
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-4 flex-1 min-w-[200px]">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-extrabold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

// ---------- Ingredient Add/Edit Modal ----------
const IngredientModal = ({ open, initial, onClose, onSave, showToast, suppliers }) => {
  const [form, setForm] = useState({ name: '', category: 'Other', unit: 'Kg', minimumQuantity: 0, costPerUnit: 0, supplier: '' });
  const [saving, setSaving] = useState(false);

  const categories = ['Vegetables', 'Dairy', 'Meat', 'Spices', 'Oil', 'Beverages', 'Bakery', 'Frozen', 'Other'];
  const units = ['Kg', 'Gram', 'Liter', 'ml', 'Packet', 'Piece', 'Bottle', 'Box'];

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        name: initial.name,
        category: initial.category || 'Other',
        unit: initial.unit || 'Kg',
        minimumQuantity: initial.minimumQuantity !== undefined ? initial.minimumQuantity : (initial.reorderThreshold || 0),
        costPerUnit: initial.costPerUnit !== undefined ? initial.costPerUnit : (initial.costPrice || 0),
        supplier: initial.supplier?._id || initial.supplier || initial.supplierId?._id || initial.supplierId || ''
      } : { name: '', category: 'Other', unit: 'Kg', minimumQuantity: 0, costPerUnit: 0, supplier: '' });
    }
  }, [open, initial]);

  if (!open) return null;

  const handleSave = async () => {
    if (!form.name.trim()) return showToast('Name is required.', 'error');
    if (!form.category) return showToast('Category is required.', 'error');
    if (!form.unit) return showToast('Unit is required.', 'error');
    
    // Construct payload with backward compatibility aliases
    const payload = {
      ...form,
      currentStock: initial ? undefined : 0, // only adjust via stock endpoints
      reorderThreshold: form.minimumQuantity,
      costPrice: form.costPerUnit,
      supplierId: form.supplier || null,
      supplier: form.supplier || null
    };

    setSaving(true);
    try {
      if (initial) {
        await api.put(`/ingredients/${initial._id}`, payload);
        showToast('Ingredient updated.', 'success');
      } else {
        await api.post('/ingredients', payload);
        showToast('Ingredient created.', 'success');
      }
      onSave();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save ingredient.', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-base">{initial ? 'Edit Ingredient' : 'Create Ingredient'}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Ingredient Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" placeholder="e.g. Tomato Sauce" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Category *</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Unit *</label>
              <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white">
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Min Quantity</label>
              <input type="number" value={form.minimumQuantity} onChange={e => setForm(f => ({ ...f, minimumQuantity: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Cost Price</label>
              <input type="number" value={form.costPerUnit} onChange={e => setForm(f => ({ ...f, costPerUnit: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Supplier (optional)</label>
            <select value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700">
              <option value="">No Supplier</option>
              {suppliers.map(s => <option key={s._id} value={s._id}>{s.companyName}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Stock Action Modals (Restock, Adjust, Transfer) ----------
const StockActionModal = ({ open, actionType, ingredient, onClose, onSave, showToast, suppliers, branches }) => {
  const [qty, setQty] = useState(0);
  const [costPerUnit, setCostPerUnit] = useState(0);
  const [reason, setReason] = useState('');
  const [invoice, setInvoice] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && ingredient) {
      setQty(0);
      setCostPerUnit(ingredient.costPerUnit || ingredient.costPrice || 0);
      setReason('');
      setInvoice('');
      setSupplierId(ingredient.supplier?._id || ingredient.supplier || ingredient.supplierId?._id || ingredient.supplierId || '');
      setToBranchId('');
    }
  }, [open, ingredient]);

  if (!open || !ingredient) return null;

  const handleSubmit = async () => {
    if (qty <= 0 && actionType !== 'adjust') return showToast('Quantity must be greater than zero.', 'error');
    if (!reason.trim()) return showToast('Reason is required.', 'error');
    setSaving(true);
    try {
      if (actionType === 'restock') {
        await api.post('/ingredients/restock', { ingredientId: ingredient._id, quantity: qty, costPerUnit, reason, invoiceNumber: invoice, supplierId: supplierId || null });
        showToast('Restocked successfully.', 'success');
      } else if (actionType === 'adjust') {
        await api.post('/ingredients/adjust', { ingredientId: ingredient._id, quantity: qty, reason });
        showToast('Adjustment recorded.', 'success');
      } else if (actionType === 'transfer') {
        await api.post('/ingredients/transfer', { ingredientId: ingredient._id, toBranchId, quantity: qty, reason });
        showToast('Transfer completed.', 'success');
      }
      onSave();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed.', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-base capitalize">{actionType} Ingredient</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-slate-500 mb-4">{ingredient.name} (Current: {ingredient.quantity} {ingredient.unit})</p>
        
        <div className="flex flex-col gap-3">
          {actionType === 'transfer' && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">To Branch *</label>
              <select value={toBranchId} onChange={e => setToBranchId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700">
                <option value="">Select Destination Branch</option>
                {branches.filter(b => b._id !== ingredient.branchId?._id && b._id !== ingredient.branchId).map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
              {actionType === 'adjust' ? 'New Stock Quantity *' : 'Quantity *'}
            </label>
            <div className="relative">
              <input type="number" value={qty} onChange={e => setQty(parseFloat(e.target.value) || 0)} className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-xl text-xs" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">{ingredient.unit}</span>
            </div>
          </div>

          {actionType === 'restock' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Cost Price</label>
                  <input type="number" value={costPerUnit} onChange={e => setCostPerUnit(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Invoice #</label>
                  <input type="text" value={invoice} onChange={e => setInvoice(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Supplier (optional)</label>
                <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700">
                  <option value="">No Supplier</option>
                  {suppliers.map(s => <option key={s._id} value={s._id}>{s.companyName}</option>)}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Reason / Notes *</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" placeholder="e.g. wastage, stock arrival, branch demand" />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Ingredient Details Sub-Panel / Modal ----------
const IngredientDetailsModal = ({ open, ingredientId, onClose, getRoleBadgeColor, getActionBadgeColor }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState('stockHistory'); // 'stockHistory' or 'auditHistory'

  useEffect(() => {
    if (open && ingredientId) {
      setLoading(true);
      api.get(`/ingredients/${ingredientId}`)
        .then(res => {
          if (res.data?.success) {
            setDetails(res.data.data.ingredient);
          }
        })
        .catch(err => {
          console.error(err);
        })
        .finally(() => setLoading(false));
    }
  }, [open, ingredientId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            <h3 className="font-extrabold text-slate-950 font-display">Ingredient Details</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        ) : !details ? (
          <div className="p-8 text-center text-slate-400 text-xs">No details found.</div>
        ) : (
          <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-6 scrollbar-thin">
            {/* 1. Basic Information Grid */}
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Basic Information</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200/50 rounded-2xl p-4">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Ingredient Name</span>
                  <span className="font-bold text-slate-900">{details.name}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Category</span>
                  <span className="font-bold text-slate-900">{details.category || 'Other'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Stock Level</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${details.quantity <= details.minimumQuantity ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-800'}`}>
                    {details.quantity} {details.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Min Quantity</span>
                  <span>{details.minimumQuantity} {details.unit}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Cost Price</span>
                  <span className="text-slate-900 font-bold">{fmt(details.costPerUnit)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Unit Type</span>
                  <span>{details.unit}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Branch</span>
                  <span>{details.branchId?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Status</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] border ${details.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {details.status}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Creator & Modifier details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50/30 border border-slate-200/50 rounded-2xl p-4 text-xs font-semibold text-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2 tracking-wider">Created By</span>
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>@{details.createdBy?.username || 'SYSTEM'}</span>
                </div>
              </div>
              <div className="bg-slate-50/30 border border-slate-200/50 rounded-2xl p-4 text-xs font-semibold text-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2 tracking-wider">Last Updated By</span>
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>@{details.updatedBy?.username || 'SYSTEM'}</span>
                </div>
              </div>
            </div>

            {/* 3. Supplier Card */}
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assigned Supplier</h4>
              <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 text-xs font-semibold text-slate-700 flex gap-4 items-start">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Truck className="h-5 w-5" />
                </div>
                {details.supplierId ? (
                  <div className="flex flex-col gap-1">
                    <p className="font-bold text-slate-900 text-sm">{details.supplierId.companyName || '—'}</p>
                    <p className="text-slate-500 font-medium">Contact: {details.supplierId.contactPerson || '—'}</p>
                    <p className="text-slate-500 font-medium">Email: {details.supplierId.email || '—'} | Phone: {details.supplierId.phone || '—'}</p>
                  </div>
                ) : (
                  <p className="text-slate-400 italic py-2">No supplier configured for this ingredient.</p>
                )}
              </div>
            </div>

            {/* Sub Tabs: Stock History vs Audit History */}
            <div className="flex gap-1 border-b border-slate-200">
              <button 
                onClick={() => setSubTab('stockHistory')} 
                className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-colors ${subTab === 'stockHistory' ? 'text-blue-600 border-blue-600 bg-blue-50/50' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
              >
                Stock History Ledger
              </button>
              <button 
                onClick={() => setSubTab('auditHistory')} 
                className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-colors ${subTab === 'auditHistory' ? 'text-blue-600 border-blue-600 bg-blue-50/50' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
              >
                Immutable Audit History
              </button>
            </div>

            {subTab === 'stockHistory' ? (
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white max-h-60 overflow-y-auto scrollbar-thin">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/40 text-[9px] font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Quantity Changed</th>
                      <th className="py-2.5 px-4">Remaining</th>
                      <th className="py-2.5 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {details.stockHistory && details.stockHistory.length > 0 ? (
                      details.stockHistory.map((item) => (
                        <tr key={item._id}>
                          <td className="py-2.5 px-4 font-mono text-slate-400">{new Date(item.timestamp).toLocaleString()}</td>
                          <td className="py-2.5 px-4">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                              item.action === 'RESTOCK' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              item.action === 'ADJUSTMENT' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>{item.action}</span>
                          </td>
                          <td className={`py-2.5 px-4 font-bold ${item.quantityChanged >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {item.quantityChanged >= 0 ? `+${item.quantityChanged}` : item.quantityChanged}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-800">{item.newQuantity}</td>
                          <td className="py-2.5 px-4 text-slate-500 font-medium">{item.reason || '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="5" className="py-8 text-center text-slate-400 italic">No stock history recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white max-h-60 overflow-y-auto scrollbar-thin">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/40 text-[9px] font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">User</th>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Metadata Context</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {details.auditHistory && details.auditHistory.length > 0 ? (
                      details.auditHistory.map((item) => (
                        <tr key={item._id}>
                          <td className="py-2.5 px-4 font-mono text-slate-400">{new Date(item.timestamp).toLocaleString()}</td>
                          <td className="py-2.5 px-4">@{item.performedBy?.username || 'SYSTEM'}</td>
                          <td className="py-2.5 px-4">
                            <span className={`px-1.5 py-0.5 border text-[8px] font-bold rounded-md uppercase ${getActionBadgeColor(item.action)}`}>
                              {item.action.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[9px] text-slate-400 truncate max-w-[180px]">
                            {JSON.stringify(item.metadata || {})}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="4" className="py-8 text-center text-slate-400 italic">No audit log history recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
          <Button onClick={onClose} variant="secondary" className="text-xs font-bold border-slate-200">
            Close Panel
          </Button>
        </div>
      </div>
    </div>
  );
};

// ---------- Main Kitchen Ingredients Component ----------
export const Ingredients = ({ user, showToast }) => {
  const [tab, setTab] = useState('list'); // 'list' or 'history'
  const [metrics, setMetrics] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search/Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [lowStock, setLowStock] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Selections & Modals
  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  
  const [crudModal, setCrudModal] = useState(false);
  const [crudTarget, setCrudTarget] = useState(null);

  const [stockModal, setStockModal] = useState(false);
  const [stockTarget, setStockTarget] = useState(null);
  const [stockAction, setStockAction] = useState('restock'); // 'restock', 'adjust', 'transfer'

  const [detailsModal, setDetailsModal] = useState(false);
  const [detailsTargetId, setDetailsTargetId] = useState(null);

  const categories = ['Vegetables', 'Dairy', 'Meat', 'Spices', 'Oil', 'Beverages', 'Bakery', 'Frozen', 'Other'];

  // ── Load Dependencies ──────────────────────────────────────────────────────
  const fetchDeps = useCallback(async () => {
    try {
      const [supRes, brRes] = await Promise.all([
        api.get('/suppliers?limit=100'),
        api.get('/branches')
      ]);
      setSuppliers(supRes.data.data?.suppliers || []);
      setBranches(brRes.data.data?.branches || []);
    } catch {}
  }, []);

  useEffect(() => { fetchDeps(); }, [fetchDeps]);

  // ── Load Data ─────────────────────────────────────────────────────────────
  const loadMetrics = async () => {
    try {
      const res = await api.get('/ingredients/metrics');
      if (res.data?.success) {
        setMetrics(res.data.data?.metrics);
      }
    } catch {}
  };

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = {
        page,
        limit: 15,
        ...(search && { search }),
        ...(status && { status }),
        ...(category && { category }),
        ...(lowStock === 'true' && { lowStock: true })
      };
      
      const params = new URLSearchParams(queryParams);
      const res = await api.get(`/ingredients?${params}`);
      setIngredients(res.data.data?.ingredients || []);
      setTotalPages(res.data.data?.pagination?.totalPages || 1);
    } catch { showToast('Failed to load ingredients.', 'error'); }
    finally { setLoading(false); }
  }, [page, search, status, category, lowStock]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      const res = await api.get(`/ingredients/history?${params}`);
      setHistory(res.data.data?.history || []);
      setTotalPages(res.data.data?.pagination?.totalPages || 1);
    } catch { showToast('Failed to load history ledger.', 'error'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => {
    loadMetrics();
    if (tab === 'list') loadList();
    else loadHistory();
  }, [tab, loadList, loadHistory]);

  const handleArchive = async (id) => {
    try {
      await api.delete(`/ingredients/${id}`);
      showToast('Ingredient archived.', 'success');
      loadList(); loadMetrics();
    } catch { showToast('Archive failed.', 'error'); }
  };

  const handleRestore = async (id) => {
    try {
      await api.patch(`/ingredients/${id}/restore`);
      showToast('Ingredient restored.', 'success');
      loadList(); loadMetrics();
    } catch { showToast('Restore failed.', 'error'); }
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

  const handleOpenDetails = (id) => {
    setDetailsTargetId(id);
    setDetailsModal(true);
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-600 shrink-0" />
            Kitchen Ingredients
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage raw kitchen ingredients independent from sellable menu items.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setCrudTarget(null); setCrudModal(true); }} className="flex items-center gap-2 text-xs font-bold">
            <Plus className="h-4 w-4" /> Add Ingredient
          </Button>
        </div>
      </header>

      {/* Metrics widgets */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={Package} label="Total Ingredients" value={metrics.totalIngredients} color="blue" />
          <MetricCard icon={AlertTriangle} label="Low Stock warnings" value={metrics.lowStockIngredients} color="amber" />
          <MetricCard icon={Activity} label="Out of Stock Items" value={metrics.outOfStockIngredients} color="rose" />
          <MetricCard icon={Layers} label="Total Categories" value={metrics.totalCategories} color="violet" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <button onClick={() => { setTab('list'); setPage(1); }} className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-colors ${tab === 'list' ? 'text-blue-600 border-blue-600 bg-blue-50/50' : 'text-slate-500 border-transparent hover:text-slate-700'}`}>Ingredients List</button>
        <button onClick={() => { setTab('history'); setPage(1); }} className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-colors ${tab === 'history' ? 'text-blue-600 border-blue-600 bg-blue-50/50' : 'text-slate-500 border-transparent hover:text-slate-700'}`}>Stock Ledger</button>
      </div>

      {tab === 'list' && (
        <>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search raw ingredients by name..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400/30" />
            </div>
            
            <div className="flex gap-2">
              <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-600 outline-none">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-600 outline-none">
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Archived</option>
              </select>

              <select value={lowStock} onChange={e => { setLowStock(e.target.value); setPage(1); }} className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-600 outline-none">
                <option value="">All Stock Levels</option>
                <option value="true">Low Stock Warnings</option>
              </select>
            </div>
          </div>

          {/* List Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/60">
                <tr>
                  {['Ingredient', 'Category', 'Current Stock', 'Cost Price', 'Reorder Lvl', 'Supplier', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan="8" className="px-4 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-full" /></td></tr>)
                ) : ingredients.length === 0 ? (
                  <tr><td colSpan="8" className="px-4 py-16 text-center text-slate-400 text-xs font-medium">No ingredients found.</td></tr>
                ) : (
                  ingredients.map(ing => (
                    <tr 
                      key={ing._id} 
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => handleOpenDetails(ing._id)}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-800">{ing.name}</td>
                      <td className="px-4 py-3 text-slate-500 font-medium">{ing.category || 'Other'}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        <span className={`px-2 py-0.5 rounded-lg ${ing.quantity <= ing.minimumQuantity ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'text-slate-800'}`}>
                          {ing.quantity} {ing.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">{fmt(ing.costPerUnit || ing.costPrice)}</td>
                      <td className="px-4 py-3 text-slate-500 font-medium">{ing.minimumQuantity || ing.reorderThreshold} {ing.unit}</td>
                      <td className="px-4 py-3 text-slate-600">{ing.supplierId?.companyName || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${ing.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {ing.status}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setCrudTarget(ing); setCrudModal(true); }} className="p-1 hover:bg-slate-100 text-slate-500 rounded" title="Edit"><Edit2 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => { setStockTarget(ing); setStockAction('restock'); setStockModal(true); }} className="px-2 py-0.5 rounded hover:bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">Restock</button>
                          <button onClick={() => { setStockTarget(ing); setStockAction('adjust'); setStockModal(true); }} className="px-2 py-0.5 rounded hover:bg-amber-50 text-amber-600 text-[10px] font-bold border border-amber-100">Adjust</button>
                          <button onClick={() => { setStockTarget(ing); setStockAction('transfer'); setStockModal(true); }} className="px-2 py-0.5 rounded hover:bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100">Transfer</button>
                          {ing.status === 'ACTIVE' ? (
                            <button onClick={() => handleArchive(ing._id)} className="p-1 hover:bg-rose-50 text-rose-600 rounded" title="Archive"><Archive className="h-3.5 w-3.5" /></button>
                          ) : (
                            <button onClick={() => handleRestore(ing._id)} className="p-1 hover:bg-emerald-50 text-emerald-600 rounded" title="Restore"><RotateCcw className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200/60">
              <tr>
                {['Timestamp', 'Ingredient', 'Action', 'Changed', 'Old Qty', 'New Qty', 'Reason', 'Invoice', 'User'].map(h => <th key={h} className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan="9" className="px-4 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-full" /></td></tr>)
              ) : history.length === 0 ? (
                <tr><td colSpan="9" className="px-4 py-16 text-center text-slate-400 text-xs font-medium">No history logged.</td></tr>
              ) : (
                history.map(item => (
                  <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">{fmtDateTime(item.timestamp)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.ingredientId?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        item.action === 'RESTOCK' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        item.action === 'ADJUSTMENT' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        item.action === 'TRANSFER_IN' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>{item.action}</span>
                    </td>
                    <td className={`px-4 py-3 font-bold ${item.quantityChanged >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.quantityChanged >= 0 ? `+${item.quantityChanged}` : item.quantityChanged} {item.ingredientId?.unit}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{item.previousQuantity}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{item.newQuantity}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[150px] truncate">{item.reason}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.invoiceNumber || '—'}</td>
                    <td className="px-4 py-3 text-slate-700 font-semibold">{item.actorId?.username || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* Modals & Details Drawers */}
      <IngredientModal open={crudModal} initial={crudTarget} onClose={() => setCrudModal(false)} onSave={() => { if (tab === 'list') loadList(); else loadHistory(); loadMetrics(); }} showToast={showToast} suppliers={suppliers} />
      
      <StockActionModal open={stockModal} actionType={stockAction} ingredient={stockTarget} onClose={() => setStockModal(false)} onSave={() => { if (tab === 'list') loadList(); else loadHistory(); loadMetrics(); }} showToast={showToast} suppliers={suppliers} branches={branches} />

      <IngredientDetailsModal 
        open={detailsModal} 
        ingredientId={detailsTargetId} 
        onClose={() => setDetailsModal(false)} 
        getRoleBadgeColor={getRoleBadgeColor} 
        getActionBadgeColor={getActionBadgeColor} 
      />
    </div>
  );
};

export default Ingredients;
