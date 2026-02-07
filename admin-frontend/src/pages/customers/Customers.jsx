import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import toast from "react-hot-toast";
import { create } from "zustand";
import {
  Search,
  Plus,
  Filter,

  Eye,
  Edit,
  Phone,
  Mail,
  MapPin,
  Users,
  TrendingUp,
  Calendar,
  FileText,
  X,
  RefreshCw,
  AlertCircle,
  Menu,
  ChevronDown,
  Settings,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { customerApi } from "../../services/customerApi";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Pagination from "../../components/common/Pagination";
import SearchBar from "../../components/common/SearchBar";
import SearchResultsIndicator from "../../components/common/SearchResultsIndicator";

// Zustand store for customer state management
const useCustomerStore = create((set, get) => ({
  filters: {
    search: "",
    city: "",
    has_gst: "all",
    sortBy: "created_at",
    sortOrder: "DESC",
    page: 1,
    limit: 10,
  },
  searchTerm: "",
  showMobileFilters: false,

  // Actions
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  resetFilters: () =>
    set({
      filters: {
        search: "",
        city: "",
        has_gst: "all",
        sortBy: "created_at",
        sortOrder: "DESC",
        page: 1,
        limit: 10,
      },
      searchTerm: "",
    }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  toggleMobileFilters: () =>
    set((state) => ({ showMobileFilters: !state.showMobileFilters })),
}));

// Validation schema for filters
const filterSchema = yup.object({
  search: yup.string(),
  city: yup.string(),
  has_gst: yup.string().oneOf(["all", "has_gst", "no_gst"]),
  sortBy: yup.string().oneOf(["created_at", "company_name", "contact_person"]),
  sortOrder: yup.string().oneOf(["ASC", "DESC"]),
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


// Minimalist Filter Component
const CustomerFilters = ({ onApplyFilters, onReset }) => {
  const { filters, showMobileFilters, toggleMobileFilters, setFilters } = useCustomerStore();
  
  const { register, handleSubmit, reset } = useForm({
    resolver: yupResolver(filterSchema),
    defaultValues: filters,
    mode: 'onChange'
  });

  const onSubmit = (data) => {
    setFilters(data);
    onApplyFilters();
    toggleMobileFilters();
  };

  const handleReset = () => {
    reset({ 
      search: "",
      city: "",
      has_gst: "all",
      sortBy: "created_at",
      sortOrder: "DESC"
    });
    onReset();
    toggleMobileFilters();
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
          Filter & Sort
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
      </div>
      
      {/* Filter Content */}
      <div className={`p-4 ${showMobileFilters ? 'block border-t border-gray-100' : 'hidden lg:block'}`}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col lg:flex-row gap-4 items-center">
             {/* Sort Select */}
             <div className="w-full lg:w-64 relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Settings className="h-4 w-4 text-gray-400" />
               </div>
               <select
                  {...register('sortOrder')}
                  className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer hover:bg-white"
                >
                  <option value="DESC">Newest First</option>
                  <option value="ASC">Oldest First</option>
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <button
                type="submit"
                className="flex-1 lg:flex-none bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-all shadow-sm active:scale-[0.98] text-sm font-medium flex items-center justify-center"
              >
                Apply
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

// Mobile-first Customer Card
const CustomerCard = ({ customer, onView, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div 
      className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all group relative"
      onClick={() => onView(customer)}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="min-w-0 flex-1 mr-3">
          <div className="flex items-center gap-2 mb-1">
             <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase">
               {customer.company_name.charAt(0)}
             </span>
             <span className="text-gray-400 text-[10px]">
               {new Date(customer.created_at).toLocaleDateString()}
             </span>
          </div>
          <h3 className="font-semibold text-gray-900 text-base leading-tight truncate" title={customer.company_name}>
            {customer.company_name}
          </h3>
          <p className="text-sm text-gray-500 truncate">{customer.contact_person}</p>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1.5 -mr-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
      
      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute right-4 top-10 bg-white border border-gray-100 rounded-lg shadow-xl z-10 min-w-[140px] py-1 animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(customer);
              setShowMenu(false);
            }}
            className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <Edit className="w-3.5 h-3.5 mr-2 text-blue-500" />
            Edit Customer
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(customer);
              setShowMenu(false);
            }}
            className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            Delete
          </button>
        </div>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <Phone className="w-3.5 h-3.5 mr-2 text-gray-400 flex-shrink-0" />
          <span className="truncate">{customer.phone}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="w-3.5 h-3.5 mr-2 text-gray-400 flex-shrink-0" />
          <span className="truncate">{customer.site_location || 'No location'}</span>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-gray-50">
         <span className="text-xs font-semibold text-blue-600 flex items-center group-hover:text-blue-700 transition-colors">
            View Details <Eye className="w-3 h-3 ml-1" />
         </span>
      </div>
    </div>
  );
};

// Main Customers Component
const Customers = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    filters,
    searchTerm,
    setFilters,
    resetFilters,
    setSearchTerm,
  } = useCustomerStore();

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Unified query key for better caching
  const queryKey = useMemo(
    () => [
      "customers",
      debouncedSearchTerm,
      filters.city,
      filters.has_gst,
      filters.sortBy,
      filters.sortOrder,
      filters.page,
      filters.limit,
    ],
    [debouncedSearchTerm, filters]
  );

  // Single API call for customers with optimized caching
  const {
    data: customersData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => {
      const queryFilters = {
        ...filters,
        search: debouncedSearchTerm || undefined,
      };

      // Clean up undefined values
      Object.keys(queryFilters).forEach((key) => {
        if (queryFilters[key] === undefined || queryFilters[key] === "") {
          delete queryFilters[key];
        }
      });

      return customerApi.getAllPaginated(
        filters.page,
        filters.limit,
        queryFilters
      );
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  const deleteMutation = useMutation({
    mutationFn: customerApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(["customers"]);
      toast.success('Customer deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete customer');
    },
  });

  const customers = customersData?.customers || [];
  const pagination = customersData?.pagination || {};

  // Event handlers
  const handlePageChange = useCallback((newPage) => setFilters({ page: newPage }), [setFilters]);
  const handleLimitChange = useCallback((newLimit) => setFilters({ limit: newLimit, page: 1 }), [setFilters]);

  const handleViewCustomer = useCallback((customer) => navigate(`/customers/${customer.id}`), [navigate]);
  const handleEditCustomer = useCallback((customer) => navigate(`/customers/${customer.id}/edit`), [navigate]);
  
  const handleDeleteCustomer = useCallback(async (customer) => {
    if (window.confirm(`Are you sure you want to delete "${customer.company_name}"?`)) {
        deleteMutation.mutate(customer.id);
    }
  }, [deleteMutation]);

  // Early returns should come after ALL hooks are called
  if (isLoading && !customersData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading customers...</p>
        </div>
      </div>
    );
  }

  if (error && !customersData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Customers</h3>
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
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customer Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your customer database ({pagination?.totalItems || 0} total)
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2.5 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors disabled:opacity-50 shadow-sm"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate("/customers/new")}
              className="flex items-center px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow active:scale-[0.98] text-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Customer
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
           <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
             <Search className="h-5 w-5 text-gray-400" />
           </div>
           <input
            type="text"
            placeholder="Search customers by name, email, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 sm:text-sm transition-all shadow-sm hover:shadow-md"
          />
           {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <CustomerFilters onApplyFilters={() => setFilters({ page: 1 })} onReset={resetFilters} />

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="overflow-x-auto">
             <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                   <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                   <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                   <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                   <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-[100px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4 align-top">
                       <div className="flex flex-col">
                         <span className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1" title={customer.company_name}>
                           {customer.company_name}
                         </span>
                         <span className="text-xs text-gray-500">
                           {customer.contact_person}
                         </span>
                       </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                       <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span>{customer.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[150px]" title={customer.email}>{customer.email}</span>
                        </div>
                       </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                       <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate max-w-[150px]">{customer.site_location || '-'}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 align-top text-right">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleViewCustomer(customer)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="View">
                             <Eye className="w-4 h-4" />
                          </button>
                           <button onClick={() => handleEditCustomer(customer)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Edit">
                             <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteCustomer(customer)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Delete">
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                   <tr>
                     <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                        No customers found matching your filters.
                     </td>
                   </tr>
                )}
              </tbody>
             </table>
          </div>
        </div>

        {/* Mobile List View */}
        <div className="lg:hidden space-y-4 mb-6">
           {customers.map((customer) => (
             <CustomerCard 
               key={customer.id} 
               customer={customer} 
               onView={handleViewCustomer}
               onEdit={handleEditCustomer}
               onDelete={handleDeleteCustomer}
             />
           ))}
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="mt-8">
            <Pagination 
              pagination={{
                current_page: pagination.currentPage || 1,
                per_page: pagination.limit || filters.limit,
                total: pagination.totalItems || 0,
                total_pages: pagination.totalPages || 1,
                has_prev_page: pagination.hasPrevPage || false,
                has_next_page: pagination.hasNextPage || false,
              }}
              onPageChange={handlePageChange} 
              onLimitChange={handleLimitChange} 
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default Customers;
