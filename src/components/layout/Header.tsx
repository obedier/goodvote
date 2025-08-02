'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Menu, X, ChevronDown } from 'lucide-react';
import { NavigationItem } from '@/types';

const navigation: NavigationItem[] = [
  {
    label: 'Politicians',
    href: '/politicians',
    children: [
      { label: 'Members of Congress', href: '/politicians/congress' },
      { label: 'State Officials', href: '/politicians/state' },
      { label: 'Personal Finances', href: '/politicians/finances' },
      { label: 'Look Up a Politician', href: '/search' },
    ],
  },
  {
    label: 'Elections',
    href: '/elections',
    children: [
      { label: 'Election Overview', href: '/elections/overview' },
      { label: 'Get Local!', href: '/elections/get-local' },
      { label: 'Presidential Elections', href: '/elections/presidential' },
      { label: 'Congressional Elections', href: '/elections/congressional' },
      { label: 'Outside Spending', href: '/elections/outside-spending' },
      { label: 'Political Ads', href: '/elections/ads' },
    ],
  },
  {
    label: 'Lobbying & Groups',
    href: '/lobbying',
    children: [
      { label: 'Lobbying Overview', href: '/lobbying/overview' },
      { label: 'PACs', href: '/lobbying/pacs' },
      { label: 'Organizations', href: '/lobbying/organizations' },
      { label: 'Revolving Door', href: '/lobbying/revolving-door' },
      { label: 'Foreign Lobby Watch', href: '/lobbying/foreign' },
    ],
  },
  {
    label: 'Learn',
    href: '/learn',
    children: [
      { label: 'Campaign Finance Basics', href: '/learn/basics' },
      { label: 'Methodology', href: '/learn/methodology' },
      { label: 'API Documentation', href: '/learn/api' },
      { label: 'Bulk Data', href: '/learn/bulk-data' },
    ],
  },
  {
    label: 'About',
    href: '/about',
    children: [
      { label: 'Mission', href: '/about/mission' },
      { label: 'Contact', href: '/about/contact' },
      { label: 'Donate', href: '/about/donate' },
    ],
  },
];

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleDropdown = (label: string) => {
    setActiveDropdown(activeDropdown === label ? null : label);
  };

  const closeDropdowns = () => {
    setActiveDropdown(null);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">GoodVote</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <div key={item.label} className="relative group">
                <button
                  className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
                  onClick={() => toggleDropdown(item.label)}
                >
                  {item.label}
                  <ChevronDown className="ml-1 h-4 w-4" />
                </button>
                
                {/* Desktop Dropdown */}
                {item.children && (
                  <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={closeDropdowns}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Search and Actions */}
          <div className="flex items-center space-x-4">
            {/* Search Button */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 text-gray-400 hover:text-gray-500"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Quick Actions */}
            <div className="hidden sm:flex items-center space-x-4">
              <Link
                href="/search"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Search
              </Link>
              <Link
                href="/about/donate"
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Donate
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 text-gray-400 hover:text-gray-500"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Search Overlay */}
        {isSearchOpen && (
          <div className="border-t border-gray-200 py-4">
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search GoodVote..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Popular searches: Donald Trump, Microsoft, Planned Parenthood
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
            {navigation.map((item) => (
              <div key={item.label}>
                <button
                  onClick={() => toggleDropdown(item.label)}
                  className="flex items-center justify-between w-full px-3 py-2 text-left text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                >
                  {item.label}
                  <ChevronDown className="h-4 w-4" />
                </button>
                
                {activeDropdown === item.label && item.children && (
                  <div className="pl-4 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {/* Mobile Quick Actions */}
            <div className="pt-4 border-t border-gray-200">
              <Link
                href="/search"
                className="block px-3 py-2 text-base font-medium text-blue-600 hover:text-blue-500"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Search
              </Link>
              <Link
                href="/about/donate"
                className="block px-3 py-2 text-base font-medium text-blue-600 hover:text-blue-500"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Donate
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
} 