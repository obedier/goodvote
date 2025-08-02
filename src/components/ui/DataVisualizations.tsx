'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
} from 'recharts';

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface ContributionData {
  candidate: string;
  total: number;
  individual: number;
  pac: number;
  party: string;
}

interface ExpenditureData {
  committee: string;
  amount: number;
  category: string;
  month: string;
}

interface DonorData {
  state: string;
  count: number;
  total: number;
  avgAmount: number;
}

interface ChartProps {
  data: any[];
  title: string;
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  xKey: string;
  yKey: string;
  width?: number;
  height?: number;
  colors?: string[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const CampaignFinanceChart: React.FC<ChartProps> = ({
  data,
  title,
  type,
  xKey,
  yKey,
  width = 600,
  height = 400,
  colors = COLORS,
}) => {
  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart width={width} height={height} data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            <Legend />
            <Bar dataKey={yKey} fill="#8884d8" />
          </BarChart>
        );

      case 'line':
        return (
          <LineChart width={width} height={height} data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            <Legend />
            <Line type="monotone" dataKey={yKey} stroke="#8884d8" strokeWidth={2} />
          </LineChart>
        );

      case 'pie':
        return (
          <PieChart width={width} height={height}>
            <Pie
              data={data}
              cx={width / 2}
              cy={height / 2}
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={yKey}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
          </PieChart>
        );

      case 'area':
        return (
          <AreaChart width={width} height={height} data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            <Area type="monotone" dataKey={yKey} stroke="#8884d8" fill="#8884d8" />
          </AreaChart>
        );

      case 'scatter':
        return (
          <ScatterChart width={width} height={height}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            <Scatter dataKey={yKey} fill="#8884d8" />
          </ScatterChart>
        );

      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

// Specialized chart components for campaign finance data
export const ContributionChart: React.FC<{ data: ContributionData[] }> = ({ data }) => {
  return (
    <CampaignFinanceChart
      data={data}
      title="Campaign Contributions by Candidate"
      type="bar"
      xKey="candidate"
      yKey="total"
      height={400}
    />
  );
};

export const ExpenditureChart: React.FC<{ data: ExpenditureData[] }> = ({ data }) => {
  return (
    <CampaignFinanceChart
      data={data}
      title="Committee Expenditures Over Time"
      type="line"
      xKey="month"
      yKey="amount"
      height={400}
    />
  );
};

export const DonorMapChart: React.FC<{ data: DonorData[] }> = ({ data }) => {
  return (
    <CampaignFinanceChart
      data={data}
      title="Donor Distribution by State"
      type="pie"
      xKey="state"
      yKey="total"
      height={400}
    />
  );
};

export const ContributionTrendChart: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <CampaignFinanceChart
      data={data}
      title="Contribution Trends Over Time"
      type="area"
      xKey="date"
      yKey="amount"
      height={400}
    />
  );
};

export const CommitteeComparisonChart: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Committee Performance Comparison</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="committee" />
          <YAxis />
          <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
          <Legend />
          <Bar dataKey="receipts" fill="#8884d8" name="Total Receipts" />
          <Bar dataKey="expenditures" fill="#82ca9d" name="Total Expenditures" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const PartyContributionChart: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Contributions by Party</h3>
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const IndustryContributionChart: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Contributions by Industry</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="industry" type="category" width={150} />
          <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
          <Bar dataKey="amount" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const StateComparisonChart: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Finance by State</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="state" />
          <YAxis />
          <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
          <Legend />
          <Bar dataKey="contributions" fill="#8884d8" name="Contributions" />
          <Bar dataKey="expenditures" fill="#82ca9d" name="Expenditures" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Dashboard component that combines multiple charts
export const CampaignFinanceDashboard: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CommitteeComparisonChart data={data.committeeComparison || []} />
        <PartyContributionChart data={data.partyContributions || []} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IndustryContributionChart data={data.industryContributions || []} />
        <StateComparisonChart data={data.stateComparison || []} />
      </div>
      <div className="grid grid-cols-1 gap-6">
        <ContributionTrendChart data={data.contributionTrends || []} />
      </div>
    </div>
  );
};

export default CampaignFinanceChart; 