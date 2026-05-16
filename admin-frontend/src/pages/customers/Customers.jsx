import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { create } from "zustand";
import {
  Search,
  Plus,
  Filter,
  Edit,
  Phone,
  Mail,
  MapPin,
  X,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  MoreVertical,
  Trash2,
  Eye,
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
}));

// Custom hook for debouncing
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};


// Filter Component
const CustomerFilters = ({ onReset }) => {
  const { filters, setFilters } = useCustomerStore();

  const handleSortChange = (e) => {
    setFilters({ sortOrder: e.target.value, page: 1 });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 p-4">
      <div className="flex flex-row gap-3 items-center">
        {/* Sort Select */}
        <div className="flex-1 lg:flex-none lg:w-64 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="h-4 w-4 text-gray-400" />
          </div>
          <select
            value={filters.sortOrder}
            onChange={handleSortChange}
            className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all appearance-none cursor-pointer hover:bg-white"
          >
            <option value="DESC">Newest First</option>
            <option value="ASC">Oldest First</option>
          </select>
          <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Reset Button */}
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset
        </button>
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

      <div className="space-y-2">
        <div className="flex items-center text-sm text-gray-600">
          <Phone className="w-3.5 h-3.5 mr-2 text-gray-400 flex-shrink-0" />
          <span className="truncate">{customer.phone}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="w-3.5 h-3.5 mr-2 text-gray-400 flex-shrink-0" />
          <span className="truncate">{customer.site_location || 'No location'}</span>
        </div>
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
    onError: () => {
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
        <div className="mb-4">
          {/* Title row */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-base sm:text-2xl font-bold text-gray-900 leading-tight">Customer Management</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Manage your customer database ({pagination?.totalItems || 0} total)
              </p>
            </div>

            {/* Desktop buttons */}
            <div className="hidden sm:flex items-center gap-2 ml-4 flex-shrink-0">
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
              >
                <RefreshCw className={`w-4 h-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => navigate("/customers/new")}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Customer
              </button>
            </div>
          </div>

          {/* Mobile buttons */}
          <div className="sm:hidden grid grid-cols-2 gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center justify-center px-2 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 text-xs font-medium"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
            <button
              onClick={() => navigate("/customers/new")}
              className="flex items-center justify-center px-2 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
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
        <CustomerFilters onReset={resetFilters} />

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
                  <tr key={customer.id} className="hover:bg-gray-50/80 transition-colors">
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
                       <div className="flex justify-end gap-2">
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
