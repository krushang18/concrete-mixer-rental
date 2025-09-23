// src/pages/machines/MachineForm.jsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Save, Package } from 'lucide-react';
import { machineApi, machineValidation } from '../../services/machineApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

// Validation schema
const machineSchema = yup.object().shape({
  machine_number: yup
    .string()
    .required('Machine number is required')
    .max(50, 'Machine number must be less than 50 characters')
    .matches(/^[A-Z0-9-]+$/i, 'Machine number can only contain letters, numbers, and hyphens'),
  name: yup
    .string()
    .required('Machine name is required')
    .max(100, 'Machine name must be less than 100 characters'),
  description: yup
    .string()
    .max(1000, 'Description must be less than 1000 characters'),
  priceByDay: yup
    .number()
    .required('Daily price is required')
    .min(0, 'Daily price must be positive')
    .typeError('Daily price must be a valid number'),
  priceByWeek: yup
    .number()
    .required('Weekly price is required')
    .min(0, 'Weekly price must be positive')
    .typeError('Weekly price must be a valid number'),
  priceByMonth: yup
    .number()
    .required('Monthly price is required')
    .min(0, 'Monthly price must be positive')
    .typeError('Monthly price must be a valid number'),
  gst_percentage: yup
    .number()
    .min(0, 'GST percentage must be between 0 and 100')
    .max(100, 'GST percentage must be between 0 and 100')
    .typeError('GST percentage must be a valid number'),
  is_active: yup.boolean()
});

const MachineForm = ({ machine, onSuccess, onCancel }) => {
  const isEditing = !!machine;

  // Get existing machines for machine number validation
  const { data: machinesData } = useQuery({
    queryKey: ['machines', { limit: 1000 }],
    queryFn: () => machineApi.getAll({ limit: 1000 }),
    enabled: !isEditing, // Only fetch for new machines
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
    clearErrors
  } = useForm({
    resolver: yupResolver(machineSchema),
    defaultValues: {
      machine_number: '',
      name: '',
      description: '',
      priceByDay: '',
      priceByWeek: '',
      priceByMonth: '',
      gst_percentage: 18,
      is_active: true
    }
  });

  // Watch pricing fields for auto-calculation suggestions
  const watchPriceByDay = watch('priceByDay');

  // Create machine mutation
  const createMutation = useMutation({
    mutationFn: machineApi.create,
    onSuccess: () => {
      toast.success('Machine created successfully');
      onSuccess();
    },
    onError: (error) => {
      console.error('Create error:', error);
    }
  });

  // Update machine mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => machineApi.update(id, data),
    onSuccess: () => {
      toast.success('Machine updated successfully');
      onSuccess();
    },
    onError: (error) => {
      console.error('Update error:', error);
    }
  });

  // Initialize form for editing
  useEffect(() => {
    if (machine) {
      reset({
        machine_number: machine.machine_number || '',
        name: machine.name || '',
        description: machine.description || '',
        priceByDay: machine.priceByDay || '',
        priceByWeek: machine.priceByWeek || '',
        priceByMonth: machine.priceByMonth || '',
        gst_percentage: machine.gst_percentage || 18,
        is_active: machine.is_active !== 0
      });
    } else {
      // Generate suggested machine number for new machines
      const existingMachines = machinesData?.data || [];
      const suggestedNumber = machineValidation.generateMachineNumber(existingMachines);
      setValue('machine_number', suggestedNumber);
    }
  }, [machine, machinesData, reset, setValue]);

  // Auto-calculate weekly and monthly prices based on daily price
  useEffect(() => {
    if (watchPriceByDay && !isEditing) {
      const dailyPrice = parseFloat(watchPriceByDay);
      if (!isNaN(dailyPrice) && dailyPrice > 0) {
        // Suggest weekly price (6 days worth)
        const weeklyPrice = Math.round(dailyPrice * 6);
        setValue('priceByWeek', weeklyPrice);
        
        // Suggest monthly price (25 days worth)
        const monthlyPrice = Math.round(dailyPrice * 25);
        setValue('priceByMonth', monthlyPrice);
      }
    }
  }, [watchPriceByDay, isEditing, setValue]);

  const onSubmit = async (data) => {
    try {
      const formData = {
        ...data,
        priceByDay: parseFloat(data.priceByDay),
        priceByWeek: parseFloat(data.priceByWeek),
        priceByMonth: parseFloat(data.priceByMonth),
        gst_percentage: parseFloat(data.gst_percentage),
        is_active: data.is_active ? 1 : 0
      };

      if (isEditing) {
        await updateMutation.mutateAsync({ id: machine.id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const isLoading = createMutation.isLoading || updateMutation.isLoading;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? 'Edit Machine' : 'Add New Machine'}
              </h2>
              <p className="text-sm text-gray-500">
                {isEditing ? 'Update machine details' : 'Add a new machine to your inventory'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Machine Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Machine Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('machine_number')}
                  placeholder="e.g., CMR-001"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.machine_number ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.machine_number && (
                  <p className="text-red-500 text-sm mt-1">{errors.machine_number.message}</p>
                )}
              </div>

              {/* Machine Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Machine Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('name')}
                  placeholder="e.g., Fiori DB 350 Self Loading Mixer"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                placeholder="Detailed description of the machine..."
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>
          </div>

          {/* Pricing Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Pricing Information</h3>
              {!isEditing && (
                <span className="text-xs text-gray-500">Prices auto-calculated from daily rate</span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Daily Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Daily Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('priceByDay')}
                  placeholder="2500.00"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.priceByDay ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.priceByDay && (
                  <p className="text-red-500 text-sm mt-1">{errors.priceByDay.message}</p>
                )}
              </div>

              {/* Weekly Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weekly Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('priceByWeek')}
                  placeholder="15000.00"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.priceByWeek ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.priceByWeek && (
                  <p className="text-red-500 text-sm mt-1">{errors.priceByWeek.message}</p>
                )}
              </div>

              {/* Monthly Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('priceByMonth')}
                  placeholder="45000.00"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.priceByMonth ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.priceByMonth && (
                  <p className="text-red-500 text-sm mt-1">{errors.priceByMonth.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Additional Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Additional Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* GST Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GST Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...register('gst_percentage')}
                  placeholder="18.00"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.gst_percentage ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.gst_percentage && (
                  <p className="text-red-500 text-sm mt-1">{errors.gst_percentage.message}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('is_active')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active (available for rental)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !isDirty}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && <LoadingSpinner size="sm" />}
              <Save className="w-4 h-4" />
              {isEditing ? 'Update Machine' : 'Create Machine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MachineForm;