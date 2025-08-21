import Link from 'next/link';
import { Search, Users, Vote, TrendingUp, Database, BarChart3 } from 'lucide-react';

export default function ExploreCampaignDataPage() {
  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Explore Campaign Data</h1>
        <p className="text-gray-600 mb-10 max-w-3xl">
          Explore campaign finance data across politicians, elections, lobbying groups, and more.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <Users className="h-8 w-8 text-blue-600" />
              <h3 className="text-xl font-semibold ml-3">Politicians</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Explore campaign finance data for members of Congress, state officials, and presidential candidates.
            </p>
            <div className="space-y-2">
              <Link href="/politicians/congress" className="block text-blue-600 hover:text-blue-700">
                Members of Congress →
              </Link>
              <Link href="/politicians/state" className="block text-blue-600 hover:text-blue-700">
                State Officials →
              </Link>
              <Link href="/politicians/finances" className="block text-blue-600 hover:text-blue-700">
                Personal Finances →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <Vote className="h-8 w-8 text-green-600" />
              <h3 className="text-xl font-semibold ml-3">Elections</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Track campaign finance by race type, explore outside spending, and discover local political contributions.
            </p>
            <div className="space-y-2">
              <Link href="/elections/overview" className="block text-blue-600 hover:text-blue-700">
                Election Overview →
              </Link>
              <Link href="/elections/get-local" className="block text-blue-600 hover:text-blue-700">
                Get Local! →
              </Link>
              <Link href="/elections/outside-spending" className="block text-blue-600 hover:text-blue-700">
                Outside Spending →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <h3 className="text-xl font-semibold ml-3">Lobbying & Groups</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Explore PACs, organizations, revolving door profiles, and foreign influence in American politics.
            </p>
            <div className="space-y-2">
              <Link href="/lobbying/pacs" className="block text-blue-600 hover:text-blue-700">
                PACs →
              </Link>
              <Link href="/lobbying/organizations" className="block text-blue-600 hover:text-blue-700">
                Organizations →
              </Link>
              <Link href="/lobbying/revolving-door" className="block text-blue-600 hover:text-blue-700">
                Revolving Door →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <Database className="h-8 w-8 text-orange-600" />
              <h3 className="text-xl font-semibold ml-3">Data & Tools</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Access our comprehensive database through search tools, APIs, and bulk data downloads.
            </p>
            <div className="space-y-2">
              <Link href="/search" className="block text-blue-600 hover:text-blue-700">
                Search →
              </Link>
              <Link href="/learn/api" className="block text-blue-600 hover:text-blue-700">
                API Documentation →
              </Link>
              <Link href="/learn/bulk-data" className="block text-blue-600 hover:text-blue-700">
                Bulk Data →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <BarChart3 className="h-8 w-8 text-red-600" />
              <h3 className="text-xl font-semibold ml-3">Analysis</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Interactive charts, visualizations, and analysis of campaign finance trends and patterns.
            </p>
            <div className="space-y-2">
              <Link href="/elections/overview" className="block text-blue-600 hover:text-blue-700">
                Election Analysis →
              </Link>
              <Link href="/lobbying/overview" className="block text-blue-600 hover:text-blue-700">
                Lobbying Trends →
              </Link>
              <Link href="/learn/methodology" className="block text-blue-600 hover:text-blue-700">
                Methodology →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



