'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminPage() {
  const [guests, setGuests] = useState<any[]>([])
  const [tables, setTables] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
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

      const { data: tablesData } = await supabase
        .from('tables')
        .select('*')
        .order('table_number')

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
      setShowAddForm(false)
      fetchData()
    } catch (error: any) {
      alert(error.message)
    }
  }

  const deleteGuest = async (id: string) => {
    if (!confirm('Are you sure you want to delete this guest?')) return

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

  const filteredGuests = guests.filter(guest => {
    let passesFilter = true
    if (filter === 'confirmed') passesFilter = guest.rsvp_status === 'confirmed'
    else if (filter === 'declined') passesFilter = guest.rsvp_status === 'declined'
    else if (filter === 'pending') passesFilter = guest.rsvp_status === 'pending'
    else if (filter === 'checkedIn') passesFilter = guest.seating_assignments?.[0]?.checked_in

    const searchLower = searchTerm.toLowerCase()
    const passesSearch = !searchTerm || 
      guest.name.toLowerCase().includes(searchLower) ||
      guest.email.toLowerCase().includes(searchLower) ||
      guest.invitation_code.toLowerCase().includes(searchLower)
    
    return passesFilter && passesSearch
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Pink Header */}
      <div className="bg-gradient-to-r from-pink-400 to-pink-500 text-white px-8 py-16 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
          </svg>
          <h1 className="text-4xl font-bold">Wedding Guest Manager</h1>
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        <p className="text-xl opacity-90">Elegant RSVP & check-in management for your special day</p>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Total Guests */}
          <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 text-sm font-medium">Total Guests</h3>
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <div className="text-4xl font-bold text-gray-800">{stats.total}</div>
          </div>

          {/* Confirmed */}
          <div className="bg-gradient-to-br from-pink-400 to-pink-500 text-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white/90 text-sm font-medium">Confirmed</h3>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <div className="text-4xl font-bold mb-1">{stats.confirmed}</div>
            <p className="text-sm opacity-90">{stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0}% response rate</p>
          </div>

          {/* Pending */}
          <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 text-sm font-medium">Pending</h3>
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-4xl font-bold text-gray-800">{stats.pending}</div>
          </div>

          {/* Checked In */}
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white/90 text-sm font-medium">Checked In</h3>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <div className="text-4xl font-bold mb-1">{stats.checkedIn}</div>
            <p className="text-sm opacity-90">{stats.confirmed > 0 ? Math.round((stats.checkedIn / stats.confirmed) * 100) : 0}% attendance</p>
          </div>
        </div>

        {/* Guest Management Section */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Guest Management</h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-pink-500 text-white px-6 py-3 rounded-full font-medium hover:bg-pink-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Guest
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search guests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-6 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white"
            >
              <option value="all">All Guests</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="declined">Declined</option>
              <option value="checkedIn">Checked In</option>
            </select>
          </div>

          {/* Guest Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredGuests.map((guest) => (
              <div key={guest.id} className="bg-gray-50 rounded-2xl p-6 hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{guest.name}</h3>
                    {guest.plus_ones > 0 && (
                      <p className="text-gray-600 text-sm mt-1">+ {guest.plus_ones === 1 ? `${guest.plus_ones} guest` : `${guest.plus_ones} guests`}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {guest.rsvp_status === 'confirmed' && (
                      <span className="bg-pink-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        confirmed
                      </span>
                    )}
                    {guest.rsvp_status === 'pending' && (
                      <span className="bg-gray-300 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                        pending
                      </span>
                    )}
                    {guest.seating_assignments?.[0]?.checked_in && (
                      <span className="bg-yellow-400 text-gray-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        Checked In
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-gray-600 text-sm mb-4">
                  <p>{guest.email}</p>
                  {guest.phone && <p>+{guest.phone}</p>}
                  {guest.seating_assignments?.[0] && (
                    <p className="font-medium text-gray-800">
                      Table: {guest.seating_assignments[0].tables.table_number}
                    </p>
                  )}
                  {guest.dietary_restrictions && (
                    <p>Dietary: {guest.dietary_restrictions}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors flex items-center justify-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button className="flex-1 bg-pink-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-pink-600 transition-colors flex items-center justify-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    QR Code
                  </button>
                  {guest.rsvp_status === 'confirmed' && !guest.seating_assignments?.[0]?.checked_in && (
                    <button className="flex-1 bg-yellow-400 text-gray-800 px-3 py-2 rounded-lg text-sm font-medium hover:bg-yellow-500 transition-colors flex items-center justify-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Check
                    </button>
                  )}
                  {guest.seating_assignments?.[0]?.checked_in && (
                    <button className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors flex items-center justify-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Undo
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredGuests.length === 0 && (
            <div className="text-center py-16">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-gray-500">No guests found</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Guest Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-6">Add New Guest</h3>
            <form onSubmit={addGuest} className="space-y-4">
              <input
                type="text"
                placeholder="Guest Name"
                value={newGuest.name}
                onChange={(e) => setNewGuest({...newGuest, name: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                required
              />
              <input
                type="email"
                placeholder="Email Address"
                value={newGuest.email}
                onChange={(e) => setNewGuest({...newGuest, email: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                required
              />
              <input
                type="tel"
                placeholder="Phone Number (optional)"
                value={newGuest.phone}
                onChange={(e) => setNewGuest({...newGuest, phone: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <input
                type="text"
                placeholder="Invitation Code"
                value={newGuest.invitation_code}
                onChange={(e) => setNewGuest({...newGuest, invitation_code: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                required
              />
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-pink-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-pink-600 transition-colors"
                >
                  Add Guest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}