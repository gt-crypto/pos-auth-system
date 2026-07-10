import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, 
  User, 
  Activity, 
  ShieldCheck, 
  TrendingUp, 
  ShoppingCart, 
  AlertTriangle, 
  Monitor, 
  Clock, 
  X,
  Users,
  Menu,
  Building2,
  Settings as SettingsIcon,
  Folder,
  ShoppingBag,
  Layers,
  Truck,
  UserCircle,
  BarChart2,
  Receipt,
  ChefHat
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import Button from '../components/Button.jsx';
import api from '../services/api.js';
import { Branches } from './Branches/index.jsx';
import { Users as UsersView } from './Users/index.jsx';
import { Categories } from './Categories/index.jsx';
import { Products } from './Products/index.jsx';
import { Inventory } from './Inventory/index.jsx';
import { Suppliers } from './Suppliers/index.jsx';
import { Customers } from './Customers/index.jsx';
import { Reports } from './Reports/index.jsx';
import { Billing } from './Billing/index.jsx';
import { Ingredients } from './Ingredients/index.jsx';
import { AuditLogs } from './AuditLogs/index.jsx';

import { useSearchParams } from 'react-router-dom';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  // Component-level session validation guard (Prevent invalid role rendering or staleness)
  if (!user || !['SUPER_ADMIN', 'ADMIN', 'CASHIER'].includes(user.role)) {
    logout();
    return null;
  }
  
  // Navigation Tabs state with Search Params support (to make browser back/forward arrows work!)
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'dashboard';

  // Protect tab access programmatically
  const getSanitizedTab = (tab) => {
    const cashierTabs = ['dashboard', 'branches', 'profile', 'settings', 'billing'];
    if (user?.hasIngredientsAccess) {
      cashierTabs.push('ingredients');
    }
    const adminTabs = ['dashboard', 'branches', 'products', 'categories', 'users', 'inventory', 'suppliers', 'customers', 'reports', 'settings', 'billing', 'ingredients'];
    if (user?.role === 'SUPER_ADMIN') {
      adminTabs.push('audit');
    }
    
    if (user?.role === 'CASHIER') {
      return cashierTabs.includes(tab) ? tab : 'dashboard';
    }
    return adminTabs.includes(tab) ? tab : 'dashboard';
  };

  const activeTab = getSanitizedTab(rawTab);

  const setActiveTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getRoleColor = (role) => {
    if (role === 'SUPER_ADMIN') return 'border-rose-200 bg-rose-50 text-rose-700';
    if (role === 'ADMIN') return 'border-amber-200 bg-amber-50 text-amber-800';
    return 'border-sky-200 bg-sky-50 text-sky-700';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const lastFailedString = user?.lastFailedLogin ? formatDate(user.lastFailedLogin) : 'No failed attempts';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex relative overflow-hidden">

      {/* Floating Menu Toggle Button (Three Lines) */}
      <button 
        onClick={() => setSidebarOpen(true)}
        className="fixed top-6 left-6 z-20 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-md hover:bg-slate-50 text-slate-600 focus:outline-none transition-all duration-200"
        aria-label="Open Navigation Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Translucent Overlay Backdrop when sidebar is active */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-20 transition-all duration-300"
        />
      )}

      {/* COLLAPSIBLE SIDEBAR MENU (Wide scrollable sidebar for Stats & Logs) */}
      <aside className={`fixed top-0 bottom-0 left-0 w-80 sm:w-96 bg-white border-r border-slate-200/80 p-6 flex flex-col justify-between z-30 transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col gap-6 overflow-y-auto flex-1 pr-1 scrollbar-thin">
          {/* Logo & Close Control */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center shadow-sm">
                <TrendingUp className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 font-display">Apexify</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close Navigation"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="flex flex-col gap-1.5">
            {/* Dashboard (All roles) */}
            <button 
              onClick={() => {
                setActiveTab('dashboard');
                setSidebarOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-blue-50 text-blue-600 border border-blue-100/50' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Activity className="h-4 w-4" /> Dashboard
            </button>

            {/* POS Billing (All roles) */}
            <button 
              onClick={() => {
                setActiveTab('billing');
                setSidebarOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'billing' 
                  ? 'bg-blue-50 text-blue-600 border border-blue-100/50' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Receipt className="h-4 w-4" /> POS Billing
            </button>

            {/* Branches / Branch (All roles) */}
            <button 
              onClick={() => {
                setActiveTab('branches');
                setSidebarOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'branches' 
                  ? 'bg-blue-50 text-blue-600 border border-blue-100/50' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Building2 className="h-4 w-4" /> {user?.role === 'SUPER_ADMIN' ? 'Branches' : 'Branch'}
            </button>

            {/* Products (Super Admin & Admin only) */}
            {user?.role !== 'CASHIER' && (
              <button 
                onClick={() => {
                  setActiveTab('products');
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'products' 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100/50' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <ShoppingBag className="h-4 w-4" /> Products
              </button>
            )}

            {/* Categories (Super Admin & Admin only) */}
            {user?.role !== 'CASHIER' && (
              <button 
                onClick={() => {
                  setActiveTab('categories');
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'categories' 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100/50' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Folder className="h-4 w-4" /> Categories
              </button>
            )}

            {/* Users / Cashiers (Super Admin & Admin only) */}
            {user?.role !== 'CASHIER' && (
              <button 
                onClick={() => {
                  setActiveTab('users');
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'users' 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100/50' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Users className="h-4 w-4" /> {user?.role === 'SUPER_ADMIN' ? 'Users' : 'Cashiers'}
              </button>
            )}

            {/* Inventory (Super Admin & Admin only) */}
            {user?.role !== 'CASHIER' && (
              <button 
                onClick={() => {
                  setActiveTab('inventory');
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'inventory' 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100/50' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Layers className="h-4 w-4" /> Inventory
              </button>
            )}

            {/* Suppliers (Super Admin & Admin only) */}
            {user?.role !== 'CASHIER' && (
              <button 
                onClick={() => {
                  setActiveTab('suppliers');
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'suppliers' 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100/50' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Truck className="h-4 w-4" /> Suppliers
              </button>
            )}

            {/* Kitchen Ingredients (Admin, Super Admin, or Cashier override) */}
            {(user?.role !== 'CASHIER' || user?.hasIngredientsAccess) && (
              <button 
                onClick={() => {
                  setActiveTab('ingredients');
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'ingredients' 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100/50' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <ChefHat className="h-4 w-4" /> Ingredients
              </button>
            )}

            {/* Customers (all non-cashier roles) */}
            {user?.role !== 'CASHIER' && (
              <button 
                onClick={() => {
                  setActiveTab('customers');
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'customers' 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100/50' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <UserCircle className="h-4 w-4" /> Customers
              </button>
            )}

            {/* Reports (Admin & SUPER_ADMIN only) */}
            {user?.role !== 'CASHIER' && (
              <button 
                onClick={() => {
                  setActiveTab('reports');
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'reports' 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100/50' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <BarChart2 className="h-4 w-4" /> Reports
              </button>
            )}

            {/* Audit Logs (Super Admin only) */}
            {user?.role === 'SUPER_ADMIN' && (
              <button 
                onClick={() => {
                  setActiveTab('audit');
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'audit' 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100/50' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="h-4 w-4" /> Audit Logs
              </button>
            )}

            {/* Profile (Cashier only) */}
            {user?.role === 'CASHIER' && (
              <button 
                onClick={() => {
                  setActiveTab('profile');
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'profile' 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100/50' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <User className="h-4 w-4" /> Profile
              </button>
            )}

            {/* Settings (All roles) */}
            <button 
              onClick={() => {
                setActiveTab('settings');
                setSidebarOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'settings' 
                  ? 'bg-blue-50 text-blue-600 border border-blue-100/50' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <SettingsIcon className="h-4 w-4" /> Settings
            </button>

            <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 select-none">
              Role
            </div>
            <div className="px-4 py-1 text-xs text-slate-800 font-bold">
              {user?.role}
            </div>
          </nav>

          {/* Quick Stats Panel inside Sidebar */}
          <div className="flex flex-col gap-4 border-t border-slate-100 pt-6 mt-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">POS Stats</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
                <p className="text-[9px] text-slate-400 uppercase font-bold">Sales</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">$4,249.50</p>
              </div>
              <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
                <p className="text-[9px] text-slate-400 uppercase font-bold">Orders</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">18 Act.</p>
              </div>
              <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
                <p className="text-[9px] text-slate-400 uppercase font-bold">Low Stock</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">3 Alerts</p>
              </div>
              <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
                <p className="text-[9px] text-slate-400 uppercase font-bold">Terminal</p>
                <p className="text-xs font-bold text-emerald-600 mt-0.5">Online</p>
              </div>
            </div>
          </div>

          {/* Audit Logs & Sessions inside Sidebar - Only visible to SUPER_ADMIN */}
          {user?.role === 'SUPER_ADMIN' && (
            <div className="flex flex-col gap-4 border-t border-slate-100 pt-6">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security Audit</h4>
              <div className="flex flex-col gap-2 text-[11px] font-semibold text-slate-700">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col gap-0.5">
                  <span className="text-[9px] text-slate-400 uppercase">Last Login</span>
                  <span>{formatDate(user?.lastLogin)}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col gap-0.5">
                  <span className="text-[9px] text-slate-400 uppercase">Failed Logins</span>
                  <span>{lastFailedString}</span>
                </div>
              </div>

              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Recent Sessions</h4>
              <div className="overflow-x-auto w-full border border-slate-200/60 rounded-xl bg-slate-50/50">
                <table className="w-full text-left text-[10px] font-semibold text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase pb-1.5 bg-slate-100/50">
                      <th className="p-2">IP Address</th>
                      <th className="p-2">Login Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user?.loginHistory && user.loginHistory.length > 0 ? (
                      [...user.loginHistory].reverse().slice(0, 3).map((history, idx) => (
                        <tr key={idx} className="border-b border-slate-100/50">
                          <td className="p-2 font-mono">{history.ipAddress}</td>
                          <td className="p-2 text-slate-500">{new Date(history.loginTime).toLocaleDateString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="p-2 text-center text-slate-400">No session history</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* User Card Bottom */}
        <div className="flex flex-col gap-4 border-t border-slate-100 pt-6 mt-4 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 text-slate-600">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{user?.username}</p>
            </div>
          </div>
          
          <Button 
            variant="secondary" 
            onClick={logout} 
            className="w-full !py-2.5 border-rose-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 text-rose-600 font-bold"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* MAIN CONTAINER: Offset left padding to clear the floating hamburger button */}
      <main className="flex-1 p-6 lg:p-10 pl-20 lg:pl-24 z-10 overflow-y-auto max-h-screen">
        
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            // ==========================================
            // MODULE CARDS VIEW ON MAIN WINDOW (5 quick-access cards)
            // ==========================================
            <motion.div
              key="dashboard-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-8 animate-fadeIn"
            >
              {/* Header */}
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
                    Welcome, {user?.username}!
                  </h1>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Select a module below or open the navigation panel to get started.
                  </p>
                </div>
                
                <div className={`px-4 py-2 border rounded-full text-xs font-bold w-fit ${getRoleColor(user?.role)}`}>
                  {user?.role} ACCOUNT
                </div>
              </header>

              {/* Main Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl z-10 relative">
                
                {/* POS Billing Card */}
                <div 
                  onClick={() => setActiveTab('billing')}
                  className="glass-card p-6 rounded-3xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex gap-5 items-start group"
                >
                  <div className="h-14 w-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0 group-hover:scale-110 transition-transform">
                    <Receipt className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 font-display">POS Billing</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                      Launch point-of-sale checkout, split payments, and hold or split orders.
                    </p>
                  </div>
                </div>

                {/* 1. Branches Card */}
                <div 
                  onClick={() => setActiveTab('branches')}
                  className="glass-card p-6 rounded-3xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex gap-5 items-start group"
                >
                  <div className="h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 transition-transform">
                    <Building2 className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 font-display">Branches</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                      {user?.role === 'SUPER_ADMIN' 
                        ? 'Create, edit, and deactivate physical POS retail outlets.' 
                        : 'View information about your assigned active location.'}
                    </p>
                  </div>
                </div>

                {/* 2. Products Card */}
                {user?.role !== 'CASHIER' && (
                  <div 
                    onClick={() => setActiveTab('products')}
                    className="glass-card p-6 rounded-3xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex gap-5 items-start group"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-110 transition-transform">
                      <ShoppingBag className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 font-display">Products</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                        Configure menu items, prices, variants, and combo meals.
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. Categories Card */}
                {user?.role !== 'CASHIER' && (
                  <div 
                    onClick={() => setActiveTab('categories')}
                    className="glass-card p-6 rounded-3xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex gap-5 items-start group"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-110 transition-transform">
                      <Folder className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 font-display">Categories</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                        Organize catalog categories for structured POS display ordering.
                      </p>
                    </div>
                  </div>
                )}

                {/* 4. Users Card */}
                {user?.role !== 'CASHIER' && (
                  <div 
                    onClick={() => setActiveTab('users')}
                    className="glass-card p-6 rounded-3xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex gap-5 items-start group"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-110 transition-transform">
                      <Users className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 font-display">Users</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                        {user?.role === 'SUPER_ADMIN' 
                          ? 'Manage employee logins, assign roles, and set statuses.' 
                          : 'Create and manage cashier credentials for your branch.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* 5. Inventory Card */}
                {user?.role !== 'CASHIER' && (
                  <div 
                    onClick={() => setActiveTab('inventory')}
                    className="glass-card p-6 rounded-3xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex gap-5 items-start group"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0 group-hover:scale-110 transition-transform">
                      <Layers className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 font-display">Inventory</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                        Real-time per-branch stock tracking, restocking, adjustments, and branch transfers.
                      </p>
                    </div>
                  </div>
                )}

                {/* 6. Suppliers Card */}
                {user?.role !== 'CASHIER' && (
                  <div 
                    onClick={() => setActiveTab('suppliers')}
                    className="glass-card p-6 rounded-3xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex gap-5 items-start group"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0 group-hover:scale-110 transition-transform">
                      <Truck className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 font-display">Suppliers</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                        Manage external vendor profiles, purchase histories, and supplied product catalogs.
                      </p>
                    </div>
                  </div>
                )}

                {/* Kitchen Ingredients Card */}
                {(user?.role !== 'CASHIER' || user?.hasIngredientsAccess) && (
                  <div 
                    onClick={() => setActiveTab('ingredients')}
                    className="glass-card p-6 rounded-3xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex gap-5 items-start group"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0 group-hover:scale-110 transition-transform">
                      <ChefHat className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 font-display">Ingredients</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                        Manage raw ingredients, restock records, adjustments, and branch-to-branch transfers.
                      </p>
                    </div>
                  </div>
                )}

                {/* 7. Customers Card */}
                {user?.role !== 'CASHIER' && (
                  <div 
                    onClick={() => setActiveTab('customers')}
                    className="glass-card p-6 rounded-3xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex gap-5 items-start group"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0 group-hover:scale-110 transition-transform">
                      <UserCircle className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 font-display">Customers</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                        Manage customer profiles, purchase history, and POS billing lookup.
                      </p>
                    </div>
                  </div>
                )}

                {/* 8. Reports Card */}
                {user?.role !== 'CASHIER' && (
                  <div 
                    onClick={() => setActiveTab('reports')}
                    className="glass-card p-6 rounded-3xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex gap-5 items-start group"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0 group-hover:scale-110 transition-transform">
                      <BarChart2 className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 font-display">Reports</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                        Sales, payment, product, inventory, cashier, and branch analytics with charts.
                      </p>
                    </div>
                  </div>
                )}

                {/* 5. Profile Card (Visible to Cashier only as substitute card) */}
                {user?.role === 'CASHIER' && (
                  <div 
                    onClick={() => setActiveTab('profile')}
                    className="glass-card p-6 rounded-3xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex gap-5 items-start group"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0 group-hover:scale-110 transition-transform">
                      <User className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 font-display">My Profile</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                        Check your username, email, phone number, and status.
                      </p>
                    </div>
                  </div>
                )}

                {/* 6. Settings Card */}
                <div 
                  onClick={() => setActiveTab('settings')}
                  className="glass-card p-6 rounded-3xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex gap-5 items-start group"
                >
                  <div className="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-250 flex items-center justify-center text-slate-600 shrink-0 group-hover:scale-110 transition-transform">
                    <SettingsIcon className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 font-display">Settings</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                      Toggle dark mode preferences and trigger security password reset emails.
                    </p>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {activeTab === 'branches' && (
            <motion.div
              key="branches-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <Branches user={user} showToast={showToast} />
            </motion.div>
          )}

          {activeTab === 'users' && user?.role !== 'CASHIER' && (
            <motion.div
              key="users-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <UsersView user={user} showToast={showToast} />
            </motion.div>
          )}

          {activeTab === 'categories' && user?.role !== 'CASHIER' && (
            <motion.div
              key="categories-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <Categories user={user} showToast={showToast} />
            </motion.div>
          )}

          {activeTab === 'products' && user?.role !== 'CASHIER' && (
            <motion.div
              key="products-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <Products user={user} showToast={showToast} />
            </motion.div>
          )}

          {activeTab === 'inventory' && user?.role !== 'CASHIER' && (
            <motion.div
              key="inventory-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <Inventory user={user} showToast={showToast} />
            </motion.div>
          )}

          {activeTab === 'suppliers' && user?.role !== 'CASHIER' && (
            <motion.div
              key="suppliers-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <Suppliers user={user} showToast={showToast} />
            </motion.div>
          )}

          {activeTab === 'customers' && user?.role !== 'CASHIER' && (
            <motion.div
              key="customers-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <Customers user={user} showToast={showToast} />
            </motion.div>
          )}

          {activeTab === 'reports' && user?.role !== 'CASHIER' && (
            <motion.div
              key="reports-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <Reports user={user} showToast={showToast} />
            </motion.div>
          )}

          {activeTab === 'billing' && (
            <motion.div
              key="billing-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <Billing user={user} showToast={showToast} />
            </motion.div>
          )}

          {activeTab === 'ingredients' && (user?.role !== 'CASHIER' || user?.hasIngredientsAccess) && (
            <motion.div
              key="ingredients-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <Ingredients user={user} showToast={showToast} />
            </motion.div>
          )}

          {activeTab === 'audit' && user?.role === 'SUPER_ADMIN' && (
            <motion.div
              key="audit-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <AuditLogs user={user} showToast={showToast} />
            </motion.div>
          )}

          {activeTab === 'profile' && user?.role === 'CASHIER' && (
            <motion.div
              key="profile-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-6"
            >
              <header>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">My Profile</h1>
                <p className="text-sm text-slate-500 font-medium mt-1">Information about your active user session.</p>
              </header>
              <div className="glass-card rounded-3xl p-8 border border-slate-200/80 shadow-xl max-w-xl bg-white/60 backdrop-blur-md flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <User className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{user?.name || user?.username}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase border-sky-200 bg-sky-50 text-sky-700">
                      {user?.role}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-semibold text-slate-700 border-t border-slate-100 pt-6">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Username</span>
                    <span>@{user?.username}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Email</span>
                    <span>{user?.email}</span>
                  </div>
                  {user?.phone && (
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Phone</span>
                      <span>{user?.phone}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Status</span>
                    <span className="capitalize">{user?.status?.toLowerCase()}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-6"
            >
              <header>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">System Settings</h1>
                <p className="text-sm text-slate-500 font-medium mt-1">Configure preferences and trigger recovery actions.</p>
              </header>
              <div className="glass-card rounded-3xl p-8 border border-slate-200/80 shadow-xl max-w-xl bg-white/60 backdrop-blur-md flex flex-col gap-6">
                
                {/* Disabled Dark Mode preference */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-bold text-slate-800">Preferences</h3>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-200/60 text-xs font-semibold text-slate-700">
                    <span>Dark Mode (Coming Soon)</span>
                    <div className="w-8 h-4 bg-slate-300 rounded-full cursor-not-allowed" />
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 mt-4 border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-bold text-slate-800">Security Credentials</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed mb-2">
                    To maintain strict POS database security, password modifications must be requested through our verification flow.
                  </p>
                  <Button 
                    variant="secondary" 
                    onClick={async () => {
                      try {
                        await api.post('/auth/forgot-password', { email: user?.email });
                        showToast('Password reset link sent to your email!', 'success');
                      } catch (err) {
                        showToast('Failed to trigger reset email.', 'error');
                      }
                    }}
                    className="w-fit text-xs font-bold border-slate-200 hover:bg-slate-50"
                  >
                    Request Password Reset Link
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
      </main>
    </div>
  );
};

export default Dashboard;
