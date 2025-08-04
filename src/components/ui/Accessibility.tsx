'use client';

import React from 'react';
import { Eye, EyeOff, Volume2, VolumeX } from 'lucide-react';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

export const SkipLink: React.FC<SkipLinkProps> = ({ href, children }) => {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
    >
      {children}
    </a>
  );
};

interface AccessibilityControlsProps {
  onToggleHighContrast: () => void;
  onToggleLargeText: () => void;
  onToggleReducedMotion: () => void;
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
}

export const AccessibilityControls: React.FC<AccessibilityControlsProps> = ({
  onToggleHighContrast,
  onToggleLargeText,
  onToggleReducedMotion,
  highContrast,
  largeText,
  reducedMotion,
}) => {
  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Accessibility</h3>
        
        <button
          onClick={onToggleHighContrast}
          className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          aria-label={`Toggle high contrast mode. Currently ${highContrast ? 'enabled' : 'disabled'}`}
        >
          {highContrast ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          <span>High Contrast</span>
        </button>

        <button
          onClick={onToggleLargeText}
          className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          aria-label={`Toggle large text mode. Currently ${largeText ? 'enabled' : 'disabled'}`}
        >
          <span className="text-lg">A</span>
          <span>Large Text</span>
        </button>

        <button
          onClick={onToggleReducedMotion}
          className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          aria-label={`Toggle reduced motion mode. Currently ${reducedMotion ? 'enabled' : 'disabled'}`}
        >
          {reducedMotion ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          <span>Reduced Motion</span>
        </button>
      </div>
    </div>
  );
};

interface AccessibleButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  onClick,
  children,
  className = '',
  disabled = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  ...props
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      {...props}
    >
      {children}
    </button>
  );
};

interface AccessibleInputProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
}

export const AccessibleInput: React.FC<AccessibleInputProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  helperText,
}) => {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        aria-invalid={error ? 'true' : 'false'}
        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${id}-helper`} className="text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
};

interface AccessibleTableProps {
  caption?: string;
  children: React.ReactNode;
  className?: string;
}

export const AccessibleTable: React.FC<AccessibleTableProps> = ({
  caption,
  children,
  className = '',
}) => {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-sm text-left text-gray-500 ${className}`}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
};

interface AccessibleTableHeaderProps {
  children: React.ReactNode;
  scope?: 'col' | 'row';
  className?: string;
}

export const AccessibleTableHeader: React.FC<AccessibleTableHeaderProps> = ({
  children,
  scope = 'col',
  className = '',
}) => {
  return (
    <th scope={scope} className={`px-6 py-3 text-xs text-gray-700 uppercase bg-gray-50 ${className}`}>
      {children}
    </th>
  );
};

interface AccessibleTableRowProps {
  children: React.ReactNode;
  className?: string;
}

export const AccessibleTableRow: React.FC<AccessibleTableRowProps> = ({
  children,
  className = '',
}) => {
  return (
    <tr className={`bg-white border-b hover:bg-gray-50 ${className}`}>
      {children}
    </tr>
  );
};

interface AccessibleTableCellProps {
  children: React.ReactNode;
  className?: string;
}

export const AccessibleTableCell: React.FC<AccessibleTableCellProps> = ({
  children,
  className = '',
}) => {
  return (
    <td className={`px-6 py-4 ${className}`}>
      {children}
    </td>
  );
}; 