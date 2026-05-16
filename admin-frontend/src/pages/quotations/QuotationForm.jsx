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
  Loader2,
  X,
  Plus
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
      quantity: yup.number().integer('Quantity must be a whole number').required('Quantity is required').min(1, 'Quantity must be at least 1'),
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
        console.log("Create onSuccess response:", response); // DEBUG
        
        // Trigger auto-download if it's a new quotation
        // Backend returns data: { quotation: { id: ... } }
        const newQuotationId = response?.data?.quotation?.id;
        console.log("New Quotation ID:", newQuotationId); // DEBUG
        
        if (!isEdit && response?.success && newQuotationId) {
            console.log("Triggering auto-download...", newQuotationId); // DEBUG
            try {
                toast.loading("Generating PDF...", { id: "pdf-gen" });
                await quotationApi.generatePDF(newQuotationId);
                toast.dismiss("pdf-gen");
                console.log("Auto-download trigger completed"); // DEBUG
            } catch (error) {
                console.error("Auto-download failed:", error);
                toast.dismiss("pdf-gen");
                // API helper already toasts error, so we just proceed
            }
        } else {
            console.log("Auto-download skipped. isEdit:", isEdit, "success:", response?.success); // DEBUG
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
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-3 py-2 mb-3">
         <div className="flex items-center gap-2 max-w-7xl mx-auto">
            <button onClick={() => navigate('/quotations')} className="p-1.5 hover:bg-gray-100 rounded shrink-0">
                <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
                <h1 className="text-sm font-bold leading-tight">{isEdit ? 'Edit Quotation' : 'New Quotation'}</h1>
                {!isEdit && nextNumberData?.data && <p className="text-xs text-gray-400">{nextNumberData.data}</p>}
            </div>
         </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-7xl mx-auto px-3 space-y-3">

        {/* Customer Section */}
        <div className="bg-white rounded-lg border p-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600"/> Customer
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="relative">
                    <label className="block text-xs font-medium mb-0.5">Search Company *</label>
                    <div className="relative">
                        <input
                            {...register('customer_name')}
                            onChange={(e) => {
                                register('customer_name').onChange(e);
                                setCustomerSearch(e.target.value);
                                setShowCustomerResults(e.target.value.length >= 2);
                                if (!getValues('customer_id')) setValue('company_name', e.target.value);
                            }}
                            className="w-full p-1.5 pr-8 border rounded text-xs"
                            placeholder="Enter company name…"
                            autoComplete="off"
                        />
                        <Search className="absolute right-2 top-2 w-3.5 h-3.5 text-gray-400" />
                    </div>
                    {showCustomerResults && !customersLoading && (
                        <div className="absolute z-10 w-full bg-white border shadow-lg mt-1 rounded max-h-52 overflow-auto">
                            {customersData?.data?.length > 0 ? (
                                <>
                                    {customersData.data.map(c => (
                                        <div key={c.id} onClick={() => handleCustomerSelect(c)} className="px-2 py-1.5 hover:bg-gray-50 cursor-pointer border-b">
                                            <div className="text-xs font-medium">{c.company_name || c.contact_person}</div>
                                            <div className="text-xs text-gray-400">{c.phone} · {c.site_location || '—'}</div>
                                        </div>
                                    ))}
                                    <div onClick={handleCreateNewCustomer} className="px-2 py-1.5 hover:bg-blue-50 cursor-pointer text-blue-600 text-xs font-medium border-t text-center">
                                        + Add "{customerSearch}"
                                    </div>
                                </>
                            ) : (
                                <div onClick={handleCreateNewCustomer} className="px-2 py-2 hover:bg-blue-50 cursor-pointer text-blue-600 text-xs font-medium text-center">
                                    No results — add "{customerSearch}"
                                </div>
                            )}
                        </div>
                    )}
                    <p className="text-red-500 text-xs mt-0.5">{errors.customer_name?.message}</p>
                </div>

                {(watch('customer_id') || isNewCustomer || watch('company_name')) && (
                    <>
                        <div>
                            <label className="block text-xs font-medium mb-0.5">Company Name {(!watch('customer_id') || isNewCustomer) && '*'}</label>
                            <input
                                {...register('company_name')}
                                className="w-full p-1.5 border rounded text-xs bg-gray-50"
                                readOnly={!!watch('customer_id') && !isNewCustomer}
                            />
                            <p className="text-red-500 text-xs mt-0.5">{errors.company_name?.message}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-0.5">Contact Number {(!watch('customer_id') || isNewCustomer) && '*'}</label>
                            <input
                                {...register('customer_contact')}
                                className="w-full p-1.5 border rounded text-xs"
                                placeholder="10-digit mobile"
                            />
                            <p className="text-red-500 text-xs mt-0.5">{errors.customer_contact?.message}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-0.5">GST Number</label>
                            <input {...register('customer_gst_number')} className="w-full p-1.5 border rounded text-xs" />
                        </div>
                    </>
                )}
            </div>

            {pricingHistoryData?.data?.length > 0 && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
                    <div className="font-medium flex items-center gap-1 mb-1"><History className="w-3 h-3"/> Recent History</div>
                    {pricingHistoryData.data.slice(0, 2).map((h, i) => (
                        <div key={i} className="ml-4 text-xs text-blue-700">
                            {h.quotation_number}: ₹{h.grand_total} · {new Date(h.created_at).toLocaleDateString()} · {h.quotation_status}
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Items Section */}
        <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-blue-600"/> Items
                </h2>
                <div className="flex gap-1.5">
                    <button type="button" onClick={() => addItem('machine')}
                        className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100"
                        style={{ minHeight: 0, minWidth: 0 }}>
                        + Machine
                    </button>
                    <button type="button" onClick={() => addItem('additional_charge')}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                        style={{ minHeight: 0, minWidth: 0 }}>
                        + Charge
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                {fields.map((field, index) => (
                    <div key={field.id} className="border p-2.5 rounded bg-gray-50">
                        <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-gray-200">
                            <span className="text-xs font-medium text-gray-600">Item #{index + 1}</span>
                            <button type="button" onClick={() => removeItem(index)}
                                className="text-red-400 hover:text-red-600 p-0.5 hover:bg-red-50 rounded"
                                style={{ minHeight: 0, minWidth: 0 }}>
                                <Trash2 className="w-3.5 h-3.5"/>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-12 gap-2">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium mb-0.5">Type</label>
                                <select {...register(`items.${index}.item_type`)} className="w-full p-1.5 border rounded text-xs">
                                    <option value="machine">Machine</option>
                                    <option value="additional_charge">Charge</option>
                                </select>
                            </div>

                            {watch(`items.${index}.item_type`) === 'machine' && (
                                <div className="col-span-2 md:col-span-3">
                                    <label className="block text-xs font-medium mb-0.5">Machine</label>
                                    <select
                                        {...register(`items.${index}.quotation_machine_id`)}
                                        onChange={(e) => handleMachineSelect(index, e.target.value)}
                                        className="w-full p-1.5 border rounded text-xs"
                                    >
                                        <option value="">Select…</option>
                                        {machinesData?.data?.map(m => (
                                            <option key={m.id} value={m.id}>{m.name} — ₹{m.priceByDay}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className={`col-span-2 ${watch(`items.${index}.item_type`) === 'machine' ? 'md:col-span-7' : 'md:col-span-10'}`}>
                                <label className="block text-xs font-medium mb-0.5">Description</label>
                                <input {...register(`items.${index}.description`)} className="w-full p-1.5 border rounded text-xs" placeholder="Description" />
                                <p className="text-red-500 text-xs mt-0.5">{errors.items?.[index]?.description?.message}</p>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium mb-0.5">Duration</label>
                                <select
                                    {...register(`items.${index}.duration_type`)}
                                    className="w-full p-1.5 border rounded text-xs"
                                    onChange={(e) => handleDurationChange(index, e.target.value)}
                                >
                                    <option value="day">Day</option>
                                    <option value="week">Week</option>
                                    <option value="month">Month</option>
                                    <option value="">None</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium mb-0.5">Qty</label>
                                <input type="number" step="1" min="1" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="w-full p-1.5 border rounded text-xs" />
                            </div>

                            <div className="md:col-span-3">
                                <label className="block text-xs font-medium mb-0.5">Unit Price (₹)</label>
                                <input type="number" {...register(`items.${index}.unit_price`)} className="w-full p-1.5 border rounded text-xs" />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium mb-0.5">GST %</label>
                                <input type="number" step="0.01" min="0" max="100" {...register(`items.${index}.gst_percentage`, { valueAsNumber: true })} className="w-full p-1.5 border rounded text-xs" />
                                {watch(`items.${index}.item_type`) === 'additional_charge' && !watch(`items.${index}.gst_percentage`) && (
                                    <p className="text-xs text-gray-400 mt-0.5 italic">No GST</p>
                                )}
                            </div>

                            <div className="col-span-2 md:col-span-3 flex items-end justify-end pb-1 text-xs font-semibold text-gray-700">
                                ₹{((watch(`items.${index}.quantity`) || 0) * (watch(`items.${index}.unit_price`) || 0)).toFixed(2)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Totals */}
            <div className="mt-2 flex justify-end">
                <div className="w-full md:w-1/3 bg-gray-50 p-2.5 rounded space-y-1 border">
                    <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>₹{totals.sub}</span></div>
                    <div className="flex justify-between text-xs text-gray-500"><span>GST</span><span>₹{totals.gst}</span></div>
                    <div className="flex justify-between text-sm font-bold border-t pt-1.5"><span>Total</span><span>₹{totals.total}</span></div>
                </div>
            </div>
        </div>

        {/* Terms & Notes */}
        <div className="bg-white rounded-lg border p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Terms & Conditions</label>
                    <TermsBuilder
                        initialTerms={watch('terms_text')}
                        onChange={handleTermsChange}
                        availableTerms={termsListData?.data || []}
                    />
                    <input type="hidden" {...register('terms_text')} />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Additional Notes</label>
                    <textarea
                        {...register('additional_notes')}
                        rows="4"
                        className="w-full p-1.5 border rounded text-xs"
                        placeholder="Notes visible to customer…"
                    />
                </div>
            </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pb-6">
            <button type="button" onClick={() => navigate('/quotations')}
                className="px-4 py-1.5 text-xs border rounded bg-white text-gray-700 hover:bg-gray-50"
                style={{ minHeight: 0, minWidth: 0 }}>
                Cancel
            </button>
            <button type="submit" disabled={mutation.isLoading || isSubmitting}
                className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1.5 disabled:opacity-60"
                style={{ minHeight: 0, minWidth: 0 }}>
                {(mutation.isLoading || isSubmitting) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Quotation
            </button>
        </div>

      </form>
    </div>
  );
};

// Internal Terms Builder Component
const TermsBuilder = ({ initialTerms, onChange, availableTerms = [] }) => {
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [customTerms, setCustomTerms] = useState([]);
    const [newTerm, setNewTerm] = useState('');
    const lastEmittedRef = useRef(null);

    // Initialize from serialised string
    useEffect(() => {
        if (initialTerms === lastEmittedRef.current && initialTerms !== '') return;

        if (!initialTerms && availableTerms.length > 0) {
            if (lastEmittedRef.current === null) {
                setSelectedIds(new Set(availableTerms.filter(t => t.is_default).map(t => t.id)));
                setCustomTerms([]);
            }
            return;
        }

        if (initialTerms && availableTerms.length > 0) {
            const matchedIds = new Set();
            const extras = [];

            if (initialTerms.includes('\n\n')) {
                // New format: "1. Title\n   Description\n\n2. Title\n   Description"
                initialTerms.trim().split('\n\n').forEach(block => {
                    const firstLine = (block.trim().split('\n')[0] || '').replace(/^\d+\.\s*/, '').trim();
                    const found = availableTerms.find(at => at.title?.trim() === firstLine);
                    if (found) matchedIds.add(found.id);
                    else if (firstLine) extras.push(firstLine);
                });
            } else {
                // Legacy format: description lines joined by \n
                initialTerms.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
                    const found = availableTerms.find(at =>
                        at.description?.trim() === line || at.title?.trim() === line
                    );
                    if (found) matchedIds.add(found.id);
                    else extras.push(line);
                });
            }

            setSelectedIds(matchedIds);
            setCustomTerms(extras);
        }
    }, [initialTerms, availableTerms]);

    // Serialise and emit — format: "1. Title\n   Description\n\n2. Title\n   Description"
    useEffect(() => {
        const selected = availableTerms.filter(t => selectedIds.has(t.id));
        let counter = 1;
        const parts = [
            ...selected.map(t => {
                const line = `${counter++}. ${t.title}${t.description ? '\n   ' + t.description : ''}`;
                return line;
            }),
            ...customTerms.map(t => `${counter++}. ${t}`),
        ];
        const result = parts.join('\n\n');
        if (result !== initialTerms) {
            lastEmittedRef.current = result;
            onChange(result);
        }
    }, [selectedIds, customTerms, availableTerms, onChange, initialTerms]);

    const toggleTerm = (id) => {
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    const addCustomTerm = () => {
        if (!newTerm.trim()) return;
        setCustomTerms(prev => [...prev, newTerm.trim()]);
        setNewTerm('');
    };

    const removeCustomTerm = (index) => {
        setCustomTerms(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-3">
            {/* Standard Terms — checkbox list */}
            {availableTerms.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                    <p className="text-xs font-semibold text-gray-500 uppercase px-3 py-2 bg-gray-50 border-b">
                        Standard Terms
                    </p>
                    <div className="divide-y max-h-56 overflow-y-auto">
                        {availableTerms.map(term => (
                            <label
                                key={term.id}
                                className={`flex items-start gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                                    selectedIds.has(term.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(term.id)}
                                    onChange={() => toggleTerm(term.id)}
                                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 shrink-0"
                                />
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-gray-900 leading-tight">{term.title}</p>
                                    {term.description && (
                                        <p className="text-xs text-gray-400 mt-0.5 leading-snug">{term.description}</p>
                                    )}
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Custom Terms */}
            <div className="border rounded-lg overflow-hidden">
                <p className="text-xs font-semibold text-gray-500 uppercase px-3 py-2 bg-gray-50 border-b">
                    Custom Terms
                </p>

                {customTerms.length > 0 && (
                    <div className="divide-y">
                        {customTerms.map((term, i) => (
                            <div key={i} className="flex items-start gap-2 px-3 py-2">
                                <span className="text-xs text-gray-400 shrink-0 mt-0.5 w-4">{availableTerms.length + i + 1}.</span>
                                <p className="text-xs text-gray-700 grow leading-snug">{term}</p>
                                <button
                                    type="button"
                                    onClick={() => removeCustomTerm(i)}
                                    className="shrink-0 p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                                    style={{ minHeight: 0, minWidth: 0 }}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add input */}
                <div className="flex items-center gap-2 px-3 py-2 border-t bg-white">
                    <input
                        type="text"
                        value={newTerm}
                        onChange={e => setNewTerm(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTerm(); } }}
                        placeholder="Add a custom term and press Enter…"
                        className="flex-1 text-xs py-1 px-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                        type="button"
                        onClick={addCustomTerm}
                        disabled={!newTerm.trim()}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700 disabled:opacity-40"
                        style={{ minHeight: 0, minWidth: 0 }}
                    >
                        <Plus className="w-3 h-3" />
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuotationForm;