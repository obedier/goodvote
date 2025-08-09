import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/admin" className="text-xl font-bold text-gray-900">
                GoodVote Admin
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/" 
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back to Site
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Israel Configuration
              </div>
              
              <Link
                href="/admin/committees"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <span className="mr-3">🏛️</span>
                Committees
              </Link>
              
              <Link
                href="/admin/relationships"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <span className="mr-3">🔗</span>
                Committee Relationships
              </Link>
              
              <Link
                href="/admin/keywords"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <span className="mr-3">🔍</span>
                Keywords
              </Link>
              
              <Link
                href="/admin/transaction-types"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <span className="mr-3">💰</span>
                Transaction Types
              </Link>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 ml-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
