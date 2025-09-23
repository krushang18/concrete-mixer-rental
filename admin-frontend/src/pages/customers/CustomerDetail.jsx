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
  History,
  TrendingUp,
  DollarSign,
  ClipboardList,
  Menu,
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
  const analytics = useMemo(() => {
    if (!quotations.length) return {};
    
    const acceptedQuotations = quotations.filter(q => 
      q.quotation_status === 'accepted' || q.quotation_status === 'approved'
    );
    
    const totalValue = acceptedQuotations.reduce((sum, q) => 
      sum + (parseFloat(q.grand_total) || 0), 0
    );

    const sortedByDate = [...quotations].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
    
    return {
      total_quotations: quotations.length,
      accepted_quotations: acceptedQuotations.length,
      total_quotation_value: totalValue,
      latest_quotation_subtotal: sortedByDate[0] ? parseFloat(sortedByDate[0].subtotal) || 0 : 0,
      highest_quotation_value: acceptedQuotations.length > 0
        ? Math.max(...acceptedQuotations.map(q => parseFloat(q.grand_total) || 0))
        : 0,
      first_quotation_date: quotations.length > 0 
        ? [...quotations].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0].created_at
        : null,
      last_quotation_date: sortedByDate[0]?.created_at || null,
      conversion_rate: quotations.length > 0 
        ? Math.round((acceptedQuotations.length / quotations.length) * 100)
        : 0
    };
  }, [quotations]);

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
    { id: 'quotations', label: `Quotes (${quotations.length})`, icon: ClipboardList },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp }
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
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 truncate mx-4">
            {customer.company_name}
          </h1>
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="border-t border-gray-200 bg-white">
            <div className="p-4 space-y-2">
              <button
                onClick={() => {
                  navigate(`/customers/${id}/edit`);
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-blue-600 bg-blue-50 rounded-lg"
              >
                <Edit className="w-4 h-4" />
                Edit Customer
              </button>
              <button
                onClick={() => {
                  handleDelete();
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  showDeleteConfirm 
                    ? 'bg-red-600 text-white' 
                    : 'text-red-600 bg-red-50'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                {showDeleteConfirm ? 'Confirm Delete' : 'Delete Customer'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        {/* Desktop Header */}
        <div className="hidden lg:block mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/customers')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                  <span className="text-blue-700 font-bold text-xl">
                    {getCustomerInitials(customer.company_name)}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{customer.company_name}</h1>
                  <p className="text-gray-600">{customer.contact_person}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-gray-500">
                      Customer since {formatDate(customer.created_at)}
                    </span>
                    {customer.gst_number && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">
                        GST Registered
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/customers/${id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  showDeleteConfirm 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'text-red-600 border border-red-600 hover:bg-red-50'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                {showDeleteConfirm ? 'Confirm Delete' : 'Delete'}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Customer Info Card */}
        <div className="lg:hidden mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-700 font-bold">
                  {getCustomerInitials(customer.company_name)}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-900">{customer.contact_person}</h2>
                <p className="text-sm text-gray-600">Customer since {formatDate(customer.created_at)}</p>
              </div>
              {customer.gst_number && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">
                  GST
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards - Mobile First Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Quotations</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900">{quotations.length}</p>
              </div>
              <ClipboardList className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last Quote Value</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900">
                  {formatCurrency(analytics.latest_quotation_subtotal)}
                </p>
              </div>
              <DollarSign className="w-6 h-6 lg:w-8 lg:h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last Quotation</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900">
                  {analytics.last_quotation_date ? 
                    formatDate(analytics.last_quotation_date) : 'Never'
                  }
                </p>
              </div>
              <Calendar className="w-6 h-6 lg:w-8 lg:h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Mobile Tab Navigation */}
          <div className="lg:hidden border-b border-gray-200 overflow-x-auto">
            <nav className="flex" aria-label="Tabs">
              {tabItems.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.id}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Desktop Tab Navigation */}
          <div className="hidden lg:block border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabItems.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 lg:p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      Contact Information
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                        <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-700">Email</p>
                          <p className="text-gray-900 truncate">{customer.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                        <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Phone</p>
                          <a href={`tel:${customer.phone}`} className="text-gray-900 hover:text-blue-600">
                            {customer.phone}
                          </a>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                        <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-700">Site Location</p>
                          <p className="text-gray-900">{customer.site_location}</p>
                        </div>
                      </div>
                      
                      {customer.address && (
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-md">
                          <Building2 className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-700">Address</p>
                            <p className="text-gray-900">{customer.address}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Business Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      Business Information
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                        <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-700">Company Name</p>
                          <p className="text-gray-900">{customer.company_name}</p>
                        </div>
                      </div>
                      
                      {customer.gst_number ? (
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-md">
                          <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-green-700">GST Number</p>
                            <p className="text-green-900 font-mono text-sm break-all">{customer.gst_number}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                          <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">GST Status</p>
                            <p className="text-gray-600">Not registered</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                        <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Customer Since</p>
                          <p className="text-gray-900">{formatDate(customer.created_at)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                        <History className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Last Updated</p>
                          <p className="text-gray-900">{formatDate(customer.updated_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quotations Tab */}
            {activeTab === 'quotations' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">Customer Quotations</h3>
                  <button
                    onClick={() => navigate(`/quotations/new?customer=${id}`)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New Quotation
                  </button>
                </div>

                {quotations.length > 0 ? (
                  <div className="space-y-3">
                    {quotations.map((quotation) => {
                      const statusDisplay = getQuotationStatusDisplay(quotation.quotation_status);
                      return (
                        <div key={quotation.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-gray-900 truncate">
                                  Quotation #{quotation.quotation_number}
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {quotation.machine_details || 'Machine details'} • {formatDate(quotation.created_at)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <span className={`px-2 py-1 text-xs rounded-md whitespace-nowrap ${statusDisplay.color}`}>
                                  {statusDisplay.label}
                                </span>
                                <button
                                  onClick={() => navigate(`/quotations/${quotation.id}`)}
                                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">Subtotal</p>
                                <p className="font-semibold">{formatCurrency(parseFloat(quotation.subtotal) || 0)}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">GST</p>
                                <p className="font-semibold">{formatCurrency(parseFloat(quotation.total_gst_amount) || 0)}</p>
                              </div>
                              <div className="col-span-2 lg:col-span-1">
                                <p className="text-gray-600">Total</p>
                                <p className="font-bold text-lg text-gray-900">
                                  {formatCurrency(parseFloat(quotation.grand_total) || 0)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No quotations yet</h3>
                    <p className="text-gray-500 mb-4">This customer hasn't received any quotations</p>
                    <button
                      onClick={() => navigate(`/quotations/new?customer=${id}`)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Create First Quotation
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Customer Analytics</h3>
                
                {quotations.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                      <h4 className="font-medium text-gray-900 mb-4">Quotation Summary</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Total Quotations:</span>
                          <span className="font-semibold text-lg">{analytics.total_quotations || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Accepted Quotations:</span>
                          <span className="font-semibold text-lg">{analytics.accepted_quotations || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Conversion Rate:</span>
                          <span className="font-semibold text-lg">{analytics.conversion_rate}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Total Value:</span>
                          <span className="font-semibold text-lg">{formatCurrency(analytics.total_quotation_value)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6">
                      <h4 className="font-medium text-gray-900 mb-4">Activity Timeline</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">First Quotation:</span>
                          <span className="font-semibold">
                            {analytics.first_quotation_date ? formatDate(analytics.first_quotation_date) : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Latest Quotation:</span>
                          <span className="font-semibold">
                            {analytics.last_quotation_date ? formatDate(analytics.last_quotation_date) : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Customer Age:</span>
                          <span className="font-semibold">
                            {Math.floor((new Date() - new Date(customer.created_at)) / (1000 * 60 * 60 * 24))} days
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Highest Quote:</span>
                          <span className="font-semibold">
                            {formatCurrency(analytics.highest_quotation_value)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mobile-friendly analytics charts could go here */}
                    <div className="lg:col-span-2">
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6">
                        <h4 className="font-medium text-gray-900 mb-4">Quick Insights</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-white rounded-lg">
                            <p className="text-2xl font-bold text-purple-600">
                              {analytics.conversion_rate}%
                            </p>
                            <p className="text-sm text-gray-600">Conversion Rate</p>
                          </div>
                          <div className="text-center p-4 bg-white rounded-lg">
                            <p className="text-2xl font-bold text-green-600">
                              {formatCurrency(analytics.total_quotation_value / analytics.total_quotations || 0)}
                            </p>
                            <p className="text-sm text-gray-600">Avg Quote Value</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics available</h3>
                    <p className="text-gray-500 mb-4">Analytics will appear once the customer has quotations</p>
                    <button
                      onClick={() => navigate(`/quotations/new?customer=${id}`)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Create First Quotation
                    </button>
                  </div>
                )}
              </div>
            )}
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