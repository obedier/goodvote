// FEC Data Interfaces
export interface FECContribution {
  committee_id: string;
  candidate_id?: string;
  contributor_name: string;
  contributor_city?: string;
  contributor_state?: string;
  contributor_zip?: string;
  contribution_amount: number;
  contribution_date: string;
  election_year: number;
  committee_name?: string;
  committee_type?: string;
}

export interface FECCommittee {
  committee_id: string;
  committee_name: string;
  committee_type: string;
  committee_designation?: string;
  committee_party?: string;
  state?: string;
  election_year: number;
}

export interface FECCandidate {
  candidate_id: string;
  candidate_name: string;
  party: string;
  state: string;
  district?: string;
  office: string;
  election_year: number;
  incumbent_challenge: string;
}

export interface FECExpenditure {
  committee_id: string;
  candidate_id?: string;
  payee_name: string;
  payee_city?: string;
  payee_state?: string;
  expenditure_amount: number;
  expenditure_date: string;
  expenditure_purpose?: string;
  election_year: number;
}

// Person-based Mapping Interfaces
export interface Person {
  person_id: string;
  normalized_name: string;
  display_name: string;
  state: string;
  first_election_year: number;
  last_election_year: number;
  total_elections: number;
  current_office?: string;
  current_district?: string;
  current_party?: string;
  bioguide_id?: string;
}

export interface PersonCandidate {
  id: number;
  person_id: string;
  cand_id: string;
  election_year: number;
  office: string;
  district?: string;
  party: string;
  incumbent_challenge: string;
  status: string;
}

export interface CurrentCandidate {
  person_id: string;
  display_name: string;
  state: string;
  current_office?: string;
  current_district?: string;
  current_party?: string;
  cand_id: string;
  election_year: number;
  incumbent_challenge: string;
  total_elections: number;
}

// Search and Filter Interfaces
export interface SearchFilters {
  party?: string;
  chamber?: string;
  state?: string;
  election_year?: number;
  min_amount?: number;
  max_amount?: number;
  contributor_name?: string;
  committee_id?: string;
  candidate_id?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
}

// API Response Interfaces
export interface ApiResponse<T> {
  success: boolean;
  data?: T[];
  error?: string;
  rowCount?: number;
  pagination?: PaginationParams;
}

export interface SearchResult {
  person_id: string;
  display_name: string;
  state: string;
  current_office?: string;
  current_district?: string;
  current_party?: string;
  total_elections: number;
}

// Chart and Visualization Interfaces
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface ContributionByParty {
  party: string;
  total_amount: number;
  contribution_count: number;
}

export interface TopContributor {
  contributor_name: string;
  total_amount: number;
  contribution_count: number;
  contributor_city?: string;
  contributor_state?: string;
}

export interface TopIndustry {
  industry: string;
  total_amount: number;
  contribution_count: number;
}

// Navigation and UI Interfaces
export interface NavigationItem {
  label: string;
  href: string;
  children?: NavigationItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Form Interfaces
export interface SearchFormData {
  searchTerm: string;
  filters: SearchFilters;
}

export interface DonorLookupForm {
  name?: string;
  state?: string;
  employer?: string;
  min_amount?: number;
  max_amount?: number;
  election_year?: number;
}

// State Management Interfaces
export interface AppState {
  currentUser?: any;
  searchHistory: string[];
  recentSearches: SearchResult[];
  filters: SearchFilters;
}

// Error Interfaces
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// Database Query Interfaces
export interface QueryResult<T> {
  success: boolean;
  data?: T[];
  error?: any;
  rowCount?: number;
}

// Election Data Interfaces
export interface ElectionCycle {
  year: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface RaceSummary {
  race_id: string;
  state: string;
  district?: string;
  office: string;
  election_year: number;
  candidates: CandidateSummary[];
  total_raised: number;
  total_spent: number;
}

export interface CandidateSummary {
  person_id: string;
  display_name: string;
  party: string;
  total_raised: number;
  total_spent: number;
  cash_on_hand: number;
  debts: number;
  incumbent_challenge: string;
}

// Lobbying and PAC Interfaces
export interface PACSummary {
  committee_id: string;
  committee_name: string;
  committee_type: string;
  total_receipts: number;
  total_disbursements: number;
  cash_on_hand: number;
  election_year: number;
}

export interface OrganizationProfile {
  organization_id: string;
  name: string;
  type: string;
  total_contributions: number;
  total_lobbying: number;
  party_breakdown: {
    democrat: number;
    republican: number;
    other: number;
  };
  top_recipients: TopContributor[];
  top_industries: TopIndustry[];
}

// Export Interfaces
export interface ExportOptions {
  format: 'csv' | 'json';
  include_headers: boolean;
  filters: SearchFilters;
  columns: string[];
}

export interface ExportResult {
  success: boolean;
  data?: string;
  filename?: string;
  error?: string;
}

// Campaign Finance Interfaces
export interface CampaignFinanceTotals {
  total_receipts: number;
  contribution_count: number;
  unique_contributors: number;
  avg_contribution: number;
  total_individual_contributions?: number;
  other_committee_contributions?: number;
  party_committee_contributions?: number;
  transfers_from_auth?: number;
  total_disbursements?: number;
  self_financing?: number;
  self_financing_percentage?: number;
  candidate_loans?: number;
  other_loans?: number;
  debts_owed_by_candidate?: number;
  total_debt?: number;
  debt_to_receipts_ratio?: number;
  candidate_loan_repayments?: number;
  other_loan_repayments?: number;
  total_pac_contributions?: number;
  pac_contribution_count?: number;
  unique_pacs?: number;
  pac_percentage?: number;
  bundled_contributions?: number;
  unique_bundlers?: number;
  bundled_contribution_count?: number;
  independent_expenditures_in_favor?: number;
  independent_expenditures_in_favor_count?: number;
  independent_expenditures_in_favor_committees?: number;
  communication_costs_in_favor?: number;
  communication_costs_in_favor_count?: number;
  communication_costs_in_favor_committees?: number;
  soft_money_in_favor?: number;
  soft_money_in_favor_count?: number;
  soft_money_in_favor_committees?: number;
  spending_against?: number;
  spending_against_count?: number;
  spending_against_committees?: number;
  total_outside_spending?: number;
  outside_spending_percentage?: number;
  outside_spending_confidence?: {
    bundled_contributions: string;
    independent_expenditures_in_favor: string;
    communication_costs_in_favor: string;
    soft_money_in_favor: string;
    spending_against: string;
  };
} 