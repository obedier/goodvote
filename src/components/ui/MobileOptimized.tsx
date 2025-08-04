'use client';

import React from 'react';
import { Menu, X, Search, Filter } from 'lucide-react';

interface MobileMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ 
  isOpen, 
  onToggle, 
  children 
}) => {
  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={onToggle}
        className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onToggle} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={onToggle}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <h1 className="text-xl font-semibold text-gray-900">GoodVote</h1>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {children}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface MobileSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSearch?: () => void;
}

export const MobileSearch: React.FC<MobileSearchProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  onSearch
}) => {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        onKeyPress={(e) => {
          if (e.key === 'Enter' && onSearch) {
            onSearch();
          }
        }}
      />
    </div>
  );
};

interface MobileFiltersProps {
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const MobileFilters: React.FC<MobileFiltersProps> = ({
  isOpen,
  onToggle,
  children
}) => {
  return (
    <>
      <button
        onClick={onToggle}
        className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
      >
        <Filter className="h-4 w-4" />
        <span>Filters</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onToggle} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={onToggle}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              </div>
              <div className="mt-5 px-4 space-y-4">
                {children}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface ResponsiveTableProps {
  data: any[];
  columns: {
    key: string;
    label: string;
    render?: (value: any, row: any) => React.ReactNode;
  }[];
  className?: string;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  data,
  columns,
  className = ''
}) => {
  return (
    <div className={`overflow-x-auto ${className}`}>
      {/* Desktop table */}
      <table className="hidden md:table w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-6 py-3">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index} className="bg-white border-b hover:bg-gray-50">
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {data.map((row, index) => (
          <div key={index} className="bg-white border rounded-lg p-4 shadow-sm">
            {columns.map((column) => (
              <div key={column.key} className="flex justify-between py-2 border-b last:border-b-0">
                <span className="font-medium text-gray-700">{column.label}:</span>
                <span className="text-gray-900">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}; 