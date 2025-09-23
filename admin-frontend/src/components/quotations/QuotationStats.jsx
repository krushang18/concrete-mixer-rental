import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  IndianRupee,
  TrendingUp,
  Package,
  AlertCircle
} from 'lucide-react';

import { quotationApi } from '../../services/quotationApi';

const QuotationStats = () => {
  // Fetch quotation statistics
  const { data: statsData, isLoading, error } = useQuery({
    queryKey: ['quotation-stats'],
    queryFn: quotationApi.getStats,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-sm text-red-700">
            Unable to load quotation statistics. Please try again later.
          </span>
        </div>
      </div>
    );
  }

  const stats = statsData?.data || {};

  // Calculate conversion rate safely
  const conversionRate = stats.total_quotations > 0 
    ? ((stats.accepted_quotations / stats.total_quotations) * 100).toFixed(1)
    : '0.0';

  const statCards = [
    {
      title: 'Total Quotations',
      value: stats.total_quotations || 0,
      icon: FileText,
      color: 'blue',
      description: 'All time quotations'
    },
    {
      title: 'Pending Quotations',
      value: stats.pending_quotations || 0,
      icon: Clock,
      color: 'yellow',
      description: 'Awaiting response'
    },
    {
      title: 'Accepted Quotations',
      value: stats.accepted_quotations || 0,
      icon: CheckCircle,
      color: 'green',
      description: `${conversionRate}% conversion rate`
    },
    {
      title: 'Total Revenue',
      value: `₹${(stats.total_revenue || 0).toLocaleString('en-IN')}`,
      icon: IndianRupee,
      color: 'purple',
      description: 'From accepted quotations'
    },
    {
      title: 'Average Amount',
      value: `₹${(stats.average_quotation_amount || 0).toLocaleString('en-IN')}`,
      icon: TrendingUp,
      color: 'indigo',
      description: 'Per quotation'
    },
    {
      title: 'Delivered Orders',
      value: stats.delivered_orders || 0,
      icon: Package,
      color: 'emerald',
      description: 'Successfully delivered'
    }
  ];

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      border: 'border-blue-200'
    },
    yellow: {
      bg: 'bg-yellow-50',
      icon: 'text-yellow-600',
      border: 'border-yellow-200'
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      border: 'border-green-200'
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'text-purple-600',
      border: 'border-purple-200'
    },
    indigo: {
      bg: 'bg-indigo-50',
      icon: 'text-indigo-600',
      border: 'border-indigo-200'
    },
    emerald: {
      bg: 'bg-emerald-50',
      icon: 'text-emerald-600',
      border: 'border-emerald-200'
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {statCards.map((stat, index) => {
        const colors = colorClasses[stat.color];
        const Icon = stat.icon;
        
        return (
          <div
            key={index}
            className={`bg-white rounded-lg shadow border ${colors.border} p-6 transition-transform hover:scale-105`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 truncate">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stat.description}
                </p>
              </div>
              <div className={`flex-shrink-0 ${colors.bg} p-3 rounded-lg`}>
                <Icon className={`h-6 w-6 ${colors.icon}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default QuotationStats;
