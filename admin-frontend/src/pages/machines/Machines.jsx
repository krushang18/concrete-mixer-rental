import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { create } from 'zustand';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Eye,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  Trash,
  Settings,
  Activity,
  MoreVertical,
  X
} from 'lucide-react';
import { machineApi } from '../../services/machineApi';
import MachineForm from './MachineForm';
import Pagination from '../../components/common/Pagination';
import MachineDetailsModal from './MachineDetailsModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Zustand store
const useMachineStore = create((set) => ({
  filters: {
    startDate: '',
    endDate: '',
    sortBy: 'machine_number',
    sortOrder: 'ASC',
    page: 1,
    limit: 10
  },
  searchTerm: '',
  showMobileFilters: false,
  showForm: false,
  selectedMachine: null,
  
  setFilters: (newFilters) => set((state) => ({ filters: { ...state.filters, ...newFilters } })),
  resetFilters: () => set({
    filters: {
      startDate: '',
      endDate: '',
      sortBy: 'machine_number',
      sortOrder: 'ASC',
      page: 1,
      limit: 10
    },
    searchTerm: ''
  }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  toggleMobileFilters: () => set((state) => ({ showMobileFilters: !state.showMobileFilters })),
  setShowForm: (show) => set({ showForm: show }),
  setSelectedMachine: (machine) => set({ selectedMachine: machine }),
  
  // Delete confirm state
  deleteMachine: null,
  showDeleteConfirm: false,
  setDeleteMachine: (machine) => set({ deleteMachine: machine }),
  setShowDeleteConfirm: (show) => set({ showDeleteConfirm: show })
}));

// Validation schema
const filterSchema = yup.object({
  sortBy: yup.string(),
  sortOrder: yup.string()
});

// Debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// Status Badge Component removed as per user schema

// Minimal Filter Component
const MachineFilters = ({ onApplyFilters, onReset }) => {
  const { filters, showMobileFilters, toggleMobileFilters, setFilters } = useMachineStore();
  
  const { register, handleSubmit, reset } = useForm({
    resolver: yupResolver(filterSchema),
    defaultValues: filters,
    mode: 'onChange'
  });

  const onSubmit = (data) => {
    setFilters(data);
    onApplyFilters();
    toggleMobileFilters();
  };

  const handleReset = () => {
    reset({ sortBy: 'machine_number', sortOrder: 'ASC' });
    onReset();
    toggleMobileFilters();
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
      {/* Mobile Header */}
      <div 
        onClick={toggleMobileFilters}
        className="flex items-center justify-between p-4 lg:hidden bg-gray-50/50 cursor-pointer active:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700 flex items-center">
          <Filter className="w-4 h-4 mr-2 text-blue-600" />
          Filter & Sort
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
      </div>
      
      {/* Filter Content */}
      <div className={`p-4 ${showMobileFilters ? 'block border-t border-gray-100' : 'hidden lg:block'}`}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col lg:flex-row gap-4 items-center">
             {/* Sort Select */}
             <div className="w-full lg:w-64 relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Settings className="h-4 w-4 text-gray-400" />
               </div>
               <select
                  {...register('sortBy')}
                  className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer hover:bg-white"
                >
                  <option value="machine_number">Sort by Number</option>
                  <option value="created_at">Sort by Date Created</option>
                  <option value="name">Sort by Name</option>
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <button
                type="submit"
                className="flex-1 lg:flex-none bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-all shadow-sm active:scale-[0.98] text-sm font-medium flex items-center justify-center"
              >
                Apply
              </button>
              
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 lg:flex-none px-4 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Minimal Mobile Machine Card
const MachineCard = ({ machine, onView, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  
  return (
    <div 
      className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all group relative"
      onClick={() => onView(machine)}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="min-w-0 flex-1 mr-3">
          <div className="flex items-center gap-2 mb-1">
             <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wide">
               #{machine.machine_number}
             </span>
             <span className="text-gray-400 text-[10px]">
               {new Date(machine.created_at).toLocaleDateString()}
             </span>
          </div>
          <h3 className="font-semibold text-gray-900 text-base leading-tight truncate" title={machine.name}>
            {machine.name}
          </h3>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1.5 -mr-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
      
      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute right-4 top-10 bg-white border border-gray-100 rounded-lg shadow-xl z-10 min-w-[140px] py-1 animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(machine);
              setShowMenu(false);
            }}
            className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <Edit className="w-3.5 h-3.5 mr-2 text-blue-500" />
            Edit Machine
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(machine);
              setShowMenu(false);
            }}
            className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center"
          >
            <Trash className="w-3.5 h-3.5 mr-2" />
            Delete
          </button>
        </div>
      )}

      {/* Description Info */}
      <div className="bg-gray-50/50 rounded-lg p-3 mb-4 space-y-2 border border-gray-100">
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
          {machine.description || 'No description available'}
        </p>
      </div>

      <div className="flex justify-end pt-2 border-t border-gray-50">
         <span className="text-xs font-semibold text-blue-600 flex items-center group-hover:text-blue-700 transition-colors">
            View Details <Eye className="w-3 h-3 ml-1" />
         </span>
      </div>
    </div>
  );
};

// Main Machines Component
const Machines = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const {
    filters,
    searchTerm,
    showForm,
    selectedMachine,
    setFilters,
    resetFilters,
    setSearchTerm,
    setShowForm,
    setSelectedMachine,
    deleteMachine,
    showDeleteConfirm,
    setDeleteMachine,
    setShowDeleteConfirm
  } = useMachineStore();
  
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  const queryKey = useMemo(() => [
    'machines', debouncedSearchTerm, filters.sortBy, filters.sortOrder, filters.page, filters.limit
  ], [debouncedSearchTerm, filters]);
  
  const { data: machinesData, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () => machineApi.getAll({ ...filters, search: debouncedSearchTerm || undefined, limit: 1000 }),
    staleTime: 1000 * 60 * 5,
    keepPreviousData: true,
  });
  
  // Client-side processing (filtering/sorting)
  const processedData = useMemo(() => {
    let machines = machinesData?.data || [];
    
    // Sort
    machines.sort((a, b) => {
      const sortBy = filters.sortBy || 'machine_number';
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      // Handle dates
      if (['created_at', 'updated_at'].includes(sortBy)) {
         return filters.sortOrder === 'ASC' 
           ? new Date(aVal) - new Date(bVal) 
           : new Date(bVal) - new Date(aVal);
      }
      
      // Strings (Machine Number, Name)
      const strA = String(aVal || '').toLowerCase();
      const strB = String(bVal || '').toLowerCase();
      return filters.sortOrder === 'ASC' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
    
    // Pagination
    const total = machines.length;
    const totalPages = Math.ceil(total / filters.limit);
    const paginated = machines.slice((filters.page - 1) * filters.limit, filters.page * filters.limit);
    
    return {
      machines: paginated,
      pagination: {
        current_page: filters.page,
        per_page: filters.limit,
        total,
        total_pages: totalPages,
        has_prev_page: filters.page > 1,
        has_next_page: filters.page < totalPages
      }
    };
  }, [machinesData?.data, filters]);

  const { machines, pagination } = processedData;

  const deleteMutation = useMutation({
    mutationFn: machineApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['machines']);
      setShowDeleteConfirm(false);
      setDeleteMachine(null);
      // Toast handled by API
    }
  });

  const handleCreateMachine = useCallback(() => { setSelectedMachine(null); setShowForm(true); }, [setSelectedMachine, setShowForm]);
  const handleEditMachine = useCallback((machine) => { setSelectedMachine(machine); setShowForm(true); }, [setSelectedMachine, setShowForm]);
  const handleViewMachine = useCallback((machine) => { setSelectedMachine(machine); }, [setSelectedMachine]);
  
  const handleDeleteMachine = useCallback((machine) => {
    setDeleteMachine(machine);
    setShowDeleteConfirm(true);
  }, [setDeleteMachine, setShowDeleteConfirm]);

  const confirmDelete = async () => {
    if (deleteMachine) {
      try { await deleteMutation.mutateAsync(deleteMachine.id); } 
      catch (error) { 
        // Toast handled by API
      }
    }
  };

  const handlePageChange = useCallback((newPage) => setFilters({ page: newPage }), [setFilters]);
  const handleLimitChange = useCallback((newLimit) => setFilters({ limit: newLimit, page: 1 }), [setFilters]);

  const handleFormCancel = useCallback(() => {
    setShowForm(false);
    setSelectedMachine(null);
  }, [setShowForm, setSelectedMachine]);

  const handleFormSuccess = useCallback(() => {
    setShowForm(false);
    setSelectedMachine(null);
    refetch();
    setShowForm(false);
    setSelectedMachine(null);
    queryClient.invalidateQueries(['machines']);
    // Toast handled by API
  }, [setShowForm, setSelectedMachine, refetch, selectedMachine]);
  
  
  // Loading & Error States
  if (isLoading && !machinesData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading machines...</p>
        </div>
      </div>
    );
  }

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Machines</h3>
        <button onClick={() => refetch()} className="text-blue-600 hover:underline">Try Again</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Machine Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your inventory ({pagination?.total || 0} total machines)
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2.5 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors disabled:opacity-50 shadow-sm"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleCreateMachine}
              className="flex items-center px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow active:scale-[0.98] text-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Machine
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
           <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
             <Search className="h-5 w-5 text-gray-400" />
           </div>
           <input
            type="text"
            placeholder="Search by machine name, number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 sm:text-sm transition-all shadow-sm hover:shadow-md"
          />
           {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <MachineFilters 
          onApplyFilters={() => setFilters({ page: 1 })} 
          onReset={resetFilters} 
        />

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="overflow-x-auto">
             <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                   <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[240px]">Machine Info</th>
                   <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">Description</th>
                   <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[150px]">Created At</th>
                   <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-[100px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {machines.map((machine) => (
                  <tr key={machine.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4 align-top">
                       <div className="flex flex-col">
                         <span className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1" title={machine.name}>
                           {machine.name}
                         </span>
                         <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 w-fit font-mono">
                           #{machine.machine_number}
                         </span>
                       </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                       <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed" title={machine.description}>
                          {machine.description || '-'}
                       </p>
                    </td>
                    <td className="px-6 py-4 align-top">
                       <span className="text-sm text-gray-600">
                         {new Date(machine.created_at).toLocaleDateString()}
                       </span>
                    </td>
                    <td className="px-6 py-4 align-top text-right">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleViewMachine(machine)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="View">
                             <Eye className="w-4 h-4" />
                          </button>
                           <button onClick={() => handleEditMachine(machine)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Edit">
                             <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteMachine(machine)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Delete">
                             <Trash className="w-4 h-4" />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
                {machines.length === 0 && (
                   <tr>
                     <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                        No machines found matching your filters.
                     </td>
                   </tr>
                )}
              </tbody>
             </table>
          </div>
        </div>

        {/* Mobile List View */}
        <div className="lg:hidden space-y-4 mb-6">
           {machines.map((machine) => (
             <MachineCard 
               key={machine.id} 
               machine={machine} 
               onView={handleViewMachine}
               onEdit={handleEditMachine}
               onDelete={handleDeleteMachine}
             />
           ))}
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="mt-8">
            <Pagination 
              pagination={pagination} 
              onPageChange={handlePageChange} 
              onLimitChange={handleLimitChange} 
            />
          </div>
        )}

      </div>

      {/* Forms & Modals */}
      {showForm && (
        <MachineForm
          machine={selectedMachine}
          onCancel={handleFormCancel}
          onSuccess={handleFormSuccess}
        />
      )}
      
      {!showForm && selectedMachine && (
        <MachineDetailsModal
          machine={selectedMachine}
          isOpen={!!selectedMachine}
          onClose={() => setSelectedMachine(null)}
          onEdit={handleEditMachine}
          onDelete={handleDeleteMachine}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Machine"
        message={`Are you sure you want to delete "${deleteMachine?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Machine"
        confirmVariant="danger"
        loading={deleteMutation.isLoading}
      />
    </div>
  );
};

export default Machines;