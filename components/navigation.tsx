'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 text-gray-800 hover:text-pink-500 transition-colors">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
            <span className="font-semibold">Wedding RSVP</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pathname === '/' 
                  ? 'bg-pink-500 text-white' 
                  : 'text-gray-600 hover:text-pink-500'
              }`}
            >
              RSVP
            </Link>
            <Link 
              href="/scan"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pathname === '/scan' 
                  ? 'bg-pink-500 text-white' 
                  : 'text-gray-600 hover:text-pink-500'
              }`}
            >
              Scanner
            </Link>
            <Link 
              href="/admin"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pathname === '/admin' 
                  ? 'bg-pink-500 text-white' 
                  : 'text-gray-600 hover:text-pink-500'
              }`}
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}