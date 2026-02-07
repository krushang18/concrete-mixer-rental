import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  ArrowLeft,
  Trash2,
  Search,
  Package,
  User,
  History,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

import { quotationApi } from '../../services/quotationApi';
import { customerApi } from '../../services/customerApi';
import { quotationMachineApi } from '../../services/quotationMachineApi';
import { termsConditionsApi } from '../../services/termsConditionsApi';
import { appSettingsApi } from '../../services/appSettingsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Validation schema
const quotationSchema = yup.object({
  customer_name: yup.string(), // Used for search input only
  company_name: yup.string().required('Company name is required').min(2, 'Company name must be at least 2 characters'),
  customer_contact: yup.string().required('Contact number is required').matches(/^\d{10}$/, 'Contact must be a 10-digit number'),
  customer_gst_number: yup.string().nullable(),
  customer_id: yup.number().nullable(),
  additional_notes: yup.string(),
  terms_text: yup.string(),
  items: yup.array().of(
    yup.object({
      item_type: yup.string().oneOf(['machine', 'additional_charge']).required(),
      quotation_machine_id: yup.number().nullable(),
      description: yup.string().required('Description is required'),
      duration_type: yup.string(),
      quantity: yup.number().required('Quantity is required').min(0.01, 'Quantity must be positive'),
      unit_price: yup.number().required('Unit price is required').min(0, 'Unit price must be non-negative'),
      gst_percentage: yup.number().min(0).max(100)
    })
  ).min(1, 'At least one item is required')
});

const QuotationForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const preSelectedCustomerId = searchParams.get('customer');
  
  const isEdit = Boolean(id);
  const queryClient = useQueryClient();

  // State management
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);

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
      customer_name: '', // search input
      company_name: '',
      customer_contact: '',
      customer_gst_number: '',
      customer_id: null,
      additional_notes: '',
      terms_text: '',
      items: [{
        item_type: 'machine',
        quotation_machine_id: null,
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
  const watchedCompanyName = watch('company_name');
  const watchedCustomerContact = watch('customer_contact');

  // Fetch existing quotation for edit
  const { data: existingQuotation, isLoading: loadingQuotation } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationApi.getById(id),
    enabled: Boolean(isEdit && id)
  });

  // Fetch pre-selected customer if provided in URL
  const { data: preSelectedCustomer } = useQuery({
    queryKey: ['customer', preSelectedCustomerId],
    queryFn: () => customerApi.getById(preSelectedCustomerId),
    enabled: Boolean(!isEdit && preSelectedCustomerId)
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

  // Fetch machines from new Catalog
  const { data: machinesData } = useQuery({
    queryKey: ['quotation-machines'],
    queryFn: () => quotationMachineApi.getAll({ is_active: true }),
    staleTime: 5 * 60 * 1000
  });

  // Fetch all terms for selection
  const { data: termsListData } = useQuery({
      queryKey: ['terms-list'],
      queryFn: termsConditionsApi.getForQuotation
  });

  // Fetch customer pricing history
  const { data: pricingHistoryData } = useQuery({
    queryKey: ['customer-pricing', watchedCompanyName, watchedCustomerContact],
    queryFn: () => quotationApi.getPricingHistory(watchedCompanyName, watchedCustomerContact),
    enabled: Boolean(
      watchedCompanyName && 
      watchedCustomerContact && 
      watchedCompanyName.length >= 2 &&
      watchedCustomerContact.length >= 2
    ),
    staleTime: 2 * 60 * 1000
  });

  // Pre-fill form with selected customer data
  useEffect(() => {
    if (preSelectedCustomer?.success && preSelectedCustomer.data && !isEdit) {
      const customer = preSelectedCustomer.data;
      setValue('company_name', customer.company_name || '');
      setValue('customer_name', customer.company_name || '');
      setValue('customer_contact', customer.phone || '');
      setValue('customer_gst_number', customer.gst_number || '');
      setValue('customer_id', customer.id || null);
      
      setCustomerSearch(''); 
      setIsNewCustomer(false);
      toast.success(`Pre-selected customer: ${customer.company_name}`);
    }
  }, [preSelectedCustomer, isEdit, setValue]);

  // Populate form for edit
  useEffect(() => {
    if (existingQuotation?.success && existingQuotation.data) {
      const quotation = existingQuotation.data;
      reset({
        customer_name: quotation.company_name || quotation.customer_name || '', // Pre-fill search with company name
        company_name: quotation.company_name || '',
        customer_contact: quotation.customer_contact || '',
        customer_gst_number: quotation.customer_gst_number || '',
        customer_id: quotation.customer_id || null,
        additional_notes: quotation.additional_notes || '',
        terms_text: quotation.terms_text || '',
        items: quotation.items && quotation.items.length > 0 ? quotation.items.map(i => ({
             ...i,
             quotation_machine_id: i.quotation_machine_id || i.machine_id // fallback
        })) : [{ // default item if none
          item_type: 'machine',
          quotation_machine_id: null,
          description: '',
          duration_type: 'day',
          quantity: 1,
          unit_price: 0,
          gst_percentage: 18
        }]
      });
      // Existing customer, so not "new" mode by default unless they clear it
      setIsNewCustomer(false);
    }
  }, [existingQuotation, reset]);

  // Helper to update price based on machine and duration
  const updatePrice = (index, machineId, durationType) => {
    if (!machineId) return;
    const machine = machinesData?.data?.find(m => m.id === parseInt(machineId));
    if (machine) {
        let price = 0;
        switch(durationType) {
            case 'week': price = machine.priceByWeek || 0; break;
            case 'month': price = machine.priceByMonth || 0; break;
            case 'day': 
            default: price = machine.priceByDay || 0; break;
        }
        // If price is 0, fall back to daily price or keep 0? Defaults to 0 is fine.
        setValue(`items.${index}.unit_price`, price);
    }
  };

  // Handle machine selection
  const handleMachineSelect = (index, machineId) => {
    const machine = machinesData?.data?.find(m => m.id === parseInt(machineId));
    if (machine) {
      setValue(`items.${index}.quotation_machine_id`, machine.id);
      setValue(`items.${index}.description`, machine.name);
      setValue(`items.${index}.gst_percentage`, machine.gst_percentage || 18);
      
      // Update price based on CURRENT duration
      const currentDuration = getValues(`items.${index}.duration_type`) || 'day';
      updatePrice(index, machine.id, currentDuration);
    }
  };
  
  const handleDurationChange = (index, durationType) => {
      // Update local state first (handled by register onChange?) - actually register handles it but we need to trigger logic
      setValue(`items.${index}.duration_type`, durationType);
      
      const machineId = getValues(`items.${index}.quotation_machine_id`);
      if (machineId) {
          updatePrice(index, machineId, durationType);
      }
  };

  const handleTermsChange = useCallback((val) => {
      setValue('terms_text', val, { shouldDirty: true });
  }, [setValue]);

  const handleCustomerSelect = (customer) => {
      // Set values
      setValue('company_name', customer.company_name || '');
      setValue('customer_name', customer.company_name || ''); // Update search box
      setValue('customer_contact', customer.phone || '');
      setValue('customer_gst_number', customer.gst_number || '');
      setValue('customer_id', customer.id || null);
      
      // UI State updates
      setShowCustomerResults(false);
      setCustomerSearch(''); // Clear internal search state if needed, or keep to show what was selected
      setIsNewCustomer(false); // It's an existing customer
      
      toast.success(`Selected customer: ${customer.company_name || customer.contact_person}`);
    };
  
  const handleCreateNewCustomer = () => {
      // Clear ID to ensure backend treats as new/unlinked if needed, 
      // though typically we upsert based on name/phone or explicit logic
      setValue('customer_id', null);
      setValue('company_name', customerSearch); // Initial value from search
      setIsNewCustomer(true);
      setShowCustomerResults(false);
  };

  const addItem = (type = 'machine') => {
    append({
      item_type: type,
      quotation_machine_id: null,
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

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: (data) => {
        // Enforce draft status if creating new, or preserve existing status if editing (or force draft?)
        // User request: "remove the status part and set it to drafted by default"
        // We will default to 'draft' generally, unless editing an active one? 
        // For now, let's stick to 'draft' for new, and maybe keep existing for edit if not passed?
        // But schema doesn't have it anymore. So we must inject it.
        const payload = { ...data, quotation_status: 'draft' }; 
        
        // For new customers, ensure we send the right signal
        // Backend typically handles "if customer_id is null, create/find by details"
        
        if (isEdit) return quotationApi.update(id, payload);
        return quotationApi.create(payload);
    },
    onSuccess: async (response) => {
        // Trigger auto-download if it's a new quotation
        if (!isEdit && response?.success && response?.data?.id) {
            try {
                toast.loading("Generating PDF...", { id: "pdf-gen" });
                await quotationApi.generatePDF(response.data.id);
                toast.dismiss("pdf-gen");
            } catch (error) {
                console.error("Auto-download failed:", error);
                toast.dismiss("pdf-gen");
                // API helper already toasts error, so we just proceed
            }
        }

        queryClient.invalidateQueries(['quotations']);
        navigate('/quotations');
    },
    onError: (err) => {
       // Toast handled by API
    }
  });

  const onSubmit = (data) => {
      // Ensure customer_name maps to company_name if backend expects old field, 
      // but new schema prioritizes company_name. 
      // We'll send company_name as the primary identifier.
      mutation.mutate(data);
  };

  const calculateTotal = () => {
      let sub = 0;
      let gst = 0;
      watchedItems?.forEach(i => {
          const q = parseFloat(i.quantity) || 0;
          const u = parseFloat(i.unit_price) || 0;
          const g = parseFloat(i.gst_percentage) || 0;
          const row = q * u;
          sub += row;
          gst += row * (g/100);
      });
      return { sub: sub.toFixed(2), gst: gst.toFixed(2), total: (sub+gst).toFixed(2)};
  };
  const totals = calculateTotal();

  if (loadingQuotation) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 mb-6">
         <div className="flex items-center space-x-3 max-w-7xl mx-auto">
            <button onClick={() => navigate('/quotations')} className="p-2 hover:bg-gray-100 rounded">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <h1 className="text-lg font-bold">{isEdit ? 'Edit Quotation' : 'New Quotation'}</h1>
                {!isEdit && nextNumberData?.data && <p className="text-xs text-gray-500">{nextNumberData.data}</p>}
            </div>
         </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-7xl mx-auto px-4 space-y-6">
        
        {/* Customer Section */}
        <div className="bg-white rounded-lg border p-6 shadow-sm">
            <h2 className="text-lg font-medium mb-4 flex items-center"><User className="w-5 h-5 mr-2 text-blue-600"/> Customer Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <label className="block text-sm font-medium mb-1">Search Company *</label>
                    <div className="relative">
                        <input 
                            {...register('customer_name')} // Keep using this for the search input logic to avoid breaking change in hook form registration naming too much
                            onChange={(e) => {
                                register('customer_name').onChange(e);
                                setCustomerSearch(e.target.value);
                                setShowCustomerResults(e.target.value.length >= 2);
                                
                                // Also update company_name if we are in "new customer" mode or just typing
                                if (!getValues('customer_id')) {
                                   setValue('company_name', e.target.value);
                                }
                            }}
                            className="input-field w-full p-2 border rounded" 
                            placeholder="Enter Company Name to Search..."
                            autoComplete="off"
                        />
                        <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                    </div>
                    {/* Search Results Dropdown */}
                    {showCustomerResults && !customersLoading && (
                        <div className="absolute z-10 w-full bg-white border shadow-lg mt-1 rounded max-h-60 overflow-auto">
                            {customersData?.data?.length > 0 ? (
                                <>
                                    {customersData.data.map(c => (
                                        <div key={c.id} onClick={() => handleCustomerSelect(c)} className="p-2 hover:bg-gray-50 cursor-pointer border-b">
                                            <div className="font-medium">{c.company_name || c.contact_person}</div>
                                            <div className="text-xs text-gray-500">{c.phone} - {c.site_location || 'No Loc'}</div>
                                        </div>
                                    ))}
                                    <div 
                                        onClick={handleCreateNewCustomer}
                                        className="p-2 hover:bg-blue-50 cursor-pointer text-blue-600 font-medium border-t text-center"
                                    >
                                        + Add New Customer "{customerSearch}"
                                    </div>
                                </>
                            ) : (
                                <div 
                                    onClick={handleCreateNewCustomer}
                                    className="p-3 hover:bg-blue-50 cursor-pointer text-blue-600 font-medium text-center"
                                >
                                    No results. Click to add "{customerSearch}"
                                </div>
                            )}
                        </div>
                    )}
                    <p className="text-red-500 text-xs">{errors.customer_name?.message}</p>
                </div>

                {/* Show other fields if we selected a customer OR if we are typing a new one */}
                {(watch('customer_id') || isNewCustomer || watch('company_name')) && (
                    <>
                         <div>
                            <label className="block text-sm font-medium mb-1">Company Name {(!watch('customer_id') || isNewCustomer) && '*'}</label>
                            <input 
                                {...register('company_name')} 
                                className="input-field w-full p-2 border rounded bg-gray-50" 
                                readOnly={!!watch('customer_id') && !isNewCustomer} // Read only if existing customer selected? defaulting to yes for now to avoid accidental edits of master data here
                            />
                            <p className="text-red-500 text-xs">{errors.company_name?.message}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Contact Number {(!watch('customer_id') || isNewCustomer) && '*'}</label>
                            <input 
                                {...register('customer_contact')} 
                                className="input-field w-full p-2 border rounded" 
                                placeholder="10-digit Mobile"
                            />
                            <p className="text-red-500 text-xs">{errors.customer_contact?.message}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">GST Number</label>
                            <input {...register('customer_gst_number')} className="input-field w-full p-2 border rounded" />
                        </div>
                    </>
                )}
            </div>

            {pricingHistoryData?.data?.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
                    <div className="font-medium flex items-center mb-1"><History className="w-4 h-4 mr-2"/> Recent History</div>
                    {pricingHistoryData.data.slice(0, 2).map((h, i) => (
                        <div key={i} className="text-xs ml-6">
                            {h.quotation_number}: ₹{h.grand_total} ({new Date(h.created_at).toLocaleDateString()}) - {h.quotation_status}
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Items Section */}
        <div className="bg-white rounded-lg border p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                <h2 className="text-lg font-medium flex items-center"><Package className="w-5 h-5 mr-2 text-blue-600"/> Items</h2>
                <div className="flex space-x-2">
                    <button type="button" onClick={() => addItem('machine')} className="flex-1 sm:flex-none text-sm bg-blue-50 text-blue-700 px-3 py-2 sm:py-1 rounded hover:bg-blue-100 flex items-center justify-center">+ Machine</button>
                    <button type="button" onClick={() => addItem('additional_charge')} className="flex-1 sm:flex-none text-sm bg-gray-50 text-gray-700 px-3 py-2 sm:py-1 rounded hover:bg-gray-100 flex items-center justify-center">+ Charge</button>
                </div>
            </div>

            <div className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="border p-4 rounded bg-gray-50 mb-4">
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
                             <div className="text-sm font-medium text-gray-700">Item #{index + 1}</div>
                             <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded">
                                 <Trash2 className="w-4 h-4"/>
                             </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium mb-1">Type</label>
                                <select {...register(`items.${index}.item_type`)} className="w-full p-2 border rounded text-sm">
                                    <option value="machine">Machine</option>
                                    <option value="additional_charge">Charge</option>
                                </select>
                            </div>

                            {watch(`items.${index}.item_type`) === 'machine' && (
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-medium mb-1">Select Machine</label>
                                    <select 
                                        {...register(`items.${index}.quotation_machine_id`)} 
                                        onChange={(e) => handleMachineSelect(index, e.target.value)}
                                        className="w-full p-2 border rounded text-sm"
                                    >
                                        <option value="">Select...</option>
                                        {machinesData?.data?.map(m => (
                                            <option key={m.id} value={m.id}>{m.name} - ₹{m.priceByDay}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className={watch(`items.${index}.item_type`) === 'machine' ? "md:col-span-7" : "md:col-span-10"}>
                                <label className="block text-xs font-medium mb-1">Description</label>
                                <input {...register(`items.${index}.description`)} className="w-full p-2 border rounded text-sm" placeholder="Description" />
                                <p className="text-red-500 text-xs">{errors.items?.[index]?.description?.message}</p>
                            </div>
                            
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium mb-1">Duration</label>
                                <select 
                                    {...register(`items.${index}.duration_type`)} 
                                    className="w-full p-2 border rounded text-sm"
                                    onChange={(e) => handleDurationChange(index, e.target.value)} // Capture native change then update
                                >
                                    <option value="day">Day</option>
                                    <option value="week">Week</option>
                                    <option value="month">Month</option>
                                    <option value="">None</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium mb-1">Qty</label>
                                <input type="number" step="0.01" {...register(`items.${index}.quantity`)} className="w-full p-2 border rounded text-sm" />
                            </div>

                            <div className="md:col-span-3">
                                <label className="block text-xs font-medium mb-1">Unit Price (₹)</label>
                                <input type="number" {...register(`items.${index}.unit_price`)} className="w-full p-2 border rounded text-sm" />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium mb-1">GST %</label>
                                <input type="number" {...register(`items.${index}.gst_percentage`)} className="w-full p-2 border rounded text-sm" />
                                {watch(`items.${index}.item_type`) === 'additional_charge' && !watch(`items.${index}.gst_percentage`) && (
                                    <p className="text-xs text-gray-500 mt-1 italic">No GST added</p>
                                )}
                            </div>
                             
                             <div className="md:col-span-3 flex items-end justify-end pb-2 font-medium text-sm">
                                 Total: ₹{((watch(`items.${index}.quantity`) || 0) * (watch(`items.${index}.unit_price`) || 0)).toFixed(2)}
                             </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 flex justify-end">
                <div className="w-full md:w-1/3 bg-gray-50 p-4 rounded space-y-2">
                    <div className="flex justify-between text-sm"><span>Subtotal:</span> <span>₹{totals.sub}</span></div>
                    <div className="flex justify-between text-sm"><span>GST:</span> <span>₹{totals.gst}</span></div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Grand Total:</span> <span>₹{totals.total}</span></div>
                </div>
            </div>
        </div>

        {/* Terms & Notes */}
        <div className="bg-white rounded-lg border p-6 shadow-sm">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                     <label className="block text-sm font-medium mb-2">Terms & Conditions</label>
                     <TermsBuilder 
                        initialTerms={watch('terms_text')} 
                        onChange={handleTermsChange}
                        availableTerms={termsListData?.data || []}
                     />
                     <input type="hidden" {...register('terms_text')} />
                 </div>
                 
                 <div>
                     <label className="block text-sm font-medium mb-2">Additional Notes</label>
                     <textarea 
                        {...register('additional_notes')} 
                        rows="4" 
                        className="w-full p-3 border rounded text-sm"
                        placeholder="Notes visible to customer..."
                     ></textarea>
                 </div>
             </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={() => navigate('/quotations')} className="px-6 py-2 border rounded bg-white text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={mutation.isLoading || isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center">
                {(mutation.isLoading || isSubmitting) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Quotation
            </button>
        </div>

      </form>
    </div>
  );
};

// Internal Terms Builder Component
const TermsBuilder = ({ initialTerms, onChange, availableTerms = [] }) => {
    // We store selected ID set
    const [selectedIds, setSelectedIds] = useState(new Set());
    // And any extra custom lines
    const [customTerms, setCustomTerms] = useState([]);
    
    const [newTerm, setNewTerm] = useState('');
    
    // Track the last string we emitted to avoid infinite loops when parent updates back
    const lastEmittedRef = useRef(null);

    // Initialize state from string
    useEffect(() => {
        // If initialTerms matches what we last emitted, it's a loop (parent updating from our change), so ignore.
        // If initialTerms matches what we last emitted, it's a loop (parent updating from our change), so ignore.
        if (initialTerms === lastEmittedRef.current && initialTerms !== '') return;

        // If no initial string and we have available terms, set defaults
        if (!initialTerms && availableTerms.length > 0) {
            // Only set defaults if we haven't emitted anything yet (first load)
            // or if we really want to force defaults when empty. 
            // Better to only do this if we are "clean".
            // But for "New Quotation", initialTerms is empty.
            if (lastEmittedRef.current === null) {
                const defaults = new Set(availableTerms.filter(t => t.is_default).map(t => t.id));
                setSelectedIds(defaults);
                setCustomTerms([]);
            }
            return;
        }

        // If we have a string, parse it
        if (initialTerms && availableTerms.length > 0) {
            const lines = initialTerms.split('\n').map(l => l.trim()).filter(l => l);
            const matchedIds = new Set();
            const extras = [];

            lines.forEach(line => {
                // Try to find a match in available terms (by description text)
                // Use trimmed comparison to avoid whitespace mismatch issues
                const found = availableTerms.find(at => at.description?.trim() === line);
                if (found) {
                    matchedIds.add(found.id);
                } else {
                    extras.push(line);
                }
            });

            setSelectedIds(matchedIds);
            setCustomTerms(extras);
        }
    }, [initialTerms, availableTerms]);

    // Construct final string and notify parent
    useEffect(() => {
        // Order: Standard Terms (in display order) + Custom Terms
        // Filter availableTerms by selectedIds, preserving their original order (assuming availableTerms is sorted)
        const selectedDocs = availableTerms.filter(t => selectedIds.has(t.id));
        
        const standardLines = selectedDocs.map(t => t.description);
        const allLines = [...standardLines, ...customTerms];
        const resultString = allLines.join('\n');

        if (resultString !== initialTerms) {
            lastEmittedRef.current = resultString;
            onChange(resultString);
        }
    }, [selectedIds, customTerms, availableTerms, onChange, initialTerms]);

    const toggleTerm = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const addCustomTerm = () => {
        if (!newTerm.trim()) return;
        setCustomTerms([...customTerms, newTerm.trim()]);
        setNewTerm('');
    };

    const removeCustomTerm = (index) => {
        const newArr = [...customTerms];
        newArr.splice(index, 1);
        setCustomTerms(newArr);
    };
    
    // Allow dragging custom terms? For now arrows for custom terms only as standard ones follow catalog order
    const moveCustomTerm = (index, direction) => {
        const newTerms = [...customTerms];
        if (direction === 'up' && index > 0) {
            [newTerms[index], newTerms[index - 1]] = [newTerms[index - 1], newTerms[index]];
        } else if (direction === 'down' && index < newTerms.length - 1) {
            [newTerms[index], newTerms[index + 1]] = [newTerms[index + 1], newTerms[index]];
        }
        setCustomTerms(newTerms);
    };

    return (
        <div className="space-y-4">
            {/* Standard Terms Selection */}
            {availableTerms.length > 0 && (
                <div className="border rounded-lg bg-white p-3 space-y-2 max-h-[300px] overflow-y-auto">
                   <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Standard Terms</p>
                   {availableTerms.map(term => (
                       <label key={term.id} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer border border-transparent hover:border-gray-100">
                           <input 
                                type="checkbox" 
                                checked={selectedIds.has(term.id)} 
                                onChange={() => toggleTerm(term.id)}
                                className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                           />
                           <div className="text-sm">
                               <span className="font-medium block text-gray-900">{term.title}</span>
                               <span className="text-gray-600 block text-xs mt-0.5">{term.description}</span>
                           </div>
                       </label>
                   ))}
                </div>
            )}

            {/* Custom Terms Builder */}
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Additional / Custom Terms</p>
                <div className="border rounded-lg bg-gray-50 p-2 space-y-2 mb-2">
                    {customTerms.length === 0 ? (
                        <div className="text-gray-400 text-xs text-center py-2">No custom terms added.</div>
                    ) : (
                        customTerms.map((term, index) => (
                            <div key={index} className="flex items-start gap-2 bg-white p-2 rounded shadow-sm border group">
                                <span className="text-xs font-mono text-gray-400 mt-1 w-5 shrink-0 px-1">{availableTerms.length + index + 1}.</span>
                                <p className="text-sm text-gray-700 grow whitespace-pre-wrap">{term}</p>
                                <div className="flex flex-col gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button type="button" onClick={() => moveCustomTerm(index, 'up')} disabled={index === 0} className="p-1 hover:bg-gray-100 text-gray-500 disabled:opacity-30"><ArrowLeft className="w-3 h-3 rotate-90" /></button>
                                    <button type="button" onClick={() => moveCustomTerm(index, 'down')} disabled={index === customTerms.length - 1} className="p-1 hover:bg-gray-100 text-gray-500 disabled:opacity-30"><ArrowLeft className="w-3 h-3 -rotate-90" /></button>
                                    <button type="button" onClick={() => removeCustomTerm(index)} className="p-1 hover:bg-red-50 text-red-500"><Trash2 className="w-3 h-3" /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex gap-2">
                    <textarea 
                        value={newTerm}
                        onChange={(e) => setNewTerm(e.target.value)}
                        placeholder="Type a new custom term..."
                        className="flex-1 p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        rows="1"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                addCustomTerm();
                            }
                        }}
                    />
                    <button 
                        type="button" 
                        onClick={addCustomTerm}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
                    >
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuotationForm;