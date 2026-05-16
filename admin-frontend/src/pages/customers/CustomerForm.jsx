// src/pages/customers/CustomerForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { 
  Save, 
  X, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { customerApi } from '../../services/customerApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Validation schema
const customerSchema = yup.object({
  company_name: yup
    .string()
    .required('Company name is required')
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must be less than 100 characters'),
  contact_person: yup
    .string()
    .nullable()
    .notRequired()
    .max(100, 'Contact person must be less than 100 characters'),
  email: yup
    .string()
    .email('Invalid email format')
    .nullable()
    .notRequired(),
  phone: yup
    .string()
    .required('Phone number is required')
    .test('phone-validation', 'Enter a valid 10-digit Indian mobile number', function(value) {
      if (!value) return false;
      // Remove spaces and non-digits
      const cleanPhone = value.replace(/\D/g, '');
      // Check if it's 10 digits and starts with 6-9
      return /^[6-9]\d{9}$/.test(cleanPhone);
    }),
  address: yup
    .string()
    .max(500, 'Address must be less than 500 characters'),
  site_location: yup
    .string()
    .nullable()
    .notRequired()
    .max(100, 'Site location must be less than 100 characters'),
  gst_number: yup
    .string()
    .nullable()
    .notRequired()
    .test('gst-format', 'Enter a valid GST number format (e.g., 22AAAAA0000A1Z5)', function(value) {
      if (!value || value.trim() === '') return true; // Allow empty GST
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      return gstRegex.test(value.toUpperCase());
    })
});

const CustomerForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset
  } = useForm({
    resolver: yupResolver(customerSchema),
    defaultValues: {
      company_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      site_location: '',
      gst_number: ''
    }
  });

  // Fetch customer data for editing
  const { data: customerData, isLoading, error: fetchError } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      console.log('Fetching customer with ID:', id);
      try {
        const result = await customerApi.getById(id);
        console.log('Customer data received:', result);
        return result;
      } catch (error) {
        console.error('Customer fetch error:', error);
        throw error;
      }
    },
    enabled: isEdit && Boolean(id),
    retry: 1,
    onError: (error) => {
      console.error('Failed to fetch customer:', error);
    }
  });

  // Update form when customer data is loaded
  useEffect(() => {
    if (customerData?.data) {
      const customer = customerData.data;
      // Format phone number for display (add space if 10 digits)
      const formattedPhone = customer.phone && customer.phone.length === 10 
        ? `${customer.phone.slice(0, 5)} ${customer.phone.slice(5)}`
        : customer.phone || '';
        
      reset({
        company_name: customer.company_name || '',
        contact_person: customer.contact_person || '',
        email: customer.email || '',
        phone: formattedPhone,
        address: customer.address || '',
        site_location: customer.site_location || '',
        gst_number: customer.gst_number || ''
      });
    }
  }, [customerData, reset]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: customerApi.create,
    onSuccess: () => {
      toast.success('Customer created successfully');
      queryClient.invalidateQueries(['customers']);
      navigate('/customers');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create customer');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => customerApi.update(id, data),
    onSuccess: () => {
      toast.success('Customer updated successfully');
      queryClient.invalidateQueries(['customers']);
      queryClient.invalidateQueries(['customer', id]);
      navigate('/customers');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update customer');
    }
  });

  // Form submission
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    
    try {
      // Clean and format data
      const formattedData = {
        ...data,
        phone: data.phone.replace(/\D/g, ''), // Remove all non-digits for storage
        gst_number: data.gst_number?.trim() ? data.gst_number.toUpperCase().trim() : null,
        company_name: data.company_name.trim(),
        contact_person: data.contact_person.trim(),
        email: data.email.toLowerCase().trim(),
        site_location: data.site_location.trim(),
        address: data.address?.trim() || null
      };

      if (isEdit) {
        updateMutation.mutate({ id, data: formattedData });
      } else {
        createMutation.mutate(formattedData);
      }
    } catch (error) {
      // Toast handled by API or logic
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        navigate('/customers');
      }
    } else {
      navigate('/customers');
    }
  };

  // Format phone number as user types
  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const phone = value.replace(/\D/g, '');
    // Limit to 10 digits
    const limitedPhone = phone.substring(0, 10);
    // Format as XXXXX XXXXX for display
    if (limitedPhone.length > 5) {
      return limitedPhone.replace(/(\d{5})(\d{0,5})/, '$1 $2').trim();
    }
    return limitedPhone;
  };

  // Validate GST number format (allow empty)
  const validateGST = (gst) => {
    if (!gst || gst.trim() === '') return true; // Allow empty GST
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst.toUpperCase());
  };

  // Watch GST field for real-time validation
  const gstValue = watch('gst_number');
  const gstIsValid = validateGST(gstValue);

  if (isEdit && isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (isEdit && fetchError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">Error loading customer details: {fetchError.message}</p>
          <div className="mt-4 flex gap-4">
            <button 
              onClick={() => navigate('/customers')}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Back to Customers
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isEdit && !customerData?.data) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-600">Customer not found</p>
          <button 
            onClick={() => navigate('/customers')}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/customers')}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
            {isEdit ? 'Edit Customer' : 'Add New Customer'}
          </h1>
          <p className="text-xs text-gray-500 sm:text-sm">
            {isEdit ? 'Update customer information' : 'Add a new customer to your database'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2 sm:text-base">
            <Building2 className="w-4 h-4 text-blue-600" />
            Company Information
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Company Name — full width */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1 sm:text-sm">
                Company Name *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  {...register('company_name')}
                  className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.company_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Company name"
                />
              </div>
              {errors.company_name && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {errors.company_name.message}
                </p>
              )}
            </div>

            {/* Contact Person — full width on mobile, half on sm+ */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1 sm:text-sm">
                Contact Person
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  {...register('contact_person')}
                  className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.contact_person ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Contact person"
                />
              </div>
              {errors.contact_person && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {errors.contact_person.message}
                </p>
              )}
            </div>

            {/* Email — full width on mobile, half on sm+ */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1 sm:text-sm">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input
                  type="email"
                  {...register('email')}
                  className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Email address"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Phone — full on mobile, half on sm+ */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1 sm:text-sm">
                Phone *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input
                  type="tel"
                  {...register('phone')}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    setValue('phone', formatted, { shouldValidate: true });
                  }}
                  className={`w-full pl-9 pr-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Phone number"
                  maxLength={12}
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* Site Location — full on mobile, half on sm+ */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1 sm:text-sm">
                Site Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  {...register('site_location')}
                  className={`w-full pl-9 pr-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.site_location ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Site location"
                />
              </div>
              {errors.site_location && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {errors.site_location.message}
                </p>
              )}
            </div>

            {/* Address — full width */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1 sm:text-sm">
                Address
              </label>
              <textarea
                {...register('address')}
                rows={2}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                  errors.address ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Complete address (optional)"
              />
              {errors.address && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {errors.address.message}
                </p>
              )}
            </div>

            {/* GST Number — full width */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1 sm:text-sm">
                GST Number
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  {...register('gst_number')}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setValue('gst_number', value, { shouldValidate: true });
                  }}
                  className={`w-full pl-9 pr-9 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.gst_number ? 'border-red-300' : gstValue && !gstIsValid ? 'border-yellow-300' : 'border-gray-300'
                  }`}
                  placeholder="22AAAAA0000A1Z5 (optional)"
                  maxLength={15}
                />
                {gstValue && gstIsValid && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    </div>
                  </div>
                )}
              </div>
              {errors.gst_number && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {errors.gst_number.message}
                </p>
              )}
              {gstValue && !gstIsValid && !errors.gst_number && gstValue.trim() !== '' && (
                <p className="mt-1 text-xs text-yellow-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  GST format appears incorrect
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Leave empty if not GST registered
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <X className="w-4 h-4 mr-1.5" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || (!isDirty && isEdit)}
            className="flex-1 sm:flex-none flex items-center justify-center px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                {isEdit ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                {isEdit ? 'Update Customer' : 'Create Customer'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerForm;