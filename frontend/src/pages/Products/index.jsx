import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Check, 
  X, 
  Edit3, 
  Power,
  Activity,
  AlertCircle,
  TrendingUp,
  Image as ImageIcon,
  Folder,
  DollarSign,
  Layers,
  Sparkles,
  ShoppingBag,
  Trash2
} from 'lucide-react';
import api from '../../services/api.js';
import Button from '../../components/Button.jsx';
import Input from '../../components/Input.jsx';

export const Products = ({ user, showToast }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');
  const [vegFilter, setVegFilter] = useState('ALL');
  const [comboFilter, setComboFilter] = useState('ALL');
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

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form values
  const [formValues, setFormValues] = useState({
    categoryId: '',
    name: '',
    description: '',
    sku: '',
    barcode: '',
    price: '',
    taxPercentage: 0,
    imageUrl: '',
    isVeg: false,
    isAvailable: true,
    isCombo: false,
    variants: [],
    comboItems: []
  });

  const [submitting, setSubmitting] = useState(false);

  // Combo Search Autocomplete state
  const [comboSearchQuery, setComboSearchQuery] = useState('');
  const [comboSearchList, setComboSearchList] = useState([]);
  const [searchingCombo, setSearchingCombo] = useState(false);

  // Fetch active categories list for dropdown filter
  const fetchActiveCategories = async () => {
    try {
      const res = await api.get('/categories', { params: { status: 'ACTIVE', limit: 100 } });
      setCategories(res.data.data.categories || []);
    } catch (err) {
      showToast('Failed to fetch categories list', 'error');
    }
  };

  // Debounced catalog search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      fetchProducts();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Refetch when filters or pagination changes
  useEffect(() => {
    fetchProducts();
  }, [page, limit, selectedCategoryFilter, statusFilter, availabilityFilter, vegFilter, comboFilter, sortBy]);

  // Load categories on start
  useEffect(() => {
    fetchActiveCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchTerm,
        sortBy,
        page,
        limit
      };

      if (selectedCategoryFilter) params.categoryId = selectedCategoryFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (availabilityFilter !== 'ALL') params.isAvailable = availabilityFilter === 'AVAILABLE';
      if (vegFilter !== 'ALL') params.isVeg = vegFilter === 'VEG';
      if (comboFilter !== 'ALL') params.isCombo = comboFilter === 'COMBO';

      const res = await api.get('/products', { params });
      const { products: fetchedList, pagination } = res.data.data;
      setProducts(fetchedList || []);
      setPaginationInfo(pagination);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch products', 'error');
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
      categoryId: categories[0]?._id || '',
      name: '',
      description: '',
      sku: '',
      barcode: '',
      price: '',
      taxPercentage: 0,
      imageUrl: '',
      isVeg: false,
      isAvailable: true,
      isCombo: false,
      variants: [],
      comboItems: []
    });
    setShowCreateModal(true);
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setFormValues({
      categoryId: product.categoryId?._id || product.categoryId || '',
      name: product.name,
      description: product.description || '',
      sku: product.sku,
      barcode: product.barcode || '',
      price: product.price !== undefined ? product.price : '',
      taxPercentage: product.taxPercentage,
      imageUrl: product.imageUrl || '',
      isVeg: product.isVeg,
      isAvailable: product.isAvailable,
      isCombo: product.isCombo,
      variants: product.variants || [],
      comboItems: product.comboItems || []
    });
    setShowEditModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = formatPayload(formValues);
      await api.post('/products', payload);
      showToast('Product created successfully', 'success');
      setShowCreateModal(false);
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = formatPayload(formValues);
      await api.patch(`/products/${selectedProduct._id}`, payload);
      showToast('Product updated successfully', 'success');
      setShowEditModal(false);
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (product) => {
    const newStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.patch(`/products/${product._id}/status`, { status: newStatus });
      showToast(newStatus === 'ACTIVE' ? 'Product restored successfully' : 'Product archived successfully', 'success');
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update product status', 'error');
    }
  };

  const formatPayload = (values) => {
    const payload = { ...values };
    
    // Convert price string to float
    if (payload.price === '') {
      delete payload.price;
    } else {
      payload.price = parseFloat(payload.price);
    }
    
    // Convert tax to number
    payload.taxPercentage = parseFloat(payload.taxPercentage);

    // Map combo item structures to IDs
    if (payload.isCombo) {
      payload.comboItems = payload.comboItems.map(item => item._id || item);
    } else {
      payload.comboItems = [];
    }

    // Clean variants prices
    payload.variants = payload.variants.map(v => ({
      ...v,
      price: parseFloat(v.price)
    }));

    return payload;
  };

  // Combo Search logic
  useEffect(() => {
    if (!comboSearchQuery) {
      setComboSearchList([]);
      return;
    }

    const searchHandler = setTimeout(async () => {
      setSearchingCombo(true);
      try {
        const res = await api.get('/products', {
          params: {
            search: comboSearchQuery,
            status: 'ACTIVE',
            isCombo: false, // Combo items must be regular items
            limit: 10
          }
        });
        // Filter out the product itself if editing
        const list = (res.data.data.products || []).filter(p => p._id !== selectedProduct?._id);
        setComboSearchList(list);
      } catch (err) {
        console.error('Failed search autocomplete', err);
      } finally {
        setSearchingCombo(false);
      }
    }, 300);

    return () => clearTimeout(searchHandler);
  }, [comboSearchQuery]);

  // Variant helper additions
  const addVariant = () => {
    setFormValues(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        { name: '', price: '', isDefault: prev.variants.length === 0, displayOrder: prev.variants.length, isActive: true }
      ]
    }));
  };

  const removeVariant = (index) => {
    setFormValues(prev => {
      const list = [...prev.variants];
      list.splice(index, 1);
      // Auto-flag another as default if we deleted default variant
      if (list.length > 0 && !list.some(v => v.isDefault)) {
        list[0].isDefault = true;
      }
      return { ...prev, variants: list };
    });
  };

  const handleVariantChange = (index, field, value) => {
    setFormValues(prev => {
      const list = prev.variants.map((v, i) => {
        if (i !== index) {
          // If we are setting default, toggle others off
          if (field === 'isDefault' && value === true) {
            return { ...v, isDefault: false };
          }
          return v;
        }
        return { ...v, [field]: value };
      });
      return { ...prev, variants: list };
    });
  };

  // Combo helpers
  const addComboItem = (item) => {
    // Check if already in list
    if (formValues.comboItems.some(i => i._id === item._id || i === item._id)) {
      showToast('Item already added to combo meal list', 'error');
      return;
    }
    setFormValues(prev => ({
      ...prev,
      comboItems: [...prev.comboItems, item]
    }));
    setComboSearchQuery('');
    setComboSearchList([]);
  };

  const removeComboItem = (itemId) => {
    setFormValues(prev => ({
      ...prev,
      comboItems: prev.comboItems.filter(i => (i._id || i) !== itemId)
    }));
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">Products Catalog</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage POS menu items, variants, and price options.</p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="h-4.5 w-4.5" /> Create Product
        </Button>
      </header>

      {/* Interlocking Filter Section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product name, SKU, or Barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold text-slate-700"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto select-none">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => { setSelectedCategoryFilter(e.target.value); setPage(1); }}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>

            <select
              value={availabilityFilter}
              onChange={(e) => { setAvailabilityFilter(e.target.value); setPage(1); }}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Stock Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 focus:outline-none"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Small Badges for Status, Veg, and Combo Filters */}
        <div className="flex gap-4 items-center flex-wrap select-none text-xs font-bold">
          <div className="flex gap-1 items-center border border-slate-200 bg-slate-50/50 rounded-xl p-1.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider px-2">Status:</span>
            {['ALL', 'ACTIVE', 'INACTIVE'].map(s => (
              <button 
                key={s} 
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusFilter === s ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex gap-1 items-center border border-slate-200 bg-slate-50/50 rounded-xl p-1.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider px-2">Recipe:</span>
            {['ALL', 'VEG', 'NON_VEG'].map(r => (
              <button 
                key={r} 
                onClick={() => { setVegFilter(r); setPage(1); }}
                className={`px-3 py-1 rounded-lg transition-all ${
                  vegFilter === r ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {r === 'ALL' ? 'All' : r === 'VEG' ? 'Veg Only' : 'Non-Veg'}
              </button>
            ))}
          </div>

          <div className="flex gap-1 items-center border border-slate-200 bg-slate-50/50 rounded-xl p-1.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider px-2">Type:</span>
            {['ALL', 'REGULAR', 'COMBO'].map(t => (
              <button 
                key={t} 
                onClick={() => { setComboFilter(t); setPage(1); }}
                className={`px-3 py-1 rounded-lg transition-all ${
                  comboFilter === t ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t === 'ALL' ? 'All' : t === 'REGULAR' ? 'Regular' : 'Combos'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Datagrid */}
      {loading ? (
        <div className="flex flex-col gap-3 py-12">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 w-full rounded-2xl bg-slate-200/40 animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto w-full glass-card rounded-2xl border border-slate-200/80 shadow-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 pl-6">Catalog Image</th>
                  <th className="p-4">Name / SKU</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Available</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700 bg-white/40">
                {products.map((prod) => (
                  <tr key={prod._id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-4 pl-6">
                      {prod.imageUrl ? (
                        <img src={prod.imageUrl} alt={prod.name} className="h-10 w-10 rounded-xl object-cover border border-slate-200" />
                      ) : (
                        <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-900 block">{prod.name}</span>
                          {prod.isVeg ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 border border-emerald-600 block" title="Veg" />
                          ) : (
                            <span className="h-2.5 w-2.5 rounded-full bg-red-500 border border-red-600 block" title="Non-Veg" />
                          )}
                          {prod.isCombo && (
                            <span className="px-1.5 py-0.5 text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded uppercase">Combo</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono tracking-wider">SKU: {prod.sku}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1 text-slate-700">
                        <Folder className="h-3.5 w-3.5 text-slate-400" />
                        {prod.categoryId?.name || 'Category'}
                      </span>
                    </td>
                    <td className="p-4 font-mono">
                      {prod.variants && prod.variants.length > 0 ? (
                        <span className="text-slate-800" title="Has pricing variants">
                          From ${Math.min(...prod.variants.map(v => v.price)).toFixed(2)} ({prod.variants.length} options)
                        </span>
                      ) : (
                        <span>${prod.price !== undefined ? prod.price.toFixed(2) : '0.00'}</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        prod.isAvailable 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {prod.isAvailable ? 'AVAILABLE' : 'OUT_OF_STOCK'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                        prod.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {prod.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(prod)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                          title="Edit Product"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleToggleStatus(prod)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            prod.status === 'ACTIVE'
                              ? 'border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100'
                              : 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                          title={prod.status === 'ACTIVE' ? 'Archive Product' : 'Restore Product'}
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
          <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-500">No products found matching filters.</p>
        </div>
      )}

      {/* CREATE/EDIT MODAL CONTAINER */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
          <div className="glass-card rounded-3xl w-full max-w-3xl p-8 relative z-10 border border-slate-200/80 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 font-display">
                {showCreateModal ? 'Create Catalog Product' : 'Edit Product details'}
              </h2>
              <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={showCreateModal ? handleCreateSubmit : handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Product Name" name="name" placeholder="e.g. Cheese Burger, Latte" required value={formValues.name} onChange={handleInputChange} />
              <Input label="SKU (Stock Keeping Unit)" name="sku" placeholder="e.g. BRG-1001" required value={formValues.sku} onChange={handleInputChange} />
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Category</label>
                <select
                  name="categoryId"
                  value={formValues.categoryId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/40 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-bold text-slate-800"
                >
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <Input label="Barcode (Optional)" name="barcode" placeholder="e.g. 12345678" value={formValues.barcode} onChange={handleInputChange} />
              <Input label="Base Price (leave blank if using variants)" name="price" type="number" step="0.01" value={formValues.price} onChange={handleInputChange} />
              <Input label="Tax Percentage (GST %)" name="taxPercentage" type="number" step="0.1" value={formValues.taxPercentage} onChange={handleInputChange} />
              
              <div className="md:col-span-2">
                <Input label="Image URL" name="imageUrl" placeholder="e.g. http://images.com/burger.jpg" value={formValues.imageUrl} onChange={handleInputChange} />
              </div>

              <div className="md:col-span-2">
                <Input label="Description" name="description" placeholder="Brief details about product" value={formValues.description} onChange={handleInputChange} />
              </div>

              <div className="flex gap-6 p-2 bg-slate-50/40 rounded-xl border border-slate-200/50 md:col-span-2 select-none">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" name="isVeg" checked={formValues.isVeg} onChange={handleInputChange} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  Vegetarian Recipe
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" name="isAvailable" checked={formValues.isAvailable} onChange={handleInputChange} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  Mark as Available
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" name="isCombo" checked={formValues.isCombo} onChange={handleInputChange} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  Is Combo Meal
                </label>
              </div>

              {/* DYNAMIC VARIANT EDITOR */}
              <div className="md:col-span-2 border-t border-slate-100 pt-6 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-slate-500" /> Pricing Variants
                  </h3>
                  <Button type="button" variant="secondary" onClick={addVariant} className="!py-1.5 !px-3 text-[11px] font-bold">
                    + Add Variant Option
                  </Button>
                </div>
                
                {formValues.variants.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    {formValues.variants.map((variant, idx) => (
                      <div key={idx} className="flex gap-3 items-center bg-slate-50/50 border border-slate-200/50 p-3 rounded-2xl">
                        <input
                          type="text"
                          placeholder="e.g. Small, Medium, Large"
                          value={variant.name}
                          onChange={(e) => handleVariantChange(idx, 'name', e.target.value)}
                          className="flex-1 px-3 py-2 text-xs border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold"
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={variant.price}
                          onChange={(e) => handleVariantChange(idx, 'price', e.target.value)}
                          className="w-24 px-3 py-2 text-xs border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold font-mono"
                        />
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={variant.isDefault}
                            onChange={(e) => handleVariantChange(idx, 'isDefault', e.target.checked)}
                            className="h-4 w-4 border-slate-300 text-blue-600 rounded"
                          />
                          Default
                        </label>
                        <button
                          type="button"
                          onClick={() => removeVariant(idx)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100 bg-rose-50/20"
                          title="Remove Variant"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No variants configured. Product uses the base price configured above.</p>
                )}
              </div>

              {/* COMBO MEAL EDITOR */}
              {formValues.isCombo && (
                <div className="md:col-span-2 border-t border-slate-100 pt-6 mt-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-3">
                    <Sparkles className="h-4 w-4 text-amber-500" /> Combo Meal Items
                  </h3>
                  
                  {/* Search Autocomplete */}
                  <div className="relative mb-4">
                    <input
                      type="text"
                      placeholder="Search active products to add to combo..."
                      value={comboSearchQuery}
                      onChange={(e) => setComboSearchQuery(e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200/80 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-semibold text-slate-700 shadow-sm"
                    />
                    
                    {comboSearchList.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {comboSearchList.map(item => (
                          <div
                            key={item._id}
                            onClick={() => addComboItem(item)}
                            className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 cursor-pointer text-xs font-semibold"
                          >
                            <div>
                              <span className="text-slate-900 block">{item.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</span>
                            </div>
                            <span className="text-blue-600 font-mono">${item.price !== undefined ? item.price.toFixed(2) : ''}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Added list */}
                  {formValues.comboItems.length > 0 ? (
                    <div className="flex flex-wrap gap-2.5">
                      {formValues.comboItems.map((item, idx) => (
                        <div key={item._id || idx} className="flex items-center gap-2 bg-blue-50/50 border border-blue-100 p-2 rounded-xl text-xs font-bold text-blue-700">
                          <span>{item.name || 'Product'}</span>
                          <button
                            type="button"
                            onClick={() => removeComboItem(item._id || item)}
                            className="p-0.5 text-blue-400 hover:text-blue-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No items added to combo meal. Search and select products above.</p>
                  )}
                </div>
              )}

              <div className="md:col-span-2 flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
                <Button variant="secondary" type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}>Cancel</Button>
                <Button type="submit" loading={submitting}>
                  {showCreateModal ? 'Create Product' : 'Update Product'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
