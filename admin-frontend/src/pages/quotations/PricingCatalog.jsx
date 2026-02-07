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
    onError: (error) => {
      setDeleteId(null);
      // Error is handled globally or shown here
      toast.error(error.message || 'Failed to delete item');
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

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading catalog...</div>;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/quotations')}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
            title="Back to Quotations"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pricing Catalog</h1>
            <p className="text-gray-500 text-sm">Manage standard machines and pricing for quotations</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b">
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
        
        {/* Desktop View (Table) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">Name</th>
                <th className="px-6 py-3 font-medium text-gray-500">Monthly Price</th>
                <th className="px-6 py-3 font-medium text-gray-500">GST %</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {machines.length === 0 ? (
                 <tr><td colSpan="4" className="p-6 text-center text-gray-500">No items found.</td></tr>
              ) : (
                machines.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                    </td>
                    <td className="px-6 py-4">₹{item.priceByMonth}</td>
                    <td className="px-6 py-4">{item.gst_percentage}%</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => handleOpenModal(item)} className="text-blue-600 hover:text-blue-800">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteId(item.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Cards) */}
        <div className="sm:hidden divide-y">
           {machines.length === 0 ? (
             <div className="p-6 text-center text-gray-500">No items found.</div>
           ) : (
             machines.map(item => (
               <div key={item.id} className="p-4 space-y-3">
                 <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.description && <div className="text-xs text-gray-500 mt-1">{item.description}</div>}
                    </div>
                    <div className="flex space-x-3">
                      <button onClick={() => handleOpenModal(item)} className="text-blue-600">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteId(item.id)} className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-50 p-2 rounded">
                       <span className="text-xs text-gray-500 block">Monthly Price</span>
                       <span className="font-medium">₹{item.priceByMonth}</span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                       <span className="text-xs text-gray-500 block">GST</span>
                       <span className="font-medium">{item.gst_percentage}%</span>
                    </div>
                 </div>
               </div>
             ))
           )}
        </div>
        
        {/* Pagination */}
        {pagination && pagination.total > 5 && (
          <Pagination
            pagination={pagination}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">{editingItem ? 'Edit Item' : 'New Item'}</h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Machine Name *</label>
                <input 
                  {...register('name')} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="e.g. JCB 3DX"
                />
                <p className="text-red-500 text-xs mt-1">{errors.name?.message}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  {...register('description')} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  rows="3" 
                  placeholder="Optional details..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Daily Price (₹)</label>
                    <input 
                      type="number" 
                      {...register('priceByDay')} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Price (₹)</label>
                    <input 
                      type="number" 
                      {...register('priceByWeek')} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Price (₹)</label>
                    <input 
                      type="number" 
                      {...register('priceByMonth')} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                 </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST %</label>
                  <input 
                    type="number" 
                    {...register('gst_percentage')} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-2">
                <button 
                  type="button" 
                  onClick={handleCloseModal} 
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                >
                  {(createMutation.isLoading || updateMutation.isLoading) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        title="Delete Item"
        message="Are you sure you want to delete this item from the catalog?"
        loading={deleteMutation.isLoading}
      />
    </div>
  );
};

export default PricingCatalog;
