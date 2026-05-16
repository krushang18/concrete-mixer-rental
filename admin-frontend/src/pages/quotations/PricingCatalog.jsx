import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2
} from 'lucide-react';

import { quotationMachineApi } from '../../services/quotationMachineApi';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import SearchResultsIndicator from '../../components/common/SearchResultsIndicator';

// Custom hook for debouncing (moved here for reusable utility later if needed)
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Validation Schema
const schema = yup.object({
  name: yup.string().required('Machine Name is required'),
  description: yup.string(),
  priceByDay: yup.number().min(0, 'Price must be positive').required('Daily Price is required'),
  priceByWeek: yup.number().min(0).nullable(),
  priceByMonth: yup.number().min(0).nullable(),
  gst_percentage: yup.number().min(0).max(100).default(18)
});

const PricingCatalog = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  
  // Debounce search term
  const debouncedSearch = useDebounce(search, 500);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      priceByDay: 0,
      priceByWeek: 0,
      priceByMonth: 0,
      gst_percentage: 18
    }
  });

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Fetch Data - Use debouncedSearch
  const { data: response, isLoading, isFetching } = useQuery({
    queryKey: ['quotation-machines', page, limit, debouncedSearch],
    queryFn: () => quotationMachineApi.getAll({ page, limit, search: debouncedSearch }),
    placeholderData: keepPreviousData // Keep data while searching (v5 syntax)
  });
  
  const machines = response?.data || [];
  const pagination = response?.pagination;

  // Mutations
  const createMutation = useMutation({
    mutationFn: quotationMachineApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['quotation-machines']);
      handleCloseModal();
      toast.success('Item added successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add item');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => quotationMachineApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['quotation-machines']);
      handleCloseModal();
      toast.success('Item updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update item');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: quotationMachineApi.delete,
    onSuccess: (response) => {
      queryClient.invalidateQueries(['quotation-machines']);
      setDeleteId(null);
      if (response && response.success) {
         toast.success(response.message || 'Item deleted successfully');
      }
    },
    onError: () => {
      setDeleteId(null);
      // Toast already shown by the global API interceptor (api.js)
    }
  });

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      reset(item);
    } else {
      setEditingItem(null);
      reset({
        name: '',
        description: '',
        priceByDay: 0,
        priceByWeek: 0,
        priceByMonth: 0,
        gst_percentage: 18
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    reset();
  };

  const onSubmit = (data) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) return <div className="p-4 text-center text-xs text-gray-500">Loading catalog...</div>;

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/quotations')}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors shrink-0"
            style={{ minHeight: 0, minWidth: 0 }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">Pricing Catalog</h1>
            <p className="text-xs text-gray-400">Machines & pricing for quotations</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-medium shrink-0"
          style={{ minHeight: 0, minWidth: 0 }}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Item
        </button>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-3 border-b">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search items..."
          />
          <SearchResultsIndicator
            searchTerm={search}
            debouncedSearchTerm={debouncedSearch}
            isFetching={isFetching}
            resultCount={pagination?.total}
            onClear={() => setSearch('')}
          />
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2.5 font-medium text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 uppercase tracking-wide">Monthly Price</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 uppercase tracking-wide">GST %</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {machines.length === 0 ? (
                <tr><td colSpan="4" className="p-6 text-center text-gray-400 text-xs">No items found.</td></tr>
              ) : machines.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    {item.description && <p className="text-gray-400 mt-0.5">{item.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">₹{item.priceByMonth}</td>
                  <td className="px-4 py-3 text-gray-700">{item.gst_percentage}%</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => handleOpenModal(item)} className="text-blue-600 hover:text-blue-800 inline-flex" style={{ minHeight: 0, minWidth: 0 }}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(item.id)} className="text-red-500 hover:text-red-700 inline-flex" style={{ minHeight: 0, minWidth: 0 }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden divide-y">
          {machines.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-400">No items found.</div>
          ) : machines.map(item => (
            <div key={item.id} className="p-2.5 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 leading-tight">{item.name}</p>
                {item.description && <p className="text-xs text-gray-400 mt-0.5 break-words">{item.description}</p>}
                <div className="flex gap-3 mt-1.5">
                  <span className="text-xs text-gray-500">₹{item.priceByMonth}<span className="text-gray-400">/mo</span></span>
                  <span className="text-xs text-gray-500">GST {item.gst_percentage}%</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleOpenModal(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" style={{ minHeight: 0, minWidth: 0 }}>
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleteId(item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" style={{ minHeight: 0, minWidth: 0 }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {pagination && pagination.total > 5 && (
          <Pagination
            pagination={pagination}
            onPageChange={setPage}
            onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
          />
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-4 shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-bold text-gray-900">{editingItem ? 'Edit Item' : 'New Item'}</h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600" style={{ minHeight: 0, minWidth: 0 }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Machine Name *</label>
                <input
                  {...register('name')}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. JCB 3DX"
                />
                <p className="text-red-500 text-xs mt-0.5">{errors.name?.message}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Description</label>
                <textarea
                  {...register('description')}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows="2"
                  placeholder="Optional details…"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Daily (₹)</label>
                  <input type="number" {...register('priceByDay')} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Weekly (₹)</label>
                  <input type="number" {...register('priceByWeek')} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Monthly (₹)</label>
                  <input type="number" {...register('priceByMonth')} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">GST %</label>
                <input type="number" {...register('gst_percentage')} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-xs text-gray-700 bg-white hover:bg-gray-50"
                  style={{ minHeight: 0, minWidth: 0 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700 flex items-center gap-1.5 disabled:opacity-60"
                  style={{ minHeight: 0, minWidth: 0 }}
                >
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        confirmLabel="Delete"
        confirmVariant="danger"
        title="Delete Item"
        message="Are you sure you want to delete this item from the catalog?"
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default PricingCatalog;
