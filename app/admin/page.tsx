'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminPage() {
  const [guests, setGuests] = useState<any[]>([])
  const [tables, setTables] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newGuest, setNewGuest] = useState({
    name: '',
    email: '',
    phone: '',
    invitation_code: ''
  })
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    declined: 0,
    pending: 0,
    checkedIn: 0
  })
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [activeTab, setActiveTab] = useState<'guests' | 'tables'>('guests')
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (!supabase) {
        console.error('Supabase not configured')
        return
      }

      // Fetch guests with their seating assignments
      const { data: guestsData } = await supabase
        .from('guests')
        .select(`
          *,
          seating_assignments (
            *,
            tables (*)
          )
        `)
        .order('name')

      // Fetch tables
      const { data: tablesData } = await supabase
        .from('tables')
        .select('*')
        .order('table_number')

      // Calculate stats
      if (guestsData) {
        setGuests(guestsData)
        
        const stats = {
          total: guestsData.length,
          confirmed: guestsData.filter(g => g.rsvp_status === 'confirmed').length,
          declined: guestsData.filter(g => g.rsvp_status === 'declined').length,
          pending: guestsData.filter(g => g.rsvp_status === 'pending').length,
          checkedIn: guestsData.filter(g => 
            g.seating_assignments && g.seating_assignments[0]?.checked_in
          ).length
        }
        setStats(stats)
      }

      if (tablesData) {
        setTables(tablesData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!supabase) {
      alert('Supabase not configured')
      return
    }
    
    try {
      const { error } = await supabase
        .from('guests')
        .insert({
          ...newGuest,
          invitation_code: newGuest.invitation_code.toUpperCase()
        })

      if (error) throw error

      setNewGuest({ name: '', email: '', phone: '', invitation_code: '' })
      fetchData()
    } catch (error: any) {
      alert(error.message)
    }
  }

  const deleteGuest = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet invité ?')) return

    if (!supabase) {
      alert('Supabase not configured')
      return
    }

    try {
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchData()
    } catch (error: any) {
      alert(error.message)
    }
  }

  const assignSeat = async (guestId: string, tableId: number, seatNumber: number) => {
    if (!supabase) {
      alert('Supabase not configured')
      return
    }

    try {
      // Check if seat is available
      const { data: existing } = await supabase
        .from('seating_assignments')
        .select('*')
        .eq('table_id', tableId)
        .eq('seat_number', seatNumber)
        .single()

      if (existing) {
        alert('Cette place est déjà occupée !')
        return
      }

      // Delete existing assignment if any
      await supabase
        .from('seating_assignments')
        .delete()
        .eq('guest_id', guestId)

      // Create new assignment
      const { error } = await supabase
        .from('seating_assignments')
        .insert({
          guest_id: guestId,
          table_id: tableId,
          seat_number: seatNumber
        })

      if (error) throw error
      fetchData()
    } catch (error: any) {
      alert(error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="elegant-card p-12 text-center animate-fadeInScale">
          <div className="elegant-spinner w-12 h-12 mx-auto mb-6" />
          <p className="text-lg font-semibold text-gray-700">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Elegant Header */}
        <div className="text-center mb-12 animate-fadeInUp">
          <div className="mb-8">
            <div className="decorative-divider">
              <div className="decorative-icon">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                </svg>
              </div>
            </div>
            <h1 className="responsive-heading font-bold text-gray-800 mb-4">
              Tableau de Bord Admin
            </h1>
            <p className="responsive-body text-gray-600 mb-6">
              Gestion des invités et des places
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent w-32"></div>
              <span className="text-2xl">💍</span>
              <div className="h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent w-32"></div>
            </div>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          <div className="elegant-card p-6 text-center transform hover:scale-105 transition-all duration-300 animate-fadeInUp">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">Total Invités</p>
            <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="elegant-card p-6 text-center transform hover:scale-105 transition-all duration-300 animate-fadeInUp" style={{animationDelay: '0.1s'}}>
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">Confirmés</p>
            <p className="text-3xl font-bold text-green-600">{stats.confirmed}</p>
          </div>
          <div className="elegant-card p-6 text-center transform hover:scale-105 transition-all duration-300 animate-fadeInUp" style={{animationDelay: '0.2s'}}>
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">Déclinés</p>
            <p className="text-3xl font-bold text-red-600">{stats.declined}</p>
          </div>
          <div className="elegant-card p-6 text-center transform hover:scale-105 transition-all duration-300 animate-fadeInUp" style={{animationDelay: '0.3s'}}>
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">⏳</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">En attente</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="elegant-card p-6 text-center transform hover:scale-105 transition-all duration-300 animate-fadeInUp" style={{animationDelay: '0.4s'}}>
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📍</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">Présents</p>
            <p className="text-3xl font-bold text-purple-600">{stats.checkedIn}</p>
          </div>
        </div>

        {/* Add Guest Form */}
        <div className="elegant-card p-8 mb-12 animate-fadeInUp" style={{animationDelay: '0.5s'}}>
          <h2 className="responsive-subheading font-bold mb-8 text-gray-800">
            Ajouter un Nouvel Invité
          </h2>
          <form onSubmit={addGuest} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <input
              type="text"
              placeholder="Nom complet"
              value={newGuest.name}
              onChange={(e) => setNewGuest({...newGuest, name: e.target.value})}
              className="elegant-input"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={newGuest.email}
              onChange={(e) => setNewGuest({...newGuest, email: e.target.value})}
              className="elegant-input"
              required
            />
            <input
              type="tel"
              placeholder="Téléphone (optionnel)"
              value={newGuest.phone}
              onChange={(e) => setNewGuest({...newGuest, phone: e.target.value})}
              className="elegant-input"
            />
            <input
              type="text"
              placeholder="Code d'invitation"
              value={newGuest.invitation_code}
              onChange={(e) => setNewGuest({...newGuest, invitation_code: e.target.value})}
              className="elegant-input"
              required
            />
            <button
              type="submit"
              className="elegant-button font-semibold"
            >
              Ajouter l'invité
            </button>
          </form>
        </div>

        {/* Filter Section */}
        <div className="mb-8 flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => setFilter('all')}
            className={`elegant-button text-sm ${filter === 'all' ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Tous ({stats.total})
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`elegant-button text-sm ${filter === 'confirmed' ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
          >
            Confirmés ({stats.confirmed})
          </button>
          <button
            onClick={() => setFilter('declined')}
            className={`elegant-button text-sm ${filter === 'declined' ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
          >
            Déclinés ({stats.declined})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`elegant-button text-sm ${filter === 'pending' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
          >
            En attente ({stats.pending})
          </button>
          <button
            onClick={() => setFilter('checkedIn')}
            className={`elegant-button text-sm ${filter === 'checkedIn' ? 'bg-gradient-to-r from-purple-500 to-purple-600' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
          >
            Présents ({stats.checkedIn})
          </button>
        </div>

        {/* Guests List */}
        <div className="elegant-card animate-fadeInUp" style={{animationDelay: '0.6s'}}>
          <div className="p-8 border-b border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <h2 className="responsive-subheading font-bold text-gray-800">
                Liste des Invités
              </h2>
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  placeholder="Rechercher un invité..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="elegant-input pl-12 text-sm"
                />
                <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Mobile View */}
          <div className="block md:hidden">
            {(() => {
              const filteredGuests = guests.filter(guest => {
                // Apply status filter
                let passesFilter = true
                if (filter === 'confirmed') passesFilter = guest.rsvp_status === 'confirmed'
                else if (filter === 'declined') passesFilter = guest.rsvp_status === 'declined'
                else if (filter === 'pending') passesFilter = guest.rsvp_status === 'pending'
                else if (filter === 'checkedIn') passesFilter = guest.seating_assignments?.[0]?.checked_in
                
                // Apply search filter
                const searchLower = searchTerm.toLowerCase()
                const passesSearch = searchTerm === '' || 
                  guest.name.toLowerCase().includes(searchLower) ||
                  guest.email.toLowerCase().includes(searchLower) ||
                  guest.invitation_code.toLowerCase().includes(searchLower)
                
                return passesFilter && passesSearch
              })
              
              return filteredGuests.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-lg">Aucun invité trouvé</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredGuests.map((guest) => (
                  <div key={guest.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-800 mb-2">
                          {guest.name}
                          {guest.plus_ones > 0 && (
                            <span className="ml-2 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                              +{guest.plus_ones}
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600 mb-1">{guest.email}</p>
                        <p className="text-xs font-mono text-amber-700">Code: {guest.invitation_code}</p>
                      </div>
                      <button
                        onClick={() => deleteGuest(guest.id)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`status-badge ${
                        guest.rsvp_status === 'confirmed' ? 'status-confirmed' : 
                        guest.rsvp_status === 'declined' ? 'status-declined' : 
                        'status-pending'
                      }`}>
                        {guest.rsvp_status === 'confirmed' ? 'Confirmé' :
                         guest.rsvp_status === 'declined' ? 'Décliné' : 'En attente'}
                      </span>
                      {guest.seating_assignments && guest.seating_assignments[0] ? (
                        <span className="status-badge status-checked-in">
                          Table {guest.seating_assignments[0].tables.table_number}, Place {guest.seating_assignments[0].seat_number}
                        </span>
                      ) : (
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                          Non assigné
                        </span>
                      )}
                      {guest.seating_assignments && guest.seating_assignments[0]?.checked_in && (
                        <span className="status-badge status-confirmed">
                          ✓ Présent
                        </span>
                      )}
                    </div>
                  </div>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-8 py-6 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Nom
                  </th>
                  <th className="px-8 py-6 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Email
                  </th>
                  <th className="px-8 py-6 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Code
                  </th>
                  <th className="px-8 py-6 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Statut
                  </th>
                  <th className="px-8 py-6 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Table/Place
                  </th>
                  <th className="px-8 py-6 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {(() => {
                  const filteredGuests = guests.filter(guest => {
                    // Apply status filter
                    let passesFilter = true
                    if (filter === 'confirmed') passesFilter = guest.rsvp_status === 'confirmed'
                    else if (filter === 'declined') passesFilter = guest.rsvp_status === 'declined'
                    else if (filter === 'pending') passesFilter = guest.rsvp_status === 'pending'
                    else if (filter === 'checkedIn') passesFilter = guest.seating_assignments?.[0]?.checked_in
                    
                    // Apply search filter
                    const searchLower = searchTerm.toLowerCase()
                    const passesSearch = searchTerm === '' || 
                      guest.name.toLowerCase().includes(searchLower) ||
                      guest.email.toLowerCase().includes(searchLower) ||
                      guest.invitation_code.toLowerCase().includes(searchLower)
                    
                    return passesFilter && passesSearch
                  })
                  
                  return filteredGuests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-16 text-center text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <p className="text-lg">Aucun invité trouvé</p>
                      </td>
                    </tr>
                  ) : (
                    filteredGuests.map((guest) => (
                    <tr key={guest.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-8 py-6 whitespace-nowrap">
                        <span className="font-semibold text-gray-800">
                          {guest.name}
                        </span>
                        {guest.plus_ones > 0 && (
                          <span className="ml-2 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                            +{guest.plus_ones}
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap text-sm text-gray-600">
                        {guest.email}
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap text-sm font-mono text-amber-700">
                        {guest.invitation_code}
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap">
                        <span className={`status-badge ${
                          guest.rsvp_status === 'confirmed' ? 'status-confirmed' : 
                          guest.rsvp_status === 'declined' ? 'status-declined' : 
                          'status-pending'
                        }`}>
                          {guest.rsvp_status === 'confirmed' ? 'Confirmé' :
                           guest.rsvp_status === 'declined' ? 'Décliné' : 'En attente'}
                        </span>
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap text-sm">
                        {guest.seating_assignments && guest.seating_assignments[0] ? (
                          <div>
                            <span className="text-gray-800">
                              Table {guest.seating_assignments[0].tables.table_number}, 
                              Place {guest.seating_assignments[0].seat_number}
                            </span>
                            {guest.seating_assignments[0].checked_in && (
                              <span className="ml-2 status-badge status-confirmed">✓ Présent</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Non assigné</span>
                        )}
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap text-sm">
                        <button
                          onClick={() => deleteGuest(guest.id)}
                          className="text-red-600 hover:text-red-800 font-medium transition-colors"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                    ))
                  )
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section Divider */}
        <div className="my-16 flex items-center justify-center">
          <div className="h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent w-full"></div>
        </div>

        {/* Quick Actions */}
        <div className="elegant-card p-8 mb-12 animate-fadeInUp" style={{animationDelay: '0.7s'}}>
          <h2 className="responsive-subheading font-bold mb-8 text-gray-800">
            Actions Rapides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => window.print()}
              className="elegant-button-secondary flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimer la liste
            </button>
            <button
              onClick={() => {
                const csvContent = "data:text/csv;charset=utf-8," + 
                  "Nom,Email,Code,Statut,Table,Place\n" +
                  guests.map(g => 
                    `${g.name},${g.email},${g.invitation_code},${g.rsvp_status === 'confirmed' ? 'Confirmé' : g.rsvp_status === 'declined' ? 'Décliné' : 'En attente'},${g.seating_assignments?.[0]?.tables.table_number || 'N/A'},${g.seating_assignments?.[0]?.seat_number || 'N/A'}`
                  ).join("\n")
                const encodedUri = encodeURI(csvContent)
                const link = document.createElement("a")
                link.setAttribute("href", encodedUri)
                link.setAttribute("download", `invites_mariage_${new Date().toISOString().split('T')[0]}.csv`)
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }}
              className="elegant-button flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Exporter CSV
            </button>
            <button
              onClick={fetchData}
              className="elegant-button-secondary flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualiser
            </button>
          </div>
        </div>

        {/* Table Management Section */}
        <div className="elegant-card p-8 mb-12 animate-fadeInUp" style={{animationDelay: '0.8s'}}>
          <h2 className="responsive-subheading font-bold mb-8 text-gray-800">
            Gestion des Tables
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tables.map((table) => {
              const assignedSeats = guests.filter(g => 
                g.seating_assignments?.[0]?.table_id === table.id
              ).length
              const availableSeats = table.capacity - assignedSeats
              
              return (
                <div key={table.id} className="border-2 border-amber-200 rounded-2xl p-6 hover:border-amber-400 transition-all duration-300 hover:shadow-lg">
                  <h3 className="font-bold text-xl mb-3 text-gray-800">
                    Table {table.table_number}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {table.description || 'Aucune description'}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">
                      {assignedSeats}/{table.capacity} places
                    </span>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      availableSeats === 0 ? 'bg-red-100 text-red-800' :
                      availableSeats <= 2 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {availableSeats === 0 ? 'Complète' :
                       `${availableSeats} ${availableSeats === 1 ? 'place libre' : 'places libres'}`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>


      </div>
    </div>
  )
}