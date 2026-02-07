import { useState, useEffect } from 'react';
import { X, Calendar, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { documentValidation } from '../../services/documentApi';

const DocumentFormModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  document: doc = null,
  machineId = null,
  isLoading = false 
}) => {
  // Helper to format date for input (YYYY-MM-DD) preserving local timezone
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Adjust for timezone offset to ensure we get the correct local date
    // Or simply use the local date methods
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    machine_id: '',
    document_type: 'RC_Book',
    expiry_date: '',
    last_renewed_date: '',
    remarks: '',
    notification_days: '30, 7, 1'
  });
  
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Reset form when modal opens or document changes
  useEffect(() => {
    if (isOpen) {
      if (doc) {
        // Edit mode
        setFormData({
          machine_id: doc.machine_id,
          document_type: doc.document_type,
          expiry_date: formatDateForInput(doc.expiry_date),
          last_renewed_date: formatDateForInput(doc.last_renewed_date),
          remarks: doc.remarks || '',
          notification_days: doc.notification_days || '30, 7, 1'
        });
      } else {
        // Create mode
        setFormData({
          machine_id: machineId || '',
          document_type: 'RC_Book',
          expiry_date: '',
          last_renewed_date: '',
          remarks: '',
          notification_days: '30, 7, 1'
        });
      }
      setErrors({});
      setTouched({});
    }
  }, [isOpen, doc, machineId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name);
  };

  const validateField = (name) => {
    // Simple validation logic
    let error = null;
    if (name === 'expiry_date' && !formData.expiry_date) {
      error = 'Expiry date is required';
    }

    if (name === 'notification_days') {
      const isValid = /^(\d+\s*,\s*)*\d+$/.test(formData.notification_days.trim());
      if (!isValid && formData.notification_days.trim() !== '') {
        error = 'Invalid format. Use comma separated numbers (e.g. 30, 7, 1)';
      }
    }
    
    setErrors(prev => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Final validation
    const validation = documentValidation.validateDocumentData(formData, !!doc);
    
    if (!validation.isValid) {
      // Map validation errors to fields
      const newErrors = {};
      validation.errors.forEach(err => {
        if (err.includes('expiry')) newErrors.expiry_date = 'Invalid expiry date';
        if (err.includes('renewal')) newErrors.last_renewed_date = 'Invalid renewal date';
      });
      setErrors(newErrors);
      return;
    }

    // Custom validation for notification_days
    if (formData.notification_days && formData.notification_days.trim() !== '') {
      const isValid = /^(\d+\s*,\s*)*\d+$/.test(formData.notification_days.trim());
      if (!isValid) {
        setErrors(prev => ({
          ...prev, 
          notification_days: 'Invalid format. Use comma separated numbers (e.g. 30, 7, 1)'
        }));
        return;
      }
    }

    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-600" />
            {doc ? 'Edit Document' : 'Add Document'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Document Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type <span className="text-red-500">*</span>
            </label>
            <select
              name="document_type"
              value={formData.document_type}
              onChange={handleChange}
              disabled={!!doc} // Cannot change type when editing
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="RC_Book">RC Book</option>
              <option value="PUC">PUC Certificate</option>
              <option value="Fitness">Fitness Certificate</option>
              <option value="Insurance">Insurance Policy</option>
            </select>
            {doc && (
              <p className="mt-1 text-xs text-gray-500">
                Document type cannot be changed once created.
              </p>
            )}
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                name="expiry_date"
                value={formData.expiry_date}
                onChange={handleChange}
                onBlur={handleBlur}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full rounded-md shadow-sm p-2 border pl-10 ${
                  errors.expiry_date 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.expiry_date && (
              <p className="mt-1 text-xs text-red-600 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                {errors.expiry_date}
              </p>
            )}
          </div>

          {/* Last Renewed Date (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Renewed Date <span className="text-xs text-gray-500">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type="date"
                name="last_renewed_date"
                value={formData.last_renewed_date}
                onChange={handleChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border pl-10"
              />
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Notification Days (Custom Reminder) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reminder Days <span className="text-xs text-gray-500">(comma separated, e.g. 30, 7, 1)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="notification_days"
                value={formData.notification_days}
                onChange={handleChange}
                placeholder="30, 7, 1"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border pl-10"
              />
              <AlertCircle className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Days before expiry to send email notifications.
            </p>
            {errors.notification_days && (
              <p className="mt-1 text-xs text-red-600 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                {errors.notification_days}
              </p>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows="3"
              placeholder="Add any notes or details..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {doc ? 'Update Document' : 'Add Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentFormModal;
