// =============================================================================
// ConfirmDialog Component - /components/common/ConfirmDialog.jsx
// =============================================================================

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  Loader2
} from 'lucide-react';

const ConfirmDialog = ({
  open = false,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary", // primary, danger, warning, success
  onConfirm,
  onCancel,
  loading = false,
  size = "medium", // small, medium, large
  icon = null, // auto, custom icon component, or null
  preventBackdropClose = false,
  children = null // Custom content
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && open && !loading) {
        onCancel?.();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when dialog is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, loading, onCancel]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !preventBackdropClose && !loading) {
      onCancel?.();
    }
  };

  // Get icon based on variant
  const getIcon = () => {
    if (icon === null) return null;
    if (icon) return icon; // Custom icon provided

    // Auto icon based on variant
    switch (confirmVariant) {
      case 'danger':
        return <AlertTriangle className="h-6 w-6 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-yellow-600" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      default:
        return <Info className="h-6 w-6 text-blue-600" />;
    }
  };

  // Get button styles
  const getConfirmButtonStyles = () => {
    const baseStyles = "inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
    
    switch (confirmVariant) {
      case 'danger':
        return `${baseStyles} border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500`;
      case 'warning':
        return `${baseStyles} border-transparent text-white bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500`;
      case 'success':
        return `${baseStyles} border-transparent text-white bg-green-600 hover:bg-green-700 focus:ring-green-500`;
      default:
        return `${baseStyles} border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
    }
  };

  // Get dialog size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return 'max-w-sm';
      case 'large':
        return 'max-w-2xl';
      default:
        return 'max-w-md';
    }
  };

  if (!open) return null;

  const dialogContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />

        {/* Dialog */}
        <div className={`relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 w-full ${getSizeStyles()}`}>
          {/* Header */}
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              {/* Icon */}
              {getIcon() && (
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 sm:mx-0 sm:h-10 sm:w-10">
                  {getIcon()}
                </div>
              )}
              
              {/* Content */}
              <div className={`mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left ${getIcon() ? '' : 'sm:ml-0'}`}>
                <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
                  {title}
                </h3>
                
                {/* Message or Custom Content */}
                <div className="mt-2">
                  {children ? (
                    children
                  ) : (
                    <p className="text-sm text-gray-500">
                      {message}
                    </p>
                  )}
                </div>
              </div>

              {/* Close button - only show if not loading and backdrop close is allowed */}
              {!loading && !preventBackdropClose && (
                <button
                  onClick={onCancel}
                  className="absolute right-4 top-4 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-1"
                >
                  <span className="sr-only">Close</span>
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            {/* Confirm Button */}
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`w-full justify-center sm:ml-3 sm:w-auto ${getConfirmButtonStyles()}`}
            >
              {loading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {loading ? 'Processing...' : confirmLabel}
            </button>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto transition-colors"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render in portal to avoid z-index issues
  return createPortal(dialogContent, document.body);
};

export default ConfirmDialog;
  