'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Relationship {
  relationship_id: number;
  committee_id: number;
  related_committee_id: string;
  relationship_type: string;
  description?: string;
  is_active: boolean;
}

export default function EditRelationship({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRelationship = async () => {
      try {
        const response = await fetch(`/api/admin/relationships/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch relationship');
        }
        const data = await response.json();
        setRelationship(data);
      } catch (err) {
        setError('Failed to load relationship');
        console.error('Error fetching relationship:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRelationship();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relationship) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/relationships/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(relationship),
      });

      if (!response.ok) {
        throw new Error('Failed to update relationship');
      }

      router.push('/admin/relationships');
    } catch (err) {
      setError('Failed to update relationship');
      console.error('Error updating relationship:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof Relationship, value: any) => {
    if (!relationship) return;
    setRelationship({ ...relationship, [field]: value });
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!relationship) {
    return <div className="p-6">Relationship not found</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Relationship</h1>
        <p className="text-gray-600">Update committee relationship configuration</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Relationship ID
            </label>
            <input
              type="text"
              value={relationship.relationship_id}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Committee ID
            </label>
            <input
              type="number"
              value={relationship.committee_id}
              onChange={(e) => handleChange('committee_id', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Related Committee ID
            </label>
            <input
              type="text"
              value={relationship.related_committee_id}
              onChange={(e) => handleChange('related_committee_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Relationship Type
            </label>
            <select
              value={relationship.relationship_type}
              onChange={(e) => handleChange('relationship_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="parent">Parent</option>
              <option value="child">Child</option>
              <option value="sibling">Sibling</option>
              <option value="affiliate">Affiliate</option>
              <option value="partner">Partner</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={relationship.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={relationship.is_active}
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
            onClick={() => router.push('/admin/relationships')}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
