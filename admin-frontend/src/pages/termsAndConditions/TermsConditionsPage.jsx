import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { create } from 'zustand';
import { 
  Search, 
  Filter, 
  Plus, 
  RefreshCw,
  AlertCircle,
  FileText,
  Settings,
  ChevronDown,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Star,
  StarOff,
  Move,
  X,
  Menu,
  Clock,
} from 'lucide-react';
import { termsConditionsApi, termsConditionsUtils } from '../../services/termsConditionsApi';
import TermModal from './TermModal';
import Pagination from '../../components/common/Pagination';

// Zustand store for Terms & Conditions state management
const useTermsStore = create((set, get) => ({
  selectedTerms: [],
  filters: {
    category: '',
    isDefault: '',
    sortBy: 'display_order',
    sortOrder: 'ASC',
    page: 1,
    limit: 12
  },
  searchTerm: '',
  showMobileFilters: false,
  
  // Actions
  setSelectedTerms: (terms) => set({ selectedTerms: terms }),
  addSelectedTerm: (termId) => set((state) => ({
    selectedTerms: state.selectedTerms.includes(termId) 
      ? state.selectedTerms.filter(id => id !== termId)
      : [...state.selectedTerms, termId]
  })),
  clearSelectedTerms: () => set({ selectedTerms: [] }),
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),
  resetFilters: () => set({
    filters: {
      category: '',
      isDefault: '',
      sortBy: 'display_order',
      sortOrder: 'ASC',
      page: 1,
      limit: 12
    },
    searchTerm: '',
    selectedTerms: []
  }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  toggleMobileFilters: () => set((state) => ({ showMobileFilters: !state.showMobileFilters }))
}));

// Validation schema for filters
const filterSchema = yup.object({
  category: yup.string(),
  isDefault: yup.string(),
  sortBy: yup.string().oneOf(['display_order', 'created_at', 'updated_at', 'title', 'category']),
  sortOrder: yup.string().oneOf(['ASC', 'DESC'])
});

// Custom hook for debouncing - same as reference
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Mobile-first Stats Cards
const TermsStatsCards = ({ termsData, stats }) => {
  let calculatedStats;
  if (stats?.success && stats?.data) {
    const backendStats = stats.data;
    calculatedStats = {
      total: backendStats.totalTerms || 0,
      defaultCount: backendStats.defaultTerms || 0,
      totalCategories: backendStats.totalCategories || 0,
      recentCount: backendStats.recentTerms || 0
    };
  } else {
    const terms = termsData?.data || [];
    calculatedStats = termsConditionsUtils.calculateTermsStats(terms);
  }
  
  const cards = [
    { 
      title: 'Total', 
      value: calculatedStats.total || 0, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-50', 
      icon: FileText 
    },
    { 
      title: 'Default', 
      value: calculatedStats.defaultCount || 0, 
      color: 'text-green-600', 
      bgColor: 'bg-green-50', 
      icon: Star 
    },
    { 
      title: 'Categories', 
      value: calculatedStats.totalCategories || 0, 
      color: 'text-purple-600', 
      bgColor: 'bg-purple-50', 
      icon: Settings 
    },
    { 
      title: 'Recent', 
      value: calculatedStats.recentCount || 0, 
      color: 'text-orange-600', 
      bgColor: 'bg-orange-50', 
      icon: Clock 
    }
  ];
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className={`${card.bgColor} rounded-lg p-3 sm:p-4 transform hover:scale-105 transition-transform duration-200`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">{card.title}</p>
                <p className={`text-lg sm:text-2xl font-bold ${card.color}`}>{card.value}</p>
              </div>
              <Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${card.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Mobile-first Filters Component with React Hook Form
const TermsFilters = ({ onApplyFilters, onReset, categories }) => {
  const { filters, showMobileFilters, setFilters, toggleMobileFilters } = useTermsStore();
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(filterSchema),
    defaultValues: filters,
    mode: 'onChange'
  });

  const onSubmit = (data) => {
    setFilters(data);
    onApplyFilters();
    toggleMobileFilters(); // Close mobile filters after apply
  };

  const handleReset = () => {
    reset({
      category: '',
      isDefault: '',
      sortBy: 'display_order',
      sortOrder: 'ASC'
    });
    onReset();
    toggleMobileFilters(); // Close mobile filters after reset
  };
  
  return (
    <div className="bg-white rounded-lg border mb-4">
      {/* Mobile filter toggle */}
      <div className="flex items-center justify-between p-4 lg:hidden">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filters
        </h3>
        <button
          onClick={toggleMobileFilters}
          className="flex items-center text-gray-500 hover:text-gray-700"
        >
          {showMobileFilters ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop header */}
      <div className="hidden lg:flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filters
        </h3>
      </div>
      
      {/* Filter form */}
      <div className={`p-4 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                {...register('category')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {termsConditionsUtils.formatCategory(category)}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Default Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Status</label>
              <select
                {...register('isDefault')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Terms</option>
                <option value="true">Default Only</option>
                <option value="false">Non-Default Only</option>
              </select>
            </div>
            
            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                {...register('sortBy')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="display_order">Display Order</option>
                <option value="created_at">Date Created</option>
                <option value="updated_at">Last Updated</option>
                <option value="title">Title</option>
                <option value="category">Category</option>
              </select>
            </div>
            
            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <select
                {...register('sortOrder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="ASC">Ascending</option>
                <option value="DESC">Descending</option>
              </select>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:justify-end gap-2">
              <button
                type="submit"
                className="flex-1 sm:flex-none lg:flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 sm:flex-none lg:flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Reset
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Mobile-first Bulk Actions Component
const BulkActions = ({ selectedTerms, onBulkUpdate, onBulkDelete, onDeselectAll }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  if (selectedTerms.length === 0) return null;
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-blue-800 font-medium text-sm">
            {selectedTerms.length} selected
          </span>
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm"
            >
              Actions
              <ChevronDown className="w-4 h-4 ml-1" />
            </button>
            
            {isOpen && (
              <div className="absolute top-full mt-1 left-0 right-0 sm:right-auto sm:w-48 bg-white border rounded-lg shadow-lg z-20">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onBulkUpdate({ is_default: true });
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Set as Default
                  </button>
                  <button
                    onClick={() => {
                      onBulkUpdate({ is_default: false });
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Remove Default
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      onBulkDelete();
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete Selected
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={onDeselectAll}
          className="text-blue-600 hover:text-blue-700 font-medium text-sm self-start sm:self-center"
        >
          Deselect All
        </button>
      </div>
    </div>
  );
};

// Mobile-optimized Term Actions Dropdown
const TermActionsDropdown = ({ term, onEdit, onDelete, onDuplicate, onToggleDefault }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const actions = [
    { label: 'Edit', action: () => onEdit(term), icon: Edit },
    { label: 'Duplicate', action: () => onDuplicate(term.id), icon: Copy },
    { 
      label: term.is_default ? 'Remove Default' : 'Set as Default', 
      action: () => onToggleDefault(term.id, !term.is_default),
      icon: term.is_default ? StarOff : Star
    },
    { label: 'Delete', action: () => onDelete(term.id), icon: Trash2, danger: true }
  ];
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg z-10 min-w-48">
          <div className="py-1">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => {
                    action.action();
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center transition-colors ${
                    action.danger 
                      ? 'text-red-600 hover:bg-red-50' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Mobile-first Term Card Component
const TermCard = ({ term, isSelected, onSelect, onEdit, onDelete, onDuplicate, onToggleDefault }) => {
  const isDefault = term.is_default === 1 || term.is_default === true;
  
  return (
    <div className={`bg-white border rounded-lg p-4 hover:shadow-md transition-all duration-200 ${
      isSelected ? 'ring-2 ring-blue-500 border-blue-300' : ''
    }`}>
      {/* Header with checkbox, title, star and actions */}
      <div className="flex items-start gap-3 mb-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(term.id)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0 mt-1"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate" title={term.title}>
                {term.title}
              </h3>
              {isDefault && (
                <Star className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" />
              )}
            </div>
            <TermActionsDropdown
              term={term}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onToggleDefault={onToggleDefault}
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mb-3 pl-7">
        <p className="text-sm text-gray-600 line-clamp-2" title={term.description}>
          {term.description}
        </p>
      </div>

      {/* Footer with category and order */}
      <div className="flex items-center justify-between pl-7">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          termsConditionsUtils.getCategoryColor(term.category)
        }`}>
          {termsConditionsUtils.formatCategory(term.category)}
        </span>
        <span className="text-xs text-gray-500 flex-shrink-0">
          Order: {term.display_order}
        </span>
      </div>
    </div>
  );
};

// Mobile-first Reorder Modal Component
const ReorderModal = ({ isOpen, onClose, terms, onReorder }) => {
  const [reorderedTerms, setReorderedTerms] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (isOpen && terms) {
      setReorderedTerms([...terms].sort((a, b) => (a.display_order || 999) - (b.display_order || 999)));
    }
  }, [isOpen, terms]);

  const moveItem = useCallback((fromIndex, toIndex) => {
    const newTerms = [...reorderedTerms];
    const [removed] = newTerms.splice(fromIndex, 1);
    newTerms.splice(toIndex, 0, removed);
    setReorderedTerms(newTerms);
  }, [reorderedTerms]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const orderData = reorderedTerms.map((term, index) => ({
        id: term.id,
        display_order: index + 1
      }));
      await onReorder(orderData);
      onClose();
    } catch (error) {
      console.error('Error reordering terms:', error);
    } finally {
      setIsSaving(false);
    }
  }, [reorderedTerms, onReorder, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Reorder Terms</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-96 p-4 space-y-2">
          {reorderedTerms.map((term, index) => (
            <div
              key={term.id}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex flex-col space-y-1">
                <button
                  onClick={() => moveItem(index, Math.max(0, index - 1))}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 text-xs"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveItem(index, Math.min(reorderedTerms.length - 1, index + 1))}
                  disabled={index === reorderedTerms.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 text-xs"
                >
                  ↓
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{term.title}</p>
                <p className="text-xs text-gray-600">{termsConditionsUtils.formatCategory(term.category)}</p>
              </div>
              <div className="text-xs text-gray-500 flex-shrink-0">
                Order: {index + 1}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end space-x-3 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {isSaving ? 'Saving...' : 'Save Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Terms Conditions Page Component - Mobile First
const TermsConditionsPage = () => {
  const [showTermModal, setShowTermModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [showReorderModal, setShowReorderModal] = useState(false);
  
  const queryClient = useQueryClient();
  const {
    selectedTerms,
    filters,
    searchTerm,
    setSelectedTerms,
    addSelectedTerm,
    clearSelectedTerms,
    setFilters,
    resetFilters,
    setSearchTerm
  } = useTermsStore();
  
  // Debounce search term - same as reference
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Unified query key for better caching
  const queryKey = useMemo(() => [
    'terms-conditions', 
    debouncedSearchTerm, 
    filters.category,
    filters.isDefault,
    filters.sortBy,
    filters.sortOrder,
    filters.page,
    filters.limit
  ], [debouncedSearchTerm, filters]);
  
  // Single API call for terms with optimized caching
  const { data: termsData, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () => {
      // Build query params properly
      const queryParams = {
        search: debouncedSearchTerm || undefined,
        page: filters.page,
        limit: filters.limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };
      
      // Add category filter if present
      if (filters.category) {
        queryParams.category = filters.category;
      }
      
      // Add default filter if present - Fix: proper boolean handling
      if (filters.isDefault !== '') {
        queryParams.isDefault = filters.isDefault === 'true';
      }
      
      return termsConditionsApi.getAll(queryParams);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    enabled: true,
    placeholderData: (previousData) => previousData,
  });
  
  // Fetch categories with reduced frequency
  const { data: categoriesData } = useQuery({
    queryKey: ['terms-categories'],
    queryFn: () => termsConditionsApi.getCategories(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    cacheTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
  });
  
  // Fetch stats with reduced frequency  
  const { data: statsData } = useQuery({
    queryKey: ['terms-stats'],
    queryFn: () => termsConditionsApi.getStats(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    cacheTime: 1000 * 60 * 15, // 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
  
  // Optimized mutations with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id) => termsConditionsApi.delete(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries(queryKey);
      const previousTerms = queryClient.getQueryData(queryKey);
      
      if (previousTerms) {
        queryClient.setQueryData(queryKey, (old) => ({
          ...old,
          data: old.data.filter(term => term.id !== deletedId)
        }));
      }
      
      return { previousTerms };
    },
    onSuccess: () => {
      toast.success('Term deleted successfully');
      queryClient.invalidateQueries(['terms-stats']);
      clearSelectedTerms();
    },
    onError: (error, variables, context) => {
      if (context?.previousTerms) {
        queryClient.setQueryData(queryKey, context.previousTerms);
      }
      toast.error(error.response?.data?.message || 'Failed to delete term');
    }
  });
  
  const duplicateMutation = useMutation({
    mutationFn: (id) => termsConditionsApi.duplicate(id),
    onSuccess: () => {
      toast.success('Term duplicated successfully');
      queryClient.invalidateQueries(['terms-conditions']);
      queryClient.invalidateQueries(['terms-stats']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to duplicate term');
    }
  });
  
  const bulkUpdateMutation = useMutation({
    mutationFn: ({ termIds, updates }) => {
      return Promise.all(termIds.map(id => termsConditionsApi.update(id, updates)));
    },
    onMutate: async ({ termIds, updates }) => {
      await queryClient.cancelQueries(queryKey);
      const previousTerms = queryClient.getQueryData(queryKey);
      
      if (previousTerms) {
        queryClient.setQueryData(queryKey, (old) => ({
          ...old,
          data: old.data.map(term => 
            termIds.includes(term.id) ? { ...term, ...updates, updated_at: new Date().toISOString() } : term
          )
        }));
      }
      
      return { previousTerms };
    },
    onSuccess: () => {
      toast.success('Terms updated successfully');
      clearSelectedTerms();
      queryClient.invalidateQueries(['terms-stats']);
    },
    onError: (error, variables, context) => {
      if (context?.previousTerms) {
        queryClient.setQueryData(queryKey, context.previousTerms);
      }
      toast.error(error.response?.data?.message || 'Failed to update terms');
    }
  });
  
  const reorderMutation = useMutation({
    mutationFn: (orderData) => termsConditionsApi.updateDisplayOrder(orderData),
    onSuccess: () => {
      toast.success('Terms reordered successfully');
      queryClient.invalidateQueries(['terms-conditions']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reorder terms');
    }
  });
  
  // Derived data
  const terms = termsData?.data || [];
  const pagination = termsData?.pagination;
  const categories = (categoriesData?.data || [])
    .map(item => item.category || item)
    .filter(cat => cat && typeof cat === 'string' && cat.trim());
  
  // Event handlers - using useCallback for stable references
  const handlePageChange = useCallback((newPage) => {
    setFilters({ page: newPage });
    clearSelectedTerms();
  }, [setFilters, clearSelectedTerms]);
  
  const handleLimitChange = useCallback((newLimit) => {
    setFilters({ limit: newLimit, page: 1 });
    clearSelectedTerms();
  }, [setFilters, clearSelectedTerms]);
  
  const handleEdit = useCallback((term) => {
    setEditingTerm(term);
    setShowTermModal(true);
  }, []);
  
  const handleDelete = useCallback((termId) => {
    if (window.confirm('Are you sure you want to delete this term?')) {
      deleteMutation.mutate(termId);
    }
  }, [deleteMutation]);
  
  const handleDuplicate = useCallback((termId) => {
    duplicateMutation.mutate(termId);
  }, [duplicateMutation]);
  
  const handleToggleDefault = useCallback(async (termId, isDefault) => {
    try {
      await termsConditionsApi.update(termId, { is_default: isDefault });
      queryClient.invalidateQueries(['terms-conditions']);
      queryClient.invalidateQueries(['terms-stats']);
      toast.success(isDefault ? 'Set as default term' : 'Removed from default');
    } catch (error) {
      toast.error('Failed to update default status');
    }
  }, [queryClient]);
  
  const handleBulkUpdate = useCallback((updates) => {
    bulkUpdateMutation.mutate({ termIds: selectedTerms, updates });
  }, [bulkUpdateMutation, selectedTerms]);
  
  const handleBulkDelete = useCallback(async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedTerms.length} selected terms?`)) {
      try {
        await Promise.all(selectedTerms.map(id => termsConditionsApi.delete(id)));
        queryClient.invalidateQueries(['terms-conditions']);
        queryClient.invalidateQueries(['terms-stats']);
        clearSelectedTerms();
        toast.success('Terms deleted successfully');
      } catch (error) {
        toast.error('Failed to delete some terms');
      }
    }
  }, [selectedTerms, queryClient, clearSelectedTerms]);
  
  const handleSelectAll = useCallback(() => {
    if (selectedTerms.length === terms.length && terms.length > 0) {
      clearSelectedTerms();
    } else {
      setSelectedTerms(terms.map(t => t.id));
    }
  }, [selectedTerms.length, terms, clearSelectedTerms, setSelectedTerms]);
  
  const applyFilters = useCallback(() => {
    setFilters({ page: 1 });
  }, [setFilters]);
  
  // Early returns should come after ALL hooks are called
  if (isLoading && !termsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading terms...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Terms</h3>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        {/* Mobile-first Header */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                Terms & Conditions
              </h1>
              <p className="text-gray-600 text-sm sm:text-base mt-1">
                Manage your terms and conditions library
                {pagination && (
                  <span className="text-xs sm:text-sm ml-2">
                    ({pagination.total} total)
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={() => setShowReorderModal(true)}
                className="flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                title="Reorder terms"
              >
                <Move className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">Reorder</span>
              </button>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline sm:ml-2">Refresh</span>
              </button>
              <button
                onClick={() => {
                  setEditingTerm(null);
                  setShowTermModal(true);
                }}
                className="flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                title="Add new term"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">Add</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Stats Cards */}
        <TermsStatsCards termsData={termsData} stats={statsData} />
        
        {/* Mobile-first Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search terms by title, description, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
            autoComplete="off"
            spellCheck="false"
          />
          {isFetching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          )}
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Search Results Indicator */}
        {(searchTerm || debouncedSearchTerm) && (
          <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  {isFetching ? (
                    'Searching...'
                  ) : (
                    <>
                      Search results for "<strong>{debouncedSearchTerm}</strong>"
                      {pagination && (
                        <span className="ml-1">
                          ({pagination.total} {pagination.total === 1 ? 'result' : 'results'})
                        </span>
                      )}
                    </>
                  )}
                </span>
              </div>
              <button
                onClick={() => setSearchTerm('')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Clear search
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <TermsFilters 
          onApplyFilters={applyFilters} 
          onReset={resetFilters} 
          categories={categories} 
        />
        
        {/* Select All and Bulk Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedTerms.length === terms.length && terms.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Select All ({terms.length})
              </span>
            </label>
          </div>
          
          {selectedTerms.length > 0 && (
            <div className="text-sm text-gray-600">
              {selectedTerms.length} of {terms.length} selected
            </div>
          )}
        </div>
        
        {/* Bulk Actions */}
        <BulkActions
          selectedTerms={selectedTerms}
          onBulkUpdate={handleBulkUpdate}
          onBulkDelete={handleBulkDelete}
          onDeselectAll={clearSelectedTerms}
        />
        
        {/* Terms Grid */}
        <div className="relative">
          {terms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {terms.map((term) => (
                <TermCard
                  key={term.id}
                  term={term}
                  isSelected={selectedTerms.includes(term.id)}
                  onSelect={addSelectedTerm}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onToggleDefault={handleToggleDefault}
                />
              ))}
            </div>
          ) : null}
          
          {/* Loading state overlay */}
          {isFetching && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
              <div className="flex flex-col items-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-sm text-gray-600">
                  {searchTerm ? 'Searching...' : 'Loading...'}
                </span>
              </div>
            </div>
          )}
          
          {/* Empty state */}
          {terms.length === 0 && !isFetching && (
            <div className="text-center py-12 px-4">
              <div className="max-w-sm mx-auto">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No terms found</h3>
                <p className="text-gray-500 mb-4 text-sm leading-relaxed">
                  {searchTerm || filters.category || filters.isDefault 
                    ? 'No terms match your current search and filter criteria. Try adjusting your filters or search terms.' 
                    : 'No terms and conditions have been created yet. Create your first term to get started.'}
                </p>
                {(searchTerm || filters.category || filters.isDefault) ? (
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear all filters
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setEditingTerm(null);
                      setShowTermModal(true);
                    }}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Term
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {terms.length > 0 && pagination && (
          <div className="mt-6">
            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
            />
          </div>
        )}
        
        {/* Modals */}
        <TermModal
          isOpen={showTermModal}
          onClose={() => {
            setShowTermModal(false);
            setEditingTerm(null);
          }}
          term={editingTerm}
          categories={categories}
          onSuccess={() => {
            queryClient.invalidateQueries(['terms-conditions']);
            queryClient.invalidateQueries(['terms-stats']);
          }}
        />
        
        <ReorderModal
          isOpen={showReorderModal}
          onClose={() => setShowReorderModal(false)}
          terms={terms}
          onReorder={(orderData) => reorderMutation.mutate(orderData)}
        />
      </div>
    </div>
  );
};

export default TermsConditionsPage;