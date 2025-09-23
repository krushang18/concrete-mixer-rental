import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { create } from 'zustand';
import { 
  X, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  FileText, 
  Calendar,
  Edit3,
  AlertCircle,
  CheckCircle2,
  User,
  Copy,
  ExternalLink,
  ChevronDown,
  ArrowLeft
} from 'lucide-react';

// Zustand store for modal state management
const useModalStore = create((set) => ({
  activeTab: 'details',
  isStatusDropdownOpen: false,
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleStatusDropdown: () => set((state) => ({ isStatusDropdownOpen: !state.isStatusDropdownOpen })),
  closeStatusDropdown: () => set({ isStatusDropdownOpen: false })
}));

// Status configurations
const statusConfig = {
  new: {
    label: 'New',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: AlertCircle,
    dotColor: 'bg-blue-500'
  },
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
    dotColor: 'bg-yellow-500'
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: Clock,
    dotColor: 'bg-orange-500'
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle2,
    dotColor: 'bg-green-500'
  }
};

// Validation schema for status updates
const statusUpdateSchema = yup.object({
  status: yup.string().oneOf(['new', 'pending', 'in_progress', 'completed'], 'Invalid status').required()
});

// Mobile-first Status Badge Component
const StatusBadge = ({ status, showDot = false, size = 'md' }) => {
  const config = statusConfig[status] || statusConfig.new;
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };
  
  return (
    <div className="flex items-center space-x-2">
      {showDot && <div className={`w-3 h-3 rounded-full ${config.dotColor}`}></div>}
      <span className={`inline-flex items-center rounded-full font-medium border ${config.color} ${sizeClasses[size]}`}>
        <Icon className="w-4 h-4 mr-2" />
        {config.label}
      </span>
    </div>
  );
};

// Copy to clipboard utility with toast feedback
const useCopyToClipboard = () => {
  const copyToClipboard = async (text, label = 'Text') => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };
  
  return copyToClipboard;
};

// Mobile-first Tab Navigation
const TabNavigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'actions', label: 'Actions', icon: Edit3 }
  ];

  return (
    <div className="border-b bg-white">
      <nav className="flex">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 text-center border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4 inline mr-2" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

// Mobile-optimized Info Card Component
const InfoCard = ({ title, icon: Icon, children, className = "" }) => {
  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <h3 className="text-base font-medium text-gray-900 mb-3 flex items-center">
        <Icon className="w-5 h-5 mr-2" />
        {title}
      </h3>
      {children}
    </div>
  );
};

// Copyable Text Component
const CopyableText = ({ text, label, href, className = "" }) => {
  const copyToClipboard = useCopyToClipboard();
  
  const TextContent = href ? (
    <a 
      href={href}
      className="text-blue-600 hover:text-blue-700 font-medium break-all"
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {text}
    </a>
  ) : (
    <span className={`text-gray-900 ${className}`}>{text}</span>
  );

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex-1 min-w-0">
        {TextContent}
      </div>
      <div className="flex items-center space-x-1 flex-shrink-0">
        <button
          onClick={() => copyToClipboard(text, label)}
          className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
          title={`Copy ${label}`}
        >
          <Copy className="w-4 h-4" />
        </button>
        {href && (
          <ExternalLink className="w-4 h-4 text-gray-400" />
        )}
      </div>
    </div>
  );
};

// Mobile-first Status Update Component with React Hook Form
const StatusUpdateSection = ({ currentQuery, onStatusUpdate, isUpdating }) => {
  const { isStatusDropdownOpen, toggleStatusDropdown, closeStatusDropdown } = useModalStore();
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(statusUpdateSchema),
    defaultValues: { status: currentQuery.status }
  });

  const statusOptions = [
    { value: 'new', label: 'New', show: currentQuery.status !== 'new' },
    { value: 'pending', label: 'Pending', show: currentQuery.status !== 'pending' },
    { value: 'in_progress', label: 'In Progress', show: currentQuery.status !== 'in_progress' },
    { value: 'completed', label: 'Completed', show: currentQuery.status !== 'completed' }
  ].filter(option => option.show);

  const onSubmit = (data) => {
    onStatusUpdate(currentQuery.id, data.status);
    closeStatusDropdown();
  };

  if (statusOptions.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700">Current Status:</span>
          <StatusBadge status={currentQuery.status} />
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Query is already in the final status.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-3">Update Status</h4>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700">Current Status:</span>
          <StatusBadge status={currentQuery.status} size="sm" />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Change to:
          </label>
          
          {/* Mobile-first status selection */}
          <div className="sm:hidden">
            <div className="relative">
              <button
                type="button"
                onClick={toggleStatusDropdown}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white text-left text-sm"
              >
                <span>Select new status</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isStatusDropdownOpen && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white border rounded-lg shadow-lg z-30">
                  <div className="py-1">
                    {statusOptions.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onStatusUpdate(currentQuery.id, option.value);
                          closeStatusDropdown();
                        }}
                        disabled={isUpdating}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      >
                        {isUpdating ? 'Updating...' : `Mark as ${option.label}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Desktop status selection */}
          <div className="hidden sm:flex flex-wrap gap-2">
            {statusOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => onStatusUpdate(currentQuery.id, option.value)}
                disabled={isUpdating}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 disabled:opacity-50 transition-colors"
              >
                {isUpdating ? 'Updating...' : `Mark as ${option.label}`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Communication Actions Component
const CommunicationActions = ({ query }) => {
  const emailSubject = `Regarding your concrete mixer rental inquiry - QRY-${String(query.id).padStart(4, '0')}`;
  const emailBody = `Dear ${query.company_name} Team,%0D%0A%0D%0AThank you for your inquiry about concrete mixer rental.%0D%0A%0D%0AProject Details:%0D%0A- Duration: ${query.duration}%0D%0A- Location: ${query.site_location}%0D%0A%0D%0AWe will get back to you with a detailed quotation shortly.%0D%0A%0D%0ABest regards,%0D%0AConcrete Mixer Rental Team`;
  
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-3">Quick Communication</h4>
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={`mailto:${query.email}?subject=${emailSubject}&body=${emailBody}`}
          className="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          <Mail className="w-4 h-4 mr-2" />
          Send Email
        </a>
        
        <a
          href={`tel:${query.contact_number}`}
          className="flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
        >
          <Phone className="w-4 h-4 mr-2" />
          Call Customer
        </a>
      </div>
    </div>
  );
};

// Main Query Details Modal Component - Mobile First
const QueryDetailsModal = ({ 
  query, 
  isOpen, 
  onClose, 
  onStatusUpdate, 
  isUpdating = false 
}) => {
  const [currentQuery, setCurrentQuery] = useState(query);
  const { activeTab, setActiveTab } = useModalStore();
  
  // Update currentQuery when query prop changes (after status update)
  useEffect(() => {
    if (query) {
      setCurrentQuery(query);
    }
  }, [query]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !currentQuery) return null;
  
  // Utility function to format dates for Indian locale
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleStatusUpdate = async (queryId, newStatus) => {
    // Optimistic update for immediate UI feedback
    setCurrentQuery(prev => ({ 
      ...prev, 
      status: newStatus, 
      updated_at: new Date().toISOString() 
    }));
    
    // Call the parent's update function
    await onStatusUpdate(queryId, newStatus);
  };

  const daysSinceSubmission = Math.floor(
    (new Date() - new Date(currentQuery.created_at)) / (1000 * 60 * 60 * 24)
  );
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      {/* Mobile-first modal container */}
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-lg flex flex-col shadow-2xl">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 sm:rounded-t-lg">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="sm:hidden text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Query Details
              </h2>
              <p className="text-xs sm:text-sm text-gray-600">
                ID: QRY-{String(currentQuery.id).padStart(4, '0')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <StatusBadge status={currentQuery.status} showDot size="sm" />
            <button
              onClick={onClose}
              className="hidden sm:block text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'details' && (
            <div className="p-4 space-y-4">
              {/* Company Information */}
              <InfoCard title="Company Information" icon={Building2}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <CopyableText 
                      text={currentQuery.company_name}
                      label="Company name"
                      className="font-medium"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Site Location
                    </label>
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <CopyableText 
                        text={currentQuery.site_location}
                        label="Site location"
                      />
                    </div>
                  </div>
                </div>
              </InfoCard>
              
              {/* Contact Information */}
              <InfoCard title="Contact Information" icon={User}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <div className="flex items-start space-x-2">
                      <Mail className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <CopyableText 
                        text={currentQuery.email}
                        label="Email address"
                        href={`mailto:${currentQuery.email}`}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Number
                    </label>
                    <div className="flex items-start space-x-2">
                      <Phone className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <CopyableText 
                        text={currentQuery.contact_number}
                        label="Contact number"
                        href={`tel:${currentQuery.contact_number}`}
                      />
                    </div>
                  </div>
                </div>
              </InfoCard>
              
              {/* Project Details */}
              <InfoCard title="Project Details" icon={FileText}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Duration
                    </label>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-900 font-medium">{currentQuery.duration}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Work Description
                    </label>
                    <div className="bg-white rounded-lg p-3 border">
                      <p className="text-gray-900 leading-relaxed text-sm">
                        {currentQuery.work_description}
                      </p>
                    </div>
                  </div>
                </div>
              </InfoCard>
              
              {/* Timeline */}
              <InfoCard title="Timeline" icon={Calendar}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Query Submitted:</span>
                    <span className="text-sm text-gray-900">{formatDate(currentQuery.created_at)}</span>
                  </div>
                  
                  {currentQuery.updated_at !== currentQuery.created_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Last Updated:</span>
                      <span className="text-sm text-gray-900">{formatDate(currentQuery.updated_at)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Days Since Submission:</span>
                    <span className="text-sm text-gray-900">
                      {daysSinceSubmission} {daysSinceSubmission === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                </div>
              </InfoCard>
            </div>
          )}
          
          {activeTab === 'actions' && (
            <div className="p-4 space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Edit3 className="w-5 h-5 mr-2" />
                Quick Actions
              </h3>
              
              {/* Status Update */}
              <StatusUpdateSection
                currentQuery={currentQuery}
                onStatusUpdate={handleStatusUpdate}
                isUpdating={isUpdating}
              />
              
              {/* Communication Actions */}
              <CommunicationActions query={currentQuery} />
            </div>
          )}
        </div>
        
        {/* Mobile-first Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 border-t sm:rounded-b-lg gap-3">
          <div className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1">
            Query ID: {currentQuery.id} • Created {formatDate(currentQuery.created_at).split(' at')[0]}
          </div>
          
          <div className="flex items-center space-x-3 order-1 sm:order-2">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueryDetailsModal;