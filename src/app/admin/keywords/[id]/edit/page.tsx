'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Keyword {
  keyword_id: number;
  keyword: string;
  category: string;
  description?: string;
  is_active: boolean;
}

export default function EditKeyword({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState<Keyword | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchKeyword = async () => {
      try {
        const response = await fetch(`/api/admin/keywords/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch keyword');
        }
        const data = await response.json();
        setKeyword(data);
      } catch (err) {
        setError('Failed to load keyword');
        console.error('Error fetching keyword:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchKeyword();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/keywords/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(keyword),
      });

      if (!response.ok) {
        throw new Error('Failed to update keyword');
      }

      router.push('/admin/keywords');
    } catch (err) {
      setError('Failed to update keyword');
      console.error('Error updating keyword:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof Keyword, value: any) => {
    if (!keyword) return;
    setKeyword({ ...keyword, [field]: value });
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!keyword) {
    return <div className="p-6">Keyword not found</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Keyword</h1>
        <p className="text-gray-600">Update keyword configuration</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Keyword ID
            </label>
            <input
              type="text"
              value={keyword.keyword_id}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Keyword
            </label>
            <input
              type="text"
              value={keyword.keyword}
              onChange={(e) => handleChange('keyword', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={keyword.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="core">Core</option>
              <option value="related">Related</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={keyword.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={keyword.is_active}
              onChange={(e) => handleChange('is_active', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
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
            onClick={() => router.push('/admin/keywords')}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
