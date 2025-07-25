'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Navigation() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navItems = [
    { href: '/', label: 'RSVP', icon: '💌' },
    { href: '/scan', label: 'Scanner', icon: '📱' },
    { href: '/admin', label: 'Admin', icon: '👑' },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-gold-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <span className="text-white text-lg">💒</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-playfair font-bold text-gray-800">
                Notre Mariage
              </h1>
              <p className="text-xs text-gray-500">RSVP & Gestion</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-4 py-2 rounded-xl font-medium transition-all duration-300 group ${
                  isActive(item.href)
                    ? 'bg-gradient-to-r from-rose-500 to-gold-500 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </span>
                {isActive(item.href) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-rose-500 to-gold-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
                )}
              </Link>
            ))}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200/50 bg-white/95 backdrop-blur-md">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-3 py-2 rounded-xl font-medium transition-all duration-300 ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-rose-500 to-gold-500 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center space-x-3">
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
} 