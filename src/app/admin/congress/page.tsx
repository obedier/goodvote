'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface CongressMember {
  representative_name: string;
  first_name: string;
  last_name: string;
  state: string;
  district: string | null;
  chamber: string;
  party: string;
  fec_id: string;
  pro_israel_contributions: string;
  pro_israel_opposition_amount: string;
  raw_pro_israel_score: string;
  curved_pro_israel_score: string;
  pro_israel_category: string;
  position: string;
  party_full: string;
  district_formatted: string;
  final_score: string;
  person_id?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function CongressPage() {
  const searchParams = useSearchParams();
  const [congressMembers, setCongressMembers] = useState<CongressMember[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [editingScore, setEditingScore] = useState<string | null>(null);
  const [overrideScore, setOverrideScore] = useState('');
  const [sortBy, setSortBy] = useState('last_name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  useEffect(() => {
    fetchCongressMembers();
  }, [category, searchQuery, sortBy, sortOrder]);

  async function fetchCongressMembers() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (searchQuery) params.append('search', searchQuery);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      const response = await fetch(`/api/admin/congress?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setCongressMembers(data.congressMembers);
        setPagination(data.pagination);
      } else {
        setError('Failed to fetch congress members');
      }
    } catch (error) {
      console.error('Error fetching congress members:', error);
      setError('Failed to fetch congress members');
    } finally {
      setLoading(false);
    }
  }

  async function updateOverrideScore(fecId: string, score: string) {
    try {
      const response = await fetch('/api/admin/congress', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fec_id: fecId,
          override_score: score ? parseFloat(score) : null
        }),
      });

      if (response.ok) {
        setEditingScore(null);
        setOverrideScore('');
        fetchCongressMembers(); // Refresh the list
      } else {
        setError('Failed to update override score');
      }
    } catch (error) {
      console.error('Error updating override score:', error);
      setError('Failed to update override score');
    }
  }

  function getCategoryColor(category: string) {
    switch (category) {
      case 'Strong Pro-Israel':
        return 'bg-green-100 text-green-800';
      case 'Moderate Pro-Israel':
        return 'bg-blue-100 text-blue-800';
      case 'Neutral':
        return 'bg-gray-100 text-gray-800';
      case 'Limited Pro-Israel':
        return 'bg-yellow-100 text-yellow-800';
      case 'Anti-Israel':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function formatCurrency(amount: string) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  }

  function formatScore(score: string) {
    return parseFloat(score).toFixed(1);
  }

  function handleSort(column: string) {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('ASC');
    }
  }

  function getSortIcon(column: string) {
    if (sortBy !== column) return null;
    return sortOrder === 'ASC' ? '↑' : '↓';
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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Congress Members</h1>
            <p className="mt-2 text-gray-600">
              View and manage congress member pro-Israel funding analysis and scores.
            </p>
          </div>
          <Link
            href="/admin"
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      {pagination && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Members</p>
                <p className="text-lg font-semibold text-gray-900">{pagination.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Pro-Israel Funding</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(congressMembers.reduce((sum, member) => sum + parseFloat(member.pro_israel_contributions), 0))}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Avg Pro-Israel Score</p>
                <p className="text-lg font-semibold text-gray-900">
                  {(congressMembers.reduce((sum, member) => sum + parseFloat(member.final_score), 0) / congressMembers.length).toFixed(1)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🏛️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Parties</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Set(congressMembers.map(member => member.party)).size}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category Filter
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                <option value="pro-israel">Pro-Israel</option>
                <option value="neutral">Neutral</option>
                <option value="opposition">Opposition</option>
              </select>
            </div>

            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by name or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setCategory('');
                  setSearchQuery('');
                }}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Congress Members ({pagination?.total || 0})
            </h3>
            {pagination && (
              <div className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('last_name')}
                >
                  <div className="flex items-center">
                    Member {getSortIcon('last_name')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('state')}
                >
                  <div className="flex items-center">
                    State/District {getSortIcon('state')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('party')}
                >
                  <div className="flex items-center">
                    Party {getSortIcon('party')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('pro_israel_contributions')}
                >
                  <div className="flex items-center">
                    Pro-Israel Funding {getSortIcon('pro_israel_contributions')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('pro_israel_opposition_amount')}
                >
                  <div className="flex items-center">
                    Opposition Funding {getSortIcon('pro_israel_opposition_amount')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('curved_pro_israel_score')}
                >
                  <div className="flex items-center">
                    Score {getSortIcon('curved_pro_israel_score')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('pro_israel_category')}
                >
                  <div className="flex items-center">
                    Category {getSortIcon('pro_israel_category')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {congressMembers.map((member) => (
                <tr key={member.fec_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                                           <div className="text-sm font-medium text-gray-900">
                     <Link
                       href={`/candidates/${member.person_id || member.fec_id}`}
                       className="text-blue-600 hover:text-blue-500"
                     >
                       {member.representative_name}
                     </Link>
                   </div>
                        <div className="text-sm text-gray-500">{member.position}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{member.state}</div>
                    <div className="text-sm text-gray-500">{member.district_formatted}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {member.party}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(member.pro_israel_contributions)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(member.pro_israel_opposition_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatScore(member.final_score)}
                    </div>
                    {member.override_score && (
                      <div className="text-xs text-gray-500">
                        Override: {formatScore(member.override_score)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(member.pro_israel_category)}`}>
                      {member.pro_israel_category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingScore === member.fec_id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={overrideScore}
                          onChange={(e) => setOverrideScore(e.target.value)}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="Score"
                        />
                        <button
                          onClick={() => updateOverrideScore(member.fec_id, overrideScore)}
                          className="text-green-600 hover:text-green-500 text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingScore(null);
                            setOverrideScore('');
                          }}
                          className="text-gray-600 hover:text-gray-500 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingScore(member.fec_id);
                          setOverrideScore(member.override_score || '');
                        }}
                        className="text-blue-600 hover:text-blue-500 text-xs"
                      >
                        Override Score
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => {
                  if (pagination.page > 1) {
                    const params = new URLSearchParams();
                    if (category) params.append('category', category);
                    if (searchQuery) params.append('search', searchQuery);
                    params.append('page', (pagination.page - 1).toString());
                    window.history.pushState({}, '', `?${params.toString()}`);
                    fetchCongressMembers();
                  }
                }}
                disabled={pagination.page <= 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => {
                  if (pagination.page < pagination.totalPages) {
                    const params = new URLSearchParams();
                    if (category) params.append('category', category);
                    if (searchQuery) params.append('search', searchQuery);
                    params.append('page', (pagination.page + 1).toString());
                    window.history.pushState({}, '', `?${params.toString()}`);
                    fetchCongressMembers();
                  }
                }}
                disabled={pagination.page >= pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => {
                        const params = new URLSearchParams();
                        if (category) params.append('category', category);
                        if (searchQuery) params.append('search', searchQuery);
                        params.append('page', pageNum.toString());
                        window.history.pushState({}, '', `?${params.toString()}`);
                        fetchCongressMembers();
                      }}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === pagination.page
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
