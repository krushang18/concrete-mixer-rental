// src/pages/machines/MachineDetail.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Power, 
  Package,
  DollarSign,
  Calendar,
  Activity,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { machineApi, machineUtils } from '../../services/machineApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import MachineForm from './MachineForm';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const MachineDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEditForm, setShowEditForm] = useState(false);

  // Fetch machine details
  const { 
    data: machineData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['machine', id],
    queryFn: () => machineApi.getById(id),
    enabled: !!id,
  });

  // Delete machine mutation
  const deleteMutation = useMutation({
    mutationFn: machineApi.delete,
    onSuccess: () => {
      toast.success('Machine deleted successfully');
      navigate('/machines');
    },
    onError: (error) => {
      console.error('Delete error:', error);
    }
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: machineApi.toggleStatus,
    onSuccess: () => {
      queryClient.invalidateQueries(['machine', id]);
      queryClient.invalidateQueries(['machines']);
      queryClient.invalidateQueries(['machine-stats']);
    },
    onError: (error) => {
      console.error('Toggle status error:', error);
    }
  });

  const machine = machineData?.data;

  // Handle delete machine
  const handleDeleteMachine = async () => {
    if (window.confirm(`Are you sure you want to delete "${machine.name}"? This action cannot be undone.`)) {
      try {
        await deleteMutation.mutateAsync(machine.id);
      } catch (error) {
        console.error('Error deleting machine:', error);
      }
    }
  };

  // Handle toggle status
  const handleToggleStatus = async () => {
    const action = machine.is_active ? 'deactivate' : 'activate';
    if (window.confirm(`Are you sure you want to ${action} "${machine.name}"?`)) {
      try {
        await toggleStatusMutation.mutateAsync(machine.id);
      } catch (error) {
        console.error('Error toggling status:', error);
      }
    }
  };

  // Handle form success
  const handleFormSuccess = () => {
    setShowEditForm(false);
    queryClient.invalidateQueries(['machine', id]);
    queryClient.invalidateQueries(['machines']);
    queryClient.invalidateQueries(['machine-stats']);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !machine) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-lg border p-6 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <div className="text-red-500 text-lg font-medium mb-2">
            Machine not found
          </div>
          <div className="text-gray-500 mb-4 text-sm">
            {error?.message || 'The machine you are looking for does not exist.'}
          </div>
          <div className="space-y-2">
            <button
              onClick={() => refetch()}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/machines')}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back to Machines
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center p-4">
          <button
            onClick={() => navigate('/machines')}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 ml-3">
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {machine.name}
            </h1>
            <p className="text-sm text-gray-500 truncate">#{machine.machine_number}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
            machineUtils.getStatusBadgeClass(machine.is_active)
          }`}>
            {machineUtils.formatStatus(machine.is_active)}
          </span>
          {machine.is_active && (
            <span className="text-sm text-green-600">Available for rental</span>
          )}
          {!machine.is_active && (
            <span className="text-sm text-red-600">Not available</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowEditForm(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={handleToggleStatus}
            disabled={toggleStatusMutation.isLoading}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
          >
            <Power className="w-4 h-4" />
            {machine.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>

        <button
          onClick={handleDeleteMachine}
          disabled={deleteMutation.isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          Delete Machine
        </button>

        {/* Basic Information Card */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Machine Name</label>
              <p className="text-gray-900">{machine.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Machine Number</label>
              <p className="text-gray-900 font-mono">{machine.machine_number}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
              <p className="text-gray-900">
                {machine.description || 'No description available'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">GST Rate</label>
                <p className="text-gray-900">{machine.gst_percentage}%</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                <p className={`font-medium ${machineUtils.getStatusColor(machine.is_active)}`}>
                  {machineUtils.formatStatus(machine.is_active)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Information Card */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Pricing Information</h2>
          </div>
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-blue-600 text-sm font-medium mb-1">Daily Rate</div>
              <div className="text-2xl font-bold text-blue-700">
                {machineUtils.formatPrice(machine.priceByDay)}
              </div>
              <div className="text-xs text-blue-600 mt-1">per day</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-green-600 text-sm font-medium mb-1">Weekly Rate</div>
              <div className="text-2xl font-bold text-green-700">
                {machineUtils.formatPrice(machine.priceByWeek)}
              </div>
              <div className="text-xs text-green-600 mt-1">per week</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
              <div className="text-purple-600 text-sm font-medium mb-1">Monthly Rate</div>
              <div className="text-2xl font-bold text-purple-700">
                {machineUtils.formatPrice(machine.priceByMonth)}
              </div>
              <div className="text-xs text-purple-600 mt-1">per month</div>
            </div>
          </div>
          
          {/* Price Breakdown */}
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Price Comparison</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Weekly vs Daily:</span>
                <span className="font-medium">
                  {machine.priceByDay > 0 
                    ? `${(machine.priceByWeek / (machine.priceByDay * 7) * 100).toFixed(1)}% of daily rate`
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly vs Daily:</span>
                <span className="font-medium">
                  {machine.priceByDay > 0 
                    ? `${(machine.priceByMonth / (machine.priceByDay * 30) * 100).toFixed(1)}% of daily rate`
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Card */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Timeline</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Machine Created</p>
                <p className="text-sm text-gray-500">
                  {format(new Date(machine.created_at), 'PPpp')}
                </p>
              </div>
            </div>
            {machine.updated_at !== machine.created_at && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Updated</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(machine.updated_at), 'PPpp')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Machine Statistics Card */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Statistics</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Machine Age</span>
              <span className="text-sm font-medium">
                {Math.ceil((new Date() - new Date(machine.created_at)) / (1000 * 60 * 60 * 24))} days
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Status</span>
              <span className={`text-sm font-medium ${machineUtils.getStatusColor(machine.is_active)}`}>
                {machineUtils.formatStatus(machine.is_active)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/documents', { state: { machineId: machine.id } })}
              className="w-full flex items-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FileText className="w-4 h-4 text-gray-500" />
              <span>View Documents</span>
            </button>
            <button
              onClick={() => navigate('/services', { state: { machineId: machine.id } })}
              className="w-full flex items-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Activity className="w-4 h-4 text-gray-500" />
              <span>Service History</span>
            </button>
            <button
              onClick={() => navigate('/quotations', { state: { machineId: machine.id } })}
              className="w-full flex items-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FileText className="w-4 h-4 text-gray-500" />
              <span>Related Quotations</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Form Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-auto">
            <MachineForm
              machine={machine}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowEditForm(false)}
            />
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {(deleteMutation.isLoading || toggleStatusMutation.isLoading) && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3 mx-4">
            <LoadingSpinner />
            <span className="text-gray-700">
              {deleteMutation.isLoading && 'Deleting machine...'}
              {toggleStatusMutation.isLoading && 'Updating status...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineDetail;