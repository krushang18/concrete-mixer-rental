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
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Star,
  StarOff,
  Move,
  X,
  ChevronDown
} from 'lucide-react';
import { termsConditionsApi } from '../../services/termsConditionsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import SearchResultsIndicator from '../../components/common/SearchResultsIndicator';
import TermModal from './TermModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';


// Zustand store for Terms & Conditions state management
const useTermsStore = create((set, get) => ({
  filters: {
    isDefault: '',
    page: 1,
    limit: 12
  },
  searchTerm: '',
  showMobileFilters: false,
  
  // Actions
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),
  resetFilters: () => set({
    filters: {
      isDefault: '',
      page: 1,
      limit: 12
    },
    searchTerm: ''
  }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  toggleMobileFilters: () => set((state) => ({ showMobileFilters: !state.showMobileFilters }))
}));

// Validation schema for filters
const filterSchema = yup.object({
  isDefault: yup.string()
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

// Main Terms Conditions Page Component - Mobile First
const TermsConditionsPage = () => {
  // Nested helper components
  const TermsFilters = ({ onApplyFilters, onReset }) => {
    const { filters, showMobileFilters, setFilters, toggleMobileFilters } = useTermsStore();
    const { register, handleSubmit, reset } = useForm({
      resolver: yupResolver(filterSchema),
      defaultValues: filters,
      mode: 'onChange'
    });

    const onSubmit = (data) => {
      setFilters(data);
      onApplyFilters();
      // Only toggle on mobile
      if (window.innerWidth < 1024) {
        toggleMobileFilters();
      }
    };

    const handleReset = () => {
      reset({ isDefault: '' });
      onReset();
      if (window.innerWidth < 1024) {
        toggleMobileFilters();
      }
    };
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        {/* Mobile Header */}
        <div 
          onClick={toggleMobileFilters}
          className="flex items-center justify-between p-4 lg:hidden bg-gray-50/50 cursor-pointer active:bg-gray-100 transition-colors"
        >
          <span className="text-sm font-semibold text-gray-700 flex items-center">
            <Filter className="w-4 h-4 mr-2 text-blue-600" />
            Filter Terms
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
        </div>
        
        {/* Filter Content */}
        <div className={`p-4 ${showMobileFilters ? 'block border-t border-gray-100' : 'hidden lg:block'}`}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col lg:flex-row gap-4 items-center">
               
               {/* Status Select */}
               <div className="w-full lg:w-64 relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <Settings className="h-4 w-4 text-gray-400" />
                 </div>
                 <select
                    {...register('isDefault')}
                    className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer hover:bg-white"
                  >
                   <option value="">All Terms</option>
                   <option value="true">Default Only</option>
                   <option value="false">Non-Default Only</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full lg:w-auto ml-auto">
                <button
                  type="submit"
                  className="flex-1 lg:flex-none bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-all shadow-sm active:scale-[0.98] text-sm font-medium flex items-center justify-center"
                >
                  Apply Filters
                </button>
                
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 lg:flex-none px-4 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium flex items-center justify-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const TermCard = ({ term, onEdit, onDelete, onDuplicate, onToggleDefault }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isDefault = term.is_default === 1 || term.is_default === true;
    const actions = [
      { label: 'Edit', action: () => onEdit(term), icon: Edit },
      { label: 'Duplicate', action: () => onDuplicate(term.id), icon: Copy },
      { label: term.is_default ? 'Remove Default' : 'Set as Default', action: () => onToggleDefault(term.id, !term.is_default), icon: term.is_default ? StarOff : Star },
      { label: 'Delete', action: () => onDelete(term.id), icon: Trash2, danger: true }
    ];
    
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition-all duration-200 hover:border-blue-200 group relative">
        <div className="flex justify-between items-start mb-3">
           <div className="flex-1 min-w-0 pr-8">
              <div className="flex items-center gap-2 mb-1.5">
                 <h3 className="font-semibold text-gray-900 truncate text-base" title={term.title}>{term.title}</h3>
                 {isDefault && (
                    <span className="bg-blue-50 text-blue-700 p-1 rounded-md" title="Default Term">
                       <Star className="w-3.5 h-3.5 fill-current" />
                    </span>
                 )}
              </div>
              <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed" title={term.description}>{term.description}</p>
           </div>
           
           <div className="absolute top-4 right-4">
               <button 
                 onClick={() => setIsOpen(!isOpen)}
                 className="p-1.5 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
               >
                 <MoreVertical className="w-5 h-5" />
               </button>
               
               {isOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-lg shadow-xl z-20 min-w-[160px] py-1 animate-in fade-in zoom-in-95 duration-100">
                    {actions.map((action, index) => {
                      const Icon = action.icon;
                      return (
                        <button 
                          key={index} 
                          onClick={(e) => { 
                             e.stopPropagation();
                             action.action(); 
                             setIsOpen(false); 
                          }} 
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center transition-colors ${
                              action.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="w-4 h-4 mr-2.5" />{action.label}
                        </button>
                      );
                    })}
                  </div>
                )}
           </div>
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-2">
           <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded">
              Order: {term.display_order}
           </span>
           {/* <span className="text-xs text-gray-400">
              Last updated: {new Date(term.updated_at || term.created_at).toLocaleDateString()}
           </span> */}
        </div>
      </div>
    );
  };

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
        const orderData = reorderedTerms.map((term, index) => ({ id: term.id, display_order: index + 1 }));
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Reorder Terms</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
               <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="overflow-y-auto p-5 space-y-3 bg-gray-50/50 flex-1">
            {reorderedTerms.map((term, index) => (
              <div key={term.id} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                <div className="flex flex-col gap-1">
                  <button onClick={() => moveItem(index, Math.max(0, index - 1))} disabled={index === 0} className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-colors">
                     <ChevronDown className="w-4 h-4 rotate-180" />
                  </button>
                  <button onClick={() => moveItem(index, Math.min(reorderedTerms.length - 1, index + 1))} disabled={index === reorderedTerms.length - 1} className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-colors">
                     <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                     <span className="bg-gray-100 text-gray-600 text-xs font-bold px-1.5 py-0.5 rounded">#{index + 1}</span>
                     <p className="font-semibold text-gray-900 text-sm truncate">{term.title}</p>
                  </div>
                  {term.description && <p className="text-xs text-gray-500 line-clamp-1">{term.description}</p>}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end gap-3 p-5 border-t border-gray-100 bg-white">
            <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={isSaving} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70 text-sm font-medium shadow-sm transition-colors">
              {isSaving ? 'Saving...' : 'Save New Order'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Main component state and hooks
  const [showTermModal, setShowTermModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [showReorderModal, setShowReorderModal] = useState(false);
  
  // Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [termToDelete, setTermToDelete] = useState(null);
  
  const queryClient = useQueryClient();
  const {
    filters,
    searchTerm,
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
    filters.isDefault,
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
        limit: filters.limit
      };
      
      // Add default filter if present
      if (filters.isDefault !== '') {
        queryParams.is_default = filters.isDefault === 'true';
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
    onSuccess: (data, deletedId) => {
      toast.success('Term deleted successfully');
      setDeleteConfirmOpen(false);
      setTermToDelete(null);

      // Auto-rearrange orders
      const currentData = queryClient.getQueryData(queryKey);
      if (currentData?.data) {
        // Filter out the deleted term
        const remainingTerms = currentData.data.filter(t => t.id !== deletedId);
        
        // Sort by current display_order to maintain relative order
        const sortedTerms = [...remainingTerms].sort((a, b) => (a.display_order || 999) - (b.display_order || 999));
        
        // Check if reordering is needed (i.e. if any term's order doesn't match its new index + 1)
        const needsReorder = sortedTerms.some((term, index) => term.display_order !== index + 1);
        
        if (needsReorder) {
          const orderData = sortedTerms.map((term, index) => ({
            id: term.id,
            display_order: index + 1
          }));
          reorderMutation.mutate(orderData);
        }
      }
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
  const categories = [];
  
  // Event handlers - using useCallback for stable references
  const handlePageChange = useCallback((newPage) => {
    setFilters({ page: newPage });
  }, [setFilters]);
  
  const handleLimitChange = useCallback((newLimit) => {
    setFilters({ limit: newLimit, page: 1 });
  }, [setFilters]);
  
  const handleEdit = useCallback((term) => {
    setEditingTerm(term);
    setShowTermModal(true);
  }, []);
  
  const handleDelete = useCallback((termId) => {
    const term = terms.find(t => t.id === termId);
    setTermToDelete(term);
    setDeleteConfirmOpen(true);
  }, [terms]);

  const onConfirmDelete = useCallback(() => {
    if (termToDelete) {
      deleteMutation.mutate(termToDelete.id);
    }
  }, [deleteMutation, termToDelete]);
  
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
  
  const applyFilters = useCallback(() => {
    setFilters({ page: 1 });
  }, [setFilters]);
  
  // Early returns should come after ALL hooks are called
  if (isLoading && !termsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <LoadingSpinner />
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
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
                Terms & Conditions
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your terms and conditions library
                {pagination && (
                  <span className="text-sm ml-2 font-medium bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                    {pagination.total} total
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowReorderModal(true)}
                className="flex items-center justify-center px-4 py-2.5 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium shadow-sm"
              >
                <Move className="w-4 h-4 mr-2 text-gray-500" />
                Reorder
              </button>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center justify-center p-2.5 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors disabled:opacity-50 shadow-sm"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => {
                  setEditingTerm(null);
                  setShowTermModal(true);
                }}
                className="flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium shadow-sm hover:shadow active:scale-[0.98] whitespace-nowrap"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Term
              </button>
            </div>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="mb-6">
           <SearchBar
             value={searchTerm}
             onChange={setSearchTerm}
             placeholder="Search terms by title or description..."
             isFetching={isFetching}
             className="w-full"
           />
        </div>
        
        {/* Filters */}
        <TermsFilters 
          onApplyFilters={applyFilters} 
          onReset={resetFilters} 
        />
        
        {/* Terms Grid */}
        <div className="relative">
          {terms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {terms.map((term) => (
                <TermCard
                  key={term.id}
                  term={term}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onToggleDefault={handleToggleDefault}
                />
              ))}
            </div>
          ) : null}
          
          {/* Empty state */}
          {terms.length === 0 && !isFetching && (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
               <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                 <FileText className="w-8 h-8" />
               </div>
               <h3 className="text-lg font-semibold text-gray-900 mb-1">No terms found</h3>
               <p className="text-gray-500 mb-6 max-w-md mx-auto">
                 {searchTerm || filters.isDefault 
                   ? 'No terms match your search criteria. Try adjusting your filters.' 
                   : 'Get started by creating your first term and condition.'}
               </p>
               
               {(searchTerm || filters.isDefault) ? (
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    Clear Filters
                  </button>
               ) : (
                  <button
                    onClick={() => {
                      setEditingTerm(null);
                      setShowTermModal(true);
                    }}
                    className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create New Term
                  </button>
               )}
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {terms.length > 0 && pagination && (
          <div className="mt-8">
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
          existingTerms={terms}
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

        <ConfirmDialog
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onCancel={() => setDeleteConfirmOpen(false)}
          onConfirm={onConfirmDelete}
          title="Delete Term"
          message={`Are you sure you want to delete the term "${termToDelete?.title}"? This action cannot be undone.`}
          confirmLabel="Delete"
          confirmVariant="danger"
          loading={deleteMutation.isPending}
        />
      </div>
    </div>
  );
};

export default TermsConditionsPage;