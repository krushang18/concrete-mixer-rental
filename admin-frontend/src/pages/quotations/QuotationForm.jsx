import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Calculator,
  Search,
  Building2,
  Phone,
  IndianRupee,
  Package,
  FileText,
  AlertCircle,
  CheckCircle,
  Mail,
  User,
  Edit3,
  Copy,
  GripVertical,
  X,
  Eye,
  History,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

import { quotationApi } from '../../services/quotationApi';
import { customerApi } from '../../services/customerApi';
import { machineApi } from '../../services/machineApi';
import { termsConditionsApi } from '../../services/termsConditionsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Validation schema
const quotationSchema = yup.object({
  customer_name: yup.string().required('Customer name is required').min(2, 'Customer name must be at least 2 characters'),
  customer_contact: yup.string().required('Customer contact is required').matches(/^\d{10}$/, 'Contact must be a 10-digit number'),
  company_name: yup.string(),
  customer_gst_number: yup.string().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/, 'Invalid GST format').nullable(),
  customer_id: yup.number().nullable(),
  quotation_status: yup.string().oneOf(['draft', 'sent', 'accepted', 'rejected', 'expired']).required(),
  delivery_status: yup.string().oneOf(['pending', 'delivered', 'completed', 'cancelled']).required(),
  additional_notes: yup.string(),
  items: yup.array().of(
    yup.object({
      item_type: yup.string().oneOf(['machine', 'additional_charge']).required(),
      machine_id: yup.number().nullable(),
      description: yup.string().required('Description is required'),
      duration_type: yup.string(),
      quantity: yup.number().required('Quantity is required').min(0.01, 'Quantity must be positive'),
      unit_price: yup.number().required('Unit price is required').min(0, 'Unit price must be non-negative'),
      gst_percentage: yup.number().min(0, 'GST percentage cannot be negative').max(100, 'GST percentage cannot exceed 100%')
    })
  ).min(1, 'At least one item is required')
});

const QuotationForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const queryClient = useQueryClient();

  // State management
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [selectedTerms, setSelectedTerms] = useState([]);
  const [customTerms, setCustomTerms] = useState([]);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Form handling
  const { 
    register, 
    handleSubmit, 
    watch, 
    setValue, 
    getValues,
    control, 
    formState: { errors, isSubmitting },
    reset 
  } = useForm({
    resolver: yupResolver(quotationSchema),
    defaultValues: {
      customer_name: '',
      customer_contact: '',
      company_name: '',
      customer_gst_number: '',
      customer_id: null,
      quotation_status: 'draft',
      delivery_status: 'pending',
      additional_notes: '',
      items: [{
        item_type: 'machine',
        machine_id: null,
        description: '',
        duration_type: 'day',
        quantity: 1,
        unit_price: 0,
        gst_percentage: 18
      }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchedItems = watch('items');
  const watchedCustomerName = watch('customer_name');
  const watchedCustomerContact = watch('customer_contact');

  // Fetch existing quotation for edit
  const { data: existingQuotation, isLoading: loadingQuotation } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationApi.getById(id),
    enabled: Boolean(isEdit && id)
  });

  // Fetch next quotation number
  const { data: nextNumberData } = useQuery({
    queryKey: ['quotation-next-number'],
    queryFn: quotationApi.getNextNumber,
    enabled: !isEdit
  });

  // Customer search
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers-search-quotation', customerSearch],
    queryFn: () => customerApi.searchForQuotation(customerSearch),
    enabled: Boolean(customerSearch && customerSearch.length >= 2),
    staleTime: 30 * 1000
  });

  // Fetch machines
  const { data: machinesData } = useQuery({
    queryKey: ['machines-active'],
    queryFn: () => machineApi.getAll({ is_active: true }),
    staleTime: 5 * 60 * 1000
  });

  // Fetch terms and conditions - MOVED BEFORE THE useEffect THAT USES IT
  const { data: termsData } = useQuery({
    queryKey: ['terms-conditions'],
    queryFn: () => termsConditionsApi.getAll(),
    staleTime: 5 * 60 * 1000
  });

  // Fetch customer pricing history
  const { data: pricingHistoryData } = useQuery({
    queryKey: ['customer-pricing', watchedCustomerName, watchedCustomerContact],
    queryFn: () => quotationApi.getCustomerPricing(watchedCustomerName, watchedCustomerContact),
    enabled: Boolean(
      watchedCustomerName && 
      watchedCustomerContact && 
      watchedCustomerName.length >= 2 &&
      watchedCustomerContact.length >= 2
    ),
    staleTime: 2 * 60 * 1000
  });

  // Effect to handle form population when quotation data is loaded
  useEffect(() => {
    if (existingQuotation?.success && existingQuotation.data) {
      const quotation = existingQuotation.data;
      
      console.log('Populating form with quotation data:', quotation);
      
      // Reset form with quotation data
      reset({
        customer_name: quotation.customer_name || '',
        customer_contact: quotation.customer_contact || '',
        company_name: quotation.company_name || '',
        customer_gst_number: quotation.customer_gst_number || '',
        customer_id: quotation.customer_id || null,
        quotation_status: quotation.quotation_status || 'draft',
        delivery_status: quotation.delivery_status || 'pending',
        additional_notes: quotation.additional_notes || '',
        items: quotation.items && quotation.items.length > 0 ? quotation.items : [{
          item_type: 'machine',
          machine_id: null,
          description: '',
          duration_type: 'day',
          quantity: 1,
          unit_price: 0,
          gst_percentage: 18
        }]
      });
    }
  }, [existingQuotation, reset]);

  // Effect to handle terms & conditions population - NOW SAFE TO USE termsData
  useEffect(() => {
    if (existingQuotation?.success && existingQuotation.data && termsData?.data) {
      const quotation = existingQuotation.data;

      // Parse and set terms & conditions
      if (quotation.terms_conditions) {
        try {
          const termsConfig = typeof quotation.terms_conditions === 'string' 
            ? JSON.parse(quotation.terms_conditions) 
            : quotation.terms_conditions;

          if (termsConfig.default_term_ids && termsConfig.default_term_ids.length > 0) {
            const selectedTermsFromDB = termsData.data.filter(term => 
              termsConfig.default_term_ids.includes(term.id)
            );
            setSelectedTerms(selectedTermsFromDB);
            console.log('Set selected terms:', selectedTermsFromDB);
          }

          if (termsConfig.custom_terms && termsConfig.custom_terms.length > 0) {
            const customTermsWithIds = termsConfig.custom_terms.map((term, index) => ({
              ...term,
              id: Date.now() + index
            }));
            setCustomTerms(customTermsWithIds);
            console.log('Set custom terms:', customTermsWithIds);
          }
        } catch (error) {
          console.error('Error parsing terms conditions:', error);
        }
      }
    }
  }, [existingQuotation, termsData]);

  // Create/Update mutation
