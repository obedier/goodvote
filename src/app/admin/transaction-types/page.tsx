'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TransactionType {
  transaction_type_id: number;
  transaction_type_code: string;
  transaction_type_name: string;
  description: string;
  is_pro_israel: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function TransactionTypesPage() {
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactionTypes();
  }, []);

  async function fetchTransactionTypes() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/transaction-types');
      if (response.ok) {
        const data = await response.json();
        setTransactionTypes(data);
      } else {
        setError('Failed to fetch transaction types');
      }
    } catch (error) {
      console.error('Error fetching transaction types:', error);
      setError('Failed to fetch transaction types');
    } finally {
      setLoading(false);
    }
  }

  async function toggleTransactionTypeStatus(transactionTypeId: number, isActive: boolean) {
    try {
      const response = await fetch(`/api/admin/transaction-types/${transactionTypeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (response.ok) {
        fetchTransactionTypes(); // Refresh the list
      } else {
        setError('Failed to update transaction type status');
      }
    } catch (error) {
      console.error('Error updating transaction type:', error);
      setError('Failed to update transaction type status');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transaction Types</h1>
            <p className="mt-2 text-gray-600">
              Manage FEC transaction types and their pro-Israel classification.
            </p>
          </div>
          <Link
            href="/admin/transaction-types/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Add New Transaction Type
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
          <h3 className="text-lg font-medium text-gray-900">
            Transaction Types ({transactionTypes.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pro-Israel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactionTypes.map((transactionType) => (
                <tr key={transactionType.transaction_type_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transactionType.transaction_type_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transactionType.transaction_type_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {transactionType.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      transactionType.is_pro_israel 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transactionType.is_pro_israel ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      transactionType.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transactionType.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Link
                        href={`/admin/transaction-types/${transactionType.transaction_type_id}/edit`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => toggleTransactionTypeStatus(transactionType.transaction_type_id, transactionType.is_active)}
                        className={`${
                          transactionType.is_active 
                            ? 'text-red-600 hover:text-red-900' 
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {transactionType.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
