import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { create } from 'zustand';
import {
  Search,
  Plus,
  FileText,
  Calendar,
  Filter,
  Eye,
  Edit2,
  Trash2,
  RefreshCcw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Package,
  Building2,
  Phone,
  MapPin,
  IndianRupee,
  X,
  Menu,
  Settings,
  Download
} from 'lucide-react';

import { quotationApi } from '../../services/quotationApi';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import SearchResultsIndicator from '../../components/common/SearchResultsIndicator';

// Zustand store for quotation state management
const useQuotationStore = create((set, get) => ({
  selectedQuotations: [],
  filters: {
    status: '',
    date: '', // Single date filter
    sort_by: 'created_at',
    sort_order: 'DESC',
    page: 1,
    limit: 20
  },
  searchTerm: '',
  showMobileFilters: false,
  deleteDialog: { open: false, id: null },
  
  // Actions
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),
  resetFilters: () => set({
    filters: {
      status: '',
      date: '',
      sort_by: 'created_at',
      sort_order: 'DESC',
      page: 1,
      limit: 20
    },
    searchTerm: '',
  }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  toggleMobileFilters: () => set((state) => ({ showMobileFilters: !state.showMobileFilters })),
  setDeleteDialog: (dialog) => set({ deleteDialog: dialog })
}));

// Validation schema for filters
const filterSchema = yup.object({
  status: yup.string(),
  date: yup.string().nullable(),
  sort_by: yup.string().oneOf(['created_at', 'quotation_number', 'customer_name', 'grand_total']),
  sort_order: yup.string().oneOf(['ASC', 'DESC'])
});

// Custom hook for debouncing
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Status configurations
const quotationStatusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: FileText },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
};

// Format currency in Indian format
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

// Format phone number
const formatPhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};

