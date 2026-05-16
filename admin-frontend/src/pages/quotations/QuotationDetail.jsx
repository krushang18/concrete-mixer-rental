import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Download,
  Building2,
  Phone,
  Calendar,
  User,
  FileText,
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ExternalLink,
  RefreshCcw,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

import { quotationApi } from '../../services/quotationApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const quotationStatusConfig = {
  draft:    { label: 'Draft',    color: 'gray',  icon: FileText },
  sent:     { label: 'Sent',     color: 'blue',  icon: Clock },
  accepted: { label: 'Accepted', color: 'green', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'red',   icon: XCircle },
};

const colorClasses = {
  gray:   'bg-gray-100 text-gray-800',
  blue:   'bg-blue-100 text-blue-800',
  green:  'bg-green-100 text-green-800',
  red:    'bg-red-100 text-red-800',
};

// Parses terms_text into [{title, description}].
// Supports new format ("1. Title\n   Desc\n\n2. Title...") and legacy format (lines joined by \n).
const parseTerms = (text) => {
  if (!text) return [];
  if (text.includes('\n\n')) {
    // New format — each term block separated by double newline
    return text.trim().split('\n\n').map(block => {
      const lines = block.trim().split('\n');
      const title = (lines[0] || '').replace(/^\d+\.\s*/, '').trim();
      const description = lines.slice(1).map(l => l.trim()).filter(Boolean).join(' ');
      return { title, description };
    }).filter(t => t.title);
  }
  // Legacy format — each line is a standalone term description
  return text.trim().split('\n').filter(Boolean).map(line => ({
    title: line.trim(),
    description: '',
  }));
};

const QuotationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data: quotationData, isLoading, error, refetch } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationApi.getById(id),
    retry: 1
  });

  const deleteMutation = useMutation({
    mutationFn: quotationApi.delete,
    onSuccess: () => navigate('/quotations'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ status }) => quotationApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['quotation', id]);
      queryClient.invalidateQueries(['quotations']);
    },
  });

  const handleStatusUpdate = (status) => statusMutation.mutate({ status });

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      toast.loading('Generating PDF...', { id: 'pdf-dl' });
      await quotationApi.generatePDF(id);
      toast.success('PDF downloaded', { id: 'pdf-dl' });
    } catch (err) {
      toast.error(err.message || 'Failed to download PDF', { id: 'pdf-dl' });
    } finally {
      setPdfLoading(false);
    }
  };

  // Inline status badge with dropdown
  const StatusBadge = ({ status, onUpdate }) => {
    const current = status || 'draft';
    const info = quotationStatusConfig[current] || { label: current, color: 'gray', icon: AlertCircle };
    const Icon = info.icon;
    return (
      <div className="relative">
        <details className="group">
          <summary className={`cursor-pointer inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[info.color]} hover:opacity-80 list-none`}>
            <Icon className="w-3 h-3 mr-1" />
            {info.label}
            <ChevronDown className="w-3 h-3 ml-1 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border z-50 min-w-[120px]">
            <div className="py-1">
              {Object.entries(quotationStatusConfig).map(([key, cfg]) => {
                const SI = cfg.icon;
                return (
                  <button
                    key={key}
                    onClick={() => onUpdate(key)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center ${
                      key === current ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <SI className="w-3 h-3 mr-2" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </details>
      </div>
    );
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-900 mb-1">Error loading quotation</h3>
        <p className="text-sm text-gray-600 mb-4">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center px-3 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Retry
        </button>
      </div>
    </div>
  );

  const quotation = quotationData?.data;
  if (!quotation) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-900 mb-1">Quotation not found</h3>
        <Link to="/quotations" className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 lg:p-6">

      {/* Header */}
      <div className="bg-white rounded-lg border mb-3">
        <div className="p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/quotations')}
              className="p-1.5 text-gray-400 hover:text-gray-600 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-lg font-bold text-gray-900 leading-tight">
                {quotation.quotation_number}
              </h1>
              <p className="text-xs text-gray-400">
                {new Date(quotation.created_at).toLocaleDateString('en-IN')}
                {quotation.created_by_user && ` · ${quotation.created_by_user}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status + Quick Actions — single compact card */}
      <div className="bg-white rounded-lg border mb-3">
        <div className="p-3 sm:p-4 space-y-3">
          {/* Status row */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Status</span>
            <StatusBadge status={quotation.quotation_status} onUpdate={handleStatusUpdate} />
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-60"
              style={{ minHeight: 0, minWidth: 0 }}
            >
              {pdfLoading
                ? <RefreshCcw className="w-3 h-3 animate-spin" />
                : <Download className="w-3 h-3" />}
              {pdfLoading ? 'Generating…' : 'Download PDF'}
            </button>

            <Link
              to={`/quotations/${id}/edit`}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              style={{ minHeight: 0, minWidth: 0 }}
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </Link>

            {quotation.customer_id && (
              <Link
                to={`/customers/${quotation.customer_id}`}
                className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100"
                style={{ minHeight: 0, minWidth: 0 }}
              >
                <ExternalLink className="w-3 h-3" />
                View Customer
              </Link>
            )}

            <button
              onClick={() => setDeleteDialog(true)}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
              style={{ minHeight: 0, minWidth: 0 }}
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="bg-white rounded-lg border mb-3">
        <div className="p-3 sm:p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Customer</h3>

          {/* Name + contact hero row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{quotation.customer_name}</p>
              {quotation.company_name && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
                  {quotation.company_name}
                </p>
              )}
            </div>
            <a
              href={`tel:${quotation.customer_contact}`}
              className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-medium shrink-0 hover:bg-blue-100"
              style={{ minHeight: 0, minWidth: 0 }}
            >
              <Phone className="w-3 h-3" />
              {quotation.customer_contact}
            </a>
          </div>

          {/* Secondary details */}
          <div className="divide-y divide-gray-100 border-t border-gray-100 mt-2 pt-2 space-y-1.5">
            {quotation.customer_gst_number && (
              <div className="flex items-center justify-between pt-1.5">
                <span className="text-xs text-gray-400">GST</span>
                <span className="text-xs font-medium text-gray-700 font-mono">{quotation.customer_gst_number}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1.5">
              <span className="text-xs text-gray-400">Quotation Date</span>
              <span className="text-xs font-medium text-gray-700">
                {new Date(quotation.created_at).toLocaleDateString('en-IN')}
              </span>
            </div>
            {quotation.created_by_user && (
              <div className="flex items-center justify-between pt-1.5">
                <span className="text-xs text-gray-400">Created by</span>
                <span className="text-xs font-medium text-gray-700">{quotation.created_by_user}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quotation Items */}
      <div className="bg-white rounded-lg border mb-3">
        <div className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</h3>
            <span className="text-xs text-gray-400">{quotation.items?.length || 0} item(s)</span>
          </div>

          {quotation.items && quotation.items.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {['#', 'Description', 'Duration', 'Qty', 'Unit Price', 'GST', 'Total'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quotation.items.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-gray-900">{i + 1}</td>
                        <td className="px-3 py-3 text-gray-900">
                          <p className="font-medium">{item.description}</p>
                          <p className="text-gray-400">{item.item_type === 'machine' ? 'Machine' : 'Add. Charge'}</p>
                        </td>
                        <td className="px-3 py-3 text-gray-900">{item.duration_type || '-'}</td>
                        <td className="px-3 py-3 text-gray-900">{item.quantity}</td>
                        <td className="px-3 py-3 text-gray-900">₹{item.unit_price?.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-3 text-gray-900">{item.gst_percentage}% (₹{item.gst_amount?.toLocaleString('en-IN')})</td>
                        <td className="px-3 py-3 font-medium text-gray-900">₹{item.total_amount?.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Item Cards */}
              <div className="md:hidden space-y-2">
                {quotation.items.map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-md p-2.5 border border-gray-200">
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-900 leading-tight">{item.description}</p>
                        <p className="text-xs text-gray-400">{item.item_type === 'machine' ? 'Machine' : 'Add. Charge'}</p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">
                        ×{item.quantity}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-1.5 pt-1.5 border-t border-gray-200">
                      {item.duration_type && (
                        <>
                          <span className="text-gray-400">Duration</span>
                          <span className="font-medium text-gray-900 text-right">{item.duration_type}</span>
                        </>
                      )}
                      <span className="text-gray-400">Unit Price</span>
                      <span className="font-medium text-gray-900 text-right">₹{item.unit_price?.toLocaleString('en-IN')}</span>
                      <span className="text-gray-400">GST ({item.gst_percentage}%)</span>
                      <span className="font-medium text-gray-900 text-right">₹{item.gst_amount?.toLocaleString('en-IN')}</span>
                      <span className="text-gray-600 font-medium">Total</span>
                      <span className="font-bold text-gray-900 text-right">₹{item.total_amount?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grand Total */}
              <div className="mt-3 pt-2 border-t border-gray-200 space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span>
                  <span>₹{quotation.subtotal?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>GST</span>
                  <span>₹{quotation.total_gst_amount?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-200">
                  <span>Total</span>
                  <span>₹{quotation.grand_total?.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No items in this quotation</p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Notes */}
      {quotation.additional_notes && (
        <div className="bg-white rounded-lg border mb-3">
          <div className="p-3 sm:p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</h3>
            <p className="text-xs text-gray-700 whitespace-pre-wrap break-words">
              {quotation.additional_notes}
            </p>
          </div>
        </div>
      )}

      {/* Terms & Conditions */}
      {quotation.terms_text && (() => {
        const terms = parseTerms(quotation.terms_text);
        return (
          <div className="bg-white rounded-lg border mb-3">
            <div className="p-3 sm:p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Terms & Conditions
              </h3>
              {terms.length > 0 ? (
                <ol className="space-y-2.5">
                  {terms.map((term, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-semibold mt-0.5">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 leading-tight">{term.title}</p>
                        {term.description && (
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{term.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-gray-400 whitespace-pre-wrap">{quotation.terms_text}</p>
              )}
            </div>
          </div>
        );
      })()}

      <ConfirmDialog
        open={deleteDialog}
        title="Delete Quotation"
        message="Are you sure you want to delete this quotation? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => { deleteMutation.mutate(id); setDeleteDialog(false); }}
        onCancel={() => setDeleteDialog(false)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default QuotationDetail;