const quotationMutation = useMutation({
  mutationFn: async (data) => {
    try {
      console.log('Frontend mutation data:', data); // Debug log

      // Handle customer GST update if needed
      const shouldUpdateCustomerGST = data.customer_id && 
                                    data.customer_gst_number && 
                                    data.customer_gst_number.trim();

      if (shouldUpdateCustomerGST) {
        try {
          // Check if customer exists and doesn't have GST, then update
          const customerResponse = await customerApi.getById(data.customer_id);
          if (customerResponse?.success && customerResponse.data) {
            const customer = customerResponse.data;
            if (!customer.gst_number || customer.gst_number.trim() === '') {
              console.log('Updating customer GST number:', data.customer_gst_number);
              await customerApi.update(data.customer_id, {
                gst_number: data.customer_gst_number.trim().toUpperCase()
              });
              toast.success('Customer GST number updated');
            }
          }
        } catch (customerError) {
          console.error('Error updating customer GST:', customerError);
          // Don't fail the quotation creation/update for customer GST update errors
        }
      }

      // Prepare items data for both create and update
      const itemsData = data.items.map(item => ({
        item_type: item.item_type,
        machine_id: item.machine_id ? parseInt(item.machine_id) : null,
        description: item.description?.trim(),
        duration_type: item.duration_type || null,
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price),
        gst_percentage: parseFloat(item.gst_percentage || 18)
      }));

      // Prepare terms conditions data
      const termsConditionsData = {
        default_term_ids: selectedTerms.map(t => t.id),
        custom_terms: customTerms.map(term => ({
          title: term.title?.trim(),
          description: term.description?.trim()
        })).filter(term => term.title && term.description)
      };

      // Proceed with quotation creation/update
      if (isEdit) {
        const updatePayload = {
          // Include all basic fields
          customer_name: data.customer_name?.trim(),
          customer_contact: data.customer_contact?.replace(/\D/g, ''),
          company_name: data.company_name?.trim(),
          customer_gst_number: data.customer_gst_number?.trim().toUpperCase() || null,
          customer_id: data.customer_id ? parseInt(data.customer_id) : null,
          additional_notes: data.additional_notes?.trim(),
          quotation_status: data.quotation_status,
          delivery_status: data.delivery_status,
          // CRITICAL: Include items and terms for updates
          items: itemsData,
          terms_conditions: termsConditionsData
        };

        console.log('Sending update payload:', updatePayload); // Debug log
        return quotationApi.update(id, updatePayload);
      }
      
      // For creation, send full payload
      const createPayload = {
        customer_name: data.customer_name?.trim(),
        customer_contact: data.customer_contact?.replace(/\D/g, ''),
        company_name: data.company_name?.trim(),
        customer_gst_number: data.customer_gst_number?.trim().toUpperCase() || null,
        customer_id: data.customer_id ? parseInt(data.customer_id) : null,
        quotation_status: data.quotation_status || 'draft',
        delivery_status: data.delivery_status || 'pending',
        additional_notes: data.additional_notes?.trim(),
        items: itemsData,
        terms_conditions: termsConditionsData
      };
      
      console.log('Sending create payload:', createPayload); // Debug log
      return quotationApi.create(createPayload);
    } catch (error) {
      console.error('Mutation error:', error);
      throw error;
    }
  },
  onSuccess: () => {
    toast.success(isEdit ? 'Quotation updated successfully' : 'Quotation created successfully');
    queryClient.invalidateQueries(['quotations']);
    queryClient.invalidateQueries(['customers']);
    navigate('/quotations');
  },
  onError: (error) => {
    console.error('Quotation mutation error:', error);
    toast.error(error.message || `Failed to ${isEdit ? 'update' : 'create'} quotation`);
  }
});


  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: customerApi.create,
    onSuccess: (response) => {
      if (response.success && response.data) {
        setValue('customer_id', response.data.id);
        setShowCustomerForm(false);
        toast.success('Customer created and linked to quotation');
      }
    }
  });

  // Auto-calculate totals
  useEffect(() => {
    const calculateTotals = () => {
      setIsCalculating(true);
      setTimeout(() => setIsCalculating(false), 300);
    };

    const timer = setTimeout(calculateTotals, 300);
    return () => clearTimeout(timer);
  }, [watchedItems]);

  // Handle customer selection
  const handleCustomerSelect = (customer) => {
    setValue('customer_name', customer.contact_person || customer.company_name || '');
    setValue('customer_contact', customer.phone || '');
    setValue('company_name', customer.company_name || '');
    setValue('customer_gst_number', customer.gst_number || '');
    setValue('customer_id', customer.id || null);
    setShowCustomerResults(false);
    setCustomerSearch('');
    toast.success(`Selected customer: ${customer.company_name || customer.contact_person}`);
  };

  // Handle new customer creation
  const handleCreateNewCustomer = () => {
    const formData = getValues();
    const customerData = {
      company_name: formData.company_name || formData.customer_name,
      contact_person: formData.customer_name,
      phone: formData.customer_contact,
      email: '',
      gst_number: formData.customer_gst_number || '',
      address: '',
      site_location: ''
    };

    setShowCustomerForm(true);
  };

  // Handle machine selection
  const handleMachineSelect = (index, machineId) => {
    const machine = machinesData?.data?.find(m => m.id === parseInt(machineId));
    if (machine) {
      setValue(`items.${index}.machine_id`, machine.id);
      setValue(`items.${index}.description`, machine.name);
      setValue(`items.${index}.unit_price`, machine.priceByDay || 0);
      setValue(`items.${index}.gst_percentage`, machine.gst_percentage || 18);
    }
  };

  // Handle duration type change
  const handleDurationTypeChange = (index, durationType, machineId) => {
    const machine = machinesData?.data?.find(m => m.id === parseInt(machineId));
    if (machine) {
      let price = 0;
      switch (durationType) {
        case 'day':
          price = machine.priceByDay || 0;
          break;
        case 'week':
          price = machine.priceByWeek || 0;
          break;
        case 'month':
          price = machine.priceByMonth || 0;
          break;
        default:
          price = machine.priceByDay || 0;
      }
      setValue(`items.${index}.unit_price`, price);
      setValue(`items.${index}.duration_type`, durationType);
    }
  };

  // Terms management
  const handleTermSelect = (term) => {
    if (!selectedTerms.find(t => t.id === term.id)) {
      setSelectedTerms([...selectedTerms, term]);
    }
  };

  const handleTermRemove = (termId) => {
    setSelectedTerms(selectedTerms.filter(t => t.id !== termId));
  };

  const addCustomTerm = () => {
    const newTerm = {
      id: Date.now(),
      title: '',
      description: '',
      category: 'custom'
    };
    setCustomTerms([...customTerms, newTerm]);
  };

  const updateCustomTerm = (index, field, value) => {
    const updated = [...customTerms];
    updated[index][field] = value;
    setCustomTerms(updated);
  };

  const removeCustomTerm = (index) => {
    setCustomTerms(customTerms.filter((_, i) => i !== index));
  };

  // Add/remove items
  const addItem = (type = 'machine') => {
    append({
      item_type: type,
      machine_id: null,
      description: '',
      duration_type: type === 'machine' ? 'day' : '',
      quantity: 1,
      unit_price: 0,
      gst_percentage: 18
    });
  };

  const removeItem = (index) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      toast.error('At least one item is required');
    }
  };

  // Calculate totals
  const calculateDisplayTotals = () => {
    let subtotal = 0;
    let totalGst = 0;

    if (watchedItems && Array.isArray(watchedItems)) {
      watchedItems.forEach(item => {
        if (item && item.quantity && item.unit_price) {
          const itemSubtotal = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
          const itemGst = (itemSubtotal * parseFloat(item.gst_percentage || 0)) / 100;
          
          subtotal += itemSubtotal;
          totalGst += itemGst;
        }
      });
    }

    return {
      subtotal: subtotal.toFixed(2),
      totalGst: totalGst.toFixed(2),
      grandTotal: (subtotal + totalGst).toFixed(2)
    };
  };

  const totals = calculateDisplayTotals();

  const onSubmit = (data) => {
    quotationMutation.mutate(data);
  };

  if (isEdit && loadingQuotation) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/quotations')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {isEdit ? 'Edit Quotation' : 'New Quotation'}
              </h1>
              {!isEdit && nextNumberData?.data && (
                <p className="text-xs text-gray-500">
                  {typeof nextNumberData.data === 'string' ? nextNumberData.data : nextNumberData.data.next_number || nextNumberData.data}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="pb-20">
        {/* Customer Information */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                Customer Information
              </h2>
            </div>
            
            {/* Customer Search */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Existing Customer
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomerSearch(value);
                    setShowCustomerResults(value.length >= 2);
                  }}
                  placeholder="Search by company, contact person, or phone..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm pl-10"
                />
                <Search className={`absolute left-3 top-3 h-4 w-4 ${customersLoading ? 'animate-spin text-blue-500' : 'text-gray-400'}`} />
                
                {/* Search Results */}
                {showCustomerResults && !customersLoading && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {customersData?.data?.length > 0 ? (
                      <>
                        {customersData.data.map(customer => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => handleCustomerSelect(customer)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900 text-sm">
                              {customer.company_name || 'No Company Name'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 space-y-1">
                              {customer.contact_person && (
                                <div className="flex items-center">
                                  <User className="h-3 w-3 mr-1" />
                                  {customer.contact_person}
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {customer.phone}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                        <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t">
                          {customersData.count} customer(s) found
                        </div>
                      </>
                    ) : (
                      <div className="px-4 py-6 text-center text-gray-500 text-sm">
                        <Building2 className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                        <div>No customers found</div>
                        <button
                          type="button"
                          onClick={() => setShowCustomerResults(false)}
                          className="mt-2 text-blue-600 text-xs hover:text-blue-800"
                        >
                          Create new customer below
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Customer Form Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    {...register('customer_name')}
                    type="text"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Enter customer name"
                  />
                  {errors.customer_name && (
                    <p className="mt-1 text-xs text-red-600">{errors.customer_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Contact *
                  </label>
                  <input
                    {...register('customer_contact')}
                    type="tel"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="10-digit phone number"
                    maxLength="10"
                  />
                  {errors.customer_contact && (
                    <p className="mt-1 text-xs text-red-600">{errors.customer_contact.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  {...register('company_name')}
                  type="text"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GST Number
                </label>
                <input
                  {...register('customer_gst_number')}
                  type="text"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="22AAAAA0000A1Z5"
                />
                {errors.customer_gst_number && (
                  <p className="mt-1 text-xs text-red-600">{errors.customer_gst_number.message}</p>
                )}
              </div>

              {/* Create New Customer Button */}
              {!watch('customer_id') && (
                <button
                  type="button"
                  onClick={handleCreateNewCustomer}
                  className="w-full mt-4 flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create & Save Customer
                </button>
              )}
            </div>

            {/* Pricing History */}
            {pricingHistoryData?.data?.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                  <History className="h-4 w-4 mr-2" />
                  Previous Pricing History
                </h3>
                <div className="space-y-2">
                  {pricingHistoryData.data.slice(0, 2).map((history, index) => (
                    <div key={index} className="text-xs text-blue-700 bg-white p-2 rounded">
                      <div className="font-medium">{history.quotation_number}</div>
                      <div className="text-blue-600">{history.pricing_details}</div>
                      <div className="text-blue-500">₹{history.grand_total} • {new Date(history.created_at).toLocaleDateString('en-IN')}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quotation Items */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <Package className="h-5 w-5 mr-2 text-blue-600" />
                Quotation Items
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <button
                type="button"
                onClick={() => addItem('machine')}
                className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Package className="h-4 w-4 mr-2" />
                Add Machine
              </button>
              <button
                type="button"
                onClick={() => addItem('additional_charge')}
                className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Charge
              </button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Item {index + 1}
                      </span>
                      <select
                        {...register(`items.${index}.item_type`)}
                        className="text-xs rounded border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="machine">Machine</option>
                        <option value="additional_charge">Additional Charge</option>
                      </select>
                    </div>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Machine Selection */}
                    {watch(`items.${index}.item_type`) === 'machine' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Machine *
                        </label>
                        <select
                          {...register(`items.${index}.machine_id`)}
                          onChange={(e) => handleMachineSelect(index, e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="">Select a machine</option>
                          {machinesData?.data?.map(machine => (
                            <option key={machine.id} value={machine.id}>
                              {machine.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description *
                      </label>
                      <input
                        {...register(`items.${index}.description`)}
                        type="text"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Enter item description"
                      />
                      {errors.items?.[index]?.description && (
                        <p className="mt-1 text-xs text-red-600">{errors.items[index].description.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Duration Type */}
                      {watch(`items.${index}.item_type`) === 'machine' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Duration
                          </label>
                          <select
                            {...register(`items.${index}.duration_type`)}
                            onChange={(e) => handleDurationTypeChange(index, e.target.value, watch(`items.${index}.machine_id`))}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          >
                            <option value="day">Per Day</option>
                            <option value="week">Per Week</option>
                            <option value="month">Per Month</option>
                          </select>
                        </div>
                      )}

                      {/* Quantity */}
                      <div className={watch(`items.${index}.item_type`) === 'machine' ? '' : 'col-span-2'}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity *
                        </label>
                        <input
                          {...register(`items.${index}.quantity`)}
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        {errors.items?.[index]?.quantity && (
                          <p className="mt-1 text-xs text-red-600">{errors.items[index].quantity.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Unit Price */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit Price *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-400 text-sm">₹</span>
                          <input
                            {...register(`items.${index}.unit_price`)}
                            type="number"
                            step="0.01"
                            min="0"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm pl-8"
                          />
                        </div>
                        {errors.items?.[index]?.unit_price && (
                          <p className="mt-1 text-xs text-red-600">{errors.items[index].unit_price.message}</p>
                        )}
                      </div>

                      {/* GST Percentage */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          GST %
                        </label>
                        <input
                          {...register(`items.${index}.gst_percentage`)}
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        {errors.items?.[index]?.gst_percentage && (
                          <p className="mt-1 text-xs text-red-600">{errors.items[index].gst_percentage.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Item Total Display */}
                    {watch(`items.${index}.quantity`) && watch(`items.${index}.unit_price`) && (
                      <div className="mt-3 p-3 bg-white rounded-md border border-gray-200">
                        <div className="text-sm text-gray-600">
                          {(() => {
                            const quantity = parseFloat(watch(`items.${index}.quantity`)) || 0;
                            const unitPrice = parseFloat(watch(`items.${index}.unit_price`)) || 0;
                            const gstPercentage = parseFloat(watch(`items.${index}.gst_percentage`)) || 0;
                            
                            const subtotal = quantity * unitPrice;
                            const gstAmount = (subtotal * gstPercentage) / 100;
                            const total = subtotal + gstAmount;
                            
                            return (
                              <div className="flex justify-between items-center">
                                <span className="text-xs">
                                  {quantity} × ₹{unitPrice.toFixed(2)} = ₹{subtotal.toFixed(2)}
                                  {gstPercentage > 0 && ` + GST (${gstPercentage}%) ₹${gstAmount.toFixed(2)}`}
                                </span>
                                <span className="font-semibold text-blue-600 text-sm">₹{total.toFixed(2)}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {errors.items && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.items.message}
              </p>
            )}
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Terms & Conditions
              </h2>
            </div>

            {/* Terms Selection */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Select Terms & Conditions
              </button>

              {/* Selected Terms */}
              {selectedTerms.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">Selected Terms:</h3>
                  {selectedTerms.map((term, index) => (
                    <div key={term.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{term.title}</div>
                        <div className="text-xs text-gray-500 mt-1">{term.description}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTermRemove(term.id)}
                        className="ml-3 text-red-600 hover:text-red-800 p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Custom Terms */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Custom Terms:</h3>
                  <button
                    type="button"
                    onClick={addCustomTerm}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    <Plus className="h-3 w-3 inline mr-1" />
                    Add Custom
                  </button>
                </div>

                {customTerms.map((term, index) => (
                  <div key={term.id} className="space-y-3 p-3 bg-gray-50 rounded-lg border mb-3">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        placeholder="Term title"
                        value={term.title}
                        onChange={(e) => updateCustomTerm(index, 'title', e.target.value)}
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomTerm(index)}
                        className="ml-3 text-red-600 hover:text-red-800 p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      placeholder="Term description"
                      value={term.description}
                      onChange={(e) => updateCustomTerm(index, 'description', e.target.value)}
                      rows={2}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <Settings className="h-5 w-5 mr-2 text-blue-600" />
                Additional Information
              </h2>
            </div>

            <div className="space-y-4">
              {/* Status Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quotation Status *
                  </label>
                  <select
                    {...register('quotation_status')}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Status *
                  </label>
                  <select
                    {...register('delivery_status')}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="delivered">Delivered</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  {...register('additional_notes')}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Enter any additional notes, special instructions, or terms..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quotation Summary */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 py-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Calculator className="h-5 w-5 mr-2 text-blue-600" />
              Quotation Summary
            </h2>
            
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Subtotal:</span>
                  <span className="text-sm font-medium">₹{totals.subtotal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total GST:</span>
                  <span className="text-sm font-medium">₹{totals.totalGst}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-300">
                  <span className="text-lg font-semibold text-gray-900">Grand Total:</span>
                  <span className="text-lg font-bold text-blue-600">₹{totals.grandTotal}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
                  <span>Items: {fields.length}</span>
                  <span>Terms: {selectedTerms.length + customTerms.length}</span>
                </div>
              </div>
              
              {isCalculating && (
                <div className="flex items-center justify-center mt-3 pt-3 border-t border-gray-300">
                  <Calculator className="h-4 w-4 text-blue-500 animate-spin mr-2" />
                  <span className="text-xs text-blue-600">Calculating...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-50">
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => navigate('/quotations')}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || quotationMutation.isLoading}
            className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(isSubmitting || quotationMutation.isLoading) && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            )}
            <Save className="h-4 w-4 mr-2" />
            {isEdit ? 'Update' : 'Create'} Quotation
          </button>
        </div>
      </div>

      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowTermsModal(false)} />
            
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full max-w-lg">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Select Terms & Conditions</h3>
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {termsData?.data && termsData.data.length > 0 ? (
                    termsData.data.map((term) => (
                      <div
                        key={term.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedTerms.find(t => t.id === term.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleTermSelect(term)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">{term.title}</div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{term.description}</div>
                            <div className="text-xs text-blue-600 mt-1 capitalize">{term.category}</div>
                          </div>
                          {selectedTerms.find(t => t.id === term.id) && (
                            <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 ml-2" />
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        {termsData ? 'No terms and conditions available' : 'Loading terms and conditions...'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Creation Modal */}
      {showCustomerForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCustomerForm(false)} />
            
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full max-w-lg">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Create New Customer</h3>
                  <button
                    type="button"
                    onClick={() => setShowCustomerForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    This will create a new customer record with the details you've entered and link it to this quotation.
                  </p>
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm">
                      <div><strong>Company:</strong> {watch('company_name') || watch('customer_name')}</div>
                      <div><strong>Contact Person:</strong> {watch('customer_name')}</div>
                      <div><strong>Phone:</strong> {watch('customer_contact')}</div>
                      <div><strong>GST:</strong> {watch('customer_gst_number') || 'Not provided'}</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      placeholder="customer@company.com"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                      id="customer-email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Complete address"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                      id="customer-address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Site Location *
                    </label>
                    <input
                      type="text"
                      placeholder="Project/site location"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                      id="customer-site"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    const email = document.getElementById('customer-email').value;
                    const address = document.getElementById('customer-address').value;
                    const siteLocation = document.getElementById('customer-site').value;
                    
                    if (!email || !siteLocation) {
                      toast.error('Email and site location are required');
                      return;
                    }

                    const customerData = {
                      company_name: watch('company_name') || watch('customer_name'),
                      contact_person: watch('customer_name'),
                      phone: watch('customer_contact'),
                      email: email,
                      gst_number: '',
                      address: address,
                      site_location: siteLocation
                    };

                    createCustomerMutation.mutate(customerData);
                  }}
                  disabled={createCustomerMutation.isLoading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {createCustomerMutation.isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Create Customer
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomerForm(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationForm;