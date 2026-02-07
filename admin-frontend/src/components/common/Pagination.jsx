import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({ pagination = {}, onPageChange, onLimitChange }) => {
  // Provide safe defaults in case pagination object is incomplete
  const {
    current_page = 1,
    per_page = 10,
    total = 0,
    total_pages = 1,
    has_prev_page = false,
    has_next_page = false,
    from = 0,
    to = 0,
  } = pagination;

  // Generate page numbers with ellipsis logic
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisiblePages = 5;
    const sidePages = Math.floor(maxVisiblePages / 2);

    let startPage = Math.max(1, current_page - sidePages);
    let endPage = Math.min(total_pages, current_page + sidePages);

    // Adjust for edges
    if (current_page <= sidePages) {
      endPage = Math.min(total_pages, maxVisiblePages);
    } else if (current_page >= total_pages - sidePages) {
      startPage = Math.max(1, total_pages - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }, [current_page, total_pages]);

  if (total === 0) return null;


  return (
    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-b-lg">
      {/* Mobile view */}
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(current_page - 1)}
          disabled={!has_prev_page}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <div className="flex items-center">
          <span className="text-sm text-gray-700 whitespace-nowrap">
            Page {current_page} of {total_pages}
          </span>
        </div>
        <button
          onClick={() => onPageChange(current_page + 1)}
          disabled={!has_next_page}
          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>

      {/* Desktop view */}
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        {/* Results info */}
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{from}</span> to{' '}
            <span className="font-medium">{to}</span> of{' '}
            <span className="font-medium">{total}</span> results
          </p>

          {/* Per page selector */}
<div className="flex items-center space-x-2">
  <span className="text-sm text-gray-700">Show:</span>
  <div className="flex space-x-1 border border-gray-300 rounded-md">
    {[5, 10, 20, 50].map((num) => (
      <button
        key={num}
        onClick={() => onLimitChange(num, 1)}
        className={`px-3 py-1.5 text-sm font-medium rounded-md ${
          per_page === num
            ? 'bg-primary-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        {num}
      </button>
    ))}
  </div>
  <span className="text-sm text-gray-700">per page</span>
</div>


        </div>

        {/* Pagination controls */}
        <div className="flex items-center space-x-1">
          {/* First page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={current_page === 1}
            className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-l-md"
            title="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Previous page */}
          <button
            onClick={() => onPageChange(current_page - 1)}
            disabled={!has_prev_page}
            className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Ellipsis before */}
          {pageNumbers[0] > 1 && (
            <>
              <button
                onClick={() => onPageChange(1)}
                className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                1
              </button>
              {pageNumbers[0] > 2 && (
                <span
                  aria-hidden="true"
                  className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                >
                  ...
                </span>
              )}
            </>
          )}

          {/* Page numbers */}
          {pageNumbers.map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              aria-current={pageNum === current_page ? 'page' : undefined}
              className={`relative inline-flex items-center px-3 py-2 border text-sm font-medium ${
                pageNum === current_page
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {pageNum}
            </button>
          ))}

          {/* Ellipsis after */}
          {pageNumbers[pageNumbers.length - 1] < total_pages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < total_pages - 1 && (
                <span
                  aria-hidden="true"
                  className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                >
                  ...
                </span>
              )}
              <button
                onClick={() => onPageChange(total_pages)}
                className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {total_pages}
              </button>
            </>
          )}

          {/* Next page */}
          <button
            onClick={() => onPageChange(current_page + 1)}
            disabled={!has_next_page}
            className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last page */}
          <button
            onClick={() => onPageChange(total_pages)}
            disabled={current_page === total_pages}
            className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-r-md"
            title="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
