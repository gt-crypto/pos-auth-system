import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, ShoppingBag, CreditCard, Package, Users, AlertTriangle,
  BarChart2, PieChart, Activity, Building2, UserCheck, Download,
  Calendar, RefreshCw, Loader2, ChevronDown, ArrowUpRight, ArrowDownRight,
  Star, Zap, ShoppingCart
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import api from '../../services/api.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) => `$${parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (n) => parseFloat(n || 0).toLocaleString();
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const CHART_COLORS = {
  blue: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.9)' },
  emerald: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.9)' },
  violet: { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.9)' },
  amber: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.9)' },
  rose: { bg: 'rgba(244,63,94,0.15)', border: 'rgba(244,63,94,0.9)' },
  teal: { bg: 'rgba(20,184,166,0.15)', border: 'rgba(20,184,166,0.9)' }
};

const PIE_PALETTE = ['rgba(59,130,246,0.85)', 'rgba(16,185,129,0.85)', 'rgba(139,92,246,0.85)', 'rgba(245,158,11,0.85)', 'rgba(244,63,94,0.85)', 'rgba(20,184,166,0.85)'];

const CHART_DEFAULTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', padding: 10, cornerRadius: 8 } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
    y: { grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', font: { size: 11 } } }
  }
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

const KPICard = ({ icon: Icon, label, value, sub, trend, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    violet: 'bg-violet-50 border-violet-100 text-violet-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-600',
    rose: 'bg-rose-50 border-rose-100 text-rose-600',
    teal: 'bg-teal-50 border-teal-100 text-teal-600',
    slate: 'bg-slate-100 border-slate-200 text-slate-500'
  };
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-start gap-4">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</p>
        <p className="text-xl font-extrabold text-slate-900 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-[10px] font-bold mt-1 ${trend >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
          {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(trend)}%
        </div>
      )}
    </motion.div>
  );
};

const ChartCard = ({ title, children, action }) => (
  <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

const SectionHeader = ({ title, desc, onExport, exporting }) => (
  <div className="flex items-center justify-between mb-6">
    <div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
    </div>
    {onExport && (
      <button onClick={onExport} disabled={exporting}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
        {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Export CSV
      </button>
    )}
  </div>
);

const LoadingBlock = () => (
  <div className="flex items-center justify-center py-24">
    <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
  </div>
);

const EmptyBlock = ({ msg = 'No data for this period.' }) => (
  <div className="flex flex-col items-center justify-center py-24 text-slate-400">
    <Activity className="h-10 w-10 opacity-30 mb-3" />
    <p className="text-sm font-medium">{msg}</p>
  </div>
);

// ─── Filters Bar ─────────────────────────────────────────────────────────────

const FiltersBar = ({ period, setPeriod, startDate, setStartDate, endDate, setEndDate, branches, branchId, setBranchId, isSuperAdmin, onRefresh, loading }) => (
  <div className="flex flex-wrap items-center gap-3">
    {['today', 'yesterday', 'this_week', 'this_month', 'custom'].map(p => (
      <button key={p} onClick={() => setPeriod(p)}
        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${period === p ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
        {p.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
      </button>
    ))}
    {period === 'custom' && (
      <>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30" />
      </>
    )}
    {isSuperAdmin && branches.length > 0 && (
      <select value={branchId} onChange={e => setBranchId(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30">
        <option value="">All Branches</option>
        {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
      </select>
    )}
    <button onClick={onRefresh} disabled={loading} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-40 transition-colors ml-auto">
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
    </button>
  </div>
);

// ─── Low Stock Tab ──────────────────────────────────────────────────────────

const LowStockTab = ({ data, loading, onExport, exporting }) => {
  if (loading) return <LoadingBlock />;
  if (!data || !data.lowStock?.length) return <EmptyBlock msg="No low stock items." />;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Low Stock Report" desc="Products with current stock at or below reorder threshold" onExport={onExport} exporting={exporting} />
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200/60">
            <tr>{['Product', 'SKU', 'Current Stock', 'Reorder Threshold', 'Branch'].map(h => <th key={h} className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.lowStock.map((item, i) => (
              <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3 text-sm font-semibold text-slate-800">{item.productName}</td>
                <td className="px-4 py-3 text-xs font-mono text-slate-500">{item.sku}</td>
                <td className="px-4 py-3 text-sm font-bold text-rose-600">{item.currentStock}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{item.reorderThreshold}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{item.branchName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Report Tabs ─────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'sales', label: 'Sales', icon: TrendingUp },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'products', label: 'Products', icon: ShoppingBag },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'low_stock', label: 'Low Stock', icon: AlertTriangle },
  { id: 'cashiers', label: 'Cashiers', icon: UserCheck },
  { id: 'branches', label: 'Branches', icon: Building2 },
  { id: 'customers', label: 'Customers', icon: Users }
];

// ─── Overview Tab ────────────────────────────────────────────────────────────

const OverviewTab = ({ data, loading }) => {
  if (loading) return <LoadingBlock />;
  if (!data) return <EmptyBlock />;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={ShoppingCart} label="Total Orders" value={fmtNum(data.totalOrders)} color="blue" />
        <KPICard icon={TrendingUp} label="Total Revenue" value={fmt(data.totalRevenue)} color="emerald" />
        <KPICard icon={Activity} label="Avg Order Value" value={fmt(data.avgOrderValue)} color="violet" />
        <KPICard icon={AlertTriangle} label="Low Stock Items" value={fmtNum(data.lowStockItems)} color="amber" />
        <KPICard icon={Users} label="Total Customers" value={fmtNum(data.totalCustomers)} color="teal" />
        <KPICard icon={UserCheck} label="New Today" value={fmtNum(data.newCustomersToday)} color="blue" />
        <KPICard icon={Star} label="Top Product" value={data.topProduct?.name || '—'} sub={data.topProduct ? `${data.topProduct.totalQty} units` : ''} color="rose" />
        <KPICard icon={CreditCard} label="Total Discounts" value={fmt(data.totalDiscount)} color="slate" />
      </div>
    </div>
  );
};

// ─── Sales Tab ───────────────────────────────────────────────────────────────

const SalesTab = ({ data, loading, onExport, exporting }) => {
  if (loading) return <LoadingBlock />;
  if (!data) return <EmptyBlock />;

  const { summary, trend } = data;
  const labels = trend.map(t => `${String(t._id.day || 1).padStart(2,'0')}/${String(t._id.month).padStart(2,'0')}`);

  const lineData = {
    labels,
    datasets: [
      { label: 'Revenue', data: trend.map(t => t.revenue), fill: true, backgroundColor: CHART_COLORS.blue.bg, borderColor: CHART_COLORS.blue.border, tension: 0.4, borderWidth: 2, pointRadius: 3 },
      { label: 'Net Revenue', data: trend.map(t => t.netRevenue), fill: false, borderColor: CHART_COLORS.emerald.border, tension: 0.4, borderWidth: 2, pointRadius: 3, borderDash: [4, 3] }
    ]
  };

  const barData = {
    labels,
    datasets: [{ label: 'Orders', data: trend.map(t => t.orders), backgroundColor: CHART_COLORS.violet.bg, borderColor: CHART_COLORS.violet.border, borderWidth: 2, borderRadius: 6 }]
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Sales Report" desc="Revenue and order trends" onExport={onExport} exporting={exporting} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={TrendingUp} label="Total Revenue" value={fmt(summary.totalRevenue)} color="blue" />
        <KPICard icon={ShoppingCart} label="Total Orders" value={fmtNum(summary.totalOrders)} color="emerald" />
        <KPICard icon={Activity} label="Avg Order Value" value={fmt(summary.avgOrderValue)} color="violet" />
        <KPICard icon={AlertTriangle} label="Total Discounts" value={fmt(summary.totalDiscount)} color="amber" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Revenue Trend">
          <div style={{ height: 220 }}><Line data={lineData} options={{ ...CHART_DEFAULTS, plugins: { ...CHART_DEFAULTS.plugins, legend: { display: true, labels: { color: '#64748b', font: { size: 11 } } } } }} /></div>
        </ChartCard>
        <ChartCard title="Order Volume">
          <div style={{ height: 220 }}><Bar data={barData} options={CHART_DEFAULTS} /></div>
        </ChartCard>
      </div>
      {trend.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200/60">
              <tr>{['Date', 'Orders', 'Revenue', 'Discount', 'Tax', 'Net Revenue'].map(h => <th key={h} className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trend.map((t, i) => (
                <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{`${t._id.year}-${String(t._id.month).padStart(2,'0')}-${String(t._id.day || 1).padStart(2,'0')}`}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{t.orders}</td>
                  <td className="px-4 py-3 font-bold text-emerald-700">{fmt(t.revenue)}</td>
                  <td className="px-4 py-3 text-amber-600 font-semibold">{fmt(t.discount)}</td>
                  <td className="px-4 py-3 text-slate-600 font-semibold">{fmt(t.tax)}</td>
                  <td className="px-4 py-3 font-bold text-blue-700">{fmt(t.netRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Payment Tab ─────────────────────────────────────────────────────────────

const PaymentTab = ({ data, loading, onExport, exporting }) => {
  if (loading) return <LoadingBlock />;
  if (!data || !data.breakdown?.length) return <EmptyBlock />;

  const pieData = {
    labels: data.breakdown.map(p => p.method),
    datasets: [{
      data: data.breakdown.map(p => p.revenue),
      backgroundColor: PIE_PALETTE,
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  const doughData = {
    labels: data.breakdown.map(p => p.method),
    datasets: [{
      data: data.breakdown.map(p => p.count),
      backgroundColor: PIE_PALETTE,
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  const pieOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#64748b', font: { size: 11 }, padding: 14 } }, tooltip: { backgroundColor: '#1e293b', padding: 10, cornerRadius: 8 } } };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Payment Report" desc="Breakdown by payment method" onExport={onExport} exporting={exporting} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Revenue by Method">
          <div style={{ height: 220 }}><Pie data={pieData} options={pieOpts} /></div>
        </ChartCard>
        <ChartCard title="Transactions by Method">
          <div style={{ height: 220 }}><Doughnut data={doughData} options={pieOpts} /></div>
        </ChartCard>
      </div>
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200/60">
            <tr>{['Method', 'Transactions', 'Revenue', '% Share'].map(h => <th key={h} className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.breakdown.map((p, i) => (
              <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${p.method === 'CASH' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : p.method === 'CARD' ? 'bg-blue-50 text-blue-700 border-blue-200' : p.method === 'UPI' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{p.method}</span></td>
                <td className="px-4 py-3 font-bold text-slate-800">{p.count}</td>
                <td className="px-4 py-3 font-bold text-emerald-700">{fmt(p.revenue)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${p.percentage}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-600 w-10 text-right">{p.percentage}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Products Tab ─────────────────────────────────────────────────────────────

const ProductsTab = ({ data, loading, onExport, exporting }) => {
  const [topLimit, setTopLimit] = useState(10);
  if (loading) return <LoadingBlock />;
  if (!data) return <EmptyBlock />;

  const barData = {
    labels: data.topSelling.map(p => p.name.length > 16 ? p.name.substring(0, 14) + '…' : p.name),
    datasets: [{ label: 'Units Sold', data: data.topSelling.map(p => p.unitsSold), backgroundColor: PIE_PALETTE, borderWidth: 2, borderColor: '#fff', borderRadius: 6 }]
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Product Report" desc="Top and least performing products" onExport={onExport} exporting={exporting} />
      <ChartCard title={`Top ${data.topSelling.length} Products — Units Sold`}>
        <div style={{ height: 250 }}><Bar data={barData} options={{ ...CHART_DEFAULTS, indexAxis: 'y', plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } } }} /></div>
      </ChartCard>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[{ title: '🏆 Top Selling', items: data.topSelling, color: 'emerald' }, { title: '⚠️ Least Selling', items: data.leastSelling, color: 'rose' }].map(({ title, items, color }) => (
          <div key={title} className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50"><h3 className="text-sm font-bold text-slate-800">{title}</h3></div>
            <table className="w-full text-left text-sm">
              <thead><tr>{['#', 'Product', 'Units', 'Revenue'].map(h => <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-2.5 text-xs font-bold text-slate-400">{i + 1}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-700 max-w-[140px] truncate">{p.name}</td>
                    <td className="px-4 py-2.5 text-xs font-bold text-slate-800">{p.unitsSold}</td>
                    <td className={`px-4 py-2.5 text-xs font-bold text-${color}-700`}>{fmt(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Inventory Tab ────────────────────────────────────────────────────────────

const InventoryTab = ({ data, loading }) => {
  if (loading) return <LoadingBlock />;
  if (!data) return <EmptyBlock />;

  const doughData = {
    labels: ['In Stock', 'Low Stock', 'Out of Stock'],
    datasets: [{ data: [data.inStock, data.lowStock, data.outOfStock], backgroundColor: ['rgba(16,185,129,0.85)', 'rgba(245,158,11,0.85)', 'rgba(244,63,94,0.85)'], borderWidth: 2, borderColor: '#fff' }]
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Inventory Report" desc="Current stock levels across all products" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Package} label="Total Items" value={fmtNum(data.totalItems)} color="blue" />
        <KPICard icon={Activity} label="In Stock" value={fmtNum(data.inStock)} color="emerald" />
        <KPICard icon={AlertTriangle} label="Low Stock" value={fmtNum(data.lowStock)} color="amber" />
        <KPICard icon={AlertTriangle} label="Out of Stock" value={fmtNum(data.outOfStock)} color="rose" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Stock Distribution">
          <div style={{ height: 220 }}>
            <Doughnut data={doughData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#64748b', font: { size: 11 } } }, tooltip: { backgroundColor: '#1e293b', padding: 10, cornerRadius: 8 } } }} />
          </div>
        </ChartCard>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Recently Restocked</h3>
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[200px] pr-1">
            {data.recentRestock?.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">No recent restocks</p>}
            {data.recentRestock?.map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <Package className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{item.productId?.name || '—'}</p>
                  <p className="text-[10px] text-slate-400">{item.branchId?.name} · Qty: {item.quantity}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.quantity === 0 ? 'bg-rose-50 text-rose-600' : item.quantity <= item.threshold ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-700'}`}>
                  {item.quantity === 0 ? 'OUT' : item.quantity <= item.threshold ? 'LOW' : 'OK'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <KPICard icon={TrendingUp} label="Total Inventory Value" value={fmt(data.totalInventoryValue)} color="violet" />
    </div>
  );
};

// ─── Cashiers Tab ─────────────────────────────────────────────────────────────

const CashiersTab = ({ data, loading, onExport, exporting }) => {
  if (loading) return <LoadingBlock />;
  if (!data || !data.cashiers?.length) return <EmptyBlock msg="No cashier activity for this period." />;

  const barData = {
    labels: data.cashiers.map(c => c.name || 'Unknown'),
    datasets: [
      { label: 'Revenue', data: data.cashiers.map(c => c.revenue), backgroundColor: CHART_COLORS.blue.bg, borderColor: CHART_COLORS.blue.border, borderWidth: 2, borderRadius: 6 },
      { label: 'Orders', data: data.cashiers.map(c => c.orders), backgroundColor: CHART_COLORS.emerald.bg, borderColor: CHART_COLORS.emerald.border, borderWidth: 2, borderRadius: 6, yAxisID: 'y1' }
    ]
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Cashier Performance" desc="Individual cashier metrics" onExport={onExport} exporting={exporting} />
      <ChartCard title="Revenue & Orders by Cashier">
        <div style={{ height: 250 }}>
          <Bar data={barData} options={{ ...CHART_DEFAULTS, plugins: { ...CHART_DEFAULTS.plugins, legend: { display: true, labels: { color: '#64748b', font: { size: 11 } } } }, scales: { ...CHART_DEFAULTS.scales, y1: { position: 'right', grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } } } }} />
        </div>
      </ChartCard>
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200/60">
            <tr>{['Rank', 'Cashier', 'Orders', 'Revenue', 'Discounts', 'Avg Order'].map(h => <th key={h} className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.cashiers.map((c, i) => (
              <tr key={i} className={`hover:bg-slate-50/60 transition-colors ${i === 0 ? 'bg-amber-50/40' : ''}`}>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-extrabold ${i === 0 ? 'text-amber-600' : 'text-slate-400'}`}>#{i + 1}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold">
                      {(c.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-slate-800">{c.name || 'Unknown'}</span>
                    {i === 0 && <Star className="h-3.5 w-3.5 text-amber-500" />}
                  </div>
                </td>
                <td className="px-4 py-3 font-bold text-slate-800">{c.orders}</td>
                <td className="px-4 py-3 font-bold text-emerald-700">{fmt(c.revenue)}</td>
                <td className="px-4 py-3 text-amber-600 font-semibold">{fmt(c.discounts)}</td>
                <td className="px-4 py-3 text-blue-700 font-bold">{fmt(c.avgOrderValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Branches Tab ─────────────────────────────────────────────────────────────

const BranchesTab = ({ data, loading }) => {
  if (loading) return <LoadingBlock />;
  if (!data || !data.branches?.length) return <EmptyBlock msg="No branch activity for this period." />;

  const barData = {
    labels: data.branches.map(b => b.branchName || 'Branch'),
    datasets: [{ label: 'Revenue', data: data.branches.map(b => b.totalRevenue), backgroundColor: PIE_PALETTE, borderWidth: 2, borderColor: '#fff', borderRadius: 6 }]
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Branch Report" desc="Cross-branch performance comparison" />
      <ChartCard title="Revenue by Branch">
        <div style={{ height: 250 }}><Bar data={barData} options={CHART_DEFAULTS} /></div>
      </ChartCard>
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200/60">
            <tr>{['Branch', 'Total Orders', 'Revenue', 'Avg Order', 'Customers'].map(h => <th key={h} className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.branches.map((b, i) => (
              <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><Building2 className="h-3.5 w-3.5" /></div>
                    <span className="text-sm font-semibold text-slate-800">{b.branchName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-bold text-slate-800">{b.totalOrders}</td>
                <td className="px-4 py-3 font-bold text-emerald-700">{fmt(b.totalRevenue)}</td>
                <td className="px-4 py-3 text-blue-700 font-bold">{fmt(b.avgOrderValue)}</td>
                <td className="px-4 py-3 text-slate-600 font-semibold">{b.totalCustomers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Customer Analytics Tab ───────────────────────────────────────────────────

const CustomerAnalyticsTab = ({ data, loading }) => {
  if (loading) return <LoadingBlock />;
  if (!data) return <EmptyBlock />;

  const doughData = {
    labels: ['New Customers', 'Returning Customers'],
    datasets: [{ data: [data.newCustomers, data.returningCustomers], backgroundColor: ['rgba(59,130,246,0.85)', 'rgba(16,185,129,0.85)'], borderWidth: 2, borderColor: '#fff' }]
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Customer Analytics" desc="Acquisition, retention, and spending behavior" />
      <div className="grid grid-cols-2 gap-4">
        <KPICard icon={UserCheck} label="New Customers" value={fmtNum(data.newCustomers)} color="blue" />
        <KPICard icon={Users} label="Returning Customers" value={fmtNum(data.returningCustomers)} color="emerald" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Customer Distribution">
          <div style={{ height: 200 }}>
            <Doughnut data={doughData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#64748b', font: { size: 11 } } }, tooltip: { backgroundColor: '#1e293b' } } }} />
          </div>
        </ChartCard>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">🏆 Top Spenders</h3>
          <div className="flex flex-col gap-2">
            {data.topSpenders?.slice(0, 5).map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] font-extrabold text-slate-300 w-4">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{c.name}</p>
                  <p className="text-[10px] text-slate-400">{c.totalOrders} orders</p>
                </div>
                <span className="text-xs font-bold text-emerald-700">{fmt(c.totalSpent)}</span>
              </div>
            ))}
            {!data.topSpenders?.length && <p className="text-xs text-slate-400 py-4 text-center">No data yet</p>}
          </div>
        </div>
      </div>
      {data.mostFrequent?.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100"><h3 className="text-sm font-bold text-slate-800">Most Frequent Customers</h3></div>
          <table className="w-full text-sm">
            <thead><tr>{['Customer', 'Visits', 'Total Spent'].map(h => <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase text-left">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.mostFrequent.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-2.5 font-semibold text-slate-800 text-xs">{c.name}</td>
                  <td className="px-4 py-2.5 font-bold text-blue-700 text-xs">{c.visits}</td>
                  <td className="px-4 py-2.5 font-bold text-emerald-700 text-xs">{fmt(c.totalSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Main Reports Page ────────────────────────────────────────────────────────

export const Reports = ({ user, showToast }) => {
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const tabMap = {
    overview: '/reports/dashboard',
    sales: '/reports/sales',
    payment: '/reports/payment-method',
    products: '/reports/top-products',
    inventory: '/reports/inventory',
    low_stock: '/reports/low-stock',
    cashiers: '/reports/cashiers',
    branches: '/reports/branches',
    customers: '/reports/customers'
  };

  const fetchBranches = async () => {
    try { const r = await api.get('/branches'); setBranches(r.data.data?.branches || []); } catch {}
  };

  useEffect(() => { if (isSuperAdmin) fetchBranches(); }, []);

  const buildParams = useCallback(() => {
    const p = { period };
    if (period === 'custom') { p.startDate = startDate; p.endDate = endDate; }
    if (isSuperAdmin && branchId) p.branchId = branchId;
    return new URLSearchParams(p).toString();
  }, [period, startDate, endDate, branchId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setData(null);
    try {
      const url = `${tabMap[activeTab]}?${buildParams()}`;
      const res = await api.get(url);
      setData(res.data.data || res.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load report.', 'error');
    } finally { setLoading(false); }
  }, [activeTab, buildParams]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const url = `${tabMap[activeTab]}?${buildParams()}&export=csv`;
      const res = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${activeTab}-report.csv`;
      link.click();
      showToast('CSV exported successfully.', 'success');
    } catch { showToast('Export failed.', 'error'); }
    finally { setExporting(false); }
  };

  const tabsToShow = TABS.filter(t => {
    if (t.id === 'branches' && !isSuperAdmin) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Reports & Analytics</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Real-time business intelligence and performance insights.</p>
      </header>

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-slate-200">
        {tabsToShow.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl whitespace-nowrap transition-all border-b-2 -mb-px ${
              activeTab === id ? 'text-blue-600 border-blue-600 bg-blue-50/50' : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
            }`}>
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <FiltersBar
        period={period} setPeriod={setPeriod}
        startDate={startDate} setStartDate={setStartDate}
        endDate={endDate} setEndDate={setEndDate}
        branches={branches} branchId={branchId} setBranchId={setBranchId}
        isSuperAdmin={isSuperAdmin}
        onRefresh={fetchData} loading={loading}
      />

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {activeTab === 'overview' && <OverviewTab data={data} loading={loading} />}
          {activeTab === 'sales' && <SalesTab data={data} loading={loading} onExport={handleExport} exporting={exporting} />}
          {activeTab === 'payment' && <PaymentTab data={data} loading={loading} onExport={handleExport} exporting={exporting} />}
          {activeTab === 'products' && <ProductsTab data={data} loading={loading} onExport={handleExport} exporting={exporting} />}
          {activeTab === 'inventory' && <InventoryTab data={data} loading={loading} />}
          {activeTab === 'low_stock' && <LowStockTab data={data} loading={loading} onExport={handleExport} exporting={exporting} />}
          {activeTab === 'cashiers' && <CashiersTab data={data} loading={loading} onExport={handleExport} exporting={exporting} />}
          {activeTab === 'branches' && <BranchesTab data={data} loading={loading} />}
          {activeTab === 'customers' && <CustomerAnalyticsTab data={data} loading={loading} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Reports;
