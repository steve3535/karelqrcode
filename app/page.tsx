'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')
  const [stats, setStats] = useState({
    totalGuests: 0,
    assignedSeats: 0,
    availableSeats: 0,
    checkedIn: 0
  })

  useEffect(() => {
    // Vérifier si déjà authentifié dans la session
    const auth = sessionStorage.getItem('wedding_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
    // Charger les statistiques
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      // Compter les invités
      const { count: guestCount } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })

      // Compter les places assignées (tables adultes uniquement)
      const { count: assignedCount } = await supabase
        .from('seating_assignments')
        .select('*', { count: 'exact', head: true })
        .lte('table_id', 26)  // Ne compter que les tables adultes

      // Compter les invités présents
      const { count: checkedInCount } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('checked_in', true)

      // Récupérer la capacité totale RÉELLE depuis la base de données (tables adultes: 1-26 + 28)
      const { data: tables } = await supabase
        .from('tables')
        .select('capacity')
        .neq('table_number', 27)  // Exclure uniquement la table 27 (MYOSOTIS - enfants)

      const totalCapacity = tables?.reduce((sum, table) => sum + table.capacity, 0) || 260
      
      setStats({
        totalGuests: guestCount || 0,
        assignedSeats: assignedCount || 0,
        availableSeats: totalCapacity - (assignedCount || 0),
        checkedIn: checkedInCount || 0
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (accessCode.toUpperCase() === 'KRL2025') {
      setIsAuthenticated(true)
      sessionStorage.setItem('wedding_auth', 'true')
      setError('')
    } else {
      setError('Code incorrect. Veuillez réessayer.')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                Accès Sécurisé
              </h1>
              <p className="text-gray-600">Mariage Karel & Lambert</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  Code d'accès
                </label>
                <input
                  type="password"
                  id="code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Entrez le code d'accès"
                  required
                />
              </div>
              
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
              >
                Accéder
              </button>
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>Accès réservé aux organisateurs</p>
            </div>
            
            {/* Statistiques en temps réel */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-600">{stats.availableSeats}</p>
                  <p className="text-xs text-gray-600">Places libres</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-purple-600">{stats.assignedSeats}</p>
                  <p className="text-xs text-gray-600">Places occupées</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    sessionStorage.removeItem('wedding_auth')
    setIsAuthenticated(false)
    setAccessCode('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      {/* Bouton de déconnexion */}
      <div className="max-w-6xl mx-auto mb-4 flex justify-end">
        <button
          onClick={handleLogout}
          className="bg-white text-gray-600 px-4 py-2 rounded-lg shadow hover:shadow-lg transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Déconnexion
        </button>
      </div>
      
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Système de Gestion des Places
          </h1>
          <p className="text-gray-600 text-lg">Mariage Karel & Lambert</p>
        </div>

        {/* Navigation Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Admin Card - Détection automatique desktop/mobile */}
          <Link 
            href="/admin/seating" 
            className="group"
            onClick={(e) => {
              // Si on est sur mobile, aller directement à la version mobile v2
              if (typeof window !== 'undefined' && window.innerWidth <= 768) {
                e.preventDefault()
                window.location.href = '/admin/seating-mobile-v2'
              }
            }}
          >
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all transform hover:scale-105 cursor-pointer border-2 border-transparent hover:border-purple-500">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Gestion des Places</h2>
                <p className="text-gray-600 mb-4">Interface d'administration pour gérer les attributions de places</p>
                <div className="space-y-2 text-sm text-left w-full">
                  <div className="flex items-center text-gray-500">
                  </div>
                  <div className="flex items-center text-gray-500">
                  </div>
                  <div className="flex items-center text-gray-500">
                  </div>
                </div>
                <div className="mt-6 px-6 py-2 bg-purple-100 text-purple-700 rounded-full font-medium group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  Accéder →
                </div>
              </div>
            </div>
          </Link>

          {/* Scanner Card */}
          <Link href="/scan-v2" className="group">
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all transform hover:scale-105 cursor-pointer border-2 border-transparent hover:border-pink-500">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Scanner QR Code</h2>
                <p className="text-gray-600 mb-4">Interface pour l'hôtesse d'accueil le jour J</p>
                <div className="space-y-2 text-sm text-left w-full">
                  <div className="flex items-center text-gray-500">
                  </div>
                  <div className="flex items-center text-gray-500">
                  </div>
                  <div className="flex items-center text-gray-500">
                  </div>
                </div>
                <div className="mt-6 px-6 py-2 bg-pink-100 text-pink-700 rounded-full font-medium group-hover:bg-pink-600 group-hover:text-white transition-colors">
                  Accéder →
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Stats Footer - Données en temps réel */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-purple-600">{stats.totalGuests}</p>
              <p className="text-gray-600">Invités</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-pink-600">26</p>
              <p className="text-gray-600">Tables</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">{stats.availableSeats}</p>
              <p className="text-gray-600">Places libres</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-600">{stats.checkedIn}</p>
              <p className="text-gray-600">Présents</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}