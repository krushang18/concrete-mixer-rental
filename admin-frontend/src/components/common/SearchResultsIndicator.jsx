import React from 'react';
import { Search } from 'lucide-react';

/**
 * Reusable SearchResultsIndicator component
 * Shows search results count and provides clear search option
 */
const SearchResultsIndicator = ({
  searchTerm,
  debouncedSearchTerm,
  isFetching,
  resultCount,
  onClear
}) => {
  // Only show if there's a search term
  if (!searchTerm && !debouncedSearchTerm) {
    return null;
  }

  return (
    <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-800">
            {isFetching ? (
              "Searching..."
            ) : (
              <>
                Search results for "<strong>{debouncedSearchTerm}</strong>"
                {resultCount !== undefined && (
                  <span className="ml-1">
                    ({resultCount} {resultCount === 1 ? 'result' : 'results'})
                  </span>
                )}
              </>
            )}
          </span>
        </div>
        <button
          onClick={onClear}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Clear search
        </button>
      </div>
    </div>
  );
};

export default SearchResultsIndicator;
