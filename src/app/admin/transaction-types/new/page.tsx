'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewTransactionTypePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    transaction_type_code: '',
    transaction_type_name: '',
    description: '',
    is_pro_israel: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/transaction-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/admin/transaction-types');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create transaction type');
      }
    } catch (error) {
      console.error('Error creating transaction type:', error);
      setError('Failed to create transaction type');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add New Transaction Type</h1>
            <p className="mt-2 text-gray-600">
              Define new FEC transaction types and their pro-Israel classification.
            </p>
          </div>
          <Link
            href="/admin/transaction-types"
            className="text-blue-600 hover:text-blue-900"
          >
            ← Back to Transaction Types
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Transaction Type Information</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="transaction_type_code" className="block text-sm font-medium text-gray-700">
                Transaction Type Code *
              </label>
              <input
                type="text"
                id="transaction_type_code"
                name="transaction_type_code"
                value={formData.transaction_type_code}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 24A, 24E, 24C"
              />
              <p className="mt-1 text-sm text-gray-500">
                The FEC transaction type code (e.g., 24A, 24E, 24C)
              </p>
            </div>

            <div>
              <label htmlFor="transaction_type_name" className="block text-sm font-medium text-gray-700">
                Transaction Type Name *
              </label>
              <input
                type="text"
                id="transaction_type_name"
                name="transaction_type_name"
                value={formData.transaction_type_name}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Independent Expenditure Against"
              />
              <p className="mt-1 text-sm text-gray-500">
                Human-readable name for the transaction type
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Detailed description of what this transaction type represents"
            />
            <p className="mt-1 text-sm text-gray-500">
              Optional detailed description for internal reference
            </p>
          </div>

          <div className="flex items-center">
            <input
              id="is_pro_israel"
              name="is_pro_israel"
              type="checkbox"
              checked={formData.is_pro_israel}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_pro_israel" className="ml-2 block text-sm text-gray-900">
              Pro-Israel Transaction Type
            </label>
            <p className="ml-2 text-sm text-gray-500">
              Check if this transaction type indicates pro-Israel support
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <Link
              href="/admin/transaction-types"
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Transaction Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
