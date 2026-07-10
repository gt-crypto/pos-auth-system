import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Check, 
  X, 
  Edit3, 
  Power,
  TrendingUp,
  Activity,
  AlertCircle,
  Clock,
  ArrowUpDown,
  BookOpen
} from 'lucide-react';
import api from '../../services/api.js';
import Button from '../../components/Button.jsx';
import Input from '../../components/Input.jsx';

export const Categories = ({ user, showToast }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('displayOrder');
  
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
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Form values
  const [formValues, setFormValues] = useState({
    name: '',
    description: '',
    displayOrder: 0,
    isActive: true
  });

  const [submitting, setSubmitting] = useState(false);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      fetchCategories();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch when page, limit, filter, or sorting changes
  useEffect(() => {
    fetchCategories();
  }, [page, limit, statusFilter, sortBy]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories', {
        params: {
          search: searchTerm,
          status: statusFilter,
          sortBy,
          page,
          limit
        }
      });
      const { categories: fetchedList, pagination } = res.data.data;
      setCategories(fetchedList || []);
      setPaginationInfo(pagination);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const openCreateModal = () => {
    setFormValues({
      name: '',
      description: '',
      displayOrder: 0,
      isActive: true
    });
    setShowCreateModal(true);
  };

  const openEditModal = (category) => {
    setSelectedCategory(category);
    setFormValues({
      name: category.name,
      description: category.description,
      displayOrder: category.displayOrder,
      isActive: category.isActive
    });
    setShowEditModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/categories', formValues);
      showToast('Category created successfully', 'success');
      setShowCreateModal(false);
      fetchCategories();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/categories/${selectedCategory._id}`, formValues);
      showToast('Category updated successfully', 'success');
      setShowEditModal(false);
      fetchCategories();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (category) => {
    const newStatus = !category.isActive;
    try {
      await api.patch(`/categories/${category._id}/status`, { isActive: newStatus });
      showToast(newStatus ? 'Category restored successfully' : 'Category archived successfully', 'success');
      fetchCategories();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">Product Categories</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Organize and group items for billing displays.</p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="h-4.5 w-4.5" /> Create Category
        </Button>
      </header>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by category name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold text-slate-700"
          />
        </div>
        
        <div className="flex gap-4 w-full md:w-auto overflow-x-auto select-none">
          <div className="flex gap-2">
            {['ALL', 'ACTIVE', 'INACTIVE'].map((status) => (
              <button
                key={status}
                onClick={() => { setStatusFilter(status); setPage(1); }}
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

          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200/80 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="displayOrder">Sort: Display Order</option>
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="alphabetical">Sort: Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Categories Table View */}
      {loading ? (
        <div className="flex flex-col gap-3 py-12">
          {/* Skeleton Loaders */}
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 w-full rounded-2xl bg-slate-200/40 animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : categories.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto w-full glass-card rounded-2xl border border-slate-200/80 shadow-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 pl-6">Display Order</th>
                  <th className="p-4">Category Name</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Active Products</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700 bg-white/40">
                {categories.map((cat) => (
                  <tr key={cat._id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-4 pl-6 font-mono text-slate-400">
                      #{cat.displayOrder}
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-bold text-slate-900">{cat.name}</span>
                    </td>
                    <td className="p-4 text-slate-500 max-w-[200px] truncate" title={cat.description}>
                      {cat.description || <span className="text-slate-300 italic">None</span>}
                    </td>
                    <td className="p-4 font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                        {cat.productsCount} items
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                        cat.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {cat.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                          title="Edit Category"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleToggleStatus(cat)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            cat.isActive
                              ? 'border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100'
                              : 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                          title={cat.isActive ? 'Archive Category' : 'Restore Category'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
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
          <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-500">No categories found matching filters.</p>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowCreateModal(false)} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
          <div className="glass-card rounded-3xl w-full max-w-md p-8 relative z-10 border border-slate-200/80 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 font-display">Create Category</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
              <Input label="Category Name" name="name" placeholder="e.g. Burgers, Beverages" required value={formValues.name} onChange={handleInputChange} />
              <Input label="Description" name="description" placeholder="Brief details about category" value={formValues.description} onChange={handleInputChange} />
              <Input label="Display Order" name="displayOrder" type="number" placeholder="0" value={formValues.displayOrder} onChange={handleInputChange} />
              
              <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
                <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" loading={submitting}>Save Category</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowEditModal(false)} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
          <div className="glass-card rounded-3xl w-full max-w-md p-8 relative z-10 border border-slate-200/80 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 font-display">Edit Category</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <Input label="Category Name" name="name" required value={formValues.name} onChange={handleInputChange} />
              <Input label="Description" name="description" value={formValues.description} onChange={handleInputChange} />
              <Input label="Display Order" name="displayOrder" type="number" value={formValues.displayOrder} onChange={handleInputChange} />
              
              <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
                <Button variant="secondary" type="button" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button type="submit" loading={submitting}>Update Category</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
