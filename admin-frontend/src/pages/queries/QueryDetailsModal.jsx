import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  X, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  FileText, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  User,
  Copy,
  ExternalLink,
  ChevronDown,
  ArrowLeft,
  RefreshCw // Added
} from 'lucide-react';

// Status configurations
const statusConfig = {
  new: {
    label: 'New',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: AlertCircle
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: Clock
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle2
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: X
  }
};

// Status Badge Component
const StatusBadge = ({ status, size = 'md' }) => {
  const config = statusConfig[status] || statusConfig.new;
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium border ${config.color} ${sizeClasses[size]}`}>
      <Icon className="w-4 h-4 mr-2" />
      {config.label}
    </span>
  );
};

// Copy to clipboard utility
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

// Info Card Component
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

// Status Update Section with new style
const StatusUpdateSection = ({ currentQuery, onStatusUpdate, isUpdating }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const statusOptions = [
    { value: 'new', label: 'New', show: currentQuery.status !== 'new' },
    { value: 'in_progress', label: 'In Progress', show: currentQuery.status !== 'in_progress' },
    { value: 'completed', label: 'Completed', show: currentQuery.status !== 'completed' },
    { value: 'cancelled', label: 'Cancelled', show: currentQuery.status !== 'cancelled' }
  ].filter(opt => opt.show);

  if (statusOptions.length === 0) return null;

  return (
    <div className="bg-primary-50/50 rounded-xl p-5 border border-primary-100">
      <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-3 shadow-sm text-primary-600">
           <RefreshCw className="w-4 h-4" />
        </div>
        Update Status
      </h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        <div className="flex items-center p-3 bg-white rounded-lg border border-gray-200">
          <span className="text-sm text-gray-500 mr-2">Current:</span>
          <StatusBadge status={currentQuery.status} size="sm" />
        </div>
        
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium text-sm shadow-sm"
          >
            <span>Change Status</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-xl z-30 overflow-hidden py-1">
              {statusOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    onStatusUpdate(currentQuery.id, option.value);
                    setIsDropdownOpen(false);
                  }}
                  disabled={isUpdating}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-700 transition-colors disabled:opacity-50"
                >
                  {isUpdating ? 'Updating...' : `Mark as ${option.label}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Communication Actions
const CommunicationActions = ({ query }) => {
  const emailSubject = `Regarding your concrete mixer rental inquiry - QRY-${String(query.id).padStart(4, '0')}`;
  const emailBody = `Dear ${query.company_name} Team,%0D%0A%0D%0AThank you for your inquiry about concrete mixer rental.%0D%0A%0D%0AProject Details:%0D%0A- Duration: ${query.duration}%0D%0A- Location: ${query.site_location}%0D%0A%0D%0AWe will get back to you with a detailed quotation shortly.%0D%0A%0D%0ABest regards,%0D%0AConcrete Mixer Rental Team`;
  
  return (
    <div className="mt-6 flex flex-col sm:flex-row gap-3">
      <a
        href={`mailto:${query.email}?subject=${emailSubject}&body=${emailBody}`}
        className="flex-1 flex items-center justify-center px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98]"
      >
        <Mail className="w-4 h-4 mr-2" />
        Send Email
      </a>
      
      <a
        href={`tel:${query.contact_number}`}
        className="flex-1 flex items-center justify-center px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-semibold shadow-sm active:scale-[0.98]"
      >
        <Phone className="w-4 h-4 mr-2 text-secondary-600" />
        Call Customer
      </a>
    </div>
  );
};

// Main Query Details Modal
const QueryDetailsModal = ({ 
  query, 
  isOpen, 
  onClose, 
  onStatusUpdate, 
  isUpdating = false 
}) => {
  const [currentQuery, setCurrentQuery] = useState(query);
  
  useEffect(() => {
    if (query) setCurrentQuery(query);
  }, [query]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !currentQuery) return null;
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const handleStatusUpdate = async (queryId, newStatus) => {
    // Optimistic update
    setCurrentQuery(prev => ({ 
      ...prev, status: newStatus, updated_at: new Date().toISOString() 
    }));
    await onStatusUpdate(queryId, newStatus);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/60 transition-opacity backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal - Bottom Sheet on Mobile, Centered on Desktop */}
      <div className="relative w-full h-[85vh] sm:h-auto sm:max-h-[85vh] sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col transform transition-transform animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:fade-in-20">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white sm:rounded-t-2xl sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              Query Details
              <StatusBadge status={currentQuery.status} size="sm" />
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              ID: QRY-{String(currentQuery.id).padStart(4, '0')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="space-y-6">
            {/* Quick Actions (Mobile Only) */}
            <div className="sm:hidden -mt-2 mb-6">
               <CommunicationActions query={currentQuery} />
            </div>

            {/* Company Info */}
            <section>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Customer Information</h3>
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                     <label className="text-xs font-semibold text-gray-500 mb-1 block">Company / Name</label>
                     <p className="font-semibold text-gray-900 text-lg">{currentQuery.company_name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Site Location</label>
                    <div className="flex items-center text-gray-700">
                      <MapPin className="w-4 h-4 text-primary-500 mr-2" />
                      {currentQuery.site_location}
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <CopyableText 
                    text={currentQuery.email}
                    label="Email"
                    href={`mailto:${currentQuery.email}`}
                    className="text-sm"
                  />
                  <CopyableText 
                    text={currentQuery.contact_number}
                    label="Phone"
                    href={`tel:${currentQuery.contact_number}`}
                    className="text-sm"
                  />
                </div>
              </div>
            </section>
            
            {/* Project Info */}
            <section>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Project Requirement</h3>
              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center mb-4 text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg w-fit text-sm font-medium">
                  <Clock className="w-4 h-4 mr-2" />
                  Duration: {currentQuery.duration}
                </div>
                <div>
                   <label className="text-xs font-semibold text-gray-500 mb-2 block">Description</label>
                   <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {currentQuery.work_description}
                   </p>
                </div>
              </div>
            </section>

            {/* Status Update */}
            <StatusUpdateSection
              currentQuery={currentQuery}
              onStatusUpdate={handleStatusUpdate}
              isUpdating={isUpdating}
            />
            
            {/* Metadata */}
            <div className="flex items-center justify-center text-xs text-gray-400 py-2">
              <Calendar className="w-3 h-3 mr-1.5" />
              Submitted on {formatDate(currentQuery.created_at)}
            </div>
          </div>
        </div>
        
        {/* Footer Actions (Desktop) */}
        <div className="hidden sm:block p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
           <CommunicationActions query={currentQuery} />
        </div>
      </div>
    </div>
  );
};

export default QueryDetailsModal;