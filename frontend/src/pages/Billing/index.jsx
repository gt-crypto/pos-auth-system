import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, ShoppingCart, Plus, Minus, Trash2, X, Play, Pause,
  CreditCard, User, Printer, Eye, AlertCircle, Sparkles, Check,
  ChevronRight, ArrowLeft, Loader2, RefreshCw, Layers
} from 'lucide-react';
import api from '../../services/api.js';

// ---------- Helpers ----------
const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

// ---------- Variant Selection Modal ----------
const VariantModal = ({ open, product, onClose, onSelect }) => {
  if (!open || !product) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 animate-fadeIn">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-base">Select Variant</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-slate-500 mb-3">{product.name}</p>
        <div className="flex flex-col gap-2">
          {product.variants?.map((v) => (
            <button
              key={v.name}
              onClick={() => onSelect(v)}
              className="flex items-center justify-between p-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              <span>{v.name}</span>
              <span className="text-blue-600">{fmt(v.price)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------- Split Billing View ----------
const SplitModal = ({ open, order, onClose, onSplitSuccess, showToast }) => {
  const [splitCount, setSplitCount] = useState(2);
  const [splitType, setSplitType] = useState('equal'); // 'equal' or 'items'
  const [saving, setSaving] = useState(false);

  if (!open || !order) return null;

  const handleProcessSplit = async () => {
    setSaving(true);
    try {
      const splits = [];
      if (splitType === 'equal') {
        const shareAmount = order.totalAmount / splitCount;
        const shareSubtotal = order.subtotal / splitCount;
        const shareTax = order.totalTax / splitCount;
        const shareDiscount = order.totalDiscount / splitCount;

        for (let i = 0; i < splitCount; i++) {
          splits.push({
            items: order.items,
            subtotal: +shareSubtotal.toFixed(2),
            totalDiscount: +shareDiscount.toFixed(2),
            totalTax: +shareTax.toFixed(2),
            totalAmount: +shareAmount.toFixed(2),
            paymentMethods: [{ method: 'CASH', amount: +shareAmount.toFixed(2) }]
          });
        }
      } else {
        // Simple 50-50 item division for demo
        const half = Math.ceil(order.items.length / 2);
        const set1 = order.items.slice(0, half);
        const set2 = order.items.slice(half);
        
        const calcSet = (items) => {
          const sub = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
          const disc = items.reduce((sum, item) => sum + (item.discount || 0), 0);
          const tax = (sub - disc) * 0.1; // flat 10%
          return { items, subtotal: sub, totalDiscount: disc, totalTax: tax, totalAmount: sub - disc + tax };
        };

        splits.push({ ...calcSet(set1), paymentMethods: [{ method: 'CASH', amount: +(calcSet(set1).totalAmount).toFixed(2) }] });
        splits.push({ ...calcSet(set2), paymentMethods: [{ method: 'CASH', amount: +(calcSet(set2).totalAmount).toFixed(2) }] });
      }

      await api.post('/billing/split', { parentOrderId: order._id, splits });
      showToast('Order split successfully.', 'success');
      onSplitSuccess();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to split order.', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-base">Split Bill</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-slate-500 mb-4">Split Order: <span className="font-bold font-mono">{order.orderNumber}</span> ({fmt(order.totalAmount)})</p>
        
        <div className="flex gap-2 mb-4">
          <button onClick={() => setSplitType('equal')} className={`flex-1 py-2 rounded-xl text-xs font-bold border ${splitType === 'equal' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600'}`}>Equal Split</button>
          <button onClick={() => setSplitType('items')} className={`flex-1 py-2 rounded-xl text-xs font-bold border ${splitType === 'items' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600'}`}>By Items</button>
        </div>

        {splitType === 'equal' && (
          <div className="mb-6">
            <label className="text-xs font-semibold text-slate-500 block mb-1">Number of Splits</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setSplitCount(c => Math.max(2, c - 1))} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50"><Minus className="h-4 w-4 text-slate-600" /></button>
              <span className="font-bold text-lg text-slate-800 w-8 text-center">{splitCount}</span>
              <button onClick={() => setSplitCount(c => Math.min(10, c + 1))} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50"><Plus className="h-4 w-4 text-slate-600" /></button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Each split will pay: <span className="font-bold text-slate-700">{fmt(order.totalAmount / splitCount)}</span></p>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleProcessSplit} disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Confirm Split
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Receipt Layout Panel ----------
const ReceiptView = ({ order, payments, onClose }) => {
  if (!order) return null;
  const printAreaRef = useRef();

  const handlePrint = () => {
    const printContent = printAreaRef.current.innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // reload to rebind react state
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm">Receipt Preview</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X className="h-4 w-4" /></button>
        </div>
        
        {/* Printable Area */}
        <div ref={printAreaRef} className="flex-1 overflow-y-auto p-6 font-mono text-xs text-slate-800 bg-white">
          <div className="text-center mb-4">
            <h2 className="font-bold text-sm tracking-tight">APEXIFY RETAIL</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">{order.branchId?.name || 'Assigned Branch'}</p>
            <p className="text-[10px] text-slate-400">POS Billing Terminal</p>
          </div>

          <div className="border-t border-dashed border-slate-200 py-3 flex flex-col gap-1 text-[10px]">
            <div className="flex justify-between"><span>Receipt No:</span><span>REC-{order._id?.substring(18).toUpperCase()}</span></div>
            <div className="flex justify-between"><span>Order Ref:</span><span>{order.orderNumber}</span></div>
            <div className="flex justify-between"><span>Date:</span><span>{new Date(order.orderDate || order.createdAt).toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Cashier:</span><span>{order.cashierId?.username || 'POS Cashier'}</span></div>
            <div className="flex justify-between"><span>Customer:</span><span>{order.customerName}</span></div>
          </div>

          <table className="w-full text-left border-t border-dashed border-slate-200 pt-3">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 border-b border-dashed border-slate-200">
                <th className="pb-1.5 w-1/2">Item</th>
                <th className="pb-1.5 text-center">Qty</th>
                <th className="pb-1.5 text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items?.map((item, i) => (
                <tr key={i} className="text-[10px]">
                  <td className="py-2 pr-2">
                    <span className="font-bold">{item.name}</span>
                    {item.variantName && <span className="block text-[9px] text-slate-400">Variant: {item.variantName}</span>}
                  </td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">{fmt(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-dashed border-slate-200 pt-3 flex flex-col gap-1.5 text-[10px]">
            <div className="flex justify-between"><span>Subtotal:</span><span>{fmt(order.subtotal)}</span></div>
            <div className="flex justify-between text-rose-500"><span>Discount:</span><span>-{fmt(order.totalDiscount)}</span></div>
            <div className="flex justify-between"><span>Tax (GST):</span><span>+{fmt(order.totalTax)}</span></div>
            <div className="flex justify-between font-bold text-slate-900 border-t border-dashed border-slate-200 pt-2 text-xs">
              <span>Grand Total:</span><span>{fmt(order.totalAmount)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-200 mt-3 pt-3 text-[10px]">
            <p className="font-bold text-[9px] uppercase tracking-wider text-slate-400 mb-1.5">Payment Breakdown</p>
            {payments?.length > 0 ? (
              payments.map((p, i) => (
                <div key={i} className="flex justify-between text-[9px]">
                  <span>{p.paymentMethod} {p.referenceNumber ? `(${p.referenceNumber})` : ''}</span>
                  <span>{fmt(p.amount)}</span>
                </div>
              ))
            ) : (
              order.paymentMethods?.map((p, i) => (
                <div key={i} className="flex justify-between text-[9px]">
                  <span>{p.method}</span>
                  <span>{fmt(p.amount)}</span>
                </div>
              ))
            )}
          </div>

          <div className="text-center mt-6 text-[10px] text-slate-400">
            <p className="font-bold">Thank You For Your Visit!</p>
            <p className="mt-0.5">Please keep this receipt as reference.</p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 rounded-b-3xl">
          <button onClick={handlePrint} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2">
            <Printer className="h-4 w-4" /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Main Billing / POS Screen Component ----------

export const Billing = ({ user, showToast }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  // Branch context for Super Admin
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    try {
      return sessionStorage.getItem('apexify-selected-branch-id') || user?.branchId || '';
    } catch {
      return user?.branchId || '';
    }
  });

  // Split payments layout state
  const [payments, setPayments] = useState([{ method: 'CASH', amount: '', referenceNumber: '' }]);

  const [walkInName, setWalkInName] = useState('Walk-in Customer');
  const [walkInPhone, setWalkInPhone] = useState('');

  // Held orders layout state
  const [heldOrders, setHeldOrders] = useState([]);
  const [viewHeld, setViewHeld] = useState(false);
  const [splitOrderTarget, setSplitOrderTarget] = useState(null);

  // Receipt modal state
  const [receiptTarget, setReceiptTarget] = useState(null);
  const [receiptPayments, setReceiptPayments] = useState([]);

  // Variant selector
  const [variantProduct, setVariantProduct] = useState(null);

  const isCashier = user?.role === 'CASHIER';

  // Fetch branches on mount for Super Admin
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      const fetchBranches = async () => {
        try {
          const res = await api.get('/branches');
          const activeBranches = (res.data.data?.branches || []).filter(b => b.status === 'ACTIVE' && !b.isDeleted);
          setBranches(activeBranches);
          
          const savedBranchId = sessionStorage.getItem('apexify-selected-branch-id');
          if (savedBranchId && activeBranches.some(b => b._id === savedBranchId)) {
            setSelectedBranchId(savedBranchId);
          } else if (activeBranches.length > 0) {
            setSelectedBranchId(activeBranches[0]._id);
            try {
              sessionStorage.setItem('apexify-selected-branch-id', activeBranches[0]._id);
            } catch {}
          }
        } catch {
          showToast('Failed to load branches list.', 'error');
        }
      };
      fetchBranches();
    }
  }, [user, showToast]);

  // ── Load Catalog ──────────────────────────────────────────────────────────
  const fetchCatalog = useCallback(async () => {
    if (user?.role === 'SUPER_ADMIN' && !selectedBranchId) {
      setProducts([]);
      setCategories([]);
      return;
    }

    setLoading(true);
    try {
      const prodUrl = selectedBranchId ? `/products?limit=100&branchId=${selectedBranchId}` : '/products?limit=100';
      const catUrl = selectedBranchId ? `/categories?branchId=${selectedBranchId}` : '/categories';

      const [prodRes, catRes] = await Promise.all([
        api.get(prodUrl),
        api.get(catUrl)
      ]);
      // Only active and available products can be displayed
      const activeList = (prodRes.data.data?.products || []).filter(p => p.status === 'ACTIVE' && p.isAvailable);
      setProducts(activeList);
      setCategories(catRes.data.data?.categories || []);
    } catch { showToast('Failed to load menu catalog.', 'error'); }
    finally { setLoading(false); }
  }, [selectedBranchId, user, showToast]);

  useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

  // ── Cart Calculations ──────────────────────────────────────────────────────
  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const totalDiscount = cart.reduce((sum, item) => sum + (item.discount || 0), 0);
  const totalTax = cart.reduce((sum, item) => {
    const taxRate = item.taxPercentage / 100;
    return sum + ((item.unitPrice * item.quantity) - (item.discount || 0)) * taxRate;
  }, 0);
  const grandTotal = subtotal - totalDiscount + totalTax;

  // Set default single payment amount to grand total whenever cart changes
  useEffect(() => {
    setPayments([{ method: 'CASH', amount: grandTotal > 0 ? +grandTotal.toFixed(2) : '', referenceNumber: '' }]);
  }, [grandTotal]);

  // ── Cart Operations ───────────────────────────────────────────────────────
  const addToCart = (product, variant = null) => {
    // If product has variants and none was selected, open select modal
    if (product.variants?.length > 0 && !variant) {
      setVariantProduct(product);
      return;
    }

    const itemId = variant ? `${product._id}-${variant.name}` : product._id;
    const unitPrice = variant ? variant.price : product.price;
    const variantName = variant ? variant.name : '';

    const existingIndex = cart.findIndex(i => i.itemId === itemId);
    if (existingIndex > -1) {
      const nextCart = [...cart];
      nextCart[existingIndex].quantity += 1;
      nextCart[existingIndex].totalPrice = nextCart[existingIndex].quantity * unitPrice;
      setCart(nextCart);
    } else {
      setCart(c => [...c, {
        itemId,
        productId: product._id,
        name: product.name,
        sku: product.sku || '',
        quantity: 1,
        unitPrice,
        discount: 0,
        taxPercentage: product.taxPercentage || 0,
        totalPrice: unitPrice,
        variantName
      }]);
    }
    setVariantProduct(null);
  };

  const updateCartQty = (itemId, quantity) => {
    if (quantity <= 0) {
      setCart(c => c.filter(i => i.itemId !== itemId));
      return;
    }
    setCart(c => c.map(item => {
      if (item.itemId === itemId) {
        return {
          ...item,
          quantity,
          totalPrice: quantity * item.unitPrice
        };
      }
      return item;
    }));
  };

  const removeItem = (itemId) => setCart(c => c.filter(i => i.itemId !== itemId));
  const clearCart = () => { setCart([]); };

  // ── Payment allocation splits ─────────────────────────────────────────────
  const addPaymentMethod = () => setPayments(p => [...p, { method: 'CASH', amount: '', referenceNumber: '' }]);
  const removePaymentMethod = (idx) => setPayments(p => p.filter((_, i) => i !== idx));

  // ── Cart Checkout Actions ──────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) return showToast('Cart is empty.', 'error');
    
    // Validate split payment sum equals grand total
    const sumPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    if (Math.abs(sumPayments - grandTotal) > 0.05) {
      return showToast(`Payment sum (${fmt(sumPayments)}) must equal grand total (${fmt(grandTotal)})`, 'error');
    }

    const checkoutData = {
      branchId: selectedBranchId || user?.branchId || null,
      customerId: null,
      customerName: walkInName,
      customerPhone: walkInPhone,
      items: cart.map(i => ({
        productId: i.productId,
        name: i.name,
        sku: i.sku,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
        taxAmount: +((i.unitPrice * i.quantity - i.discount) * (i.taxPercentage / 100)).toFixed(2),
        totalPrice: i.totalPrice,
        variantName: i.variantName
      })),
      subtotal: +subtotal.toFixed(2),
      totalDiscount: +totalDiscount.toFixed(2),
      totalTax: +totalTax.toFixed(2),
      totalAmount: +grandTotal.toFixed(2),
      paymentMethods: payments.map(p => ({ method: p.method, amount: parseFloat(p.amount), referenceNumber: p.referenceNumber })),
      notes: ''
    };

    setLoading(true);
    try {
      const res = await api.post('/billing/checkout', checkoutData);
      showToast('Transaction completed successfully!', 'success');
      
      // Open receipt modal
      setReceiptTarget(res.data.data?.order);
      setReceiptPayments(res.data.data?.payments || []);
      clearCart();
    } catch (err) {
      showToast(err.response?.data?.message || 'Checkout failed.', 'error');
    } finally { setLoading(false); }
  };

  // ── Place cart on HOLD ────────────────────────────────────────────────────
  const handleHoldOrder = async () => {
    if (cart.length === 0) return showToast('Cart is empty.', 'error');

    const holdData = {
      branchId: selectedBranchId || user?.branchId || null,
      customerId: null,
      customerName: walkInName,
      customerPhone: walkInPhone,
      items: cart.map(i => ({
        productId: i.productId,
        name: i.name,
        sku: i.sku,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
        taxAmount: +((i.unitPrice * i.quantity - i.discount) * (i.taxPercentage / 100)).toFixed(2),
        totalPrice: i.totalPrice,
        variantName: i.variantName
      })),
      subtotal: +subtotal.toFixed(2),
      totalDiscount: +totalDiscount.toFixed(2),
      totalTax: +totalTax.toFixed(2),
      totalAmount: +grandTotal.toFixed(2),
      notes: 'Held order'
    };

    setLoading(true);
    try {
      await api.post('/billing/hold', holdData);
      showToast('Order placed on hold.', 'success');
      clearCart();
    } catch { showToast('Failed to hold order.', 'error'); }
    finally { setLoading(false); }
  };

  // ── Place cart on HOLD ────────────────────────────────────────────────────
  const loadHeldOrders = async () => {
    try {
      const branchParam = selectedBranchId ? `&branchId=${selectedBranchId}` : '';
      const res = await api.get(`/billing/orders?status=HOLD${branchParam}`);
      setHeldOrders(res.data.data?.orders || []);
      setViewHeld(true);
    } catch { showToast('Failed to load held orders.', 'error'); }
  };

  const resumeHeld = async (order) => {
    try {
      await api.post(`/billing/resume/${order._id}`);
      // Hydrate cart
      setCart(order.items.map(i => ({
        itemId: i.variantName ? `${i.productId}-${i.variantName}` : i.productId,
        productId: i.productId,
        name: i.name,
        sku: i.sku || '',
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount || 0,
        taxPercentage: 10, // approximate default GST
        totalPrice: i.totalPrice,
        variantName: i.variantName || ''
      })));
      setWalkInName(order.customerName || 'Walk-in Customer');
      setWalkInPhone(order.customerPhone || '');
      
      // Delete held order from DB
      await api.post(`/billing/cancel-hold/${order._id}`);
      setViewHeld(false);
      showToast('Order resumed successfully.', 'success');
    } catch { showToast('Failed to resume order.', 'error'); }
  };

  const cancelHeld = async (orderId) => {
    try {
      await api.post(`/billing/cancel-hold/${orderId}`);
      setHeldOrders(o => o.filter(item => item._id !== orderId));
      showToast('Held order cancelled.', 'success');
    } catch { showToast('Failed to cancel held order.', 'error'); }
  };

  // ── Catalog filter logic ──────────────────────────────────────────────────
  const filteredProducts = products.filter(p => {
    const catId = typeof p.categoryId === 'object' && p.categoryId !== null ? p.categoryId._id : p.categoryId;
    const matchCat = activeCategory ? catId === activeCategory : true;
    const matchSearch = search ? (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase())
    ) : true;
    return matchCat && matchSearch;
  });

  return (
    <div className="h-[85vh] flex gap-6 pb-4">
      {/* 1. Catalog Grid Layout */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Search and Held controls */}
        <div className="flex items-center gap-3">
          {user?.role === 'SUPER_ADMIN' && (
            <select
              value={selectedBranchId}
              onChange={e => {
                const val = e.target.value;
                setSelectedBranchId(val);
                try {
                  sessionStorage.setItem('apexify-selected-branch-id', val);
                } catch {}
                setCart([]); // Clear cart when switching branches to prevent cross-branch orders
              }}
              className="px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 shrink-0"
            >
              <option value="">Select Branch...</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products by name, SKU, barcode..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30"
            />
          </div>
          <button onClick={loadHeldOrders} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors">
            <Pause className="h-4 w-4" /> Held Bills
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button onClick={() => setActiveCategory('')} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors shrink-0 ${!activeCategory ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600'}`}>All Items</button>
          {categories.map(c => (
            <button key={c._id} onClick={() => setActiveCategory(c._id)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors shrink-0 ${activeCategory === c._id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600'}`}>{c.name}</button>
          ))}
        </div>

        {/* Product Catalog Cards */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pr-1 scrollbar-thin">
          {user?.role === 'SUPER_ADMIN' && !selectedBranchId ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              <AlertCircle className="h-10 w-10 opacity-30 mb-3 text-amber-500" />
              <p className="text-sm font-bold text-slate-700">Active Branch Terminal Required</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs text-center leading-relaxed">Please select an active branch from the dropdown selector in the top toolbar to fetch the product catalog.</p>
            </div>
          ) : loading ? (
            Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              <Layers className="h-10 w-10 opacity-30 mb-3" />
              <p className="text-sm font-medium">No matching menu products found</p>
            </div>
          ) : (
            filteredProducts.map(p => (
              <div
                key={p._id} onClick={() => addToCart(p)}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-blue-300 hover:shadow-md cursor-pointer transition-all duration-200 group relative overflow-hidden"
              >
                {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="absolute right-0 bottom-0 opacity-10 h-16 w-16 object-cover" />}
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight">{p.name}</h4>
                    {p.isVeg !== undefined && <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">{p.sku}</p>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs font-black text-slate-900">{p.variants?.length > 0 ? `${fmt(Math.min(...p.variants.map(v => v.price)))} +` : fmt(p.price)}</span>
                  <div className="h-7 w-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Plus className="h-4 w-4" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Right Cart / Checkout Panel */}
      <div className="w-[380px] bg-white border border-slate-200 rounded-3xl p-6 flex flex-col max-h-full shadow-md">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <ShoppingCart className="h-4 w-4 text-blue-600" />
          <h3 className="font-bold text-slate-950 text-sm">Cart Details</h3>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-600">{cart.length} Items</span>
        </div>

        {/* Walk-in Customer Details */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={walkInName}
            onChange={e => setWalkInName(e.target.value)}
            placeholder="Walk-in Name"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400/30"
          />
          <input
            type="text"
            value={walkInPhone}
            onChange={e => setWalkInPhone(e.target.value)}
            placeholder="Walk-in Phone"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400/30"
          />
        </div>

        {/* Scrollable Cart Items */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 scrollbar-thin">
          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-10">
              <ShoppingCart className="h-8 w-8 opacity-25 mb-2" />
              <p className="text-xs font-medium">Cart is currently empty</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={item.itemId} className="flex gap-3 bg-slate-50 border border-slate-200/50 p-3 rounded-xl">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 truncate">{item.name}</h4>
                  {item.variantName && <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">Variant: {item.variantName}</span>}
                  <span className="text-[10px] font-bold text-slate-600 mt-1 block">{fmt(item.unitPrice)}</span>
                </div>
                <div className="flex flex-col justify-between items-end shrink-0">
                  <button onClick={() => removeItem(item.itemId)} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1">
                    <button onClick={() => updateCartQty(item.itemId, item.quantity - 1)} className="p-0.5 hover:bg-slate-100 rounded text-slate-500"><Minus className="h-3 w-3" /></button>
                    <span className="text-xs font-bold text-slate-800 w-5 text-center">{item.quantity}</span>
                    <button onClick={() => updateCartQty(item.itemId, item.quantity + 1)} className="p-0.5 hover:bg-slate-100 rounded text-slate-500"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Calculations */}
        <div className="border-t border-slate-100 pt-4 mt-4 flex flex-col gap-2 text-xs">
          <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
          {totalDiscount > 0 && <div className="flex justify-between text-rose-500 font-medium"><span>Discounts</span><span>-{fmt(totalDiscount)}</span></div>}
          <div className="flex justify-between text-slate-500"><span>Tax (GST)</span><span>+{fmt(totalTax)}</span></div>
          <div className="flex justify-between font-extrabold text-slate-900 border-t border-dashed border-slate-200 pt-2.5 text-sm">
            <span>Grand Total</span><span>{fmt(grandTotal)}</span>
          </div>
        </div>

        {/* Split Payments Allocation */}
        {cart.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 max-h-[140px] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Split</span>
              <button onClick={addPaymentMethod} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">+ Add</button>
            </div>
            <div className="flex flex-col gap-2">
              {payments.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select value={p.method} onChange={e => setPayments(prev => prev.map((item, idx) => idx === i ? { ...item, method: e.target.value } : item))} className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 bg-white">
                    <option value="CASH">CASH</option>
                    <option value="CARD">CARD</option>
                    <option value="UPI">UPI</option>
                  </select>
                  <input
                    type="number" value={p.amount} onChange={e => setPayments(prev => prev.map((item, idx) => idx === i ? { ...item, amount: e.target.value } : item))}
                    placeholder="Amount" className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  />
                  {payments.length > 1 && (
                    <button onClick={() => removePaymentMethod(i)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"><X className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex gap-2 mt-4 pt-2 border-t border-slate-100">
          <button onClick={handleHoldOrder} disabled={cart.length === 0} className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5">
            <Pause className="h-3.5 w-3.5" /> Hold
          </button>
          <button onClick={handleCheckout} disabled={cart.length === 0 || loading} className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md shadow-blue-200">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
            Checkout
          </button>
        </div>
      </div>

      {/* Held Bills Slide-out Drawer */}
      <AnimatePresence>
        {viewHeld && (
          <>
            <div onClick={() => setViewHeld(false)} className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-30" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28 }} className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white border-l border-slate-200 z-40 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 text-sm">Held Orders</h3>
                <button onClick={() => setViewHeld(false)} className="p-1 rounded hover:bg-slate-100 text-slate-400"><X className="h-4.5 w-4.5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 scrollbar-thin">
                {heldOrders.length === 0 ? (
                  <p className="text-xs text-slate-400 py-10 text-center">No orders currently on hold</p>
                ) : (
                  heldOrders.map(order => (
                    <div key={order._id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-slate-800 font-mono">{order.orderNumber}</p>
                          <p className="text-[10px] text-slate-400">{new Date(order.createdAt).toLocaleTimeString()}</p>
                        </div>
                        <span className="text-xs font-bold text-blue-700">{fmt(order.totalAmount)}</span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-600">Customer: {order.customerName}</p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => cancelHeld(order._id)} className="flex-1 py-1.5 border border-slate-200 hover:bg-white text-rose-500 rounded-lg text-[10px] font-bold">Delete</button>
                        <button onClick={() => setSplitOrderTarget(order)} className="flex-1 py-1.5 border border-slate-200 hover:bg-white text-slate-600 rounded-lg text-[10px] font-bold">Split</button>
                        <button onClick={() => resumeHeld(order)} className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1"><Play className="h-2.5 w-2.5 fill-white" /> Resume</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Selector modals */}
      <VariantModal open={!!variantProduct} product={variantProduct} onClose={() => setVariantProduct(null)} onSelect={(v) => addToCart(variantProduct, v)} />
      
      <SplitModal open={!!splitOrderTarget} order={splitOrderTarget} onClose={() => setSplitOrderTarget(null)} onSplitSuccess={() => { setViewHeld(false); loadHeldOrders(); }} showToast={showToast} />
      
      <ReceiptView order={receiptTarget} payments={receiptPayments} onClose={() => setReceiptTarget(null)} />
    </div>
  );
};

export default Billing;