// Mobile-first Status Badge Component with Edit Support
const StatusBadge = ({ status, size = 'sm', showDropdown = false, onUpdate }) => {
  const statusInfo = quotationStatusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800 border-gray-200', icon: AlertCircle };
  const Icon = statusInfo.icon;
  const [isEditing, setIsEditing] = useState(false);

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  if (showDropdown && isEditing) {
    return (
      <select
        className={`rounded border-gray-300 text-xs shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`}
        value={status}
        onChange={(e) => {
          onUpdate(e.target.value);
          setIsEditing(false);
        }}
        onBlur={() => setIsEditing(false)}
        autoFocus
      >
        {Object.entries(quotationStatusConfig).map(([key, config]) => (
          <option key={key} value={key}>
            {config.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span 
      className={`inline-flex items-center rounded-full font-medium border ${statusInfo.color} ${sizeClasses[size]} ${showDropdown ? 'cursor-pointer hover:opacity-80' : ''}`}
      onClick={() => showDropdown && onUpdate && setIsEditing(true)}
      title={showDropdown ? "Click to change status" : ""}
    >
      <Icon className="w-3 h-3 mr-1" />
      {statusInfo.label}
    </span>
  );
};


// Mobile-first Bulk Actions Component


// Mobile-first Filters Component with React Hook Form
const QuotationFilters = ({ onApplyFilters, onReset }) => {
  const { filters, setFilters } = useQuotationStore();

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(filterSchema),
    defaultValues: filters,
    mode: 'onChange'
  });

  const onSubmit = (data) => {
    setFilters(data);
    onApplyFilters();
  };

  const handleReset = () => {
    reset({ status: '', date: '', sort_by: 'created_at', sort_order: 'DESC' });
    onReset();
  };

  return (
    <div className="bg-white rounded-lg border mb-4 p-3">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              {...register('status')}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
            >
              <option value="">All</option>
              {Object.entries(quotationStatusConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date"
              {...register('date')}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
            />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
          </div>

          <div className="flex items-end gap-1.5 col-span-2 sm:col-span-2">
            <button
              type="submit"
              className="flex-1 bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600 transition-colors text-xs"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 px-2 py-1 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 transition-colors text-xs"
            >
              Reset
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// Mobile-first Quotation Card Component
const QuotationCard = ({ quotation, onDelete, onDownload, isDownloading, onStatusUpdate }) => {
  return (
    <div className="bg-white border rounded-lg p-3 space-y-2 hover:shadow-md transition-shadow duration-200">
      {/* Row 1: ID + Status */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-900 text-sm leading-tight">{quotation.quotation_number}</span>
        <StatusBadge
          status={quotation.quotation_status}
          size="xs"
          showDropdown={true}
          onUpdate={(newStatus) => onStatusUpdate(quotation.id, newStatus)}
        />
      </div>

      {/* Row 2: Customer Name (Company Name) */}
      <div className="flex items-center gap-1 text-xs">
        <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
        <span className="font-medium text-gray-800 truncate">{quotation.customer_name}</span>
        {quotation.company_name && quotation.company_name !== quotation.customer_name && (
          <span className="text-gray-400 truncate">({quotation.company_name})</span>
        )}
      </div>

      {/* Row 3: Amount + Site Location */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center font-semibold text-gray-900">
          <IndianRupee className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{formatCurrency(quotation.grand_total).replace('₹', '')}</span>
        </div>
        {quotation.site_location && (
          <div className="flex items-center text-gray-500 gap-1 min-w-0 ml-2">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate max-w-[120px]">{quotation.site_location}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
        <Link
          to={`/quotations/${quotation.id}`}
          style={{ height: '24px' }}
          className="flex-1 bg-gray-100 text-gray-700 px-1.5 rounded-md hover:bg-gray-200 transition-colors text-xs flex items-center justify-center gap-1"
        >
          <Eye className="w-3 h-3" />
          View
        </Link>
        <button
          onClick={() => onDownload(quotation.id)}
          disabled={isDownloading}
          style={{ height: '24px', minHeight: '0', minWidth: '0' }}
          className={`flex-1 px-1.5 rounded-md transition-all text-xs flex items-center justify-center gap-1 ${
            isDownloading
              ? 'bg-blue-500 text-white cursor-not-allowed'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          {isDownloading ? (
            <>
              <RefreshCcw className="w-3 h-3 animate-spin" />
              Gen…
            </>
          ) : (
            <>
              <Download className="w-3 h-3" />
              PDF
            </>
          )}
        </button>
        <button
          onClick={() => onDelete(quotation.id)}
          style={{ height: '24px', minHeight: '0', minWidth: '0' }}
          className="flex-1 px-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-xs flex items-center justify-center"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};



// Main QuotationList Component - Mobile First
const QuotationList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [downloadingIds, setDownloadingIds] = useState(new Set());

  const {
    filters,
    searchTerm,
    deleteDialog,
    setFilters,
    resetFilters,
    setSearchTerm,
    setDeleteDialog
  } = useQuotationStore();
  
  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Unified query key for better caching
  const queryKey = useMemo(() => [
    'quotations', 
    debouncedSearchTerm,
    filters.status,
    filters.date,
    filters.sort_by,
    filters.sort_order,
    filters.page,
    filters.limit
  ], [debouncedSearchTerm, filters]);
  
  // Single API call for quotations with optimized caching
  const { data: quotationsData, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () => quotationApi.getAll({
      search: debouncedSearchTerm || undefined,
      status: filters.status || undefined,
      date: filters.date || undefined,
      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
      page: filters.page,
      limit: filters.limit
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  // Handle status update
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await quotationApi.updateStatus(id, newStatus);
      toast.success('Status updated successfully');
      queryClient.invalidateQueries(['quotations']);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  // Handle PDF Download
  const handleDownload = async (id) => {
    setDownloadingIds(prev => new Set(prev).add(id));
    try {
      await quotationApi.generatePDF(id);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };
  
  // Optimized mutations with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: quotationApi.delete,
    onMutate: async (quotationId) => {
      await queryClient.cancelQueries(queryKey);
      const previousData = queryClient.getQueryData(queryKey);
      
      if (previousData) {
        queryClient.setQueryData(queryKey, (old) => ({
          ...old,
          data: old.data.filter(quotation => quotation.id !== quotationId)
        }));
      }
      
      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['quotation-stats']);
      setDeleteDialog({ open: false, id: null });
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      // Toast handled by API
    }
  });


  
  const quotations = quotationsData?.data || [];
  const pagination = quotationsData?.pagination || {};
  
  // Event handlers - all using useCallback to maintain references
  const handlePageChange = useCallback((newPage) => {
    setFilters({ page: newPage });
  }, [setFilters]);

  const handleLimitChange = useCallback((newLimit) => {
    setFilters({ limit: newLimit, page: 1 });
  }, [setFilters]);

  const applyFilters = useCallback(() => {
    setFilters({ page: 1 });
  }, [setFilters]);

  const handleExport = useCallback(async () => {
    try {
      const exportData = await quotationApi.getAll({
        search: debouncedSearchTerm,
        status: filters.status,
        machine_id: filters.machine_id,
        date: filters.date,
        limit: 1000
      });

      const csvData = exportData.data.map(quotation => ({
        'Quotation Number': quotation.quotation_number,
        'Customer Name': quotation.customer_name,
        'Company Name': quotation.company_name || '',
        'Customer GST': quotation.customer_gst_number || '',
        'Contact': quotation.customer_contact,
        'Total Amount': quotation.grand_total,
        'Status': quotation.quotation_status,
        'Created Date': new Date(quotation.created_at).toLocaleDateString('en-IN'),
        'Machines': quotation.machines || '',
        'Days Ago': quotation.days_ago
      }));

      const csvString = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        ).join(','))
      ].join('\n');

      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quotations-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
    }
  }, [debouncedSearchTerm, filters]);

  // Early returns should come after ALL hooks are called
  if (isLoading && !quotationsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCcw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading quotations...</p>
        </div>
      </div>
    );
  }

  if (error && !quotationsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Quotations</h3>
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
        {/* Header */}
        <div className="mb-4">
          {/* Title row */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-base sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
                Quotation Management
              </h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                Manage quotations and track delivery status
                {pagination?.total ? (
                  <span className="ml-1">({pagination.total} total)</span>
                ) : null}
              </p>
            </div>

            {/* Desktop-only button row */}
            <div className="hidden sm:flex items-center gap-2 ml-4 flex-shrink-0">
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
              >
                <RefreshCcw className={`w-4 h-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <Link
                to="/quotations/pricing"
                className="flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <Settings className="w-4 h-4 mr-1.5" />
                Catalog
              </Link>
              <Link
                to="/quotations/new"
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                New Quotation
              </Link>
            </div>
          </div>

          {/* Mobile-only button rows */}
          <div className="sm:hidden space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/quotations/pricing"
                className="flex items-center justify-center px-2 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-xs font-medium"
              >
                <Settings className="w-3.5 h-3.5 mr-1" />
                Catalog
              </Link>
              <Link
                to="/quotations/new"
                className="flex items-center justify-center px-2 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                New Quotation
              </Link>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center justify-center w-full px-2 py-1 text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 text-xs"
            >
              <RefreshCcw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
        
        
        {/* Search Bar */}
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by quotation number, customer, or machine..."
          isFetching={isFetching}
          className="mb-4"
        />

        {/* Search Results */}
        <SearchResultsIndicator
          searchTerm={searchTerm}
          debouncedSearchTerm={debouncedSearchTerm}
          isFetching={isFetching}
          resultCount={pagination?.total}
          onClear={() => setSearchTerm('')}
        />
        
        {/* Filters */}
        <QuotationFilters 
          onApplyFilters={applyFilters} 
          onReset={resetFilters} 
        />
        

        
        {/* Responsive Table/Card View */}
        <div className="bg-white rounded-lg border overflow-hidden relative">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quotation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Machine Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quotations.map((quotation) => (
                  <tr key={quotation.id} className="hover:bg-gray-50 transition-colors">
                    
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{quotation.quotation_number}</p>
                        {quotation.machines && (
                          <p className="text-sm text-gray-500 flex items-center mt-1 truncate max-w-xs">
                            <Package className="w-4 h-4 mr-1 flex-shrink-0" />
                            <span title={quotation.machines}>{quotation.machines}</span>
                          </p>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs" title={quotation.customer_name}>
                          {quotation.customer_name}
                        </p>
                        {quotation.company_name && quotation.company_name !== quotation.customer_name && (
                          <p className="text-sm text-gray-500 truncate max-w-xs" title={quotation.company_name}>
                            {quotation.company_name}
                          </p>
                        )}
                        <p className="text-sm text-gray-900 flex items-center">
                          <Phone className="w-4 h-4 mr-1 text-gray-400 flex-shrink-0" />
                          <a href={`tel:${quotation.customer_contact}`} className="text-blue-600 hover:text-blue-700">
                            {formatPhone(quotation.customer_contact)}
                          </a>
                        </p>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(quotation.machine_total)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {quotation.total_items} item(s)
                        </p>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <StatusBadge 
                        status={quotation.quotation_status} 
                        showDropdown={true}
                        onUpdate={(newStatus) => handleStatusUpdate(quotation.id, newStatus)}
                      />
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <p>{new Date(quotation.created_at).toLocaleDateString('en-IN')}</p>
                        <p className="text-xs text-gray-500">{quotation.days_ago} days ago</p>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/quotations/${quotation.id}`}
                          className="p-2 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-gray-100 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/quotations/${quotation.id}/edit`}
                          className="p-2 text-green-600 hover:text-green-800 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Edit quotation"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDownload(quotation.id)}
                          disabled={downloadingIds.has(quotation.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            downloadingIds.has(quotation.id)
                              ? 'text-purple-400 bg-purple-50 cursor-not-allowed'
                              : 'text-purple-600 hover:text-purple-800 hover:bg-gray-100'
                          }`}
                          title={downloadingIds.has(quotation.id) ? 'Generating PDF…' : 'Download PDF'}
                        >
                          {downloadingIds.has(quotation.id)
                            ? <RefreshCcw className="w-4 h-4 animate-spin" />
                            : <Download className="w-4 h-4" />
                          }
                        </button>
                        <button
                          onClick={() => setDeleteDialog({ open: true, id: quotation.id })}
                          className="p-2 text-red-600 hover:text-red-800 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Delete quotation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden">
            {quotations.length > 0 && (
              <>
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {quotations.length} {quotations.length === 1 ? 'quotation' : 'quotations'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {pagination.total || quotations.length} total
                    </span>
                  </div>
                </div>
            
                <div className="flex flex-col gap-2 p-2">
                  {quotations.map((quotation) => (
                    <QuotationCard
                      key={quotation.id}
                      quotation={quotation}
                      onDelete={(id) => setDeleteDialog({ open: true, id })}
                      onDownload={handleDownload}
                      isDownloading={downloadingIds.has(quotation.id)}
                      onStatusUpdate={handleStatusUpdate}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          
          {/* Loading state overlay - Only on table content, not entire page */}
          {isFetching && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="flex flex-col items-center space-y-2">
                <RefreshCcw className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-sm text-gray-600">
                  {searchTerm ? 'Searching...' : 'Loading...'}
                </span>
              </div>
            </div>
          )}
          
          {/* Empty state */}
          {quotations.length === 0 && !isFetching && (
            <div className="text-center py-12 px-4">
              <div className="max-w-sm mx-auto">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No quotations found</h3>
                <p className="text-gray-500 mb-4 text-sm leading-relaxed">
                  {searchTerm || filters.status || filters.date 
                    ? 'No quotations match your current search and filter criteria. Try adjusting your filters or search terms.'
                    : 'No quotations have been created yet. Create your first quotation to get started.'}
                </p>
                {(searchTerm || filters.status || filters.date) && (
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear all filters
                  </button>
                )}
                {(!searchTerm && !filters.status && !filters.date) && (
                  <Link
                    to="/quotations/new"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Quotation
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {quotations.length > 0 && pagination && (
          <div className="mt-6">
            <Pagination
              pagination={{
                current_page: pagination.current_page || 1,
                per_page: pagination.per_page || filters.limit,
                total: pagination.total || 0,
                total_pages: pagination.total_pages || 1,
                has_prev_page: pagination.has_prev || false,
                has_next_page: pagination.has_next || false,
                from: ((pagination.current_page || 1) - 1) * (pagination.per_page || filters.limit) + 1,
                to: Math.min((pagination.current_page || 1) * (pagination.per_page || filters.limit), pagination.total || 0),
              }}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
            />
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteDialog.open}
          title="Delete Quotation"
          message="Are you sure you want to delete this quotation? This action cannot be undone."
          confirmLabel="Delete"
          confirmVariant="danger"
          onConfirm={() => {
            if (deleteDialog.id) {
              deleteMutation.mutate(deleteDialog.id);
            }
          }}
          onCancel={() => setDeleteDialog({ open: false, id: null })}
          loading={deleteMutation.isPending}
        />

        {/* Loading Overlay for Actions */}
        {/* Loading Overlay for Actions */}
        {deleteMutation.isPending && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center gap-4 shadow-xl min-w-[300px]">
              <LoadingSpinner size="lg" />
              <div>
                <div className="text-gray-900 font-medium">
                  Deleting Quotation
                </div>
                <div className="text-gray-500 text-sm mt-1">
                  Please wait while we delete the quotation...
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotationList;