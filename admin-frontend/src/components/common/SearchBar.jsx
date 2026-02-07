import React from 'react';
import { Search, RefreshCw, X } from 'lucide-react';

/**
 * Reusable SearchBar component
 * Used across all pages for consistent search experience
 */
const SearchBar = ({ 
  value, 
  onChange, 
  placeholder = "Search...", 
  isFetching = false,
  className = ""
}) => {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
        autoComplete="off"
        spellCheck="false"
      />
      {isFetching && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
        </div>
      )}
      {value && !isFetching && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          title="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
