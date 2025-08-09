'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Committee {
  committee_id: number;
  fec_committee_id: string;
  category: string;
  is_active: boolean;
  committee_name?: string;
  committee_designation?: string;
  committee_type?: string;
}

export default function EditCommittee({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [committee, setCommittee] = useState<Committee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCommittee = async () => {
      try {
        const response = await fetch(`/api/admin/committees/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch committee');
        }
        const data = await response.json();
        setCommittee(data);
      } catch (err) {
        setError('Failed to load committee');
        console.error('Error fetching committee:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCommittee();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!committee) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/committees/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(committee),
      });

      if (!response.ok) {
        throw new Error('Failed to update committee');
      }

      router.push('/admin/committees');
    } catch (err) {
      setError('Failed to update committee');
      console.error('Error updating committee:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof Committee, value: any) => {
    if (!committee) return;
    setCommittee({ ...committee, [field]: value });
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!committee) {
    return <div className="p-6">Committee not found</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Committee</h1>
        <p className="text-gray-600">Update committee configuration</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Committee ID
            </label>
            <input
              type="text"
              value={committee.committee_id}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              FEC Committee ID
            </label>
            <input
              type="text"
              value={committee.fec_committee_id}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Committee Name
            </label>
            <input
              type="text"
              value={committee.committee_name || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={committee.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="major">Major</option>
              <option value="minor">Minor</option>
              <option value="general">General</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Committee Type
            </label>
            <input
              type="text"
              value={committee.committee_type || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Committee Designation
            </label>
            <input
              type="text"
              value={committee.committee_designation || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={committee.is_active}
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
            onClick={() => router.push('/admin/committees')}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
