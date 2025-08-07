'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Download } from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { CurrentCandidate, BreadcrumbItem } from '@/types';

export default function CongressPage() {
  const [members, setMembers] = useState<CurrentCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    party: '',
    chamber: '',
    state: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
  });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Politicians', href: '/politicians' },
    { label: 'Members of Congress' },
  ];

  useEffect(() => {
    fetchMembers();
  }, [filters, pagination.page, pagination.limit]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters.party) params.append('party', filters.party);
      if (filters.chamber) params.append('chamber', filters.chamber);
      if (filters.state) params.append('state', filters.state);
      if (searchTerm) params.append('search', searchTerm);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      console.log('Fetching Congress members with params:', params.toString());
      const response = await fetch(`/api/congress?${params.toString()}`);
      const data = await response.json();
      console.log('API response:', data);

      if (data.success) {
        setMembers(data.data || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0,
        }));
      } else {
        setError(data.error || 'Failed to fetch members');
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      setError('Failed to fetch members');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchMembers();
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const resetFilters = () => {
    setFilters({ party: '', chamber: '', state: '' });
    setSearchTerm('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Congress members...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
          <button
            onClick={fetchMembers}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs items={breadcrumbs} />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Members of Congress
        </h1>
        <p className="text-gray-600">
          Explore campaign finance data for current members of the 118th Congress. 
          Data is based on FEC filings and updated monthly.
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Party Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Party
            </label>
            <select
              value={filters.party}
              onChange={(e) => setFilters({ ...filters, party: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Parties</option>
              <option value="DEM">Democrat</option>
              <option value="REP">Republican</option>
              <option value="IND">Independent</option>
            </select>
          </div>

          {/* Chamber Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chamber
            </label>
            <select
              value={filters.chamber}
              onChange={(e) => setFilters({ ...filters, chamber: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Chambers</option>
              <option value="H">House</option>
              <option value="S">Senate</option>
            </select>
          </div>

          {/* State Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <select
              value={filters.state}
              onChange={(e) => setFilters({ ...filters, state: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All States</option>
              <option value="CA">California</option>
              <option value="TX">Texas</option>
              <option value="NY">New York</option>
              <option value="FL">Florida</option>
              {/* Add more states as needed */}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name or state..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-2.5 text-blue-600 hover:text-blue-700"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Reset Filters */}
        <div className="flex justify-between items-center">
          <button
            onClick={resetFilters}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Reset Filters
          </button>
          <div className="text-sm text-gray-500">
            {pagination.total} total members • Page {pagination.page} of {pagination.totalPages}
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chamber
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Party
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  District
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Israel Score
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.person_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <a
                      href={`/politicians/${member.person_id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {member.display_name}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.state}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.current_office === 'H' ? 'House' : member.current_office === 'S' ? 'Senate' : member.current_office}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      member.current_party === 'DEM' ? 'bg-blue-100 text-blue-800' :
                      member.current_party === 'REP' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {member.current_party === 'DEM' ? 'Democrat' :
                       member.current_party === 'REP' ? 'Republican' :
                       member.current_party === 'IND' ? 'Independent' : member.current_party}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.current_district || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      member.incumbent_challenge === 'I' ? 'bg-green-100 text-green-800' :
                      member.incumbent_challenge === 'C' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {member.incumbent_challenge === 'I' ? 'Incumbent' :
                       member.incumbent_challenge === 'C' ? 'Challenger' :
                       member.incumbent_challenge === 'O' ? 'Open Seat' : member.incumbent_challenge}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {member.israel_score !== null ? (
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white ${
                          member.israel_score === 0 ? 'bg-red-500' :
                          member.israel_score === 1 ? 'bg-orange-500' :
                          member.israel_score === 2 ? 'bg-yellow-500' :
                          member.israel_score === 3 ? 'bg-blue-500' :
                          member.israel_score === 4 ? 'bg-green-500' :
                          member.israel_score === 5 ? 'bg-green-600' :
                          'bg-gray-500'
                        }`}>
                          {member.israel_score}
                        </span>
                        <span className="text-xs text-gray-500">
                          {member.israel_grade} • ${member.israel_total?.toLocaleString() || 0}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          
          {/* Page Size Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Show:</span>
            <select
              value={pagination.limit}
              onChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
            <span className="text-sm text-gray-700">per page</span>
          </div>
        </div>
      )}

      {/* Export Button */}
      <div className="mt-6 text-right">
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <Download className="h-4 w-4 mr-2" />
          Export to CSV
        </button>
      </div>
    </div>
  );
} 