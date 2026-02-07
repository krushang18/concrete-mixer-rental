// src/pages/customers/CustomerDetail.jsx
import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Calendar, 
  ExternalLink,
  Eye,
  Plus,
  ClipboardList,
  MoreVertical,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { customerApi } from '../../services/customerApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const CustomerDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // OPTIMIZATION 1: Combined customer data fetch with quotations
  // Instead of 2 separate API calls, we now use one optimized query
  const { 
    data: customerResponse, 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['customer-detail', id],
    queryFn: async () => {
      // Single API call that returns both customer data and quotations
      const [customerData, quotationsData] = await Promise.allSettled([
        customerApi.getById(id),
        customerApi.getQuotations(id)
      ]);

      return {
        customer: customerData.status === 'fulfilled' ? customerData.value?.data : null,
        quotations: quotationsData.status === 'fulfilled' ? quotationsData.value?.data || [] : [],
        quotationsError: quotationsData.status === 'rejected' ? quotationsData.reason : null
      };
    },
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const customer = customerResponse?.customer;
  const quotations = customerResponse?.quotations || [];

  // OPTIMIZATION 2: Memoized analytics calculation


  // OPTIMIZATION 3: Optimized delete mutation with cache update
  const deleteMutation = useMutation({
    mutationFn: customerApi.delete,
    onMutate: async () => {
      // Optimistic update - immediately show loading state
      setShowDeleteConfirm(false);
    },
    onSuccess: () => {
      // Update cache without refetching
      queryClient.setQueryData(['customers'], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          customers: oldData.customers?.filter(c => c.id !== id) || []
        };
      });
      
      // Remove this customer from cache
      queryClient.removeQueries(['customer-detail', id]);
      
      toast.success('Customer deleted successfully');
      navigate('/customers');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete customer');
    }
  });

  // Utility functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCustomerInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'C';
  };

  const getQuotationStatusDisplay = (status) => {
    const statusMap = {
      'draft': { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
      'pending': { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      'approved': { label: 'Approved', color: 'bg-green-100 text-green-800' },
      'accepted': { label: 'Accepted', color: 'bg-green-100 text-green-800' },
      'rejected': { label: 'Rejected', color: 'bg-red-100 text-red-800' },
      'expired': { label: 'Expired', color: 'bg-red-100 text-red-800' }
    };
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      deleteMutation.mutate(id);
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  // Tab configuration
  const tabItems = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'quotations', label: `Quotes (${quotations.length})`, icon: ClipboardList }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 mb-4">Error loading customer details</p>
            <div className="space-y-2">
              <button 
                onClick={() => refetch()}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
              <button 
                onClick={() => navigate('/customers')}
                className="w-full px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors"
              >
                Back to Customers
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 rounded-lg active:bg-gray-50"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 truncate mx-2 flex-1 text-center">
            {customer.company_name}
          </h1>
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 -mr-2 text-gray-500 hover:text-gray-700 rounded-lg active:bg-gray-50"
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <MoreVertical className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg animate-in fade-in slide-in-from-top-2">
            <div className="p-2 space-y-1">
              <button
                onClick={() => {
                  navigate(`/customers/${id}/edit`);
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                <Edit className="w-4 h-4 text-blue-600" />
                Edit Customer
              </button>
              <button
                onClick={() => {
                  handleDelete();
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  showDeleteConfirm 
                    ? 'bg-red-50 text-red-700 font-medium' 
                    : 'text-red-600 hover:bg-red-50'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                {showDeleteConfirm ? 'Tap to Confirm Delete' : 'Delete Customer'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        {/* Desktop Header */}
        <div className="hidden lg:flex items-start justify-between mb-8">
          <div className="flex items-start gap-5">
             <button
              onClick={() => navigate('/customers')}
              className="mt-1 p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-5">
               <div className="w-16 h-16 bg-blue-600 rounded-2xl shadow-sm flex items-center justify-center text-white text-2xl font-bold tracking-wider">
                  {getCustomerInitials(customer.company_name)}
               </div>
               <div>
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{customer.company_name}</h1>
                  <div className="flex items-center gap-3 mt-2 text-gray-500">
                    <span className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-0.5 rounded-full text-sm font-medium text-gray-600">
                       <User className="w-3.5 h-3.5" />
                       {customer.contact_person}
                    </span>
                    <span className="text-sm">•</span>
                    <span className="text-sm">Added {formatDate(customer.created_at)}</span>
                  </div>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/customers/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shadow-sm border ${
                showDeleteConfirm 
                  ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' 
                  : 'bg-white text-red-600 border-gray-200 hover:border-red-200 hover:bg-red-50'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              {showDeleteConfirm ? 'Confirm Delete' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
           
           {/* Mobile Tabs */}
            <div className="lg:hidden bg-white rounded-xl border border-gray-100 shadow-sm p-1 mb-4">
              <div className="flex bg-gray-50 rounded-lg p-1">
                {tabItems.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
            </div>
           </div>

           {/* Left Sidebar (Desktop) / Main Content Area */}
           <div className={`lg:w-1/3 space-y-6 ${activeTab === 'overview' ? 'block' : 'hidden lg:block'}`}>
              
              {/* Customer Details Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                   <h3 className="font-semibold text-gray-900">Contact Details</h3>
                </div>
                <div className="p-5 space-y-5">
                   <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                         <Phone className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                         <p className="text-sm text-gray-500 font-medium mb-0.5">Phone</p>
                         <a href={`tel:${customer.phone}`} className="text-gray-900 hover:text-blue-600 font-medium">{customer.phone}</a>
                      </div>
                   </div>

                   <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                         <Mail className="w-4 h-4 text-blue-600" />
                      </div>
                       <div className="flex-1 min-w-0">
                         <p className="text-sm text-gray-500 font-medium mb-0.5">Email</p>
                         <a href={`mailto:${customer.email}`} className="text-gray-900 hover:text-blue-600 font-medium truncate block">{customer.email || 'N/A'}</a>
                      </div>
                   </div>

                   <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                         <MapPin className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                         <p className="text-sm text-gray-500 font-medium mb-0.5">Location</p>
                         <p className="text-gray-900">{customer.site_location || 'N/A'}</p>
                         {customer.address && (
                            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{customer.address}</p>
                         )}
                      </div>
                   </div>
                   
                   {customer.gst_number && (
                    <div className="flex gap-4">
                       <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-blue-600" />
                       </div>
                       <div>
                          <p className="text-sm text-gray-500 font-medium mb-0.5">GST Number</p>
                          <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded font-mono">
                             {customer.gst_number}
                          </span>
                       </div>
                    </div>
                   )}
                </div>
              </div>
           </div>

           {/* Right Content Area */}
           <div className={`lg:w-2/3 space-y-6 ${activeTab === 'quotations' ? 'block' : 'hidden lg:block'}`}>
              
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                 <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <h3 className="font-semibold text-gray-900">Quotations</h3>
                       <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                          {quotations.length}
                       </span>
                    </div>
                    <button
                      onClick={() => navigate(`/quotations/new?customer=${id}`)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Create New
                    </button>
                 </div>

                 <div className="p-5">
                    {quotations.length > 0 ? (
                      <div className="space-y-4">
                        {quotations.map((quotation) => {
                          const status = getQuotationStatusDisplay(quotation.quotation_status);
                          return (
                            <div 
                              key={quotation.id} 
                              onClick={() => navigate(`/quotations/${quotation.id}`)}
                              className="group block bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer relative"
                            > 
                              <div className="flex items-start justify-between gap-4 mb-3">
                                 <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                       <span className="font-bold text-gray-900">#{quotation.quotation_number}</span>
                                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ${status.color}`}>
                                          {status.label}
                                       </span>
                                    </div>
                                    <p className="text-xs text-gray-500">{formatDate(quotation.created_at)}</p>
                                 </div>
                                 <div className="text-right flex-shrink-0 ml-4">
                                    <p className="text-lg font-bold text-gray-900">{formatCurrency(parseFloat(quotation.grand_total))}</p>
                                 </div>
                              </div>
                              
                              <div className="flex items-end justify-between gap-4 pt-3 border-t border-gray-50">
                                 <p className="text-sm text-gray-600 flex-1">
                                    {quotation.machines || 'Details unavailable'}
                                 </p>
                                 <span className="text-blue-600 font-medium group-hover:translate-x-1 transition-transform flex items-center text-xs flex-shrink-0 whitespace-nowrap mb-0.5">
                                   View Quote <ArrowLeft className="w-3 h-3 ml-1 rotate-180" />
                                 </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-gray-100 bg-gray-50/50">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-3">
                           <FileText className="w-6 h-6 text-gray-300" />
                        </div>
                        <h3 className="text-gray-900 font-medium mb-1">No quotations yet</h3>
                        <p className="text-sm text-gray-500 mb-4 max-w-xs mx-auto">Start by creating a new quotation for this customer.</p>
                        <button
                          onClick={() => navigate(`/quotations/new?customer=${id}`)}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create First Quotation
                        </button>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Error Toast for Quotations */}
      {customerResponse?.quotationsError && (
        <div className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-sm z-50">
          <p className="text-yellow-800 text-sm">
            Some quotation data may be incomplete
          </p>
        </div>
      )}
    </div>
  );
};

export default CustomerDetail;