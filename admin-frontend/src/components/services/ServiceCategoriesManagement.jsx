import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { create } from 'zustand';
import { serviceApi } from '../../services/serviceApi';
import Pagination from '../../components/common/Pagination';
import { 
  Plus, Edit, Trash2, X, Save, ChevronDown, ChevronRight,
  Settings, List, AlertCircle, Search, ArrowLeft,
  RefreshCw, MoreVertical
} from 'lucide-react';

// Zustand store for state management
const useCategoriesStore = create((set, get) => ({
  // UI State
  expandedCategories: new Set(),
  searchTerm: '',
  selectedCategories: [],
  
  // Modal States
  showCategoryModal: false,
  showSubServiceModal: false,
  editingCategory: null,
  editingSubService: null,
  selectedCategoryForSub: null,
  
  // Pagination
  currentPage: 1,
  itemsPerPage: 10,
  
  // Actions
  toggleCategory: (categoryId) => set((state) => {
    const newSet = new Set(state.expandedCategories);
    if (newSet.has(categoryId)) {
      newSet.delete(categoryId);
    } else {
      newSet.add(categoryId);
    }
    return { expandedCategories: newSet };
  }),
  
  expandAllCategories: (categoryIds) => set({ 
    expandedCategories: new Set(categoryIds) 
  }),
  
  collapseAllCategories: () => set({ 
    expandedCategories: new Set() 
  }),
  
  setSearchTerm: (term) => set({ searchTerm: term, currentPage: 1 }),
  
  toggleCategorySelection: (categoryId) => set((state) => ({
    selectedCategories: state.selectedCategories.includes(categoryId)
      ? state.selectedCategories.filter(id => id !== categoryId)
      : [...state.selectedCategories, categoryId]
  })),
  
  selectAllCategories: (categoryIds) => set({ selectedCategories: categoryIds }),
  clearSelection: () => set({ selectedCategories: [] }),
  
  openCategoryModal: (category = null) => set({ 
    editingCategory: category, 
    showCategoryModal: true 
  }),
  
  closeCategoryModal: () => set({ 
    showCategoryModal: false, 
    editingCategory: null 
  }),
  
  openSubServiceModal: (categoryId, subService = null) => set({
    selectedCategoryForSub: categoryId,
    editingSubService: subService,
    showSubServiceModal: true
  }),
  
  closeSubServiceModal: () => set({
    showSubServiceModal: false,
    editingSubService: null,
    selectedCategoryForSub: null
  }),
  
  setCurrentPage: (page) => set({ currentPage: page }),
  setItemsPerPage: (items) => set({ itemsPerPage: items, currentPage: 1 }),
  
  resetStore: () => set({
    expandedCategories: new Set(),
    searchTerm: '',
    selectedCategories: [],
    currentPage: 1,
    itemsPerPage: 10,
    showCategoryModal: false,
    showSubServiceModal: false,
    editingCategory: null,
    editingSubService: null,
    selectedCategoryForSub: null
  })
}));

// Validation schemas
const categorySchema = yup.object({
  name: yup.string()
    .required('Category name is required')
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name must not exceed 100 characters'),
  description: yup.string()
    .trim()
    .max(500, 'Description must not exceed 500 characters')
});

const subServiceSchema = yup.object({
  category_id: yup.number().required('Category is required'),
  name: yup.string()
    .required('Service name is required')
    .trim()
    .min(2, 'Service name must be at least 2 characters')
    .max(100, 'Service name must not exceed 100 characters'),
  description: yup.string()
    .trim()
    .max(500, 'Description must not exceed 500 characters')
});

