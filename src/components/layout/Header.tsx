'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, Menu, X, ChevronDown } from 'lucide-react';
import { NavigationItem } from '@/types';
import { useRouter } from 'next/navigation';

const navigation: NavigationItem[] = [
  { label: 'Current Candidates', href: '/candidates' },
  { label: 'Incumbents', href: '/house-districts' },
  { label: 'Israel Funding', href: '/israel-funding' },
  {
    label: 'Learn',
    href: '/learn',
    children: [
      { label: 'Explore Campaign Data', href: '/learn/explore-campaign-data' },
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
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleDropdown = (label: string) => {
    setActiveDropdown(activeDropdown === label ? null : label);
  };

  const closeDropdowns = () => {
    setActiveDropdown(null);
  };

  // Fetch suggestions when typing
  useEffect(() => {
    let active = true;
    const fetchSuggestions = async () => {
      const q = searchTerm.trim();
      if (q.length < 2) {
        if (active) setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (active && data.success) {
          setSuggestions(Array.isArray(data.data) ? data.data : []);
        }
      } catch {
        if (active) setSuggestions([]);
      }
    };
    fetchSuggestions();
    return () => {
      active = false;
    };
  }, [searchTerm]);

  useEffect(() => {
    if (isSearchOpen) {
      // focus input when opening search
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearchTerm('');
      setSuggestions([]);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  }, [isSearchOpen]);

  const navigateToSearch = (term: string) => {
    const q = term.trim();
    if (!q) return;
    setIsSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Escape') {
      setIsSearchOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowSuggestions(true);
      setHighlightedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, -1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        navigateToSearch(suggestions[highlightedIndex]);
      } else {
        navigateToSearch(searchTerm);
      }
    }
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
                {item.children ? (
                  <>
                    <button
                      className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
                      onClick={() => toggleDropdown(item.label)}
                    >
                      {item.label}
                      <ChevronDown className="ml-1 h-4 w-4" />
                    </button>
                    {/* Desktop Dropdown */}
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
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* Search and Mobile Menu */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 text-gray-400 hover:text-gray-500"
            >
              <Search className="h-5 w-5" />
            </button>

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
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search politicians, committees, donors..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />

                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-auto">
                    {suggestions.map((s, idx) => (
                      <button
                        key={`${s}-${idx}`}
                        className={`w-full text-left px-3 py-2 text-sm ${idx === highlightedIndex ? 'bg-blue-50' : 'bg-white'} hover:bg-blue-50`}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          navigateToSearch(s);
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Press Enter to search • Arrow keys to navigate • Esc to close
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
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleDropdown(item.label)}
                      className="flex items-center justify-between w-full px-3 py-2 text-left text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    >
                      {item.label}
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    {activeDropdown === item.label && (
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
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
            
            {/* Mobile Quick Actions removed per design */}
          </div>
        </div>
      )}
    </header>
  );
} 