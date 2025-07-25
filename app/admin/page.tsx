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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-800 font-medium">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="mb-4">
            <span className="text-5xl">👑</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2" style={{ color: 'var(--primary)' }}>
            Tableau de Bord Admin
          </h1>
          <p className="text-amber-700 text-lg mb-4">Gestion des invités et des places</p>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent w-32"></div>
            <span className="text-amber-600">💍</span>
            <div className="h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent w-32"></div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="wedding-card p-6 text-center transform hover:scale-105 transition-transform duration-200">
            <div className="text-3xl mb-2" style={{ color: 'var(--secondary)' }}>👥</div>
            <p className="text-sm text-gray-600 mb-1">Total Invités</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--primary)' }}>{stats.total}</p>
          </div>
          <div className="wedding-card p-6 text-center transform hover:scale-105 transition-transform duration-200 border-2 border-green-200">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm text-gray-600 mb-1">Confirmés</p>
            <p className="text-3xl font-bold text-green-600">{stats.confirmed}</p>
          </div>
          <div className="wedding-card p-6 text-center transform hover:scale-105 transition-transform duration-200 border-2 border-red-200">
            <div className="text-3xl mb-2">❌</div>
            <p className="text-sm text-gray-600 mb-1">Déclinés</p>
            <p className="text-3xl font-bold text-red-600">{stats.declined}</p>
          </div>
          <div className="wedding-card p-6 text-center transform hover:scale-105 transition-transform duration-200 border-2 border-yellow-200">
            <div className="text-3xl mb-2">⏳</div>
            <p className="text-sm text-gray-600 mb-1">En attente</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="wedding-card p-6 text-center transform hover:scale-105 transition-transform duration-200 border-2 border-blue-200">
            <div className="text-3xl mb-2">📍</div>
            <p className="text-sm text-gray-600 mb-1">Présents</p>
            <p className="text-3xl font-bold text-blue-600">{stats.checkedIn}</p>
          </div>
        </div>

        {/* Add Guest Form */}
        <div className="wedding-card p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--primary)' }}>
            Ajouter un Nouvel Invité
          </h2>
          <form onSubmit={addGuest} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="Nom complet"
              value={newGuest.name}
              onChange={(e) => setNewGuest({...newGuest, name: e.target.value})}
              className="wedding-input"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={newGuest.email}
              onChange={(e) => setNewGuest({...newGuest, email: e.target.value})}
              className="wedding-input"
              required
            />
            <input
              type="tel"
              placeholder="Téléphone (optionnel)"
              value={newGuest.phone}
              onChange={(e) => setNewGuest({...newGuest, phone: e.target.value})}
              className="wedding-input"
            />
            <input
              type="text"
              placeholder="Code d'invitation"
              value={newGuest.invitation_code}
              onChange={(e) => setNewGuest({...newGuest, invitation_code: e.target.value})}
              className="wedding-input"
              required
            />
            <button
              type="submit"
              className="wedding-button gold-gradient text-white font-semibold hover:shadow-lg"
            >
              Ajouter l'invité
            </button>
          </form>
        </div>

        {/* Filter Section */}
        <div className="mb-6 flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => setFilter('all')}
            className={`wedding-button text-sm ${filter === 'all' ? 'gold-gradient text-white' : 'bg-amber-100 text-amber-800'}`}
          >
            Tous ({stats.total})
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`wedding-button text-sm ${filter === 'confirmed' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800'}`}
          >
            Confirmés ({stats.confirmed})
          </button>
          <button
            onClick={() => setFilter('declined')}
            className={`wedding-button text-sm ${filter === 'declined' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800'}`}
          >
            Déclinés ({stats.declined})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`wedding-button text-sm ${filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800'}`}
          >
            En attente ({stats.pending})
          </button>
          <button
            onClick={() => setFilter('checkedIn')}
            className={`wedding-button text-sm ${filter === 'checkedIn' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}
          >
            Présents ({stats.checkedIn})
          </button>
        </div>

        {/* Guests List */}
        <div className="wedding-card">
          <div className="p-6 border-b border-amber-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                Liste des Invités
              </h2>
              <div className="relative w-full md:w-64">
                <input
                  type="text"
                  placeholder="Rechercher un invité..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="wedding-input pl-10 text-sm"
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-600">
                  🔍
                </span>
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
                <p className="p-6 text-center text-gray-500">Aucun invité trouvé</p>
              ) : (
                <div className="divide-y divide-amber-100">
                  {filteredGuests.map((guest) => (
                  <div key={guest.id} className="p-4 hover:bg-amber-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg" style={{ color: 'var(--primary)' }}>
                          {guest.name}
                          {guest.plus_ones > 0 && (
                            <span className="text-sm text-amber-600 ml-2">+{guest.plus_ones}</span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600">{guest.email}</p>
                        <p className="text-xs font-mono text-amber-700 mt-1">Code: {guest.invitation_code}</p>
                      </div>
                      <button
                        onClick={() => deleteGuest(guest.id)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        Supprimer
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full
                        ${guest.rsvp_status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                          guest.rsvp_status === 'declined' ? 'bg-red-100 text-red-800' : 
                          'bg-amber-100 text-amber-800'}`}>
                        {guest.rsvp_status === 'confirmed' ? 'Confirmé' :
                         guest.rsvp_status === 'declined' ? 'Décliné' : 'En attente'}
                      </span>
                      {guest.seating_assignments && guest.seating_assignments[0] ? (
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          Table {guest.seating_assignments[0].tables.table_number}, Place {guest.seating_assignments[0].seat_number}
                        </span>
                      ) : (
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                          Non assigné
                        </span>
                      )}
                      {guest.seating_assignments && guest.seating_assignments[0]?.checked_in && (
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
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
              <thead className="bg-amber-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
                    Nom
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
                    Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
                    Statut
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
                    Table/Place
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-amber-100">
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
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        Aucun invité trouvé
                      </td>
                    </tr>
                  ) : (
                    filteredGuests.map((guest) => (
                    <tr key={guest.id} className="hover:bg-amber-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium" style={{ color: 'var(--text-dark)' }}>
                          {guest.name}
                        </span>
                        {guest.plus_ones > 0 && (
                          <span className="text-sm text-amber-600 ml-2">+{guest.plus_ones}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {guest.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-amber-700">
                        {guest.invitation_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${guest.rsvp_status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                            guest.rsvp_status === 'declined' ? 'bg-red-100 text-red-800' : 
                            'bg-amber-100 text-amber-800'}`}>
                          {guest.rsvp_status === 'confirmed' ? 'Confirmé' :
                           guest.rsvp_status === 'declined' ? 'Décliné' : 'En attente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {guest.seating_assignments && guest.seating_assignments[0] ? (
                          <div>
                            <span style={{ color: 'var(--text-dark)' }}>
                              Table {guest.seating_assignments[0].tables.table_number}, 
                              Place {guest.seating_assignments[0].seat_number}
                            </span>
                            {guest.seating_assignments[0].checked_in && (
                              <span className="ml-2 text-green-600 font-medium">✓ Présent</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Non assigné</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
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
        <div className="my-12 flex items-center justify-center">
          <div className="h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent w-full"></div>
        </div>

        {/* Quick Actions */}
        <div className="wedding-card p-6">
          <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--primary)' }}>
            Actions Rapides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.print()}
              className="wedding-button bg-amber-100 text-amber-800 hover:bg-amber-200 flex items-center justify-center gap-2"
            >
              <span>📄</span> Imprimer la liste
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
              className="wedding-button bg-green-100 text-green-800 hover:bg-green-200 flex items-center justify-center gap-2"
            >
              <span>📊</span> Exporter CSV
            </button>
            <button
              onClick={fetchData}
              className="wedding-button bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center justify-center gap-2"
            >
              <span>🔄</span> Actualiser
            </button>
          </div>
        </div>

        {/* Table Management Section */}
        <div className="mt-8 wedding-card p-6">
          <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--primary)' }}>
            Gestion des Tables
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => {
              const assignedSeats = guests.filter(g => 
                g.seating_assignments?.[0]?.table_id === table.id
              ).length
              const availableSeats = table.capacity - assignedSeats
              
              return (
                <div key={table.id} className="border-2 border-amber-200 rounded-lg p-4 hover:border-amber-400 transition-colors">
                  <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--primary)' }}>
                    Table {table.table_number}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    {table.description || 'Aucune description'}
                  </p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-sm">
                      <span className="font-semibold">{assignedSeats}</span>/{table.capacity} places
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
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

        {/* Footer */}
        <div className="mt-16 pb-8 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent w-32"></div>
            <span className="text-2xl">💒</span>
            <div className="h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent w-32"></div>
          </div>
          <p className="text-amber-600 text-sm">
            Tableau de bord administratif du mariage
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .wedding-button,
          button {
            display: none !important;
          }
          .wedding-card {
            box-shadow: none !important;
            border: 1px solid #ddd !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  )
}