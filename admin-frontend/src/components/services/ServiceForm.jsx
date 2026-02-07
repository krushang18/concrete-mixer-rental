import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { serviceApi } from '../../services/serviceApi';
import { machineApi } from '../../services/machineApi';
import { 
  Save, ArrowLeft, Plus, Search, X, ChevronDown, ChevronUp,
  AlertCircle, Check, FileText, Loader2
} from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';

import Pagination from '../../components/common/Pagination';


const ServiceForm = ({ serviceId = null, onBack }) => {
  const [formData, setFormData] = useState({
    machine_id: '',
    service_date: new Date().toISOString().split('T')[0],
    engine_hours: '',
    site_location: '',
    operator: '',
    general_notes: '',
    services: {}
  });
  
  const hasInitialized = useRef(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [errors, setErrors] = useState({});
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState('category'); // 'category' or 'subcategory'
  const [selectedCategoryForSub, setSelectedCategoryForSub] = useState(null);
  const [newItemData, setNewItemData] = useState({
    name: '',
    description: '',
    category_id: null
  });

  // Fetch machines
  const { data: machinesData, isLoading: machinesLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: () => machineApi.getAll()
  });

  // Fetch service categories
  const { data: categoriesData, isLoading: categoriesLoading, refetch: refetchCategories } = useQuery({
    queryKey: ['service-categories'],
    queryFn: () => serviceApi.getServiceCategories()
  });

  // Fetch service record for editing
  const { data: serviceData } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => serviceApi.getById(serviceId),
    enabled: !!serviceId
  });

  // Mutation for creating/updating service
  const serviceMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      console.log('=== MUTATION STARTING ===');
      console.log('ID:', id);
      console.log('Data being sent:', JSON.stringify(data, null, 2));
      console.log('API method:', id ? 'UPDATE' : 'CREATE');
      console.log('========================');
      
      try {
        const result = id ? await serviceApi.update(id, data) : await serviceApi.create(data);
        console.log('=== MUTATION SUCCESS ===');
        console.log('Result:', result);
        console.log('========================');
        return result;
      } catch (error) {
        console.error('=== MUTATION ERROR ===');
        console.error('Error:', error);
        console.error('Error response:', error.response);
        console.error('Error data:', error.response?.data);
        console.error('======================');
        throw error;
      }
    },
    onSuccess: () => {
      if (onBack) {
        onBack();
      } else {
        window.location.href = '/services';
      }
    },
    onError: (error) => {
      setErrors({ general: error.message });
    }
  });

  // Mutation for adding new category
  const addCategoryMutation = useMutation({
    mutationFn: (categoryData) => serviceApi.createServiceCategory(categoryData),
    onSuccess: () => {
      setShowAddModal(false);
      setNewItemData({ name: '', description: '', category_id: null });
      refetchCategories();
    }
  });

  // Mutation for adding new sub-service
  const addSubServiceMutation = useMutation({
    mutationFn: (subServiceData) => serviceApi.createSubServiceItem(subServiceData),
    onSuccess: () => {
      setShowAddModal(false);
      setNewItemData({ name: '', description: '', category_id: null });
      refetchCategories();
    }
  });

  const machines = Array.isArray(machinesData?.data) ? machinesData.data : [];
  const serviceCategories = Array.isArray(categoriesData?.data) ? categoriesData.data : [];

  // Load service data when editing
  useEffect(() => {
    if (serviceData?.data) {
      const service = serviceData.data;
      
      console.log('=== LOADING SERVICE DATA FOR EDIT ===');
      console.log('Raw service data:', service);
      console.log('Services array:', service.services);
      
      const servicesObj = {};
      if (service.services && Array.isArray(service.services)) {
        service.services.forEach(serviceCategory => {
          console.log('Processing service category:', serviceCategory);
          
          servicesObj[serviceCategory.category_id] = {
            selected: serviceCategory.was_performed || false,
            notes: serviceCategory.service_notes || '', // Backend sends service_notes
            subServices: {}
          };
          
          if (serviceCategory.sub_services && Array.isArray(serviceCategory.sub_services)) {
            serviceCategory.sub_services.forEach(subService => {
              console.log('Processing sub-service:', subService);
              
              servicesObj[serviceCategory.category_id].subServices[subService.id] = {
                selected: subService.was_performed || false,
                notes: subService.sub_service_notes || '' // Backend sends sub_service_notes
              };
            });
          }
        });
      }
      
      console.log('Transformed services object:', servicesObj);
      console.log('===================================');
      
      setFormData({
        machine_id: service.machine_id,
        service_date: service.service_date.split('T')[0],
        engine_hours: service.engine_hours || '',
        site_location: service.site_location || '',
        operator: service.operator || '',
        general_notes: service.general_notes || '',
        services: servicesObj
      });
      
      // Auto-expand categories that have selections
      const categoriesToExpand = new Set();
      Object.keys(servicesObj).forEach(categoryId => {
        const categoryData = servicesObj[categoryId];
        if (categoryData.selected || Object.values(categoryData.subServices || {}).some(sub => sub.selected)) {
          categoriesToExpand.add(parseInt(categoryId));
        }
      });
      setExpandedCategories(categoriesToExpand);
    }
  }, [serviceData]);

  // Auto-expand first category when categories load - FIX: Only run once
  useEffect(() => {
    if (serviceCategories.length > 0 && !hasInitialized.current && !searchTerm) {
      // Find the first category that has sub-services
      const firstExpandable = serviceCategories.find(cat => cat.sub_services && cat.sub_services.length > 0);
      if (firstExpandable) {
        setExpandedCategories(new Set([firstExpandable.id]));
      }
      hasInitialized.current = true;
    }
  }, [serviceCategories, searchTerm]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const toggleCategorySelection = useCallback((categoryId) => {
    setFormData(prev => {
      const currentServices = JSON.parse(JSON.stringify(prev.services));
      
      if (!currentServices[categoryId]) {
        currentServices[categoryId] = {
          selected: false,
          notes: '',
          subServices: {}
        };
      }
      
      const wasSelected = currentServices[categoryId].selected;
      const newSelectedState = !wasSelected;
      currentServices[categoryId].selected = newSelectedState;
      
      // Cascade selection/deselection to all sub-services
      const categoryDef = serviceCategories.find(cat => cat.id === categoryId);
      if (categoryDef && categoryDef.sub_services) {
        categoryDef.sub_services.forEach(subService => {
          if (!currentServices[categoryId].subServices[subService.id]) {
            currentServices[categoryId].subServices[subService.id] = {
              selected: false,
              notes: ''
            };
          }
          currentServices[categoryId].subServices[subService.id].selected = newSelectedState;
        });
      }
      
      return {
        ...prev,
        services: currentServices
      };
    });
  }, [serviceCategories]);

  const toggleSubService = useCallback((categoryId, subServiceId) => {
    setFormData(prev => {
      const currentServices = JSON.parse(JSON.stringify(prev.services));
      
      if (!currentServices[categoryId]) {
        currentServices[categoryId] = {
          selected: false,
          notes: '',
          subServices: {}
        };
      }
      
      if (!currentServices[categoryId].subServices[subServiceId]) {
        currentServices[categoryId].subServices[subServiceId] = {
          selected: false,
          notes: ''
        };
      }
      
      const wasSelected = currentServices[categoryId].subServices[subServiceId].selected;
      currentServices[categoryId].subServices[subServiceId].selected = !wasSelected;
      
      // Check if any sub-service is selected
      const hasSelectedSubServices = Object.values(currentServices[categoryId].subServices).some(sub => sub.selected);
      
      // Auto-select parent if any sub-service is selected
      if (hasSelectedSubServices) {
        currentServices[categoryId].selected = true;
      } else {
        // Auto-deselect parent if NO sub-service is selected (only if it has sub-services)
        const categoryDef = serviceCategories.find(cat => cat.id === categoryId);
        if (categoryDef && categoryDef.sub_services && categoryDef.sub_services.length > 0) {
          currentServices[categoryId].selected = false;
        }
      }
      
      return {
        ...prev,
        services: currentServices
      };
    });
  }, [serviceCategories]);

  const updateCategoryNotes = (categoryId, notes) => {
    setFormData(prev => {
      const newServices = { ...prev.services };
      if (!newServices[categoryId]) {
        newServices[categoryId] = {
          selected: false,
          notes: '',
          subServices: {}
        };
      }
      newServices[categoryId].notes = notes;
      return { ...prev, services: newServices };
    });
  };

  const updateSubServiceNotes = (categoryId, subServiceId, notes) => {
    setFormData(prev => {
      const newServices = { ...prev.services };
      if (!newServices[categoryId]) {
        newServices[categoryId] = {
          selected: false,
          notes: '',
          subServices: {}
        };
      }
      if (!newServices[categoryId].subServices[subServiceId]) {
        newServices[categoryId].subServices[subServiceId] = {
          selected: false,
          notes: ''
        };
      }
      newServices[categoryId].subServices[subServiceId].notes = notes;
      return { ...prev, services: newServices };
    });
  };

  const isCategorySelected = (categoryId) => {
    return formData.services[categoryId]?.selected || false;
  };

  const isSubServiceSelected = (categoryId, subServiceId) => {
    return formData.services[categoryId]?.subServices[subServiceId]?.selected || false;
  };

  const hasCategoryInteraction = (categoryId) => {
    const categoryData = formData.services[categoryId];
    if (!categoryData) return false;
    
    return categoryData.selected || 
           categoryData.notes.length > 0 || 
           Object.values(categoryData.subServices || {}).some(sub => sub.selected || sub.notes.length > 0);
  };

  const transformFormDataForSubmission = () => {
    const services = [];
    
    Object.keys(formData.services).forEach(categoryIdStr => {
      const categoryId = parseInt(categoryIdStr);
      const categoryData = formData.services[categoryId];
      
      if (categoryData.selected || Object.values(categoryData.subServices || {}).some(sub => sub.selected)) {
        const category = serviceCategories.find(cat => cat.id === categoryId);
        
        const serviceCategory = {
          category_id: categoryId,
          category_name: category?.name || '',
          was_performed: categoryData.selected,
          service_notes: categoryData.notes || '', // Backend expects service_notes
          sub_services: []
        };
        
        Object.keys(categoryData.subServices || {}).forEach(subIdStr => {
          const subId = parseInt(subIdStr);
          const subData = categoryData.subServices[subId];
          
          if (subData.selected) {
            const subService = category?.sub_services?.find(sub => sub.id === subId);
            serviceCategory.sub_services.push({
              id: subId,
              name: subService?.name || '',
              was_performed: true,
              sub_service_notes: subData.notes || '' // Backend expects sub_service_notes
            });
          }
        });
        
        services.push(serviceCategory);
      }
    });
    
    console.log('=== FORM DATA TRANSFORMATION ===');
    console.log('Original form services:', formData.services);
    console.log('Transformed services for backend:', services);
    console.log('=================================');
    
    return {
      ...formData,
      services
    };
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.machine_id) {
      errors.machine_id = 'Machine is required';
    }
    
    if (!formData.service_date) {
      errors.service_date = 'Service date is required';
    }
    
    if (!formData.operator?.trim()) {
      errors.operator = 'Operator is required';
    }
    
    const hasAnyServiceSelected = Object.values(formData.services).some(categoryData => 
      categoryData.selected || Object.values(categoryData.subServices || {}).some(sub => sub.selected)
    );
    
    if (!hasAnyServiceSelected) {
      errors.services = 'At least one service must be selected';
    }
    
    Object.keys(formData.services).forEach(categoryIdStr => {
      const categoryId = parseInt(categoryIdStr);
      const categoryData = formData.services[categoryId];
      const category = serviceCategories.find(cat => cat.id === categoryId);
      
      if (category?.sub_services?.length > 0 && categoryData.selected) {
        const hasSubServiceSelected = Object.values(categoryData.subServices || {}).some(sub => sub.selected);
        if (!hasSubServiceSelected) {
          errors[`category_${categoryId}`] = `At least one sub-service must be selected for ${category.name}`;
        }
      }
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

  const handleSubmit = () => {
    const validation = validateForm();
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    
    const submitData = transformFormDataForSubmission();
    
    console.log('=== SUBMITTING SERVICE FORM ===');
    console.log('Service ID:', serviceId);
    console.log('Is Edit Mode:', !!serviceId);
    console.log('Submit Data:', JSON.stringify(submitData, null, 2));
    console.log('Services Count:', submitData.services.length);
    console.log('===============================');
    
    serviceMutation.mutate({ 
      id: serviceId, 
      data: submitData 
    });
  };

  const handleAddItem = () => {
    if (addModalType === 'category') {
      if (!newItemData.name.trim()) return;
      
      addCategoryMutation.mutate({
        name: newItemData.name.trim(),
        description: newItemData.description.trim(),
        has_sub_services: 0
      });
    } else {
      if (!newItemData.name.trim() || !newItemData.category_id) return;
      
      addSubServiceMutation.mutate({
        category_id: newItemData.category_id,
        name: newItemData.name.trim(),
        description: newItemData.description.trim()
      });
    }
  };

  const openAddModal = (type, categoryId = null) => {
    setAddModalType(type);
    setSelectedCategoryForSub(categoryId);
    setNewItemData({
      name: '',
      description: '',
      category_id: categoryId
    });
    setShowAddModal(true);
  };

  // Improved search - only show categories that match search OR have matching sub-services
  const filteredCategories = searchTerm 
    ? serviceCategories.filter(category => {
        const categoryMatches = category.name.toLowerCase().includes(searchTerm.toLowerCase());
        const subServiceMatches = category.sub_services?.some(sub => 
          sub.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return categoryMatches || subServiceMatches;
      })
    : serviceCategories;

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Loading states
  if (machinesLoading || categoriesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" text="Loading form data..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center">
            <button
              onClick={onBack || (() => window.history.back())}
              className="mr-3 sm:mr-4 p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                {serviceId ? 'Edit Service Record' : 'New Service Record'}
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
                Record maintenance and service activities for machines
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 sm:space-y-8">
          
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              
              {/* Machine Selection */}
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Machine *
                </label>
                <select
                  value={formData.machine_id}
                  onChange={(e) => handleInputChange('machine_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm sm:text-base ${
                    errors.machine_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Select a machine...</option>
                  {machines.map(machine => (
                    <option key={machine.id} value={machine.id}>
                      {machine.name} - {machine.machine_number || `ID: ${machine.id}`}
                    </option>
                  ))}
                </select>
                {errors.machine_id && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">{errors.machine_id}</span>
                  </p>
                )}
              </div>

              {/* Service Date */}
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Date *
                </label>
                <input
                  type="date"
                  value={formData.service_date}
                  onChange={(e) => handleInputChange('service_date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm sm:text-base ${
                    errors.service_date ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.service_date && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">{errors.service_date}</span>
                  </p>
                )}
              </div>

              {/* Engine Hours */}
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Engine Hours
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 1234.5"
                  value={formData.engine_hours}
                  onChange={(e) => handleInputChange('engine_hours', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm sm:text-base"
                />
              </div>

              {/* Operator */}
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operator *
                </label>
                <input
                  type="text"
                  placeholder="Enter operator name"
                  value={formData.operator}
                  onChange={(e) => handleInputChange('operator', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm sm:text-base ${
                    errors.operator ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.operator && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">{errors.operator}</span>
                  </p>
                )}
              </div>

              {/* Site Location */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site Location
                </label>
                <input
                  type="text"
                  placeholder="Enter site location"
                  value={formData.site_location}
                  onChange={(e) => handleInputChange('site_location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm sm:text-base"
                />
              </div>
            </div>
          </div>

          {/* Services Performed */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Services Performed *
              </h2>
              <button
                type="button"
                onClick={() => openAddModal('category')}
                className="inline-flex items-center px-3 py-2 border border-blue-200 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors w-full sm:w-auto justify-center"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Category
              </button>
            </div>

            {/* Search Bar */}
            <div className="mb-4 sm:mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm sm:text-base"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Services Error */}
            {errors.services && (
              <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {errors.services}
                </p>
              </div>
            )}

            {/* Service Categories */}
            <div className="space-y-3 sm:space-y-4 max-h-[800px] overflow-y-auto pr-1">
              {paginatedCategories.map(category => {
                const hasSubServices = category.sub_services && category.sub_services.length > 0;
                const isExpanded = expandedCategories.has(category.id);
                const categorySelected = isCategorySelected(category.id);
                const hasInteraction = hasCategoryInteraction(category.id);
                
                return (
                  <div key={category.id} className={`border rounded-lg overflow-hidden transition-all duration-200 ${
                    hasInteraction ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'
                  }`}>
                    
                    {/* Category Header */}
                    <div className="flex items-start p-2 sm:p-4">
                      {/* Category Checkbox */}
                      <div className="flex items-start flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleCategorySelection(category.id)}
                          className={`p-1 sm:p-0.5 rounded-md border flex items-center justify-center transition-all duration-200 mr-2 sm:mr-3 flex-shrink-0 shadow-sm mt-0.5 sm:mt-1 ${
                            categorySelected
                              ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                              : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                          }`}
                          style={{ minWidth: '20px', minHeight: '20px' }}
                        >
                          {categorySelected && <Check className="w-4 h-4 sm:w-3.5 sm:h-3.5" />}
                        </button>
                        
                        <div className="flex-1 min-w-0 font-medium pt-0.5">
                          <h3 className={`font-medium transition-colors text-sm sm:text-base break-words ${
                            categorySelected ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {category.name}
                          </h3>
                          {category.description && (
                            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 break-words">{category.description}</p>
                          )}
                          
                          {/* Category validation error */}
                          {errors[`category_${category.id}`] && (
                            <p className="text-sm text-red-600 mt-1 flex items-center">
                              <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{errors[`category_${category.id}`]}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Add Sub-service and Expand/Collapse buttons */}
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          type="button"
                          onClick={() => openAddModal('subcategory', category.id)}
                          className="p-1.5 sm:p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Add sub-service"
                        >
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        
                        {hasSubServices && (
                          <button
                            type="button"
                            onClick={() => toggleCategory(category.id)}
                            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Sub-services */}
                    {hasSubServices && isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 p-3 sm:p-4">
                        <div className="space-y-2 sm:space-y-3">
                          {category.sub_services
                            .filter(subService => 
                              !searchTerm || 
                              subService.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              category.name.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .map(subService => {
                            const subSelected = isSubServiceSelected(category.id, subService.id);
                            
                            return (
                              <div key={subService.id} className={`p-2 sm:p-3 rounded-lg border transition-all duration-200 ${
                                subSelected
                                  ? 'bg-blue-100 border-blue-300'
                                  : 'bg-white border-gray-200 hover:border-gray-300'
                              }`}>
                                <div className="flex items-start mb-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleSubService(category.id, subService.id)}
                                    className={`p-1 sm:p-0.5 rounded border flex items-center justify-center transition-all duration-200 mr-2 sm:mr-3 flex-shrink-0 shadow-sm mt-0.5 sm:mt-1 ${
                                      subSelected
                                        ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                                    }`}
                                    style={{ minWidth: '18px', minHeight: '18px' }}
                                  >
                                    {subSelected && <Check className="w-3.5 h-3.5 sm:w-3 sm:h-3" />}
                                  </button>
                                  
                                  <span className={`text-sm font-medium transition-colors break-words flex-1 ${
                                    subSelected ? 'text-blue-900' : 'text-gray-700'
                                  }`}>
                                    {subService.name}
                                  </span>
                                </div>
                                
                                {/* Sub-service description */}
                                {subService.description && (
                                  <p className="text-[10px] sm:text-xs text-gray-600 ml-6 sm:ml-7 mb-2 leading-relaxed">{subService.description}</p>
                                )}
                                
                                {/* Sub-service notes */}
                                {subSelected && (
                                  <div className="ml-7">
                                    <textarea
                                      placeholder="Notes for this sub-service..."
                                      value={formData.services[category.id]?.subServices[subService.id]?.notes || ''}
                                      onChange={(e) => updateSubServiceNotes(category.id, subService.id, e.target.value)}
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      rows={2}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Category Notes */}
                    {hasInteraction && (
                      <div className="border-t border-gray-200 bg-gray-50 p-3 sm:p-4">
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Notes for {category.name}
                        </label>
                        <textarea
                          placeholder="Add notes for this service category..."
                          value={formData.services[category.id]?.notes || ''}
                          onChange={(e) => updateCategoryNotes(category.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

            </div>

            {/* Pagination Controls */}
            {filteredCategories.length > itemsPerPage && (
              <div className="mt-4">
                <Pagination
                  pagination={{
                    current_page: currentPage,
                    total: filteredCategories.length,
                    per_page: itemsPerPage,
                    total_pages: Math.ceil(filteredCategories.length / itemsPerPage),
                    has_prev_page: currentPage > 1,
                    has_next_page: currentPage < Math.ceil(filteredCategories.length / itemsPerPage),
                    from: (currentPage - 1) * itemsPerPage + 1,
                    to: Math.min(currentPage * itemsPerPage, filteredCategories.length)
                  }}
                  onPageChange={(page) => setCurrentPage(page)}
                  onLimitChange={() => {}} // Not implementing limit change here
                />
              </div>
            )}


            {/* No categories found */}
            {filteredCategories.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Search className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm sm:text-base">No service categories found matching "{searchTerm}"</p>
              </div>
            )}
          </div>

          {/* General Notes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">General Notes</h2>
            <textarea
              placeholder="Enter general notes about the service session..."
              value={formData.general_notes}
              onChange={(e) => handleInputChange('general_notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm sm:text-base"
              rows={4}
            />
          </div>

          {/* Error Display */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-red-600">{errors.general}</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onBack || (() => window.history.back())}
              className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all shadow-sm order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={serviceMutation.isPending}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all order-1 sm:order-2"
            >
              {serviceMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {serviceId ? 'Update Service Record' : 'Create Service Record'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Add Category/Sub-service Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
            <div className="relative top-4 sm:top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-lg bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {addModalType === 'category' ? 'Add New Service Category' : 'Add New Sub-Service'}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {addModalType === 'subcategory' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={newItemData.category_id || ''}
                      onChange={(e) => setNewItemData(prev => ({
                        ...prev,
                        category_id: parseInt(e.target.value) || null
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      required
                    >
                      <option value="">Select a category...</option>
                      {serviceCategories.map(category => (
                        <option key={category.id} value={category.id} selected={category.id === selectedCategoryForSub}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {addModalType === 'category' ? 'Category' : 'Sub-Service'} Name *
                  </label>
                  <input
                    type="text"
                    placeholder={`Enter ${addModalType === 'category' ? 'category' : 'sub-service'} name`}
                    value={newItemData.name}
                    onChange={(e) => setNewItemData(prev => ({
                      ...prev,
                      name: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    placeholder={`Enter ${addModalType === 'category' ? 'category' : 'sub-service'} description`}
                    value={newItemData.description}
                    onChange={(e) => setNewItemData(prev => ({
                      ...prev,
                      description: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItem}
                  disabled={!newItemData.name.trim() || (addModalType === 'subcategory' && !newItemData.category_id) || 
                           addCategoryMutation.isPending || addSubServiceMutation.isPending}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {(addCategoryMutation.isPending || addSubServiceMutation.isPending) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    `Add ${addModalType === 'category' ? 'Category' : 'Sub-Service'}`
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceForm;