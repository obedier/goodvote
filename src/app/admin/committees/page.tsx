'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface Committee {
  committee_id: number;
  fec_committee_id: string;
  committee_name: string;
  committee_designation: string;
  committee_type: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SearchResult {
  cmte_id: string;
  cmte_nm: string;
  cmte_tp: string;
  cmte_dsgn: string;
  cmte_pty_affiliation: string;
}

export default function CommitteesPage() {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Autocomplete search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCommittees();
  }, []);

  async function fetchCommittees() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/committees');
      if (response.ok) {
        const data = await response.json();
        setCommittees(data);
      } else {
        setError('Failed to fetch committees');
      }
    } catch (error) {
      console.error('Error fetching committees:', error);
      setError('Failed to fetch committees');
    } finally {
      setLoading(false);
    }
  }

  async function toggleCommitteeStatus(committeeId: number, isActive: boolean) {
    try {
      const response = await fetch(`/api/admin/committees/${committeeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (response.ok) {
        fetchCommittees(); // Refresh the list
      } else {
        setError('Failed to update committee status');
      }
    } catch (error) {
      console.error('Error updating committee:', error);
      setError('Failed to update committee status');
    }
  }

  async function deleteCommittee(committeeId: number, committeeName: string) {
    if (!confirm(`Are you sure you want to delete "${committeeName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/committees/${committeeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchCommittees(); // Refresh the list
        setError(null); // Clear any previous errors
        setSuccess(`Committee "${committeeName}" deleted successfully`);
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(`Failed to delete committee: ${errorData.error || 'Unknown error'}`);
        setSuccess(null); // Clear any success message
      }
    } catch (error) {
      console.error('Error deleting committee:', error);
      setError('Failed to delete committee');
      setSuccess(null); // Clear any success message
    }
  }

  // Search committees functionality
  async function searchCommittees(query: string) {
    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(`/api/admin/committees/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        setShowDropdown(true);
      } else {
        setError('Failed to search committees');
      }
    } catch (error) {
      console.error('Error searching committees:', error);
      setError('Failed to search committees');
    } finally {
      setIsSearching(false);
    }
  }

  // Add selected committee
  async function addCommittee(searchResult: SearchResult) {
    try {
      setIsAdding(true);
      const response = await fetch('/api/admin/committees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fec_committee_id: searchResult.cmte_id,
          category: 'general'
        }),
      });

      if (response.ok) {
        setSearchQuery('');
        setSearchResults([]);
        setShowDropdown(false);
        fetchCommittees(); // Refresh the list
      } else {
        setError('Failed to add committee');
      }
    } catch (error) {
      console.error('Error adding committee:', error);
      setError('Failed to add committee');
    } finally {
      setIsAdding(false);
    }
  }

  // Handle search input change
  function handleSearchChange(value: string) {
    setSearchQuery(value);
    searchCommittees(value);
  }

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pro-Israel Committees</h1>
            <p className="mt-2 text-gray-600">
              Manage committees that are identified as pro-Israel for campaign finance analysis.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Autocomplete Search Box */}
            <div className="relative" ref={searchRef}>
              <div className="flex items-center space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search committee names..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {isSearching && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
              </div>
              
              {/* Dropdown Results */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div
                      key={result.cmte_id}
                      onClick={() => !isAdding && addCommittee(result)}
                      className={`px-4 py-3 border-b border-gray-100 last:border-b-0 ${
                        isAdding 
                          ? 'bg-gray-50 cursor-not-allowed opacity-50' 
                          : 'hover:bg-gray-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{result.cmte_nm}</div>
                          <div className="text-sm text-gray-500">
                            {result.cmte_id} • {result.cmte_tp} • {result.cmte_pty_affiliation}
                          </div>
                        </div>
                        {isAdding && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* No Results */}
              {showDropdown && searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                  <div className="px-4 py-3 text-gray-500">No committees found</div>
                </div>
              )}
            </div>
            
            <Link
              href="/admin/committees/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add New Committee
            </Link>
          </div>
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

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-400">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Committees ({committees.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  FEC ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Committee Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
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
              {committees.map((committee) => (
                <tr key={committee.committee_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {committee.fec_committee_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {committee.committee_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {committee.committee_type} ({committee.committee_designation})
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      committee.category === 'major' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {committee.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      committee.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {committee.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Link
                        href={`/admin/committees/${committee.committee_id}/edit`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => toggleCommitteeStatus(committee.committee_id, committee.is_active)}
                        className={`${
                          committee.is_active 
                            ? 'text-red-600 hover:text-red-900' 
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {committee.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => deleteCommittee(committee.committee_id, committee.committee_name)}
                        className="text-red-600 hover:text-red-900 font-medium"
                        title="Delete committee"
                      >
                        🗑️ Delete
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
