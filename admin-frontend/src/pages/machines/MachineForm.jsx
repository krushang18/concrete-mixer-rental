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
    setValue
  } = useForm({
    resolver: yupResolver(machineSchema),
    defaultValues: {
      machine_number: '',
      name: '',
      description: ''
    }
  });

  // Create machine mutation
  const createMutation = useMutation({
    mutationFn: machineApi.create,
    onSuccess: () => {
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
        description: machine.description || ''
      });
    } else {
      // Generate suggested machine number for new machines
      const existingMachines = machinesData?.data || [];
      const suggestedNumber = machineValidation.generateMachineNumber(existingMachines);
      setValue('machine_number', suggestedNumber);
    }
  }, [machine, machinesData, reset, setValue]);

  const onSubmit = async (data) => {
    try {
      const formData = {
        ...data
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
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                {isEditing ? 'Edit Machine' : 'Add New Machine'}
              </h2>
              <p className="text-sm text-gray-500">
                {isEditing ? 'Update machine details below' : 'Add a new machine to your inventory'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Machine Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Machine Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('machine_number')}
                  placeholder="e.g., CMR-001"
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                    errors.machine_number ? 'border-red-300 focus:ring-red-100' : 'border-gray-200'
                  }`}
                />
                {errors.machine_number && (
                  <p className="text-red-500 text-xs mt-1 font-medium">{errors.machine_number.message}</p>
                )}
              </div>

              {/* Machine Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Machine Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('name')}
                  placeholder="e.g., Fiori DB 350 Self Loading Mixer"
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                    errors.name ? 'border-red-300 focus:ring-red-100' : 'border-gray-200'
                  }`}
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1 font-medium">{errors.name.message}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                {...register('description')}
                placeholder="Detailed description of the machine..."
                rows={4}
                className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none ${
                  errors.description ? 'border-red-300 focus:ring-red-100' : 'border-gray-200'
                }`}
              />
              {errors.description && (
                <p className="text-red-500 text-xs mt-1 font-medium">{errors.description.message}</p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-5 py-2.5 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-800 transition-colors disabled:opacity-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !isDirty}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
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