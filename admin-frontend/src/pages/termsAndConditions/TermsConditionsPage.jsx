import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { create } from 'zustand';
import {
  Plus,
  RefreshCw,
  AlertCircle,
  FileText,
  MoreVertical,
  Edit,
  Trash2,
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
import TermModal from './TermModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';


// Zustand store for Terms & Conditions state management
const useTermsStore = create((set) => ({
  filters: {
    isDefault: '',
    page: 1,
    limit: 12
  },
  searchTerm: '',

  // Actions
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),
  resetFilters: () => set({
    filters: { isDefault: '', page: 1, limit: 12 },
    searchTerm: ''
  }),
  setSearchTerm: (term) => set({ searchTerm: term }),
}));

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
  const TermCard = ({ term, onEdit, onDelete, onToggleDefault }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isDefault = term.is_default === 1 || term.is_default === true;
    const actions = [
      { label: 'Edit', action: () => onEdit(term), icon: Edit },
      { label: term.is_default ? 'Remove Default' : 'Set as Default', action: () => onToggleDefault(term.id, !term.is_default), icon: term.is_default ? StarOff : Star },
      { label: 'Delete', action: () => onDelete(term.id), icon: Trash2, danger: true }
    ];

    return (
      <div className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4 hover:shadow-md transition-all duration-200 hover:border-blue-200 group relative">
        <div className="flex items-start justify-between mb-2 gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <h3 className="font-semibold text-gray-900 truncate text-sm" title={term.title}>{term.title}</h3>
              {isDefault && (
                <span className="bg-blue-50 text-blue-700 p-0.5 rounded flex-shrink-0" title="Default Term">
                  <Star className="w-3 h-3 fill-current" />
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed" title={term.description}>{term.description}</p>
          </div>

          <div className="flex-shrink-0 relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-lg shadow-xl z-20 min-w-[148px] py-1 animate-in fade-in zoom-in-95 duration-100">
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
                      className={`w-full text-left px-3 py-2 text-xs flex items-center transition-colors ${
                        action.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 mr-2" />{action.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <span className="text-xs font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
            Order: {term.display_order}
          </span>
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[88vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 flex-shrink-0">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Reorder Terms</h2>
              <p className="text-xs text-gray-400 mt-0.5">Tap arrows to change position</p>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
            {reorderedTerms.map((term, index) => {
              const isDefault = term.is_default === 1 || term.is_default === true;
              const isFirst = index === 0;
              const isLast = index === reorderedTerms.length - 1;
              return (
                <div
                  key={term.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  {/* Position badge */}
                  <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-900 truncate">{term.title}</p>
                      {isDefault && (
                        <Star className="w-3 h-3 text-blue-500 fill-current flex-shrink-0" />
                      )}
                    </div>
                    {term.description && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{term.description}</p>
                    )}
                  </div>

                  {/* Up / Down controls */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => moveItem(index, Math.max(0, index - 1))}
                      disabled={isFirst}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown className="w-4 h-4 rotate-180" />
                    </button>
                    <button
                      onClick={() => moveItem(index, Math.min(reorderedTerms.length - 1, index + 1))}
                      disabled={isLast}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
            <span className="text-xs text-gray-400">{reorderedTerms.length} terms</span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-1.5 border border-gray-200 bg-white text-gray-600 rounded-lg hover:bg-gray-50 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                {isSaving && <RefreshCw className="w-3 h-3 animate-spin" />}
                {isSaving ? 'Saving…' : 'Save Order'}
              </button>
            </div>
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
  
  const handleFilterChange = useCallback((value) => {
    setFilters({ isDefault: value, page: 1 });
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
      <div className="p-3 sm:p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight leading-tight">
                Terms & Conditions
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                Manage your terms library
                {pagination && (
                  <span className="font-medium bg-gray-100 px-1.5 py-0.5 rounded-full text-gray-500 text-xs">
                    {pagination.total} total
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
              {/* Reorder — text label on sm+, icon-only on mobile */}
              <button
                onClick={() => setShowReorderModal(true)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors text-xs font-medium"
                title="Reorder"
              >
                <Move className="w-3.5 h-3.5" />
                Reorder
              </button>
              <button
                onClick={() => setShowReorderModal(true)}
                className="sm:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title="Reorder"
              >
                <Move className="w-4 h-4" />
              </button>

              {/* Refresh */}
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-40"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              </button>

              {/* Add Term */}
              <button
                onClick={() => {
                  setEditingTerm(null);
                  setShowTermModal(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium active:scale-[0.97] whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Term
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search terms by title or description..."
            isFetching={isFetching}
            className="w-full"
          />
        </div>
        
        {/* Filter — always visible, instant apply */}
        <div className="flex items-center gap-2 mb-4">
          <select
            value={filters.isDefault}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          >
            <option value="">All Terms</option>
            <option value="true">Default Only</option>
            <option value="false">Non-Default Only</option>
          </select>
          {filters.isDefault && (
            <button
              onClick={() => handleFilterChange('')}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        {/* Terms Grid */}
        <div className="relative">
          {terms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {terms.map((term) => (
                <TermCard
                  key={term.id}
                  term={term}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleDefault={handleToggleDefault}
                />
              ))}
            </div>
          ) : null}

          {/* Empty state */}
          {terms.length === 0 && !isFetching && (
            <div className="text-center py-10 sm:py-16 bg-white rounded-2xl border border-dashed border-gray-200">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">No terms found</h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 max-w-xs mx-auto px-4">
                {searchTerm || filters.isDefault
                  ? 'No terms match your search criteria. Try adjusting your filters.'
                  : 'Get started by creating your first term and condition.'}
              </p>

              {(searchTerm || filters.isDefault) ? (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditingTerm(null);
                    setShowTermModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-xs font-medium"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create New Term
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {terms.length > 0 && pagination && (
          <div className="mt-4 sm:mt-6">
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