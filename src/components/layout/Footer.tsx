import Link from 'next/link';
import { Mail, Twitter, Facebook, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-semibold mb-4">GoodVote</h3>
            <p className="text-gray-300 mb-4">
              Tracking money in U.S. politics. GoodVote provides comprehensive campaign finance 
              data and analysis to promote transparency in our democracy.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Data & Tools</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/politicians/congress" className="text-gray-300 hover:text-white">
                  Members of Congress
                </Link>
              </li>
              <li>
                <Link href="/elections/overview" className="text-gray-300 hover:text-white">
                  Election Overview
                </Link>
              </li>
              <li>
                <Link href="/lobbying/pacs" className="text-gray-300 hover:text-white">
                  PACs
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-gray-300 hover:text-white">
                  Search
                </Link>
              </li>
              <li>
                <Link href="/learn/api" className="text-gray-300 hover:text-white">
                  API
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about/donate" className="text-gray-300 hover:text-white">
                  Donate
                </Link>
              </li>
              <li>
                <Link href="/about/contact" className="text-gray-300 hover:text-white">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/learn/methodology" className="text-gray-300 hover:text-white">
                  Methodology
                </Link>
              </li>
              <li>
                <Link href="/learn/basics" className="text-gray-300 hover:text-white">
                  Campaign Finance Basics
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-400 mb-4 md:mb-0">
              <p>
                © 2024 GoodVote. Most content available under{' '}
                <a href="#" className="text-blue-400 hover:text-blue-300">
                  Creative Commons license
                </a>
                .
              </p>
              <p className="mt-1">
                Data from Federal Election Commission and other public sources.
              </p>
            </div>
            
            <div className="flex space-x-6 text-sm">
              <Link href="/about/privacy" className="text-gray-400 hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/about/terms" className="text-gray-400 hover:text-white">
                Terms of Use
              </Link>
              <Link href="/about/accessibility" className="text-gray-400 hover:text-white">
                Accessibility
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 