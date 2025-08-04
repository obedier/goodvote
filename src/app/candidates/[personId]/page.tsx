'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  MapPin, 
  Calendar,
  Building,
  FileText,
  BarChart3,
  ExternalLink,
  Award,
  ArrowLeft,
  Tag
} from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';

interface CampaignFinance {
  election_year: number;
  total_receipts: number;
  total_individual_contributions: number;
  other_committee_contributions: number;
  party_committee_contributions: number;
  transfers_from_auth: number;
  total_disbursements: number;
  cash_on_hand: number;
  contribution_count: number;
  avg_contribution: number;
  self_financing: number;
  self_financing_percentage: number;
  total_debt: number;
  debt_to_receipts_ratio: number;
  total_pac_contributions: number;
  pac_percentage: number;
  total_contributions: number;
  other_receipts: number;
  
  // Outside spending breakdown from operating expenditures
  total_operating_expenditures?: number;
  operating_expenditure_count?: number;
  unique_committees?: number;
  
  // Categorized operating expenditures
  media_advertising?: number;
  digital_advertising?: number;
  polling_research?: number;
  printing_production?: number;
  consulting_services?: number;
  staff_payroll?: number;
  
  // Committee contributions (for comparison)
  committee_contributions?: number;
  committee_contribution_count?: number;
  
  // Legacy fields for backward compatibility
  bundled_contributions?: number;
  independent_expenditures_in_favor?: number;
  communication_costs_in_favor?: number;
  soft_money_in_favor?: number;
  spending_against?: number;
  
  total_outside_spending?: number;
  outside_spending_percentage?: number;
}

interface Contributor {
  name: string;
  location: string;
  employer: string;
  occupation: string;
  amount: number;
  count: number;
  type: string;
}

interface Industry {
  industry: string;
  amount: number;
  count: number;
  percentage: number;
}

interface ElectionHistory {
  election_year: number;
  cand_id: string;
  current_office: string;
  current_party: string;
  result: string;
  campaign_finance: CampaignFinance | null;
}

interface CandidateProfile {
  person_id: string;
  display_name: string;
  state: string;
  current_office: string;
  current_district: string;
  current_party: string;
  total_elections: number;
  is_current_office_holder: boolean;
  member_id?: string;
  bio_id?: string;
  cand_id: string;
  available_election_cycles: number[];
  current_election_year: number;
  links: {
    fec?: string;
    open_secrets?: string;
    congress?: string;
  };
  campaign_finance: CampaignFinance | null;
  career_totals: any;
  top_contributors: Contributor[];
  top_industries: Industry[];
  election_history: ElectionHistory[];
}

type TabType = 'overview' | 'campaign-finance' | 'outside-spending' | 'contributors' | 'industries' | 'election-history';

