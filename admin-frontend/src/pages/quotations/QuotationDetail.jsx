import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Download,
  Building2,
  Phone,
  Calendar,
  User,
  FileText,
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ExternalLink,
  RefreshCcw,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

import { quotationApi } from '../../services/quotationApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Status configurations (reusing from list component)
const quotationStatusConfig = {
  draft: { label: 'Draft', color: 'gray', icon: FileText },
  sent: { label: 'Sent', color: 'blue', icon: Clock },
  accepted: { label: 'Accepted', color: 'green', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'red', icon: XCircle },
  expired: { label: 'Expired', color: 'orange', icon: AlertCircle }
};



const QuotationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State management
  const [deleteDialog, setDeleteDialog] = useState(false);

  // Fetch quotation details
  const { data: quotationData, isLoading, error, refetch } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationApi.getById(id),
    retry: 1
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: quotationApi.delete,
    onSuccess: () => {
      navigate('/quotations');
    },
    onError: (error) => {
      // Toast handled by API
    }
  });

  // Status update mutations
  const statusMutation = useMutation({
    mutationFn: ({ status }) => quotationApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['quotation', id]);
      queryClient.invalidateQueries(['quotations']);
    },
    onError: (error) => {
      // Toast handled by API
    }
  });



  // Handlers
  const handleDelete = () => {
    setDeleteDialog(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(id);
    setDeleteDialog(false);
  };

  const handleStatusUpdate = (status) => {
    statusMutation.mutate({ status });
  };



  // Download PDF functionality
  const handleDownloadPDF = async () => {
    try {
      toast.loading('Generating PDF...', { id: 'pdf-download' });
      
      await quotationApi.generatePDF(id);
      
      toast.success('PDF downloaded successfully', { id: 'pdf-download' });
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error(error.message || 'Failed to download PDF', { id: 'pdf-download' });
    }
  };

  // Status Badge Component
  const StatusBadge = ({ status, showDropdown = false, onUpdate }) => {
    
    // Handle undefined or empty status
    const currentStatus = status || 'draft';
    const statusInfo = quotationStatusConfig[currentStatus] || { 
      label: currentStatus || 'Unknown', 
      color: 'gray', 
      icon: AlertCircle 
    };
    const Icon = statusInfo.icon;

    const colorClasses = {
      gray: 'bg-gray-100 text-gray-800',
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      orange: 'bg-orange-100 text-orange-800'
    };

    if (!showDropdown) {
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[statusInfo.color]}`}>
          <Icon className="w-3 h-3 mr-1" />
          {statusInfo.label}
        </span>
      );
    }

    return (
      <div className="relative">
        <details className="group">
          <summary className={`cursor-pointer inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[statusInfo.color]} hover:opacity-80 list-none`}>
            <Icon className="w-3 h-3 mr-1" />
            {statusInfo.label}
            <ChevronDown className="w-3 h-3 ml-1 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border z-50 min-w-[120px]">
            <div className="py-1">
              {Object.entries(quotationStatusConfig).map(([key, statusConfig]) => {
                const StatusIcon = statusConfig.icon;
                return (
                  <button
                    key={key}
                    onClick={() => onUpdate(key)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center ${
                      key === currentStatus ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <StatusIcon className="w-3 h-3 mr-2" />
                    {statusConfig.label}
                  </button>
                );
              })}
            </div>
          </div>
        </details>
      </div>
    );
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-red-500 mb-4">
          <AlertCircle className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error loading quotation</h3>
        <p className="text-gray-600 mb-6">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Retry
        </button>
      </div>
    </div>
  );

  const quotation = quotationData?.data;
  if (!quotation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-gray-400 mb-4">
            <FileText className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Quotation not found</h3>
          <p className="text-gray-600 mb-6">The requested quotation could not be found.</p>
          <Link
            to="/quotations"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border mb-4 sm:mb-6">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                onClick={() => navigate('/quotations')}
                className="p-2 text-gray-400 hover:text-gray-600 shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                  {quotation.quotation_number}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Created {new Date(quotation.created_at).toLocaleDateString('en-IN')} 
                  {quotation.created_by_user && ` by ${quotation.created_by_user}`}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {/* <button
                onClick={handleDownloadPDF}
                className="flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
              >
                <Download className="w-4 h-4 mr-2" />
                PDF
              </button>
              <Link
                to={`/quotations/${id}/edit`}
                className="flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Link> */}
              <button
                onClick={handleDelete}
                className="flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status and Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-sm font-medium text-gray-700">Quotation Status</span>
                <StatusBadge 
                  status={quotation.quotation_status} 
                  showDropdown={true} 
                  onUpdate={handleStatusUpdate} 
                />
              </div>

            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Subtotal:</span>
                <span className="font-medium">₹{quotation.subtotal?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">GST:</span>
                <span className="font-medium">₹{quotation.total_gst_amount?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium text-gray-900">Total:</span>
                <span className="text-lg font-bold text-gray-900">₹{quotation.grand_total?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Items:</span>
                <span className="text-sm font-medium flex items-center">
                  <Package className="w-4 h-4 mr-1" />
                  {quotation.items?.length || 0} item(s)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={handleDownloadPDF}
                className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
              <Link
                to={`/quotations/${id}/edit`}
                className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Quotation
              </Link>
              {quotation.customer_id && (
                <Link
                  to={`/customers/${quotation.customer_id}`}
                  className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Customer
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="bg-white rounded-lg shadow-sm border mb-4 sm:mb-6">
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {quotation.customer_name}
                  </p>
                  <p className="text-xs text-gray-500">Customer Name</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {quotation.customer_contact}
                  </p>
                  <p className="text-xs text-gray-500">Contact Number</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {quotation.company_name && (
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 break-words">
                      {quotation.company_name}
                    </p>
                    <p className="text-xs text-gray-500">Company Name</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(quotation.created_at).toLocaleDateString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-500">Quotation Date</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quotation Items */}
      <div className="bg-white rounded-lg shadow-sm border mb-4 sm:mb-6">
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quotation Items</h3>
          {quotation.items && quotation.items.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GST
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quotation.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900">
                          <div className="max-w-xs">
                            <p className="font-medium break-words">
                              {item.description}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {item.item_type === 'machine' ? 'Machine' : 'Additional Charge'}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.duration_type || '-'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{item.unit_price?.toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.gst_percentage}% (₹{item.gst_amount?.toLocaleString('en-IN')})
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ₹{item.total_amount?.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {quotation.items.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-shadow">
                    {/* Item Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Item #{index + 1}</span>
                        <p className="font-medium text-gray-900 mt-1 text-base">{item.description}</p>
                        <p className="text-xs text-gray-500">{item.item_type === 'machine' ? 'Machine' : 'Additional Charge'}</p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded ml-2 whitespace-nowrap">
                        Qty: {item.quantity}
                      </span>
                    </div>
                    
                    {/* Divider */}
                    <div className="border-t border-gray-100 my-2"></div>

                    {/* Details Grid */}
                    <div className="space-y-2 text-sm">
                      {item.duration_type && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Duration:</span>
                          <span className="font-medium text-gray-900">{item.duration_type}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Unit Price:</span>
                        <span className="font-medium text-gray-900">₹{item.unit_price?.toLocaleString('en-IN')}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">GST ({item.gst_percentage}%) :</span>
                        <span className="font-medium text-gray-900">₹{item.gst_amount?.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                     
                     {/* Total Footer */}
                     <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between items-center bg-gray-50 -mx-4 -mb-4 px-4 py-3 rounded-b-lg">
                        <span className="font-medium text-gray-700">Total Amount</span>
                        <span className="text-lg font-bold text-gray-900">₹{item.total_amount?.toLocaleString('en-IN')}</span>
                     </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No items found in this quotation</p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Notes */}
      {quotation.additional_notes && (
        <div className="bg-white rounded-lg shadow-sm border mb-4 sm:mb-6">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Notes</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                {quotation.additional_notes}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Terms & Conditions */}
      {quotation.terms_text && (
        <div className="bg-white rounded-lg shadow-sm border mb-4 sm:mb-6">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Terms & Conditions</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words font-mono">
                {quotation.terms_text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog}
        title="Delete Quotation"
        message="Are you sure you want to delete this quotation? This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog(false)}
        loading={deleteMutation.isLoading}
      />
    </div>
  );
};

export default QuotationDetail;