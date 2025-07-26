'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import QRCode from 'qrcode'

type Guest = {
  id: string
  name: string
  email: string
  phone?: string
  invitation_code: string
  rsvp_status: 'pending' | 'confirmed' | 'declined'
  plus_ones: number
  dietary_restrictions?: string
  notes?: string
  table_number?: number
  seat_number?: number
  checked_in?: boolean
  qr_code?: string
}

export default function AdminDashboard() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    checkedIn: 0
  })
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [newGuest, setNewGuest] = useState({
    name: '',
    email: '',
    phone: '',
    invitation_code: '',
    plus_ones: 0,
    dietary_restrictions: '',
    notes: ''
  })

  useEffect(() => {
    fetchGuests()
  }, [])

  const fetchGuests = async () => {
    try {
      const { data: guestsData, error } = await supabase
        .from('guests')
        .select(`
          *,
          seating_assignments (
            table_id,
            seat_number,
            qr_code,
            checked_in
          )
        `)
        .order('name')

      if (error) throw error

      const formattedGuests = guestsData?.map(guest => ({
        ...guest,
        table_number: guest.seating_assignments?.[0]?.table_id,
        seat_number: guest.seating_assignments?.[0]?.seat_number,
        checked_in: guest.seating_assignments?.[0]?.checked_in,
        qr_code: guest.seating_assignments?.[0]?.qr_code
      })) || []

      setGuests(formattedGuests)

      // Calculate stats
      const total = formattedGuests.length
      const confirmed = formattedGuests.filter(g => g.rsvp_status === 'confirmed').length
      const pending = formattedGuests.filter(g => g.rsvp_status === 'pending').length
      const checkedIn = formattedGuests.filter(g => g.checked_in).length

      setStats({ total, confirmed, pending, checkedIn })
    } catch (error) {
      console.error('Error fetching guests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('guests')
        .insert({
          ...newGuest,
          invitation_code: newGuest.invitation_code.toUpperCase()
        })

      if (error) throw error

      setShowAddGuest(false)
      setNewGuest({
        name: '',
        email: '',
        phone: '',
        invitation_code: '',
        plus_ones: 0,
        dietary_restrictions: '',
        notes: ''
      })
      fetchGuests()
    } catch (error) {
      console.error('Error adding guest:', error)
      alert('Error adding guest. Make sure invitation code is unique.')
    }
  }

  const handleCheckIn = async (guestId: string) => {
    try {
      const { error } = await supabase
        .from('seating_assignments')
        .update({ 
          checked_in: true,
          checked_in_at: new Date().toISOString()
        })
        .eq('guest_id', guestId)

      if (error) throw error
      fetchGuests()
    } catch (error) {
      console.error('Error checking in guest:', error)
    }
  }

  const generateQRCode = async (guestId: string) => {
    const guest = guests.find(g => g.id === guestId)
    if (guest?.qr_code) {
      const qrUrl = await QRCode.toDataURL(guest.qr_code)
      const link = document.createElement('a')
      link.download = `${guest.name.replace(' ', '_')}_QR.png`
      link.href = qrUrl
      link.click()
    }
  }

  const filteredGuests = guests.filter(guest => {
    const matchesSearch = guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guest.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (filter === 'all') return matchesSearch
    if (filter === 'confirmed') return matchesSearch && guest.rsvp_status === 'confirmed'
    if (filter === 'pending') return matchesSearch && guest.rsvp_status === 'pending'
    if (filter === 'checked-in') return matchesSearch && guest.checked_in
    return matchesSearch
  })

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-wedding-pink to-wedding-darkPink text-white p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold mb-2">💕 Wedding Guest Manager ✨</h1>
          <p className="text-white/90">Elegant RSVP & check-in management for your special day</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Guests</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <span className="text-2xl">👥</span>
            </div>
          </div>

          <div className="bg-wedding-pink text-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm">Confirmed</p>
                <p className="text-3xl font-bold">{stats.confirmed}</p>
                <p className="text-sm text-white/80">{stats.confirmed > 0 ? `${Math.round(stats.confirmed / stats.total * 100)}% response rate` : '0% response rate'}</p>
              </div>
              <span className="text-2xl">👤</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending</p>
                <p className="text-3xl font-bold text-gray-600">{stats.pending}</p>
              </div>
              <span className="text-2xl">⏰</span>
            </div>
          </div>

          <div className="bg-wedding-gold text-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700 text-sm">Checked In</p>
                <p className="text-3xl font-bold">{stats.checkedIn}</p>
                <p className="text-sm text-gray-600">{stats.confirmed > 0 ? `${Math.round(stats.checkedIn / stats.confirmed * 100)}% attendance` : '0% attendance'}</p>
              </div>
              <span className="text-2xl">🎉</span>
            </div>
          </div>
        </div>

        {/* Guest Management */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-xl font-bold">Guest Management</h2>
              <button
                onClick={() => setShowAddGuest(true)}
                className="bg-wedding-pink text-white px-4 py-2 rounded-md hover:bg-wedding-darkPink transition duration-200 flex items-center gap-2"
              >
                + Add Guest
              </button>
            </div>

            <div className="mt-4 flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="Search guests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-wedding-pink focus:border-wedding-pink"
              />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-wedding-pink focus:border-wedding-pink"
              >
                <option value="all">All Guests</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="checked-in">Checked In</option>
              </select>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {filteredGuests.map((guest) => (
                <div key={guest.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{guest.name}</h3>
                      {guest.plus_ones > 0 && (
                        <p className="text-sm text-gray-600">+ {guest.plus_ones} guest{guest.plus_ones > 1 ? 's' : ''}</p>
                      )}
                      <p className="text-gray-600">{guest.email}</p>
                      {guest.phone && <p className="text-gray-600">{guest.phone}</p>}
                      {guest.table_number && (
                        <p className="text-gray-800 font-medium">Table: {guest.table_number}</p>
                      )}
                      {guest.dietary_restrictions && (
                        <p className="text-gray-600">Dietary: {guest.dietary_restrictions}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        guest.rsvp_status === 'confirmed' 
                          ? 'bg-wedding-pink text-white' 
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {guest.rsvp_status === 'confirmed' ? '✓ confirmed' : guest.rsvp_status}
                      </span>
                      
                      {guest.checked_in && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-wedding-gold text-gray-800">
                          Checked In
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {guest.qr_code && (
                        <button
                          onClick={() => generateQRCode(guest.id)}
                          className="px-3 py-1 bg-wedding-pink text-white rounded hover:bg-wedding-darkPink transition duration-200 text-sm"
                        >
                          QR Code
                        </button>
                      )}
                      {guest.rsvp_status === 'confirmed' && !guest.checked_in && (
                        <button
                          onClick={() => handleCheckIn(guest.id)}
                          className="px-3 py-1 bg-wedding-gold text-gray-800 rounded hover:bg-yellow-500 transition duration-200 text-sm"
                        >
                          Check In
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Guest Modal */}
      {showAddGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Add New Guest</h3>
            <form onSubmit={handleAddGuest}>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={newGuest.name}
                  onChange={(e) => setNewGuest({...newGuest, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newGuest.email}
                  onChange={(e) => setNewGuest({...newGuest, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={newGuest.phone}
                  onChange={(e) => setNewGuest({...newGuest, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  placeholder="Invitation Code"
                  value={newGuest.invitation_code}
                  onChange={(e) => setNewGuest({...newGuest, invitation_code: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
                <input
                  type="number"
                  placeholder="Plus Ones"
                  value={newGuest.plus_ones}
                  onChange={(e) => setNewGuest({...newGuest, plus_ones: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="0"
                />
                <input
                  type="text"
                  placeholder="Dietary Restrictions (optional)"
                  value={newGuest.dietary_restrictions}
                  onChange={(e) => setNewGuest({...newGuest, dietary_restrictions: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <textarea
                  placeholder="Notes (optional)"
                  value={newGuest.notes}
                  onChange={(e) => setNewGuest({...newGuest, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
              <div className="mt-6 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-wedding-pink text-white py-2 rounded-md hover:bg-wedding-darkPink transition duration-200"
                >
                  Add Guest
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddGuest(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}