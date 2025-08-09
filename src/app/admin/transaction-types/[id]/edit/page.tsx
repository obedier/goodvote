'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TransactionType {
  transaction_type_id: number;
  transaction_type_code: string;
  transaction_type_name: string;
  description?: string;
  is_pro_israel: boolean;
  is_active: boolean;
}

export default function EditTransactionType({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [transactionType, setTransactionType] = useState<TransactionType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTransactionType = async () => {
      try {
        const response = await fetch(`/api/admin/transaction-types/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch transaction type');
        }
        const data = await response.json();
        setTransactionType(data);
      } catch (err) {
        setError('Failed to load transaction type');
        console.error('Error fetching transaction type:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionType();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionType) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/transaction-types/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionType),
      });

      if (!response.ok) {
        throw new Error('Failed to update transaction type');
      }

      router.push('/admin/transaction-types');
    } catch (err) {
      setError('Failed to update transaction type');
      console.error('Error updating transaction type:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof TransactionType, value: any) => {
    if (!transactionType) return;
    setTransactionType({ ...transactionType, [field]: value });
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!transactionType) {
    return <div className="p-6">Transaction type not found</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Transaction Type</h1>
        <p className="text-gray-600">Update transaction type configuration</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Type ID
            </label>
            <input
              type="text"
              value={transactionType.transaction_type_id}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Type Code
            </label>
            <input
              type="text"
              value={transactionType.transaction_type_code}
              onChange={(e) => handleChange('transaction_type_code', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Type Name
            </label>
            <input
              type="text"
              value={transactionType.transaction_type_name}
              onChange={(e) => handleChange('transaction_type_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={transactionType.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="flex items-center space-x-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={transactionType.is_active}
              onChange={(e) => handleChange('is_active', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={transactionType.is_pro_israel}
              onChange={(e) => handleChange('is_pro_israel', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Pro-Israel</span>
          </label>
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/transaction-types')}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