// Custom hook for debouncing
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  React.useEffect(() => {
    if (!value) {
      setDebouncedValue('');
      return;
    }
    
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Simple Stats Cards
const CategoryStatsCards = ({ categoriesData }) => {
  const stats = useMemo(() => {
    if (!Array.isArray(categoriesData)) return { total: 0, totalServices: 0 };
    
    const total = categoriesData.length;
    const totalServices = categoriesData.reduce((sum, cat) => sum + (cat.sub_services?.length || 0), 0);
    
    return { total, totalServices };
  }, [categoriesData]);

  return (
    <div className="flex gap-4 mb-6">
      <div className="bg-blue-50 rounded-lg p-4 flex-1">
        <div className="text-sm text-gray-600">Categories</div>
        <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
      </div>
      <div className="bg-green-50 rounded-lg p-4 flex-1">
        <div className="text-sm text-gray-600">Total Services</div>
        <div className="text-2xl font-bold text-green-600">{stats.totalServices}</div>
      </div>
    </div>
  );
};

// Minimal Action Toolbar
const ActionToolbar = ({ 
  selectedCategories, 
  onExpandAll, 
  onCollapseAll, 
  onSelectAll, 
  onClearSelection,
  onBulkDelete,
  totalCategories 
}) => {
  return (
    <div className="bg-white rounded-lg border p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onExpandAll}
            className="px-3 py-1 text-xs text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
          >
            Expand All
          </button>
          <button
            onClick={onCollapseAll}
            className="px-3 py-1 text-xs text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            Collapse All
          </button>
        </div>
        
        {selectedCategories.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-600">{selectedCategories.length} selected</span>
            <button
              onClick={onClearSelection}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
            >
              Clear
            </button>
            <button
              onClick={onBulkDelete}
              className="px-2 py-1 text-xs text-red-600 hover:text-red-800"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Clean Category Card
const CategoryCard = ({ 
  category, 
  onToggle, 
  onEditCategory, 
  onDeleteCategory, 
  onAddSubService, 
  onEditSubService, 
  onDeleteSubService,
  onToggleSelection,
  isExpanded,
  isSelected
}) => {
  return (
    <div className={`bg-white rounded-lg border transition-all duration-200 mb-3 overflow-hidden ${
      isSelected ? 'border-blue-500 shadow-sm' : 'border-gray-200'
    }`}>
      {/* Category Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelection(category.id)}
              className="rounded border-gray-300 text-blue-600"
            />
            
            <button
              onClick={() => onToggle(category.id)}
              className="flex items-center gap-2 text-left flex-1"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
              <div>
                <h3 className="font-medium text-gray-900">{category.name}</h3>
                <span className="text-xs text-gray-500">
                  {category.sub_services?.length || 0} services
                </span>
              </div>
            </button>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => onAddSubService(category.id)}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEditCategory(category)}
              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteCategory(category.id)}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Services List */}
      {isExpanded && (
        <div className="border-t bg-gray-50 px-4 py-3">
          {category.sub_services && category.sub_services.length > 0 ? (
            <div className="space-y-2">
              {category.sub_services.map((subService) => (
                <div
                  key={subService.id}
                  className="flex items-center justify-between py-2 px-3 bg-white rounded border"
                >
                  <span className="text-sm text-gray-900">{subService.name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditSubService(category.id, subService)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDeleteSubService(subService.id)}
                      className="p-1 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-2">No services yet</p>
              <button
                onClick={() => onAddSubService(category.id)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Add first service
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Simple Modal Components
const CategoryModal = ({ isOpen, onClose, onSubmit, editingCategory, isLoading }) => {
  const { control, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: yupResolver(categorySchema),
    defaultValues: {
      name: editingCategory?.name || '',
      description: editingCategory?.description || ''
    }
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({
        name: editingCategory?.name || '',
        description: editingCategory?.description || ''
      });
    }
  }, [isOpen, editingCategory, reset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium">
            {editingCategory ? 'Edit Category' : 'Add Category'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Name
            </label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <input
                  type="text"
                  placeholder="e.g., Engine Maintenance"
                  {...field}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              )}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <textarea
                  placeholder="Brief description..."
                  {...field}
                  value={field.value || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              )}
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : (editingCategory ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SubServiceModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingSubService, 
  selectedCategoryId, 
  categories, 
  isLoading 
}) => {
  const { control, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: yupResolver(subServiceSchema),
    defaultValues: {
      category_id: selectedCategoryId || editingSubService?.category_id || '',
      name: editingSubService?.name || '',
      description: editingSubService?.description || ''
    }
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({
        category_id: selectedCategoryId || editingSubService?.category_id || '',
        name: editingSubService?.name || '',
        description: editingSubService?.description || ''
      });
    }
  }, [isOpen, editingSubService, selectedCategoryId, reset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium">
            {editingSubService ? 'Edit Service' : 'Add Service'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <Controller
              name="category_id"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  value={field.value || ''}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.category_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select category...</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.category_id && (
              <p className="mt-1 text-sm text-red-600">{errors.category_id.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Name
            </label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <input
                  type="text"
                  placeholder="e.g., Oil Change"
                  {...field}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              )}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <textarea
                  placeholder="Brief description..."
                  {...field}
                  value={field.value || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              )}
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : (editingSubService ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Component
const ServiceCategoriesManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const {
    expandedCategories,
    searchTerm,
    selectedCategories,
    currentPage,
    itemsPerPage,
    showCategoryModal,
    showSubServiceModal,
    editingCategory,
    editingSubService,
    selectedCategoryForSub,
    
    toggleCategory,
    expandAllCategories,
    collapseAllCategories,
    setSearchTerm,
    toggleCategorySelection,
    selectAllCategories,
    clearSelection,
    openCategoryModal,
    closeCategoryModal,
    openSubServiceModal,
    closeSubServiceModal,
    setCurrentPage,
    setItemsPerPage,
    resetStore
  } = useCategoriesStore();
  
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  const queryKey = useMemo(() => ['service-categories'], []);
  
  const { 
    data: categoriesData, 
    isLoading, 
    isFetching,
    error, 
    refetch 
  } = useQuery({
    queryKey,
    queryFn: () => serviceApi.getServiceCategories(),
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    retry: 2,
  });

  const categoryMutation = useMutation({
    mutationFn: ({ id, data }) => 
      id ? serviceApi.updateServiceCategory(id, data) : serviceApi.createServiceCategory(data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries(queryKey);
      const previousData = queryClient.getQueryData(queryKey);
      
      if (previousData) {
        queryClient.setQueryData(queryKey, (old) => {
          const categories = Array.isArray(old?.data) ? old.data : [];
          
          if (id) {
            return {
              ...old,
              data: categories.map(cat => 
                cat.id === id ? { ...cat, ...data, updated_at: new Date().toISOString() } : cat
              )
            };
          } else {
            const tempId = Date.now();
            return {
              ...old,
              data: [...categories, { 
                id: tempId, 
                ...data, 
                sub_services: [], 
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }]
            };
          }
        });
      }
      
      return { previousData };
    },
    onSuccess: () => {
      toast.success(editingCategory ? 'Category updated successfully' : 'Category created successfully');
      closeCategoryModal();
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(error.response?.data?.message || 'Failed to save category');
    },
    onSettled: () => {
      queryClient.invalidateQueries(queryKey);
    }
  });

  const subServiceMutation = useMutation({
    mutationFn: ({ id, data }) => 
      id ? serviceApi.updateSubServiceItem(id, data) : serviceApi.createSubServiceItem(data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries(queryKey);
      const previousData = queryClient.getQueryData(queryKey);
      
      if (previousData) {
        queryClient.setQueryData(queryKey, (old) => {
          const categories = Array.isArray(old?.data) ? old.data : [];
          
          return {
            ...old,
            data: categories.map(cat => {
              if (cat.id === data.category_id) {
                const subServices = cat.sub_services || [];
                
                if (id) {
                  return {
                    ...cat,
                    sub_services: subServices.map(sub =>
                      sub.id === id ? { ...sub, ...data, updated_at: new Date().toISOString() } : sub
                    )
                  };
                } else {
                  const tempId = Date.now();
                  return {
                    ...cat,
                    sub_services: [...subServices, {
                      id: tempId,
                      ...data,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    }]
                  };
                }
              }
              return cat;
            })
          };
        });
      }
      
      return { previousData };
    },
    onSuccess: () => {
      toast.success(editingSubService ? 'Service updated successfully' : 'Service created successfully');
      closeSubServiceModal();
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(error.response?.data?.message || 'Failed to save service');
    },
    onSettled: () => {
      queryClient.invalidateQueries(queryKey);
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (categoryIds) => 
      Promise.all(categoryIds.map(id => serviceApi.deleteServiceCategory(id))),
    onSuccess: (_, categoryIds) => {
      toast.success(`${categoryIds.length} categories deleted successfully`);
      clearSelection();
      queryClient.invalidateQueries(queryKey);
    },
    onError: (error) => {
      toast.error('Failed to delete some categories');
      queryClient.invalidateQueries(queryKey);
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => serviceApi.deleteServiceCategory(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries(queryKey);
      const previousData = queryClient.getQueryData(queryKey);
      
      if (previousData) {
        queryClient.setQueryData(queryKey, (old) => ({
          ...old,
          data: (old.data || []).filter(cat => cat.id !== deletedId)
        }));
      }
      
      return { previousData };
    },
    onSuccess: () => {
      toast.success('Category deleted successfully');
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(error.response?.data?.message || 'Failed to delete category');
    },
    onSettled: () => {
      queryClient.invalidateQueries(queryKey);
    }
  });

  const deleteSubServiceMutation = useMutation({
    mutationFn: (id) => serviceApi.deleteSubServiceItem(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries(queryKey);
      const previousData = queryClient.getQueryData(queryKey);
      
      if (previousData) {
        queryClient.setQueryData(queryKey, (old) => ({
          ...old,
          data: (old.data || []).map(cat => ({
            ...cat,
            sub_services: (cat.sub_services || []).filter(sub => sub.id !== deletedId)
          }))
        }));
      }
      
      return { previousData };
    },
    onSuccess: () => {
      toast.success('Service deleted successfully');
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(error.response?.data?.message || 'Failed to delete service');
    },
    onSettled: () => {
      queryClient.invalidateQueries(queryKey);
    }
  });

  const categories = Array.isArray(categoriesData?.data) ? categoriesData.data : [];

  const filteredAndSortedCategories = useMemo(() => {
    let filtered = categories;
    
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = categories.filter(category =>
        category.name.toLowerCase().includes(searchLower) ||
        category.description?.toLowerCase().includes(searchLower) ||
        category.sub_services?.some(sub => 
          sub.name.toLowerCase().includes(searchLower) ||
          sub.description?.toLowerCase().includes(searchLower)
        )
      );
    }
    
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    
    return filtered;
  }, [categories, debouncedSearchTerm]);

  const totalPages = Math.ceil(filteredAndSortedCategories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredAndSortedCategories.length);
  const paginatedCategories = filteredAndSortedCategories.slice(startIndex, endIndex);

  const handleBack = useCallback(() => {
    resetStore();
    navigate('/services');
  }, [navigate, resetStore]);

  const handleCategorySubmit = useCallback((formData) => {
    categoryMutation.mutate({
      id: editingCategory?.id,
      data: formData
    });
  }, [categoryMutation, editingCategory]);

  const handleSubServiceSubmit = useCallback((formData) => {
    subServiceMutation.mutate({
      id: editingSubService?.id,
      data: formData
    });
  }, [subServiceMutation, editingSubService]);

const handleDeleteCategory = useCallback((categoryId) => {
    if (window.confirm('Are you sure you want to delete this category? This will also delete all its sub-services.')) {
      deleteCategoryMutation.mutate(categoryId);
    }
  }, [deleteCategoryMutation]);

  const handleDeleteSubService = useCallback((subServiceId) => {
    if (window.confirm('Are you sure you want to delete this sub-service?')) {
      deleteSubServiceMutation.mutate(subServiceId);
    }
  }, [deleteSubServiceMutation]);

  const handleBulkDelete = useCallback(() => {
    if (selectedCategories.length === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedCategories.length} selected categories? This will also delete all their sub-services.`;
    if (window.confirm(confirmMessage)) {
      bulkDeleteMutation.mutate(selectedCategories);
    }
  }, [selectedCategories, bulkDeleteMutation]);

  const handleExpandAll = useCallback(() => {
    expandAllCategories(paginatedCategories.map(cat => cat.id));
  }, [expandAllCategories, paginatedCategories]);

  const handleCollapseAll = useCallback(() => {
    collapseAllCategories();
  }, [collapseAllCategories]);

  const handleSelectAll = useCallback((action) => {
    if (action === 'all') {
      selectAllCategories(paginatedCategories.map(cat => cat.id));
    } else {
      clearSelection();
    }
  }, [selectAllCategories, clearSelection, paginatedCategories]);

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
    clearSelection();
  }, [setCurrentPage, clearSelection]);

  const handleLimitChange = useCallback((newLimit) => {
    setItemsPerPage(newLimit);
    clearSelection();
  }, [setItemsPerPage, clearSelection]);

  // Loading state
  if (isLoading && !categoriesData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading categories...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Categories</h3>
          <p className="text-gray-600 mb-4 text-sm">{error.message}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
            <button
              onClick={handleBack}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors p-2 -ml-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              <span className="text-sm font-medium">Back</span>
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Service Categories
              </h1>
              <p className="mt-1 text-sm sm:text-base text-gray-600">
                Manage service categories and sub-services
                {categories.length > 0 && (
                  <span className="text-xs sm:text-sm ml-2">
                    ({categories.length} categories)
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <button
              onClick={() => openCategoryModal()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <CategoryStatsCards categoriesData={categories} />

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories and services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {debouncedSearchTerm && (
            <div className="mt-3 text-sm text-gray-600">
              {filteredAndSortedCategories.length} results for "{debouncedSearchTerm}"
            </div>
          )}
        </div>

        {/* Action Toolbar */}
        {paginatedCategories.length > 0 && (
          <ActionToolbar
            selectedCategories={selectedCategories}
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
            onSelectAll={handleSelectAll}
            onClearSelection={clearSelection}
            onBulkDelete={handleBulkDelete}
            totalCategories={paginatedCategories.length}
          />
        )}

        {/* Categories List */}
        <div className="relative">
          {isFetching && categoriesData && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
              <div className="flex flex-col items-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-sm text-gray-600">Refreshing...</span>
              </div>
            </div>
          )}

          {paginatedCategories.length === 0 ? (
            <div className="bg-white rounded-lg border p-8 text-center">
              <Settings className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {debouncedSearchTerm ? 'No results found' : 'No categories yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {debouncedSearchTerm 
                  ? `No categories match "${debouncedSearchTerm}"`
                  : 'Create your first service category'
                }
              </p>
              {!debouncedSearchTerm && (
                <button
                  onClick={() => openCategoryModal()}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onToggle={toggleCategory}
                  onEditCategory={openCategoryModal}
                  onDeleteCategory={handleDeleteCategory}
                  onAddSubService={openSubServiceModal}
                  onEditSubService={openSubServiceModal}
                  onDeleteSubService={handleDeleteSubService}
                  onToggleSelection={toggleCategorySelection}
                  isExpanded={expandedCategories.has(category.id)}
                  isSelected={selectedCategories.includes(category.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredAndSortedCategories.length > 0 && totalPages > 1 && (
          <div className="mt-8">
            <Pagination
              pagination={{
                current_page: currentPage,
                per_page: itemsPerPage,
                total: filteredAndSortedCategories.length,
                total_pages: totalPages,
                has_prev_page: currentPage > 1,
                has_next_page: currentPage < totalPages,
                from: startIndex + 1,
                to: endIndex
              }}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
            />
          </div>
        )}

        {/* Modals */}
        <CategoryModal
          isOpen={showCategoryModal}
          onClose={closeCategoryModal}
          onSubmit={handleCategorySubmit}
          editingCategory={editingCategory}
          isLoading={categoryMutation.isPending}
        />

        <SubServiceModal
          isOpen={showSubServiceModal}
          onClose={closeSubServiceModal}
          onSubmit={handleSubServiceSubmit}
          editingSubService={editingSubService}
          selectedCategoryId={selectedCategoryForSub}
          categories={categories}
          isLoading={subServiceMutation.isPending}
        />
      </div>
    </div>
  );
};

export default ServiceCategoriesManagement;