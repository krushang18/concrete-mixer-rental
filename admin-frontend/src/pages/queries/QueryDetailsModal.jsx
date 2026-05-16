import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  X,
  Mail,
  Phone,
  MapPin,
  Clock,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Copy,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';

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

const StatusBadge = ({ status }) => {
  const config = statusConfig[status] || statusConfig.new;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
      <Icon className="w-3 h-3 mr-1.5" />
      {config.label}
    </span>
  );
};

const useCopyToClipboard = () => {
  return async (text, label = 'Text') => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied!`);
    } catch {
      toast.error('Failed to copy');
    }
  };
};

const CopyableText = ({ text, label, className = '' }) => {
  const copy = useCopyToClipboard();
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`text-gray-900 break-all text-sm ${className}`}>{text}</span>
      <button
        onClick={() => copy(text, label)}
        className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors flex-shrink-0"
        title={`Copy ${label}`}
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const StatusUpdateBar = ({ currentQuery, onStatusUpdate, isUpdating }) => {
  const handleChange = (e) => {
    const newStatus = e.target.value;
    if (newStatus !== currentQuery.status) {
      onStatusUpdate(currentQuery.id, newStatus);
    }
  };

  return (
    <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50/60">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">Status</span>
      <StatusBadge status={currentQuery.status} />
      <div className="ml-auto flex items-center gap-2">
        {isUpdating && <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin" />}
        <div className="relative">
          <select
            value={currentQuery.status}
            onChange={handleChange}
            disabled={isUpdating}
            className="text-sm border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 bg-white text-gray-700 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 cursor-pointer disabled:opacity-50 appearance-none"
          >
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

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

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
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

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

  const handleStatusUpdate = async (queryId, newStatus) => {
    setCurrentQuery(prev => ({ ...prev, status: newStatus, updated_at: new Date().toISOString() }));
    await onStatusUpdate(queryId, newStatus);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full h-[85vh] sm:h-auto sm:max-h-[85vh] sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sm:rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Query Details</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              QRY-{String(currentQuery.id).padStart(4, '0')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status bar — always visible just below header */}
        <StatusUpdateBar
          currentQuery={currentQuery}
          onStatusUpdate={handleStatusUpdate}
          isUpdating={isUpdating}
        />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Customer Information */}
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Customer Information</h3>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Company / Name</label>
                  <p className="font-semibold text-gray-900">{currentQuery.company_name}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Site Location</label>
                  <div className="flex items-start text-gray-700 text-sm gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary-500 mt-0.5 shrink-0" />
                    {currentQuery.site_location}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email
                  </label>
                  <CopyableText text={currentQuery.email} label="Email" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Phone
                  </label>
                  <CopyableText text={currentQuery.contact_number} label="Phone" />
                </div>
              </div>
            </div>
          </section>

          {/* Project Requirement */}
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Project Requirement</h3>
            <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
              <div className="flex items-center text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg w-fit text-sm font-medium">
                <Clock className="w-3.5 h-3.5 mr-2" />
                Duration: {currentQuery.duration}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Description
                </label>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {currentQuery.work_description}
                </p>
              </div>
            </div>
          </section>

          {/* Metadata */}
          <div className="flex items-center justify-center text-xs text-gray-400 py-1">
            <Calendar className="w-3 h-3 mr-1.5" />
            Submitted on {formatDate(currentQuery.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueryDetailsModal;
