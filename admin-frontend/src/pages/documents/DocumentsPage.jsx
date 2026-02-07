import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  MoreVertical,
  Calendar,
  Trash2,
  Edit,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { documentApi, documentUtils } from '../../services/documentApi';
import { machineApi } from '../../services/machineApi';
import DocumentFormModal from './DocumentFormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const DocumentsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // State
  const [documents, setDocuments] = useState([]);
  const [machines, setMachines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [filters, setFilters] = useState({
    machine_id: searchParams.get('machine') || '',
    status: 'all'
  });

  // Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load Machines for filter dropdown
  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const response = await machineApi.getAll();
        setMachines(response.data || []);
      } catch (error) {
        console.error("Failed to load machines", error);
        toast.error("Failed to load machines list");
      }
    };
    fetchMachines();
  }, []);

  // Fetch Documents
  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await documentApi.getAll({
        machine_id: filters.machine_id || undefined
      });
      
      let docs = response.data || [];
      
      // Client-side filtering for status if backend doesn't support it fully efficiently yet
      // or to match the exact badge status logic
      if (filters.status !== 'all') {
        docs = documentUtils.filterByExpiryStatus(docs, filters.status);
      }
      
      setDocuments(docs);
    } catch (error) {
      console.error("Failed to fetch documents", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [filters]);

  // Handlers
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    
    // Update URL if machine filter changes
    if (key === 'machine_id') {
      if (value) setSearchParams({ machine: value });
      else setSearchParams({});
    }
  };

  const handleAddDocument = () => {
    setSelectedDoc(null);
    if (!filters.machine_id) {
      toast.error("Please select a machine first to add a document");
      return;
    }
    setShowModal(true);
  };

  const handleEditDocument = (doc) => {
    setSelectedDoc(doc);
    setShowModal(true);
  };

  const handleDeleteDocument = (doc) => {
    setDocToDelete(doc);
    setDeleteConfirmOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!docToDelete) return;
    
    setIsDeleting(true);
    try {
      await documentApi.delete(docToDelete.id);
      fetchDocuments(); // Refresh list
      setDeleteConfirmOpen(false);
      setDocToDelete(null);
    } catch (error) {
      // Error handled in API service
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveDocument = async (formData) => {
    try {
      await documentApi.createOrUpdate(formData);
      setShowModal(false);
      fetchDocuments();
    } catch (error) {
      // Error handled in API service
    }
  };

  const handleRenewClick = (doc) => {
    // Pre-fill modal for renewal (pseudo-renewal via edit for now, or dedicated renewal flow)
    // For simplicity, we open edit but maybe user wants specific renewal logic.
    // Let's stick to Edit for renewal as per simpler scope, or use the renew endpoint if specific.
    // The backend `renewDocument` endpoint updates expiry. `createOrUpdate` also does it.
    // Let's use the FormModal but maybe pre-set a new date? 
    // Actually, let's keep it simple: Edit simply opens the form.
    
    // Suggest next renewal date
    const suggestedDate = documentUtils.suggestRenewalDate(doc.expiry_date, doc.document_type);
    
    const renewalFormData = {
      ...doc,
      expiry_date: suggestedDate,
      last_renewed_date: new Date().toISOString().split('T')[0]
    };
    
    setSelectedDoc(renewalFormData); // Pass modified data as if editing
    setShowModal(true);
    toast("Suggested renewal date pre-filled", { icon: '📅' });
  };

  // Status Badge Helper
  const StatusBadge = ({ expiryDate }) => {
    const status = documentUtils.getExpiryStatus(expiryDate);
    const badgeClass = documentUtils.getStatusBadgeClass(expiryDate);
    
    let Icon = CheckCircle;
    if (status.status === 'expired' || status.status === 'critical') Icon = AlertTriangle;
    if (status.status === 'warning') Icon = Calendar;
    if (status.status === 'unknown') Icon = HelpCircle;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Management</h1>
          <p className="text-gray-600 mt-1">Track and manage machine documentation expiry</p>
        </div>
        
        <button
          onClick={handleAddDocument}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Document
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 w-full sm:max-w-xs">
          <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Machine</label>
          <div className="relative">
            <select
              value={filters.machine_id}
              onChange={(e) => handleFilterChange('machine_id', e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="">Select a Machine...</option>
              {machines.map(m => (
                <option key={m.id} value={m.id}>
                  {m.machine_number} - {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 w-full sm:max-w-xs">
          <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Statuses</option>
            <option value="expired">Expired</option>
            <option value="critical">Critical (≤ 3 days)</option>
            <option value="warning">Warning (≤ 30 days)</option>
            <option value="valid">Valid</option>
          </select>
        </div>
        
        <div className="flex-1"></div>
        
        <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-md">
          Showing <strong>{documents.length}</strong> documents
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
           {/* Simple Spinner */}
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filters.machine_id 
              ? "This machine doesn't have any documents managed yet." 
              : "Select a machine to view its documents or add a new one."}
          </p>
          {filters.machine_id && (
            <div className="mt-6">
              <button
                onClick={handleAddDocument}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Add Document Now
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{documentUtils.getDocumentTypeIcon(doc.document_type)}</span>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {documentUtils.formatDocumentType(doc.document_type)}
                      </h3>
                      {!filters.machine_id && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mt-1">
                          {doc.machine_number}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge expiryDate={doc.expiry_date} />
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Expires:</span>
                    <span className="font-medium text-gray-900">
                      {documentUtils.formatDate(doc.expiry_date)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Status:</span>
                    <span className={`font-medium ${
                      doc.days_until_expiry <= 0 ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {documentUtils.formatExpiryStatus(doc.expiry_date)}
                    </span>
                  </div>
                  
                  {doc.last_renewed_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Last Renewed:</span>
                      <span className="text-gray-900">
                        {documentUtils.formatDate(doc.last_renewed_date)}
                      </span>
                    </div>
                  )}
                </div>

                {doc.remarks && (
                  <div className="mt-4 pt-4 border-t border-gray-100 text-sm italic text-gray-500">
                    "{doc.remarks}"
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 px-5 py-3 flex justify-between items-center border-t border-gray-100">
                <button 
                  onClick={() => handleRenewClick(doc)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Renew
                </button>
                
                <div className="flex space-x-3">
                  <button 
                    onClick={() => handleEditDocument(doc)}
                    className="text-gray-400 hover:text-blue-600"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteDocument(doc)}
                    className="text-gray-400 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <DocumentFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveDocument}
        document={selectedDoc}
        machineId={filters.machine_id}
        isLoading={false}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={onConfirmDelete}
        title="Delete Document"
        message={`Are you sure you want to delete the document "${docToDelete?.document_type ? documentUtils.formatDocumentType(docToDelete.document_type) : 'Selected Document'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={isDeleting}
      />
    </div>
  );
};

export default DocumentsPage;
