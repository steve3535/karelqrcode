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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Wedding Guest Manager Header */}
        <div className="bg-gradient-to-r from-pink-400 to-pink-500 text-white p-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            <h1 className="text-3xl font-bold">Wedding Guest Manager</h1>
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <p className="text-lg opacity-90">Elegant RSVP & check-in management for your special day</p>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 animate-fadeInUp">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Total Guests</h3>
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-800 mb-2">{stats.total}</div>
          </div>

          <div className="bg-pink-500 rounded-lg shadow-md p-6 text-center text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Confirmed</h3>
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold mb-2">{stats.confirmed}</div>
            <p className="text-sm opacity-90">{stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0}% response rate</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Pending</h3>
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-800 mb-2">{stats.pending}</div>
          </div>

          <div className="bg-yellow-400 rounded-lg shadow-md p-6 text-center text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Checked In</h3>
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold mb-2">{stats.checkedIn}</div>
            <p className="text-sm opacity-90">{stats.confirmed > 0 ? Math.round((stats.checkedIn / stats.confirmed) * 100) : 0}% attendance</p>
          </div>
        </div>

        {/* Guest Management Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mx-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Guest Management</h2>
          
          {/* Control Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Search guests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <div className="flex items-center gap-3">
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="all">All Guests</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="declined">Declined</option>
                <option value="checkedIn">Checked In</option>
              </select>
              
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Guest
              </button>
            </div>
          </div>

          {/* Add Guest Form */}
          {showMobileMenu && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Guest</h3>
              <form onSubmit={addGuest} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newGuest.name}
                  onChange={(e) => setNewGuest({...newGuest, name: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newGuest.email}
                  onChange={(e) => setNewGuest({...newGuest, email: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Invitation Code"
                  value={newGuest.invitation_code}
                  onChange={(e) => setNewGuest({...newGuest, invitation_code: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
                <button
                  type="submit"
                  className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors"
                >
                  Add Guest
                </button>
              </form>
            </div>
          )}
          
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
                  <p className="text-lg">No guests found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGuests.map((guest) => (
                    <div key={guest.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-800 mb-1">
                            {guest.name}
                          </h3>
                          {guest.plus_ones > 0 && (
                            <p className="text-sm text-gray-600 mb-2">+ {guest.plus_ones > 1 ? `${guest.plus_ones} guests` : '1 guest'}</p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteGuest(guest.id)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <p className="text-sm text-gray-600">{guest.email}</p>
                        {guest.phone && (
                          <p className="text-sm text-gray-600">{guest.phone}</p>
                        )}
                        <p className="text-xs font-mono text-gray-500">Code: {guest.invitation_code}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          guest.rsvp_status === 'confirmed' ? 'bg-pink-100 text-pink-700' : 
                          guest.rsvp_status === 'declined' ? 'bg-red-100 text-red-700' : 
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {guest.rsvp_status === 'confirmed' ? '✓ confirmed' :
                           guest.rsvp_status === 'declined' ? 'declined' : 'pending'}
                        </span>
                        {guest.seating_assignments && guest.seating_assignments[0]?.checked_in && (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">
                            ✓ Checked In
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-4">
                        {guest.seating_assignments && guest.seating_assignments[0] ? (
                          <p>Table: {guest.seating_assignments[0].tables.table_number}</p>
                        ) : (
                          <p className="text-gray-400">No table assigned</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button className="bg-pink-500 text-white px-3 py-1 rounded text-sm hover:bg-pink-600 transition-colors">
                          Edit
                        </button>
                        <button className="bg-pink-500 text-white px-3 py-1 rounded text-sm hover:bg-pink-600 transition-colors">
                          QR Code
                        </button>
                        <button className="bg-yellow-400 text-white px-3 py-1 rounded text-sm hover:bg-yellow-500 transition-colors">
                          Check
                        </button>
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