import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
  X, 
  Save, 
  Star, 
  StarOff, 
  Type, 
  AlignLeft, 
  Tag, 
  Hash,
  AlertTriangle 
} from 'lucide-react';
import { termsConditionsApi, termsConditionsValidation, termsConditionsUtils } from '../../services/termsConditionsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const TermModal = ({ isOpen, onClose, term, categories, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    is_default: false,
    display_order: ''
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // Reset form when modal opens/closes or term changes
  useEffect(() => {
    if (isOpen) {
      if (term) {
        // Edit mode
        setFormData({
          title: term.title || '',
          description: term.description || '',
          category: term.category || '',
          is_default: term.is_default || false,
          display_order: term.display_order || ''
        });
      } else {
        // Create mode
        setFormData({
          title: '',
          description: '',
          category: categories?.[0] || '',
          is_default: false,
          display_order: ''
        });
      }
      setErrors({});
      setTouched({});
      setIsDirty(false);
    }
  }, [isOpen, term, categories]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => termsConditionsApi.create(data),
    onSuccess: () => {
      toast.success('Term created successfully');
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Failed to create term';
      toast.error(errorMessage);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => termsConditionsApi.update(id, data),
    onSuccess: () => {
      toast.success('Term updated successfully');
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Failed to update term';
      toast.error(errorMessage);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    }
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isEditing = !!term;

  // Handle input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    setIsDirty(true);
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle field blur
  const handleBlur = (field) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
    
    // Validate field
    validateField(field, formData[field]);
  };

  // Validate individual field
  const validateField = (field, value) => {
    let error = '';
    
    switch (field) {
      case 'title':
        if (!value?.trim()) {
          error = 'Title is required';
        } else if (value.length > 200) {
          error = 'Title must be less than 200 characters';
        }
        break;
        
      case 'description':
        if (!value?.trim()) {
          error = 'Description is required';
        } else if (value.length > 2000) {
          error = 'Description must be less than 2000 characters';
        }
        break;
        
      case 'category':
        if (!value?.trim()) {
          error = 'Category is required';
        } else if (value.length > 100) {
          error = 'Category must be less than 100 characters';
        }
        break;
        
      case 'display_order':
        if (value && (isNaN(value) || value < 0)) {
          error = 'Display order must be a valid positive number';
        }
        break;
        
      default:
        break;
    }
    
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
    
    return !error;
  };

  // Validate entire form
  const validateForm = () => {
    const validation = termsConditionsValidation.validateTermsData(formData, isEditing);
    
    if (!validation.isValid) {
      const fieldErrors = {};
      validation.errors.forEach(error => {
        if (error.includes('Title')) fieldErrors.title = error;
        else if (error.includes('Description')) fieldErrors.description = error;
        else if (error.includes('Category')) fieldErrors.category = error;
        else if (error.includes('Display order')) fieldErrors.display_order = error;
      });
      setErrors(fieldErrors);
    }
    
    return validation.isValid;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      display_order: formData.display_order ? parseInt(formData.display_order) : undefined
    };

    if (isEditing) {
      updateMutation.mutate({ id: term.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  // Handle close with confirmation if dirty
  const handleClose = () => {
    if (isDirty && !isLoading) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Auto-resize textarea
  const autoResizeTextarea = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  // Generate category suggestions
  const categorySuggestions = [
    'general',
    'payment',
    'delivery',
    'maintenance',
    'liability',
    'warranty',
    'cancellation'
  ];

  // Get suggested display order
  const getSuggestedDisplayOrder = () => {
    if (formData.category && categories.length > 0) {
      // This would need the full terms list to calculate properly
      // For now, return a placeholder
      return '';
    }
    return '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Term & Condition' : 'Add New Term & Condition'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isEditing ? 'Update the term details below' : 'Create a new term for your library'}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Type className="w-4 h-4 inline mr-2" />
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                onBlur={() => handleBlur('title')}
                placeholder="Enter term title..."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.title && touched.title ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isLoading}
                maxLength={200}
              />
              {errors.title && touched.title && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  {errors.title}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.title.length}/200 characters
              </p>
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <AlignLeft className="w-4 h-4 inline mr-2" />
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => {
                  handleChange('description', e.target.value);
                  autoResizeTextarea(e);
                }}
                onBlur={() => handleBlur('description')}
                placeholder="Enter detailed description of the term..."
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none ${
                  errors.description && touched.description ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isLoading}
                maxLength={2000}
              />
              {errors.description && touched.description && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  {errors.description}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.description.length}/2000 characters
              </p>
            </div>

            {/* Category and Display Order Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Tag className="w-4 h-4 inline mr-2" />
                  Category *
                </label>
                <div className="relative">
                  <select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    onBlur={() => handleBlur('category')}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      errors.category && touched.category ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={isLoading}
                  >
                    <option value="">Select Category</option>
                    {categorySuggestions.map((cat) => (
                      <option key={cat} value={cat}>
                        {termsConditionsUtils.formatCategory(cat)}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.category && touched.category && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    {errors.category}
                  </p>
                )}
              </div>

              {/* Display Order Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Hash className="w-4 h-4 inline mr-2" />
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => handleChange('display_order', e.target.value)}
                  onBlur={() => handleBlur('display_order')}
                  placeholder="Auto-assigned"
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.display_order && touched.display_order ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
                {errors.display_order && touched.display_order && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    {errors.display_order}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty for auto-assignment
                </p>
              </div>
            </div>

            {/* Default Status Toggle */}
            <div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {formData.is_default ? (
                    <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  ) : (
                    <StarOff className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Default Term</h4>
                    <p className="text-xs text-gray-600">
                      Default terms are automatically included in new quotations
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => handleChange('is_default', e.target.checked)}
                    className="sr-only peer"
                    disabled={isLoading}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>

            {/* Preview Section */}
            {(formData.title || formData.description) && (
              <div className="border-t pt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Preview</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <h5 className="font-medium text-gray-900">{formData.title || 'Term Title'}</h5>
                    {formData.is_default && (
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {formData.description || 'Term description will appear here...'}
                  </p>
                  <div className="flex items-center space-x-3">
                    {formData.category && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${termsConditionsUtils.getCategoryColor(formData.category)}`}>
                        {termsConditionsUtils.formatCategory(formData.category)}
                      </span>
                    )}
                    {formData.display_order && (
                      <span className="text-xs text-gray-500">
                        Order: {formData.display_order}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 bg-gray-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {isDirty && !isLoading && (
                  <span className="flex items-center text-amber-600">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    You have unsaved changes
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !isDirty}
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <LoadingSpinner size="small" color="white" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {isLoading ? 'Saving...' : (isEditing ? 'Update Term' : 'Create Term')}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TermModal;