import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Check, 
  X, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Layers, 
  RefreshCw, 
  ArrowLeftRight, 
  Settings2,
  Trash2,
  ListFilter,
  Eye,
  FileText
} from 'lucide-react';
import api from '../../services/api.js';
import Button from '../../components/Button.jsx';
import Input from '../../components/Input.jsx';

export const Inventory = ({ user, showToast }) => {
  const [activeTab, setActiveTab] = useState('GRID'); // GRID or LEDGER
  const [loading, setLoading] = useState(true);
  const [inventories, setInventories] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  
  // Stats
  const [metrics, setMetrics] = useState({
    totalItems: 0,
    lowStockCount: 0,
    totalValue: 0,
    recentlyRestockedCount: 0
  });
  
  const [lowStockList, setLowStockList] = useState([]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [paginationInfo, setPaginationInfo] = useState({
    totalRecords: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false
  });

  // History Pagination
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [historyPaginationInfo, setHistoryPaginationInfo] = useState({
    totalRecords: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false
  });

  // Resources for selectors
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeSuppliers, setActiveSuppliers] = useState([]);

  // Modals state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form States
  const [configForm, setConfigForm] = useState({
    productId: '',
    supplierId: '',
    branchId: '',
    quantity: 0,
    threshold: 0,
    unit: 'units'
  });

  const [restockForm, setRestockForm] = useState({
    quantityAdded: 0,
    supplierId: '',
    invoiceNumber: '',
    notes: ''
  });

  const [adjustForm, setAdjustForm] = useState({
    newQuantity: 0,
    reason: 'MANUAL_CORRECTION',
    notes: ''
  });

  const [transferForm, setTransferForm] = useState({
    productId: '',
    fromBranch: '',
    toBranch: '',
    quantity: 0,
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);

  // Fetch initial dropdown options
  useEffect(() => {
    fetchPrerequisites();
  }, []);

  // Sync Search Debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      fetchInventoryData();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Sync state queries
  useEffect(() => {
    fetchInventoryData();
  }, [page, limit, selectedBranch, selectedCategory, stockStatus, sortBy]);

  // Sync History Ledger
  useEffect(() => {
    if (activeTab === 'LEDGER') {
      fetchHistoryLedger();
    }
  }, [activeTab, historyPage, historyLimit, selectedBranch]);

  const fetchPrerequisites = async () => {
    try {
      // Branches
      const branchRes = await api.get('/branches');
      setBranches(branchRes.data.data.branches || []);

      // Categories
      const catRes = await api.get('/categories');
      setCategories(catRes.data.data.categories || []);

      // Active Suppliers
      const supRes = await api.get('/suppliers/active');
      setActiveSuppliers(supRes.data.data.suppliers || []);

      // Products (to configure new inventory)
      const prodRes = await api.get('/products?limit=100');
      setProducts(prodRes.data.data.products || []);
    } catch (err) {
      console.error('Failed to load selector options', err);
    }
  };

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchTerm,
        branchId: selectedBranch,
        categoryId: selectedCategory,
        stockStatus,
        sortBy,
        page,
        limit
      };
      
      const res = await api.get('/inventory', { params });
      setInventories(res.data.data.inventory || []);
      setPaginationInfo(res.data.data.pagination);

      // Dashboard stats
      const metricRes = await api.get('/inventory/metrics', { params: { branchId: selectedBranch } });
      setMetrics(metricRes.data.data.metrics);

      // Low stock warnings widget
      const lowStockRes = await api.get('/inventory/low-stock', { params: { branchId: selectedBranch } });
      setLowStockList(lowStockRes.data.data.lowStock || []);
    } catch (err) {
      showToast('Failed to load inventory stock grid', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryLedger = async () => {
    try {
      const params = {
        branchId: selectedBranch,
        page: historyPage,
        limit: historyLimit
      };
      const res = await api.get('/inventory/history', { params });
      setHistoryLogs(res.data.data.history || []);
      setHistoryPaginationInfo(res.data.data.pagination);
    } catch (err) {
      showToast('Failed to load movement logs', 'error');
    }
  };

  const openConfigModal = () => {
    setConfigForm({
      productId: '',
      supplierId: '',
      branchId: user?.role === 'SUPER_ADMIN' ? '' : user?.branchId || '',
      quantity: 0,
      threshold: 0,
      unit: 'units'
    });
    setShowConfigModal(true);
  };

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...configForm,
        quantity: Number(configForm.quantity),
        threshold: Number(configForm.threshold)
      };
      await api.post('/inventory', payload);
      showToast('Inventory profile configured successfully', 'success');
      setShowConfigModal(false);
      fetchInventoryData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to configure inventory profile', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openRestockModal = (item) => {
    setSelectedItem(item);
    setRestockForm({
      quantityAdded: '',
      supplierId: item.supplierId?._id || '',
      invoiceNumber: '',
      notes: ''
    });
    setShowRestockModal(true);
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        inventoryId: selectedItem._id,
        quantityAdded: Number(restockForm.quantityAdded),
        supplierId: restockForm.supplierId || null,
        invoiceNumber: restockForm.invoiceNumber,
        notes: restockForm.notes
      };
      await api.post('/inventory/restock', payload);
      showToast('Restocked inventory successfully', 'success');
      setShowRestockModal(false);
      fetchInventoryData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to restock inventory', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openAdjustModal = (item) => {
    setSelectedItem(item);
    setAdjustForm({
      newQuantity: item.quantity,
      reason: 'MANUAL_CORRECTION',
      notes: ''
    });
    setShowAdjustModal(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        inventoryId: selectedItem._id,
        newQuantity: Number(adjustForm.newQuantity),
        reason: adjustForm.reason,
        notes: adjustForm.notes
      };
      await api.post('/inventory/adjust', payload);
      showToast('Inventory adjusted successfully', 'success');
      setShowAdjustModal(false);
      fetchInventoryData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to adjust inventory', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openTransferModal = (item = null) => {
    setSelectedItem(item);
    setTransferForm({
      productId: item ? item.productId?._id : '',
      fromBranch: item ? item.branchId?._id : (user?.role === 'SUPER_ADMIN' ? '' : user?.branchId || ''),
      toBranch: '',
      quantity: '',
      notes: ''
    });
    setShowTransferModal(true);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (transferForm.fromBranch === transferForm.toBranch) {
      return showToast('Source branch and destination branch must be different.', 'error');
    }
    setSubmitting(true);
    try {
      const payload = {
        productId: transferForm.productId,
        fromBranch: transferForm.fromBranch,
        toBranch: transferForm.toBranch,
        quantity: Number(transferForm.quantity),
        notes: transferForm.notes
      };
      await api.post('/inventory/transfer', payload);
      showToast('Stock transfer relocation completed', 'success');
      setShowTransferModal(false);
      fetchInventoryData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to transfer stock', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">Inventory Tracking</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Multi-branch stock ledger with real-time low-stock tracking and branch transfer relocation.</p>
        </div>
        
        {user?.role !== 'CASHIER' && (
          <div className="flex gap-2">
            <Button onClick={() => openTransferModal(null)} variant="secondary" className="flex items-center gap-2">
              <ArrowLeftRight className="h-4.5 w-4.5" /> Transfer Stock
            </Button>
            <Button onClick={openConfigModal} className="flex items-center gap-2">
              <Plus className="h-4.5 w-4.5" /> Add Inventory
            </Button>
          </div>
        )}
      </header>

      {/* Tab select bar */}
      <div className="flex border-b border-slate-200 select-none">
        <button
          onClick={() => setActiveTab('GRID')}
          className={`py-3 px-6 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'GRID'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="h-4 w-4" /> Stock Grid
        </button>
        <button
          onClick={() => setActiveTab('LEDGER')}
          className={`py-3 px-6 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'LEDGER'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="h-4 w-4" /> History Ledger
        </button>
      </div>

      {activeTab === 'GRID' ? (
        <div className="flex flex-col gap-6">
          
          {/* Dashboard Summary Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-slate-200/80 p-5 rounded-2xl bg-white shadow-sm flex items-center gap-4">
              <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Catalog Items</span>
                <span className="text-xl font-black text-slate-900">{metrics.totalItems}</span>
              </div>
            </div>

            <div className="border border-slate-200/80 p-5 rounded-2xl bg-white shadow-sm flex items-center gap-4">
              <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Low Stock Warnings</span>
                <span className="text-xl font-black text-slate-900">{metrics.lowStockCount}</span>
              </div>
            </div>

            <div className="border border-slate-200/80 p-5 rounded-2xl bg-white shadow-sm flex items-center gap-4">
              <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Recently Restocked (7d)</span>
                <span className="text-xl font-black text-slate-900">{metrics.recentlyRestockedCount}</span>
              </div>
            </div>

            <div className="border border-slate-200/80 p-5 rounded-2xl bg-white shadow-sm flex items-center gap-4">
              <div className="h-10 w-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Inventory Value</span>
                <span className="text-xl font-black text-slate-900">${metrics.totalValue?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
            
            {/* Stock Grid Filters and Table */}
            <div className="xl:col-span-3 flex flex-col gap-4">
              
              {/* Filter controls */}
              <div className="flex flex-col gap-3.5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search SKU, name, barcode, supplier..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  {user?.role === 'SUPER_ADMIN' && (
                    <select
                      value={selectedBranch}
                      onChange={(e) => { setSelectedBranch(e.target.value); setPage(1); }}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700"
                    >
                      <option value="">All Branches</option>
                      {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                  )}

                  <select
                    value={selectedCategory}
                    onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700"
                  >
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700"
                  >
                    <option value="newest">Sort: Newest</option>
                    <option value="quantity_asc">Sort: Stock Level (Low-High)</option>
                    <option value="quantity_desc">Sort: Stock Level (High-Low)</option>
                    <option value="productName">Sort: Product Name (A-Z)</option>
                    <option value="threshold_desc">Sort: High Threshold</option>
                  </select>
                </div>

                <div className="flex gap-2 items-center text-xs font-bold overflow-x-auto select-none py-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider shrink-0 px-2">Stock Level:</span>
                  {['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'].map(statusVal => (
                    <button
                      key={statusVal}
                      onClick={() => { setStockStatus(statusVal); setPage(1); }}
                      className={`px-3 py-1 rounded-xl border transition-all shrink-0 ${
                        stockStatus === statusVal
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {statusVal === 'ALL' ? 'All Items' : statusVal.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Datagrid Table */}
              {loading ? (
                <div className="flex flex-col gap-3 py-12">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 w-full rounded-2xl bg-slate-200/40 animate-pulse border border-slate-100" />
                  ))}
                </div>
              ) : inventories.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <div className="overflow-x-auto w-full glass-card rounded-2xl border border-slate-200/80 shadow-md">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="p-4 pl-6">Product & SKU</th>
                          <th className="p-4">Branch</th>
                          <th className="p-4 text-center">Stock Level</th>
                          <th className="p-4">Threshold</th>
                          <th className="p-4">Supplier</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 pr-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700 bg-white/40">
                        {inventories.map((item) => (
                          <tr key={item._id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="p-4 pl-6">
                              <div>
                                <span className="font-bold text-slate-900 block">{item.productId?.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">SKU: {item.productId?.sku}</span>
                              </div>
                            </td>
                            <td className="p-4 font-bold text-slate-600">{item.branchId?.name}</td>
                            <td className="p-4 text-center">
                              <span className="font-black text-slate-900">{item.quantity}</span>{' '}
                              <span className="text-slate-400 text-[10px]">{item.unit}</span>
                            </td>
                            <td className="p-4">
                              <span className="font-bold text-slate-600">{item.threshold}</span>{' '}
                              <span className="text-[10px] text-slate-400">{item.unit}</span>
                            </td>
                            <td className="p-4 text-slate-600 font-bold">{item.supplierId?.companyName || 'Unassigned'}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                                item.status === 'OUT_OF_STOCK'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : item.status === 'LOW_STOCK'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {item.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {user?.role !== 'CASHIER' && (
                                  <>
                                    <Button onClick={() => openRestockModal(item)} className="!py-1 !px-2 text-[10px] font-bold" variant="primary">
                                      Restock
                                    </Button>
                                    <button
                                      onClick={() => openAdjustModal(item)}
                                      className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                      title="Manual Adjustment"
                                    >
                                      <Settings2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => openTransferModal(item)}
                                      className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                      title="Relocate Stock"
                                    >
                                      <ArrowLeftRight className="h-3.5 w-3.5" />
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

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-semibold text-slate-500">
                      Showing {inventories.length} of {paginationInfo.totalRecords} records
                    </span>
                    <div className="flex gap-2">
                      <Button variant="secondary" disabled={!paginationInfo.hasPrevious} onClick={() => setPage(p => p - 1)} className="!py-1 !px-3 text-xs">
                        Prev
                      </Button>
                      <Button disabled={!paginationInfo.hasNext} onClick={() => setPage(p => p + 1)} className="!py-1 !px-3 text-xs">
                        Next
                      </Button>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="glass-card p-12 text-center text-slate-400 border border-slate-200/80 rounded-2xl">
                  <Layers className="h-10 w-10 mx-auto text-slate-300 mb-4" />
                  <p className="text-sm font-semibold text-slate-500">No inventory stock configurations match current criteria.</p>
                </div>
              )}

            </div>

            {/* Low Stock Widget - Top 10 warnings list */}
            <div className="xl:col-span-1 border border-slate-200/80 bg-white rounded-3xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" /> Low Stock Alerts
              </h3>
              
              {lowStockList.length > 0 ? (
                <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
                  {lowStockList.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-2 p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-2xl transition-all">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-bold text-xs text-slate-900 truncate">{item.productId?.name}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">SKU: {item.productId?.sku}</span>
                        <span className="text-[9px] text-slate-500 font-bold">{item.branchId?.name}</span>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end">
                        <span className="font-black text-xs text-rose-600">{item.quantity}</span>
                        <span className="text-[9px] text-slate-400 font-bold">Thresh: {item.threshold}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-6">All stock levels are currently healthy.</p>
              )}
            </div>

          </div>

        </div>
      ) : (
        /* History Ledger Tab View */
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto w-full glass-card rounded-2xl border border-slate-200/80 shadow-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 pl-6">Product</th>
                  <th className="p-4">Branch</th>
                  <th className="p-4">Action</th>
                  <th className="p-4 text-center">Movement Qty</th>
                  <th className="p-4 text-center">Stock Ledger</th>
                  <th className="p-4">User</th>
                  <th className="p-4">Reference/Notes</th>
                  <th className="p-4 pr-6">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700 bg-white/40">
                {historyLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-4 pl-6">
                      <div>
                        <span className="font-bold text-slate-900 block">{log.productId?.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">SKU: {log.productId?.sku}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 font-bold">{log.branchId?.name}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                        log.action === 'RESTOCK'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : log.action === 'ADJUSTMENT'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : log.action === 'TRANSFER_IN'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : log.action === 'TRANSFER_OUT'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {log.action.replace('_', ' ')}
                      </span>
                    </td>
                    <td className={`p-4 text-center font-bold font-mono ${
                      log.quantity > 0 ? 'text-emerald-600' : log.quantity < 0 ? 'text-rose-600' : 'text-slate-700'
                    }`}>
                      {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                    </td>
                    <td className="p-4 text-center text-slate-400 font-mono">
                      {log.previousQuantity} ➔ <span className="font-bold text-slate-700">{log.newQuantity}</span>
                    </td>
                    <td className="p-4 font-bold text-slate-600">{log.userId?.username}</td>
                    <td className="p-4">
                      <div>
                        <span className="text-slate-800 font-bold block">{log.notes || 'N/A'}</span>
                        {log.invoiceNumber && <span className="text-[10px] text-slate-400 font-mono">Invoice: {log.invoiceNumber}</span>}
                      </div>
                    </td>
                    <td className="p-4 pr-6 text-slate-400 font-mono font-medium">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* History Pagination */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-semibold text-slate-500">
              Showing page {historyPage} of {historyPaginationInfo.totalPages || 1} ({historyPaginationInfo.totalRecords} logs)
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={!historyPaginationInfo.hasPrevious} onClick={() => setHistoryPage(p => p - 1)} className="!py-1.5 text-xs">
                Previous
              </Button>
              <Button disabled={!historyPaginationInfo.hasNext} onClick={() => setHistoryPage(p => p + 1)} className="!py-1.5 text-xs">
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIGURE NEW INVENTORY MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowConfigModal(false)} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
          <div className="glass-card rounded-3xl w-full max-w-md p-8 relative z-10 border border-slate-200/80 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 font-display">Configure Product Stock</h2>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleConfigSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Select Product</label>
                <select
                  value={configForm.productId}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, productId: e.target.value }))}
                  className="p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                  required
                >
                  <option value="">-- Choose Product --</option>
                  {products.map(p => <option key={p._id} value={p._id}>{p.name} (SKU: {p.sku})</option>)}
                </select>
              </div>

              {user?.role === 'SUPER_ADMIN' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Select Branch</label>
                  <select
                    value={configForm.branchId}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, branchId: e.target.value }))}
                    className="p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                    required
                  >
                    <option value="">-- Choose Branch --</option>
                    {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Associated Supplier</label>
                <select
                  value={configForm.supplierId}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, supplierId: e.target.value }))}
                  className="p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                >
                  <option value="">-- Unassigned (Optional) --</option>
                  {activeSuppliers.map(s => <option key={s._id} value={s._id}>{s.companyName}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Initial Quantity" type="number" name="quantity" required min="0" step="any" value={configForm.quantity} onChange={(e) => setConfigForm(prev => ({ ...prev, quantity: e.target.value }))} />
                <Input label="Reorder Threshold" type="number" name="threshold" required min="0" step="any" value={configForm.threshold} onChange={(e) => setConfigForm(prev => ({ ...prev, threshold: e.target.value }))} />
              </div>

              <Input label="Stock Unit Specification" name="unit" placeholder="e.g. pieces, kg, boxes" required value={configForm.unit} onChange={(e) => setConfigForm(prev => ({ ...prev, unit: e.target.value }))} />

              <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
                <Button variant="secondary" type="button" onClick={() => setShowConfigModal(false)}>Cancel</Button>
                <Button type="submit" loading={submitting}>Configure Stock</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESTOCK STOCK MODAL */}
      {showRestockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowRestockModal(false)} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
          <div className="glass-card rounded-3xl w-full max-w-md p-8 relative z-10 border border-slate-200/80 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display">Restock Stock Addition</h2>
                <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Product: {selectedItem?.productId?.name}</span>
              </div>
              <button onClick={() => setShowRestockModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleRestockSubmit} className="flex flex-col gap-4">
              <Input label={`Quantity to Add (${selectedItem?.unit})`} type="number" required min="0.001" step="any" value={restockForm.quantityAdded} onChange={(e) => setRestockForm(prev => ({ ...prev, quantityAdded: e.target.value }))} />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Select Supplier</label>
                <select
                  value={restockForm.supplierId}
                  onChange={(e) => setRestockForm(prev => ({ ...prev, supplierId: e.target.value }))}
                  className="p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                >
                  <option value="">-- Choose Supplier (Optional) --</option>
                  {activeSuppliers.map(s => <option key={s._id} value={s._id}>{s.companyName}</option>)}
                </select>
              </div>

              <Input label="Invoice / Purchase Order Number" placeholder="e.g. INV-2026-908" value={restockForm.invoiceNumber} onChange={(e) => setRestockForm(prev => ({ ...prev, invoiceNumber: e.target.value }))} />
              <Input label="Audit Reference Notes" placeholder="e.g. Delivered batch A-1" value={restockForm.notes} onChange={(e) => setRestockForm(prev => ({ ...prev, notes: e.target.value }))} />

              <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
                <Button variant="secondary" type="button" onClick={() => setShowRestockModal(false)}>Cancel</Button>
                <Button type="submit" loading={submitting}>Complete Restock</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST QUANTITY MODAL */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowAdjustModal(false)} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
          <div className="glass-card rounded-3xl w-full max-w-md p-8 relative z-10 border border-slate-200/80 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display">Manual Adjustment</h2>
                <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Product: {selectedItem?.productId?.name} (Current: {selectedItem?.quantity})</span>
              </div>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="flex flex-col gap-4">
              <Input label={`Adjust New Quantity (${selectedItem?.unit})`} type="number" required min="0" step="any" value={adjustForm.newQuantity} onChange={(e) => setAdjustForm(prev => ({ ...prev, newQuantity: e.target.value }))} />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Adjustment Reason</label>
                <select
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                  required
                >
                  <option value="MANUAL_CORRECTION">Manual Stock Correction</option>
                  <option value="DAMAGED">Damaged / Broken Goods</option>
                  <option value="EXPIRED">Expired Inventory</option>
                  <option value="WASTED">Wasted / Spillage</option>
                </select>
              </div>

              <Input label="Audit notes describing the manual adjustment" placeholder="e.g. Audit correction after monthly manual count" required minLength="3" value={adjustForm.notes} onChange={(e) => setAdjustForm(prev => ({ ...prev, notes: e.target.value }))} />

              <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
                <Button variant="secondary" type="button" onClick={() => setShowAdjustModal(false)}>Cancel</Button>
                <Button type="submit" loading={submitting}>Apply Adjustment</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK TRANSFER RELOCATION MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowTransferModal(false)} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
          <div className="glass-card rounded-3xl w-full max-w-md p-8 relative z-10 border border-slate-200/80 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 font-display">Stock Relocation Transfer</h2>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleTransferSubmit} className="flex flex-col gap-4">
              {!selectedItem && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Select Product</label>
                  <select
                    value={transferForm.productId}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, productId: e.target.value }))}
                    className="p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                    required
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map(p => <option key={p._id} value={p._id}>{p.name} (SKU: {p.sku})</option>)}
                  </select>
                </div>
              )}

              {user?.role === 'SUPER_ADMIN' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Source Branch</label>
                    <select
                      value={transferForm.fromBranch}
                      onChange={(e) => setTransferForm(prev => ({ ...prev, fromBranch: e.target.value }))}
                      className="p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                      required
                    >
                      <option value="">-- From Branch --</option>
                      {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Destination Branch</label>
                    <select
                      value={transferForm.toBranch}
                      onChange={(e) => setTransferForm(prev => ({ ...prev, toBranch: e.target.value }))}
                      className="p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                      required
                    >
                      <option value="">-- To Branch --</option>
                      {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Destination Branch</label>
                  <select
                    value={transferForm.toBranch}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, toBranch: e.target.value }))}
                    className="p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                    required
                  >
                    <option value="">-- To Branch --</option>
                    {branches.filter(b => b._id.toString() !== user?.branchId?.toString()).map(b => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <Input label={`Transfer Quantity ${selectedItem ? `(${selectedItem.unit})` : ''}`} type="number" required min="0.001" step="any" value={transferForm.quantity} onChange={(e) => setTransferForm(prev => ({ ...prev, quantity: e.target.value }))} />
              <Input label="Transfer Notes (Optional)" placeholder="e.g. Relocating seasonal overstock" value={transferForm.notes} onChange={(e) => setTransferForm(prev => ({ ...prev, notes: e.target.value }))} />

              <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
                <Button variant="secondary" type="button" onClick={() => setShowTransferModal(false)}>Cancel</Button>
                <Button type="submit" loading={submitting}>Execute Transfer</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;