export default function CandidateProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const personId = params.personId as string;
  const electionYearParam = searchParams.get('election_year');
  const electionYear = electionYearParam === 'career' ? 'career' : (electionYearParam ? parseInt(electionYearParam) : 2024);
  
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedElectionYear, setSelectedElectionYear] = useState<number | 'career'>(electionYear);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Candidates', href: '/candidates' },
    { label: profile?.display_name || 'Loading...' },
    ...(profile ? [{ 
      label: 'Politician Profile', 
      href: `/politicians/${profile.person_id}` 
    }] : []),
  ];

  useEffect(() => {
    fetchCandidateProfile();
  }, [personId, electionYear]);

  const fetchCandidateProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = `/api/candidates/${personId}?election_year=${electionYear}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch candidate profile');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch candidate profile');
      }
      
      setProfile(data.data);
      setSelectedElectionYear(electionYear);
    } catch (err) {
      console.error('Error fetching candidate profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch candidate profile');
    } finally {
      setLoading(false);
    }
  };

  const handleElectionYearChange = (year: number | 'career') => {
    setSelectedElectionYear(year);
    if (year !== 'career') {
      router.push(`/candidates/${personId}?election_year=${year}`);
    } else {
      router.push(`/candidates/${personId}?election_year=career`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getPartyColor = (party: string) => {
    return party === 'DEM' ? 'text-blue-600' : party === 'REP' ? 'text-red-600' : 'text-gray-600';
  };

  const getPartyBgColor = (party: string) => {
    return party === 'DEM' ? 'bg-blue-100' : party === 'REP' ? 'bg-red-100' : 'bg-gray-100';
  };

  const getOfficeLabel = (office: string) => {
    return office === 'S' ? 'Senate' : office === 'H' ? 'House' : office;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'campaign-finance', label: 'Campaign Finance', icon: DollarSign },
    { id: 'outside-spending', label: 'Outside Spending', icon: TrendingUp },
    { id: 'contributors', label: 'Top Contributors', icon: Users },
    { id: 'industries', label: 'Top Industries', icon: BarChart3 },
    { id: 'election-history', label: 'Election History', icon: Calendar },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-700 dark:text-gray-300">Loading candidate profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400">Error: {error || 'Candidate not found'}</p>
            <button
              onClick={fetchCandidateProfile}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentFinance = profile.campaign_finance;
  const careerTotals = profile.career_totals;
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbs} />
        
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <Link
                  href="/candidates"
                  className="inline-flex items-center text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Candidates
                </Link>
                {profile.is_current_office_holder && (
                  <Link
                    href={`/politicians/${profile.person_id}`}
                    className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                  >
                    <Award className="h-4 w-4 mr-1" />
                    View Politician Profile
                  </Link>
                )}
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {profile.display_name}
              </h1>
              
              <div className="flex items-center space-x-4 text-gray-700 dark:text-gray-300 mb-4">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPartyBgColor(profile.current_party)} ${getPartyColor(profile.current_party)}`}>
                  {profile.current_party === 'DEM' ? 'Democrat' : profile.current_party === 'REP' ? 'Republican' : profile.current_party}
                </span>
                <span className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {profile.state} - {getOfficeLabel(profile.current_office)} {profile.current_district}
                </span>
                {profile.is_current_office_holder && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                    <Award className="h-3 w-3 mr-1" />
                    Incumbent
                  </span>
                )}
              </div>

              {/* FEC ID and Links */}
              <div className="flex items-center space-x-4 text-sm text-gray-700 dark:text-gray-300 mb-4">
                <span className="flex items-center">
                  <Building className="h-4 w-4 mr-1" />
                  FEC ID: {profile.cand_id}
                </span>
                {profile.links.fec && (
                  <a
                    href={profile.links.fec}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    FEC.gov
                  </a>
                )}
                {profile.links.congress && (
                  <a
                    href={profile.links.congress}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Congress.gov
                  </a>
                )}
              </div>

              {/* Election Cycle Tags */}
              <div className="flex flex-wrap items-center space-x-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Election Cycles:</span>
                {profile.available_election_cycles.map((year) => (
                  <button
                    key={year}
                    onClick={() => handleElectionYearChange(year)}
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      selectedElectionYear === year
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    {year}
                  </button>
                ))}
                <button
                  onClick={() => handleElectionYearChange('career')}
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    selectedElectionYear === 'career'
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Tag className="h-3 w-3 mr-1" />
                  Career
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Raised</h3>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {selectedElectionYear === 'career' && careerTotals
                        ? formatCurrency(careerTotals.career_total_receipts || 0)
                        : currentFinance
                        ? formatCurrency(currentFinance.total_receipts)
                        : '$0'}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-green-600 dark:text-green-400">Total Spent</h3>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {selectedElectionYear === 'career' && careerTotals
                        ? formatCurrency(careerTotals.career_total_disbursements || 0)
                        : currentFinance
                        ? formatCurrency(currentFinance.total_disbursements)
                        : '$0'}
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-purple-600 dark:text-purple-400">Cash on Hand</h3>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {currentFinance ? formatCurrency(currentFinance.cash_on_hand) : '$0'}
                    </p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-orange-600 dark:text-orange-400">Contributions</h3>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                      {currentFinance ? formatNumber(currentFinance.contribution_count) : '0'}
                    </p>
                  </div>
                </div>

                {currentFinance && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Campaign Finance Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Receipts Breakdown</h4>
                        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                          <div className="flex justify-between">
                            <span>Individual Contributions:</span>
                            <span className="font-medium">{formatCurrency(currentFinance.total_individual_contributions)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>PAC Contributions:</span>
                            <span className="font-medium">{formatCurrency(currentFinance.total_pac_contributions)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Other Committee:</span>
                            <span className="font-medium">{formatCurrency(currentFinance.other_committee_contributions)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Party Committee:</span>
                            <span className="font-medium">{formatCurrency(currentFinance.party_committee_contributions)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Transfers:</span>
                            <span className="font-medium">{formatCurrency(currentFinance.transfers_from_auth)}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Key Metrics</h4>
                        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                          <div className="flex justify-between">
                            <span>Average Contribution:</span>
                            <span className="font-medium">{formatCurrency(currentFinance.avg_contribution)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Self-Financing:</span>
                            <span className="font-medium">{currentFinance.self_financing_percentage.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>PAC Percentage:</span>
                            <span className="font-medium">{currentFinance.pac_percentage.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Debt Ratio:</span>
                            <span className="font-medium">{currentFinance.debt_to_receipts_ratio.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'campaign-finance' && currentFinance && (
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Complete Campaign Finance Summary</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Total Receipts: {formatCurrency(currentFinance.total_receipts)}</h4>
                      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex justify-between">
                          <span>Individual Contributions:</span>
                          <span className="font-medium">{formatCurrency(currentFinance.total_individual_contributions)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>PAC Contributions:</span>
                          <span className="font-medium">{formatCurrency(currentFinance.total_pac_contributions)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Other Committee Contributions:</span>
                          <span className="font-medium">{formatCurrency(currentFinance.other_committee_contributions)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Party Committee Contributions:</span>
                          <span className="font-medium">{formatCurrency(currentFinance.party_committee_contributions)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Transfers from Authorized Committees:</span>
                          <span className="font-medium">{formatCurrency(currentFinance.transfers_from_auth)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Other Receipts:</span>
                          <span className="font-medium">{formatCurrency(currentFinance.other_receipts)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-3">Disbursements & Debt</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total Disbursements:</span>
                          <span className="font-medium">{formatCurrency(currentFinance.total_disbursements)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cash on Hand:</span>
                          <span className="font-medium">{formatCurrency(currentFinance.cash_on_hand)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Self-Financing:</span>
                          <span className="font-medium">{formatCurrency(currentFinance.self_financing)} ({currentFinance.self_financing_percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Debt:</span>
                          <span className="font-medium">{formatCurrency(currentFinance.total_debt)} ({currentFinance.debt_to_receipts_ratio.toFixed(1)}%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Contribution Count:</span>
                          <span className="font-medium">{formatNumber(currentFinance.contribution_count)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Contribution:</span>
                          <span className="font-medium">{formatCurrency(currentFinance.avg_contribution)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'outside-spending' && currentFinance && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Outside Spending Breakdown</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Spending FOR the candidate */}
                  <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-green-800 dark:text-green-200">Spending FOR Candidate</h4>
                      <Link
                        href={`/outside-spending/${profile.person_id}?election_year=${selectedElectionYear}&type=for`}
                        className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Details
                      </Link>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-green-700 dark:text-green-300">Independent Expenditures:</span>
                        <span className="font-medium text-green-900 dark:text-green-100">{formatCurrency(currentFinance.independent_expenditures_in_favor || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-green-700 dark:text-green-300">Communication Costs:</span>
                        <span className="font-medium text-green-900 dark:text-green-100">{formatCurrency(currentFinance.communication_costs_in_favor || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-green-700 dark:text-green-300">Coordinated Expenditures:</span>
                        <span className="font-medium text-green-900 dark:text-green-100">{formatCurrency(currentFinance.consulting_services || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-green-700 dark:text-green-300">Media Advertising:</span>
                        <span className="font-medium text-green-900 dark:text-green-100">{formatCurrency(currentFinance.media_advertising || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-green-700 dark:text-green-300">Digital Advertising:</span>
                        <span className="font-medium text-green-900 dark:text-green-100">{formatCurrency(currentFinance.digital_advertising || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-green-700 dark:text-green-300">Staff Payroll:</span>
                        <span className="font-medium text-green-900 dark:text-green-100">{formatCurrency(currentFinance.staff_payroll || 0)}</span>
                      </div>
                      <hr className="border-green-200 dark:border-green-700" />
                      <div className="flex justify-between items-center font-semibold">
                        <span className="text-green-800 dark:text-green-200">Total Spending FOR:</span>
                        <span className="text-green-900 dark:text-green-100">{formatCurrency(currentFinance.total_operating_expenditures || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Spending AGAINST the candidate */}
                  <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-red-800 dark:text-red-200">Spending AGAINST Candidate</h4>
                      <Link
                        href={`/outside-spending/${profile.person_id}?election_year=${selectedElectionYear}&type=against`}
                        className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Details
                      </Link>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-red-700 dark:text-red-300">Independent Expenditures:</span>
                        <span className="font-medium text-red-900 dark:text-red-100">{formatCurrency(Math.abs(currentFinance.spending_against || 0))}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-red-700 dark:text-red-300">Negative Advertising:</span>
                        <span className="font-medium text-red-900 dark:text-red-100">{formatCurrency(0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-red-700 dark:text-red-300">Opposition Research:</span>
                        <span className="font-medium text-red-900 dark:text-red-100">{formatCurrency(0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-red-700 dark:text-red-300">Attack Ads:</span>
                        <span className="font-medium text-red-900 dark:text-red-100">{formatCurrency(0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-red-700 dark:text-red-300">Mailers Against:</span>
                        <span className="font-medium text-red-900 dark:text-red-100">{formatCurrency(0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-red-700 dark:text-red-300">Digital Opposition:</span>
                        <span className="font-medium text-red-900 dark:text-red-100">{formatCurrency(0)}</span>
                      </div>
                      <hr className="border-red-200 dark:border-red-700" />
                      <div className="flex justify-between items-center font-semibold">
                        <span className="text-red-800 dark:text-red-200">Total Spending AGAINST:</span>
                        <span className="text-red-900 dark:text-red-100">{formatCurrency(Math.abs(currentFinance.spending_against || 0))}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Outside Spending Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(currentFinance.total_operating_expenditures || 0)}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Spending FOR</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(Math.abs(currentFinance.spending_against || 0))}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Spending AGAINST</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{(currentFinance.outside_spending_percentage || 0).toFixed(1)}%</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">% of Total Receipts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{currentFinance.unique_committees || 0}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Unique Committees</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contributors' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Top Contributors</h3>
                  <Link
                    href={`/contributors?candidate=${profile.person_id}&election_year=${selectedElectionYear}`}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                  >
                    View All Contributors
                  </Link>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {profile.top_contributors.map((contributor, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            <div className="max-w-xs truncate" title={contributor.name}>
                              {contributor.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {contributor.location}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              contributor.type === 'Individual' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {contributor.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(contributor.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {contributor.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'industries' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Top Contributing Industries</h3>
                
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {profile.top_industries.map((industry, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {industry.industry}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(industry.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {industry.count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {industry.percentage.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'election-history' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Election History</h3>
                
                <div className="space-y-4">
                  {profile.election_history.map((election, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <h4 className="text-lg font-medium text-gray-900">{election.election_year}</h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            election.result === 'Won' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {election.result}
                          </span>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPartyBgColor(election.current_party)} ${getPartyColor(election.current_party)}`}>
                            {election.current_party === 'DEM' ? 'Democrat' : election.current_party === 'REP' ? 'Republican' : election.current_party}
                          </span>
                          <span className="text-sm text-gray-600">
                            {getOfficeLabel(election.current_office)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleElectionYearChange(election.election_year)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                        >
                          View Details
                        </button>
                      </div>
                      
                      {election.campaign_finance && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Total Raised:</span>
                            <span className="ml-2 font-medium">{formatCurrency(election.campaign_finance.total_receipts)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Total Spent:</span>
                            <span className="ml-2 font-medium">{formatCurrency(election.campaign_finance.total_disbursements)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Contributions:</span>
                            <span className="ml-2 font-medium">{formatNumber(election.campaign_finance.contribution_count)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 