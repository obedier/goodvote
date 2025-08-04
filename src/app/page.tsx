import Link from 'next/link';
import { Search, Users, Vote, TrendingUp, Database, BarChart3 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Track Money in U.S. Politics
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              GoodVote provides comprehensive campaign finance data and analysis to promote 
              transparency in our democracy. Explore contributions, expenditures, and influence 
              in American politics.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search politicians, donors, committees..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                />
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Popular searches: Donald Trump, Microsoft, Planned Parenthood
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/politicians/congress"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Browse Congress
              </Link>
              <Link
                href="/elections/overview"
                className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Election Overview
              </Link>
              <Link
                href="/lobbying/pacs"
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Explore PACs
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Explore Campaign Finance Data
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Politicians */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <Users className="h-8 w-8 text-blue-600" />
              <h3 className="text-xl font-semibold ml-3">Politicians</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Explore campaign finance data for members of Congress, state officials, 
              and presidential candidates.
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

          {/* Elections */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <Vote className="h-8 w-8 text-green-600" />
              <h3 className="text-xl font-semibold ml-3">Elections</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Track campaign finance by race type, explore outside spending, 
              and discover local political contributions.
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

          {/* Lobbying & Groups */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <h3 className="text-xl font-semibold ml-3">Lobbying & Groups</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Explore PACs, organizations, revolving door profiles, and foreign 
              influence in American politics.
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

          {/* Data & Tools */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <Database className="h-8 w-8 text-orange-600" />
              <h3 className="text-xl font-semibold ml-3">Data & Tools</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Access our comprehensive database through search tools, APIs, 
              and bulk data downloads.
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

          {/* Analysis */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <BarChart3 className="h-8 w-8 text-red-600" />
              <h3 className="text-xl font-semibold ml-3">Analysis</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Interactive charts, visualizations, and analysis of campaign 
              finance trends and patterns.
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

          {/* Learn */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <Search className="h-8 w-8 text-indigo-600" />
              <h3 className="text-xl font-semibold ml-3">Learn</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Educational resources on campaign finance basics, methodology, 
              and understanding money in politics.
            </p>
            <div className="space-y-2">
              <Link href="/learn/basics" className="block text-blue-600 hover:text-blue-700">
                Campaign Finance Basics →
              </Link>
              <Link href="/learn/methodology" className="block text-blue-600 hover:text-blue-700">
                Methodology →
              </Link>
              <Link href="/about/mission" className="block text-blue-600 hover:text-blue-700">
                Our Mission →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Campaign Finance Data at Your Fingertips
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold mb-2">Millions</div>
              <div className="text-blue-100">Contribution Records</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">50,000+</div>
              <div className="text-blue-100">Political Committees</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">24,000+</div>
              <div className="text-blue-100">Unique Politicians</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">Real-time</div>
              <div className="text-blue-100">Data Updates</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Start Exploring Today
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of researchers, journalists, and citizens using GoodVote 
            to understand money in politics.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/search"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Start Searching
            </Link>
            <Link
              href="/learn/basics"
              className="bg-gray-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              Learn the Basics
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
