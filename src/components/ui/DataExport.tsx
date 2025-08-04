'use client';

import React from 'react';
import { Download, FileText, Share2, Mail, Printer } from 'lucide-react';

interface ExportOption {
  key: string;
  label: string;
  format: 'csv' | 'json' | 'pdf';
  icon: React.ReactNode;
}

interface DataExportProps {
  data: any[];
  filename: string;
  onExport: (format: string) => void;
  exportOptions?: ExportOption[];
  isLoading?: boolean;
}

const defaultExportOptions: ExportOption[] = [
  {
    key: 'csv',
    label: 'CSV',
    format: 'csv',
    icon: <FileText className="h-4 w-4" />,
  },
  {
    key: 'json',
    label: 'JSON',
    format: 'json',
    icon: <FileText className="h-4 w-4" />,
  },
];

export const DataExport: React.FC<DataExportProps> = ({
  data,
  filename,
  onExport,
  exportOptions = defaultExportOptions,
  isLoading = false,
}) => {
  const handleExport = (format: string) => {
    onExport(format);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const estimateFileSize = (data: any[], format: string) => {
    if (format === 'csv') {
      // Rough estimate: each row ~200 bytes
      return data.length * 200;
    } else if (format === 'json') {
      // Rough estimate: each row ~500 bytes
      return data.length * 500;
    }
    return 0;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Download className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Export Data</h3>
        </div>
        <div className="text-sm text-gray-500">
          {data.length} records available
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exportOptions.map((option) => (
          <button
            key={option.key}
            onClick={() => handleExport(option.format)}
            disabled={isLoading || data.length === 0}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center space-x-3">
              {option.icon}
              <div>
                <div className="font-medium text-gray-900">
                  Export as {option.label}
                </div>
                <div className="text-sm text-gray-500">
                  ~{formatFileSize(estimateFileSize(data, option.format))}
                </div>
              </div>
            </div>
            <Download className="h-4 w-4 text-gray-400" />
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="mt-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-2">Preparing export...</p>
        </div>
      )}
    </div>
  );
};

// Utility functions for data export
export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToJSON = (data: any[], filename: string) => {
  if (data.length === 0) return;

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Specialized export components for campaign finance data
export const ContributionExport: React.FC<{
  data: any[];
  onExport: (format: string) => void;
  isLoading?: boolean;
}> = ({ data, onExport, isLoading }) => {
  const exportOptions: ExportOption[] = [
    {
      key: 'csv',
      label: 'CSV',
      format: 'csv',
      icon: <FileText className="h-4 w-4" />,
    },
    {
      key: 'json',
      label: 'JSON',
      format: 'json',
      icon: <FileText className="h-4 w-4" />,
    },
  ];

  return (
    <DataExport
      data={data}
      filename="campaign-contributions"
      onExport={onExport}
      exportOptions={exportOptions}
      isLoading={isLoading}
    />
  );
};

export const ExpenditureExport: React.FC<{
  data: any[];
  onExport: (format: string) => void;
  isLoading?: boolean;
}> = ({ data, onExport, isLoading }) => {
  const exportOptions: ExportOption[] = [
    {
      key: 'csv',
      label: 'CSV',
      format: 'csv',
      icon: <FileText className="h-4 w-4" />,
    },
    {
      key: 'json',
      label: 'JSON',
      format: 'json',
      icon: <FileText className="h-4 w-4" />,
    },
  ];

  return (
    <DataExport
      data={data}
      filename="campaign-expenditures"
      onExport={onExport}
      exportOptions={exportOptions}
      isLoading={isLoading}
    />
  );
};

export const DonorExport: React.FC<{
  data: any[];
  onExport: (format: string) => void;
  isLoading?: boolean;
}> = ({ data, onExport, isLoading }) => {
  const exportOptions: ExportOption[] = [
    {
      key: 'csv',
      label: 'CSV',
      format: 'csv',
      icon: <FileText className="h-4 w-4" />,
    },
    {
      key: 'json',
      label: 'JSON',
      format: 'json',
      icon: <FileText className="h-4 w-4" />,
    },
  ];

  return (
    <DataExport
      data={data}
      filename="donor-data"
      onExport={onExport}
      exportOptions={exportOptions}
      isLoading={isLoading}
    />
  );
};

// Advanced export with sharing options
export const AdvancedDataExport: React.FC<{
  data: any[];
  filename: string;
  onExport: (format: string) => void;
  onShare?: (method: string) => void;
  isLoading?: boolean;
}> = ({ data, filename, onExport, onShare, isLoading }) => {
  const shareOptions = [
    { key: 'email', label: 'Email', icon: <Mail className="h-4 w-4" /> },
    { key: 'print', label: 'Print', icon: <Printer className="h-4 w-4" /> },
    { key: 'share', label: 'Share', icon: <Share2 className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-4">
      <DataExport
        data={data}
        filename={filename}
        onExport={onExport}
        isLoading={isLoading}
      />
      
      {onShare && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Share Data</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {shareOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => onShare(option.key)}
                disabled={isLoading || data.length === 0}
                className="flex items-center justify-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {option.icon}
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataExport; 