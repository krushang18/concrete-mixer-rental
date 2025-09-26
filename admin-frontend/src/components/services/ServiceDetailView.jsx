import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { serviceApi, serviceUtils } from '../../services/serviceApi';
import { 
  ArrowLeft, Calendar, MapPin, User, Clock, FileText, 
  CheckCircle, Settings, Edit, Trash2,
  AlertCircle, Wrench, RefreshCw
} from 'lucide-react';

const ServiceDetailView = () => {
  const navigate = useNavigate();
  const { serviceId } = useParams();
  const queryClient = useQueryClient();
  
  // Optimized service detail query with better caching
  const { data: serviceData, isLoading, error, refetch } = useQuery({
    queryKey: ['service-detail', serviceId],
    queryFn: () => serviceApi.getById(serviceId),
    enabled: !!serviceId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Optimized delete mutation with navigation
  const deleteMutation = useMutation({
    mutationFn: (id) => serviceApi.delete(id),
    onSuccess: () => {
      toast.success('Service record deleted successfully');
      // Invalidate related queries
      queryClient.invalidateQueries(['services']);
      queryClient.invalidateQueries(['service-stats']);
      // Navigate back to list
      navigate('/services', { replace: true });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete service record');
    }
  });

  // Export mutation for better UX
  const exportMutation = useMutation({
    mutationFn: (id) => serviceApi.exportSingle(id),
    onSuccess: () => {
      toast.success('Service record exported successfully');
    },
    onError: () => {
      toast.error('Failed to export service record');
    }
  });

  const service = serviceData?.data;

  // Event handlers with useCallback
  const handleBack = useCallback(() => {
    navigate('/services');
  }, [navigate]);

  const handleEdit = useCallback(() => {
    navigate(`/services/${serviceId}/edit`);
  }, [navigate, serviceId]);

  const handleDelete = useCallback(() => {
    if (window.confirm('Are you sure you want to delete this service record? This action cannot be undone.')) {
      deleteMutation.mutate(serviceId);
    }
  }, [deleteMutation, serviceId]);

  const handleExport = useCallback(() => {
    exportMutation.mutate(serviceId);
  }, [exportMutation, serviceId]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Service Record #${serviceId}`,
          text: `Service record for ${service?.machine_name || 'machine'}`,
          url: url
        });
      } catch (err) {
        // Fallback to copy
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  }, [serviceId, service?.machine_name]);

  // Utility functions moved outside render for better performance
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Not specified';
    return serviceUtils.formatDate(dateString);
  }, []);

  const formatEngineHours = useCallback((hours) => {
    return serviceUtils.formatEngineHours(hours);
  }, []);

  const getServiceStatus = useCallback((serviceDate) => {
    return serviceUtils.getServiceStatus(serviceDate);
  }, []);

  // Check if serviceId is provided AFTER hooks
  if (!serviceId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Missing Service ID</h2>
          <p className="text-gray-600 mb-4">
            No service ID was provided. Please check the URL or navigation.
          </p>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Loading state - Mobile optimized
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading service details...</p>
        </div>
      </div>
    );
  }

  // Error state - Mobile optimized
  if (error || (!isLoading && !service)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            {error?.response?.status === 404 ? 'Service Record Not Found' : 'Unable to Load Service Record'}
          </h2>
          <p className="text-gray-600 mb-4 text-sm sm:text-base">
            {error?.response?.status === 404 
              ? "The service record you're looking for doesn't exist or has been removed."
              : error?.message || "There was a problem loading the service record. Please try again."
            }
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
            <button
              onClick={handleBack}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusBadge = getServiceStatus(service.service_date);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {/* Mobile-first Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col gap-4">
            {/* Top row - Back button and actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors p-2 -ml-2 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                <span className="text-sm font-medium">Back</span>
              </button>
              
              {/* Mobile action menu */}
              {/* <div className="flex items-center gap-2">
                <button
                  onClick={handleShare}
                  className="p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
                  title="Share"
                >
                  <Share className="w-5 h-5" />
                </button>
                <button
                  onClick={handleExport}
                  disabled={exportMutation.isPending}
                  className="p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100 disabled:opacity-50"
                  title="Export"
                >
                  {exportMutation.isPending ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                </button>
              </div> */}
            </div>
            
            {/* Title and status */}
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                Service Record Details
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  statusBadge.status === 'current' ? 'bg-green-100 text-green-800' :
                  statusBadge.status === 'due' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {statusBadge.message}
                </span>
                <span className="text-sm text-gray-500">
                  Record #{serviceId}
                </span>
              </div>
            </div>
            
            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex flex-wrap gap-2">
              {/* <button
                onClick={handleExport}
                disabled={exportMutation.isPending}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {exportMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export
              </button> */}
              
              <button
                onClick={handleEdit}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
              
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          
          {/* Basic Information - Mobile optimized layout */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              
              {/* Machine */}
              <div className="space-y-1">
                <div className="flex items-center text-sm font-medium text-gray-500">
                  <Settings className="w-4 h-4 mr-1" />
                  Machine
                </div>
                <div className="text-base font-medium text-gray-900">
                  {service.machine_name || 'Unknown Machine'}
                </div>
                {service.machine_number && (
                  <div className="text-sm text-gray-600">
                    {service.machine_number}
                  </div>
                )}
              </div>

              {/* Service Date */}
              <div className="space-y-1">
                <div className="flex items-center text-sm font-medium text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  Service Date
                </div>
                <div className="text-base font-medium text-gray-900">
                  {formatDate(service.service_date)}
                </div>
              </div>

              {/* Engine Hours */}
              <div className="space-y-1">
                <div className="flex items-center text-sm font-medium text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  Engine Hours
                </div>
                <div className="text-base font-medium text-gray-900">
                  {formatEngineHours(service.engine_hours)}
                </div>
              </div>

              {/* Operator */}
              <div className="space-y-1">
                <div className="flex items-center text-sm font-medium text-gray-500">
                  <User className="w-4 h-4 mr-1" />
                  Operator
                </div>
                <div className="text-base font-medium text-gray-900">
                  {service.operator || 'Not specified'}
                </div>
              </div>

              {/* Site Location */}
              <div className="col-span-1 sm:col-span-2 space-y-1">
                <div className="flex items-center text-sm font-medium text-gray-500">
                  <MapPin className="w-4 h-4 mr-1" />
                  Site Location
                </div>
                <div className="text-base font-medium text-gray-900">
                  {service.site_location || 'Not specified'}
                </div>
              </div>

              {/* Created By */}
              {service.created_by_user && (
                <div className="col-span-1 sm:col-span-2 space-y-1">
                  <div className="flex items-center text-sm font-medium text-gray-500">
                    <User className="w-4 h-4 mr-1" />
                    Created By
                  </div>
                  <div className="text-base font-medium text-gray-900">
                    {service.created_by_user}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Services Performed - Mobile optimized */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Wrench className="w-5 h-5 mr-2 text-blue-600" />
                Services Performed
              </h2>
              {service.services && service.services.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2 sm:mt-0">
                  {service.services.length} {service.services.length === 1 ? 'Category' : 'Categories'}
                </span>
              )}
            </div>

            {service.services && service.services.length > 0 ? (
              <div className="space-y-4">
                {service.services.map((serviceCategory, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    
                    {/* Category Header */}
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-gray-900">
                              {serviceCategory.service_name || serviceCategory.category_name}
                            </h3>
                            {serviceCategory.service_description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {serviceCategory.service_description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {serviceCategory.was_performed && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 flex-shrink-0 ml-2">
                            Completed
                          </span>
                        )}
                      </div>
                      
                      {/* Category Notes */}
                      {serviceCategory.service_notes && (
                        <div className="mt-3 p-3 bg-white rounded border">
                          <div className="text-xs font-medium text-gray-500 mb-1">Category Notes:</div>
                          <div className="text-sm text-gray-700 break-words">{serviceCategory.service_notes}</div>
                        </div>
                      )}
                    </div>

                    {/* Sub-services - Mobile optimized */}
                    {serviceCategory.sub_services && serviceCategory.sub_services.length > 0 && (
                      <div className="p-4">
                        <div className="text-sm font-medium text-gray-700 mb-3">
                          Sub-services performed ({serviceCategory.sub_services.length}):
                        </div>
                        <div className="space-y-3">
                          {serviceCategory.sub_services.map((subService, subIndex) => (
                            <div key={subIndex} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm">
                                  {subService.sub_service_name || subService.name}
                                </div>
                                {subService.sub_service_description && (
                                  <div className="text-xs text-gray-600 mt-1 break-words">
                                    {subService.sub_service_description}
                                  </div>
                                )}
                                {subService.sub_service_notes && (
                                  <div className="mt-2 p-2 bg-white rounded border">
                                    <div className="text-xs font-medium text-gray-500 mb-1">Notes:</div>
                                    <div className="text-xs text-gray-700 break-words">{subService.sub_service_notes}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Wrench className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm sm:text-base">No services were recorded for this session</p>
              </div>
            )}
          </div>

          {/* General Notes */}
          {service.general_notes && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                General Notes
              </h2>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 bg-gray-50 p-4 rounded-lg border text-sm break-words">
                  {service.general_notes}
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              Record Information
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-500">Created</div>
                <div className="text-base text-gray-900">
                  {formatDate(service.created_at)}
                </div>
              </div>
              
              {service.updated_at && service.updated_at !== service.created_at && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-500">Last Updated</div>
                  <div className="text-base text-gray-900">
                    {formatDate(service.updated_at)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Action Buttons */}
          <div className="sm:hidden">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleEdit}
                  className="flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </button>
                
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleteMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailView;