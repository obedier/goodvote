'use client';

import React, { useState, useEffect } from 'react';
import { Filter, SortAsc, SortDesc, Search, Calendar, DollarSign, MapPin, Users } from 'lucide-react';

export interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'date' | 'multiselect';
  options?: string[];
  placeholder?: string;
}

export interface SortOption {
  key: string;
  label: string;
  direction: 'asc' | 'desc';
}

export interface FilterState {
  [key: string]: any;
}

interface DataFiltersProps {
  filters: FilterOption[];
  sortOptions: SortOption[];
  onFiltersChange: (filters: FilterState) => void;
  onSortChange: (sort: SortOption) => void;
  initialFilters?: FilterState;
  initialSort?: SortOption;
}

export const DataFilters: React.FC<DataFiltersProps> = ({
  filters,
  sortOptions,
  onFiltersChange,
  onSortChange,
  initialFilters = {},
  initialSort,
}) => {
  const [filterState, setFilterState] = useState<FilterState>(initialFilters);
  const [currentSort, setCurrentSort] = useState<SortOption | undefined>(initialSort);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filterState, [key]: value };
    setFilterState(newFilters);
    onFiltersChange(newFilters);
  };

  const handleSortChange = (sort: SortOption) => {
    setCurrentSort(sort);
    onSortChange(sort);
  };

  const clearFilters = () => {
    setFilterState({});
    onFiltersChange({});
  };

  const renderFilterInput = (filter: FilterOption) => {
    const value = filterState[filter.key] || '';

    switch (filter.type) {
      case 'text':
        return (
          <input
            type="text"
            placeholder={filter.placeholder || `Enter ${filter.label.toLowerCase()}`}
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All {filter.label}</option>
            {filter.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            placeholder={filter.placeholder || `Enter ${filter.label.toLowerCase()}`}
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case 'multiselect':
        return (
          <select
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={(e) => {
              const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
              handleFilterChange(filter.key, selectedOptions);
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {filter.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  const activeFiltersCount = Object.keys(filterState).filter(key => filterState[key] !== '' && filterState[key] !== null).length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Filters & Sorting</h3>
          {activeFiltersCount > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
              {activeFiltersCount} active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {isExpanded ? 'Hide' : 'Show'} Advanced Filters
          </button>
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {filters.slice(0, 3).map((filter) => (
          <div key={filter.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {filter.label}
            </label>
            {renderFilterInput(filter)}
          </div>
        ))}
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filters.slice(3).map((filter) => (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {filter.label}
                </label>
                {renderFilterInput(filter)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sorting */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <div className="flex items-center space-x-2">
          <SortAsc className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Sort by:</span>
          <div className="flex space-x-2">
            {sortOptions.map((sort) => (
              <button
                key={sort.key}
                onClick={() => handleSortChange(sort)}
                className={`px-3 py-1 text-sm rounded-md border ${
                  currentSort?.key === sort.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {sort.label}
                {currentSort?.key === sort.key && (
                  <span className="ml-1">
                    {currentSort.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Specialized filter components for campaign finance data
export const ContributionFilters: React.FC<{
  onFiltersChange: (filters: FilterState) => void;
  onSortChange: (sort: SortOption) => void;
}> = ({ onFiltersChange, onSortChange }) => {
  const filters: FilterOption[] = [
    {
      key: 'candidate',
      label: 'Candidate',
      type: 'text',
      placeholder: 'Search by candidate name',
    },
    {
      key: 'committee',
      label: 'Committee',
      type: 'text',
      placeholder: 'Search by committee name',
    },
    {
      key: 'state',
      label: 'State',
      type: 'select',
      options: ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'MI', 'GA', 'NC'],
    },
    {
      key: 'party',
      label: 'Party',
      type: 'select',
      options: ['DEM', 'REP', 'IND', 'LIB', 'GRN'],
    },
    {
      key: 'min_amount',
      label: 'Min Amount',
      type: 'number',
      placeholder: 'Minimum contribution amount',
    },
    {
      key: 'max_amount',
      label: 'Max Amount',
      type: 'number',
      placeholder: 'Maximum contribution amount',
    },
    {
      key: 'election_year',
      label: 'Election Year',
      type: 'select',
      options: ['2024', '2022', '2020', '2018', '2016'],
    },
    {
      key: 'transaction_type',
      label: 'Transaction Type',
      type: 'select',
      options: ['Individual', 'PAC', 'Party', 'Other'],
    },
  ];

  const sortOptions: SortOption[] = [
    { key: 'amount', label: 'Amount', direction: 'desc' },
    { key: 'date', label: 'Date', direction: 'desc' },
    { key: 'candidate', label: 'Candidate', direction: 'asc' },
    { key: 'committee', label: 'Committee', direction: 'asc' },
  ];

  return (
    <DataFilters
      filters={filters}
      sortOptions={sortOptions}
      onFiltersChange={onFiltersChange}
      onSortChange={onSortChange}
    />
  );
};

export const ExpenditureFilters: React.FC<{
  onFiltersChange: (filters: FilterState) => void;
  onSortChange: (sort: SortOption) => void;
}> = ({ onFiltersChange, onSortChange }) => {
  const filters: FilterOption[] = [
    {
      key: 'committee',
      label: 'Committee',
      type: 'text',
      placeholder: 'Search by committee name',
    },
    {
      key: 'payee',
      label: 'Payee',
      type: 'text',
      placeholder: 'Search by payee name',
    },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: ['Media', 'Consulting', 'Travel', 'Administrative', 'Fundraising'],
    },
    {
      key: 'state',
      label: 'State',
      type: 'select',
      options: ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'MI', 'GA', 'NC'],
    },
    {
      key: 'min_amount',
      label: 'Min Amount',
      type: 'number',
      placeholder: 'Minimum expenditure amount',
    },
    {
      key: 'max_amount',
      label: 'Max Amount',
      type: 'number',
      placeholder: 'Maximum expenditure amount',
    },
    {
      key: 'election_year',
      label: 'Election Year',
      type: 'select',
      options: ['2024', '2022', '2020', '2018', '2016'],
    },
    {
      key: 'transaction_type',
      label: 'Transaction Type',
      type: 'select',
      options: ['Operating', 'Independent', 'Coordinated'],
    },
  ];

  const sortOptions: SortOption[] = [
    { key: 'amount', label: 'Amount', direction: 'desc' },
    { key: 'date', label: 'Date', direction: 'desc' },
    { key: 'committee', label: 'Committee', direction: 'asc' },
    { key: 'payee', label: 'Payee', direction: 'asc' },
  ];

  return (
    <DataFilters
      filters={filters}
      sortOptions={sortOptions}
      onFiltersChange={onFiltersChange}
      onSortChange={onSortChange}
    />
  );
};

export const DonorFilters: React.FC<{
  onFiltersChange: (filters: FilterState) => void;
  onSortChange: (sort: SortOption) => void;
}> = ({ onFiltersChange, onSortChange }) => {
  const filters: FilterOption[] = [
    {
      key: 'name',
      label: 'Donor Name',
      type: 'text',
      placeholder: 'Search by donor name',
    },
    {
      key: 'occupation',
      label: 'Occupation',
      type: 'text',
      placeholder: 'Search by occupation',
    },
    {
      key: 'employer',
      label: 'Employer',
      type: 'text',
      placeholder: 'Search by employer',
    },
    {
      key: 'state',
      label: 'State',
      type: 'select',
      options: ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'MI', 'GA', 'NC'],
    },
    {
      key: 'min_amount',
      label: 'Min Amount',
      type: 'number',
      placeholder: 'Minimum contribution amount',
    },
    {
      key: 'max_amount',
      label: 'Max Amount',
      type: 'number',
      placeholder: 'Maximum contribution amount',
    },
    {
      key: 'election_year',
      label: 'Election Year',
      type: 'select',
      options: ['2024', '2022', '2020', '2018', '2016'],
    },
    {
      key: 'contribution_count',
      label: 'Min Contributions',
      type: 'number',
      placeholder: 'Minimum number of contributions',
    },
  ];

  const sortOptions: SortOption[] = [
    { key: 'total_amount', label: 'Total Amount', direction: 'desc' },
    { key: 'contribution_count', label: 'Contribution Count', direction: 'desc' },
    { key: 'name', label: 'Name', direction: 'asc' },
    { key: 'state', label: 'State', direction: 'asc' },
  ];

  return (
    <DataFilters
      filters={filters}
      sortOptions={sortOptions}
      onFiltersChange={onFiltersChange}
      onSortChange={onSortChange}
    />
  );
};

export default DataFilters; 