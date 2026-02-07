import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  X, 
  Package, 
  Calendar,
  DollarSign,
  FileText,
  History,
  ArrowLeft,
  Edit,
  Trash2,
  Activity,
  MapPin,
  Clock
} from 'lucide-react';

// Reusable Info Section Component
const InfoSection = ({ title, icon: Icon, children, className = "" }) => {
  return (
    <div className={`mb-6 ${className}`}>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
        {Icon && <Icon className="w-3.5 h-3.5 mr-1.5" />}
        {title}
      </h3>
      <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
        {children}
      </div>
    </div>
  );
};

// Key-Value Item Component for Grid
const InfoItem = ({ label, value, icon: Icon, className = "" }) => (
  <div className={`flex flex-col ${className}`}>
    <span className="text-xs text-gray-500 mb-1">{label}</span>
    <span className="text-sm font-medium text-gray-900 flex items-center">
      {Icon && <Icon className="w-3.5 h-3.5 mr-1.5 text-gray-400" />}
      {value || '-'}
    </span>
  </div>
);

// Machine Details Modal Component
const MachineDetailsModal = ({ 
  machine, 
  isOpen, 
  onClose, 
  onEdit,
  onDelete
}) => {
  const navigate = useNavigate();
  
  // Close modal on escape key
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

  if (!isOpen || !machine) return null;
  
  // Formatters
  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const handleEdit = () => {
    onEdit(machine);
    // onClose() removed to prevent clearing selectedMachine before form opens
  };

  const handleServiceHistory = () => {
    navigate(`/services?machine=${machine.id}`);
    onClose();
  };

  const handleDocuments = () => {
    navigate(`/documents?machine=${machine.id}`);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity pointer-events-auto"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full sm:w-[600px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col pointer-events-auto animate-in slide-in-from-bottom-5 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight">
              {machine.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 font-mono">
                #{machine.machine_number}
              </span>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-gray-200">
          
          <InfoSection title="Details" icon={Package}>
             <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <InfoItem label="Created On" value={formatDate(machine.created_at)} icon={Calendar} />
                <InfoItem label="Last Updated" value={formatDate(machine.updated_at)} icon={Clock} />
                {machine.description && (
                  <div className="col-span-2 pt-2 border-t border-gray-100 mt-2">
                    <span className="text-xs text-gray-500 block mb-1">Description</span>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {machine.description}
                    </p>
                  </div>
                )}
             </div>
          </InfoSection>

          <InfoSection title="Quick Actions & History" icon={Activity}>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               <button
                  onClick={handleServiceHistory}
                  className="flex items-center justify-center px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium shadow-sm group"
                >
                  <History className="w-4 h-4 mr-2 text-blue-500 group-hover:scale-110 transition-transform" />
                  Service History
               </button>
               
               <button
                  onClick={handleDocuments}
                  className="flex items-center justify-center px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium shadow-sm group"
                >
                  <FileText className="w-4 h-4 mr-2 text-yellow-500 group-hover:scale-110 transition-transform" />
                  Documents
               </button>
             </div>
          </InfoSection>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex gap-3">
           <button
            onClick={handleEdit}
            className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition-all font-medium shadow-sm active:scale-[0.98] flex items-center justify-center"
           >
             <Edit className="w-4 h-4 mr-2" />
             Edit Machine
           </button>
           
           <button
             onClick={() => onDelete(machine)}
             className="px-4 py-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors font-medium flex items-center justify-center"
             title="Delete Machine"
           >
             <Trash2 className="w-5 h-5" />
           </button>
        </div>
      
      </div>
    </div>
  );
};

export default MachineDetailsModal;
