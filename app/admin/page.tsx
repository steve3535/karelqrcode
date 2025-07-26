'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import QRCode from 'qrcode'

type Guest = {
  id: string
  name: string
  email?: string
  phone?: string
  invitation_code: string
  guest_code?: string
  rsvp_status: 'pending' | 'confirmed' | 'declined'
  plus_ones: number
  dietary_restrictions?: string
  notes?: string
  table_number?: number
  seat_number?: number
  checked_in?: boolean
  qr_code?: string
  seating_assignment_id?: number
}

type Table = {
  id: number
  table_number: number
  table_name?: string
  capacity: number
}

export default function AdminDashboard() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [tables, setTables] = useState<Table[]>([])
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
  const [showEditGuest, setShowEditGuest] = useState(false)
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null)
  const [newGuest, setNewGuest] = useState({
    name: '',
    email: '',
    phone: '',
    invitation_code: '',
    plus_ones: 0,
    dietary_restrictions: '',
    notes: '',
    table_id: 0,
    seat_number: 0
  })
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    fetchGuests()
    fetchTables()
  }, [])

  const fetchTables = async () => {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .order('table_number')

    if (!error && data) {
      setTables(data)
    }
  }

  const fetchGuests = async () => {
    try {
      const { data: guestsData, error } = await supabase
        .from('guests')
        .select(`
          *,
          seating_assignments (
            id,
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
        seating_assignment_id: guest.seating_assignments?.[0]?.id,
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

  const generateGuestCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    
    try {
      const guestCode = generateGuestCode()
      const invitationCode = newGuest.invitation_code || `ADMIN-${guestCode}`

      const { data: guest, error: guestError } = await supabase
        .from('guests')
        .insert({
          name: newGuest.name,
          email: newGuest.email || null,
          phone: newGuest.phone || null,
          invitation_code: invitationCode.toUpperCase(),
          guest_code: guestCode,
          plus_ones: newGuest.plus_ones,
          dietary_restrictions: newGuest.dietary_restrictions || null,
          notes: newGuest.notes || null,
          rsvp_status: 'confirmed'
        })
        .select()
        .single()

      if (guestError) {
        if (guestError.message.includes('duplicate key value violates unique constraint')) {
          if (guestError.message.includes('invitation_code')) {
            setErrorMessage('This invitation code already exists. Please use a different code.')
          } else {
            setErrorMessage('A guest with this information already exists.')
          }
        } else {
          setErrorMessage('Error adding guest: ' + guestError.message)
        }
        return
      }

      // Create seating assignment if table is specified
      if (newGuest.table_id > 0) {
        const qrCodeData = `WEDDING-${guest.id}-${Date.now()}`
        
        const { error: seatError } = await supabase
          .from('seating_assignments')
          .insert({
            guest_id: guest.id,
            table_id: newGuest.table_id,
            seat_number: newGuest.seat_number || 1,
            qr_code: qrCodeData
          })

        if (seatError) {
          if (seatError.message.includes('duplicate key value violates unique constraint')) {
            setErrorMessage(`Table ${newGuest.table_id}, Seat ${newGuest.seat_number} is already taken. Please choose a different seat.`)
            // Delete the guest if seating assignment fails
            await supabase.from('guests').delete().eq('id', guest.id)
            return
          }
        }
      }

      setShowAddGuest(false)
      setNewGuest({
        name: '',
        email: '',
        phone: '',
        invitation_code: '',
        plus_ones: 0,
        dietary_restrictions: '',
        notes: '',
        table_id: 0,
        seat_number: 0
      })
      fetchGuests()
    } catch (error) {
      console.error('Error adding guest:', error)
      setErrorMessage('An unexpected error occurred. Please try again.')
    }
  }

  const handleEditGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    
    if (!editingGuest) return

    try {
      // Update guest information
      const { error: guestError } = await supabase
        .from('guests')
        .update({
          name: editingGuest.name,
          email: editingGuest.email || null,
          phone: editingGuest.phone || null,
          plus_ones: editingGuest.plus_ones,
          dietary_restrictions: editingGuest.dietary_restrictions || null,
          notes: editingGuest.notes || null,
          rsvp_status: editingGuest.rsvp_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingGuest.id)

      if (guestError) throw guestError

      // Update seating assignment if it exists
      if (editingGuest.seating_assignment_id && editingGuest.table_number) {
        const { error: seatError } = await supabase
          .from('seating_assignments')
          .update({
            table_id: editingGuest.table_number,
            seat_number: editingGuest.seat_number || 1
          })
          .eq('id', editingGuest.seating_assignment_id)

        if (seatError) {
          if (seatError.message.includes('duplicate key value violates unique constraint')) {
            setErrorMessage(`Table ${editingGuest.table_number}, Seat ${editingGuest.seat_number} is already taken.`)
            return
          }
        }
      } else if (!editingGuest.seating_assignment_id && editingGuest.table_number) {
        // Create new seating assignment if it doesn't exist
        const qrCodeData = `WEDDING-${editingGuest.id}-${Date.now()}`
        
        const { error: seatError } = await supabase
          .from('seating_assignments')
          .insert({
            guest_id: editingGuest.id,
            table_id: editingGuest.table_number,
            seat_number: editingGuest.seat_number || 1,
            qr_code: qrCodeData
          })

        if (seatError) {
          if (seatError.message.includes('duplicate key value violates unique constraint')) {
            setErrorMessage(`Table ${editingGuest.table_number}, Seat ${editingGuest.seat_number} is already taken.`)
            return
          }
        }
      }

      setShowEditGuest(false)
      setEditingGuest(null)
      fetchGuests()
    } catch (error) {
      console.error('Error updating guest:', error)
      setErrorMessage('An error occurred while updating the guest.')
    }
  }

  const handleDeleteGuest = async (guestId: string) => {
    if (!confirm('Are you sure you want to delete this guest? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestId)

      if (error) throw error
      fetchGuests()
    } catch (error) {
      console.error('Error deleting guest:', error)
      alert('Error deleting guest. Please try again.')
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
                         (guest.email && guest.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (guest.guest_code && guest.guest_code.toLowerCase().includes(searchTerm.toLowerCase()))
    
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
                placeholder="Search by name, email, or guest code..."
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
                      {guest.guest_code && (
                        <p className="text-sm text-gray-600 font-mono">Code: {guest.guest_code}</p>
                      )}
                      {guest.plus_ones > 0 && (
                        <p className="text-sm text-gray-600">+ {guest.plus_ones} guest{guest.plus_ones > 1 ? 's' : ''}</p>
                      )}
                      {guest.email && <p className="text-gray-600">{guest.email}</p>}
                      {guest.phone && <p className="text-gray-600">{guest.phone}</p>}
                      {guest.table_number && (
                        <p className="text-gray-800 font-medium">
                          Table: {guest.table_number}, Seat: {guest.seat_number}
                        </p>
                      )}
                      {guest.dietary_restrictions && (
                        <p className="text-gray-600">Dietary: {guest.dietary_restrictions}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        guest.rsvp_status === 'confirmed' 
                          ? 'bg-wedding-pink text-white' 
                          : guest.rsvp_status === 'declined'
                          ? 'bg-red-500 text-white'
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
                      <button
                        onClick={() => {
                          setEditingGuest(guest)
                          setShowEditGuest(true)
                        }}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition duration-200 text-sm"
                      >
                        Edit
                      </button>
                      {guest.qr_code && (
                        <button
                          onClick={() => generateQRCode(guest.id)}
                          className="px-3 py-1 bg-wedding-pink text-white rounded hover:bg-wedding-darkPink transition duration-200 text-sm"
                        >
                          QR Code
                        </button>
                      )}
                      {guest.rsvp_status === 'confirmed' && !guest.checked_in && guest.qr_code && (
                        <button
                          onClick={() => handleCheckIn(guest.id)}
                          className="px-3 py-1 bg-wedding-gold text-gray-800 rounded hover:bg-yellow-500 transition duration-200 text-sm"
                        >
                          Check In
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteGuest(guest.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition duration-200 text-sm"
                      >
                        Delete
                      </button>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Add New Guest</h3>
            <form onSubmit={handleAddGuest}>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Name *"
                  value={newGuest.name}
                  onChange={(e) => setNewGuest({...newGuest, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={newGuest.email}
                  onChange={(e) => setNewGuest({...newGuest, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  placeholder="Invitation Code (auto-generated if empty)"
                  value={newGuest.invitation_code}
                  onChange={(e) => setNewGuest({...newGuest, invitation_code: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Table</label>
                    <select
                      value={newGuest.table_id}
                      onChange={(e) => setNewGuest({...newGuest, table_id: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value={0}>Not Assigned</option>
                      {tables.map(table => (
                        <option key={table.id} value={table.id}>
                          Table {table.table_number} {table.table_name ? `- ${table.table_name}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Seat</label>
                    <input
                      type="number"
                      placeholder="Seat #"
                      value={newGuest.seat_number}
                      onChange={(e) => setNewGuest({...newGuest, seat_number: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                      max="10"
                    />
                  </div>
                </div>
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

              {errorMessage && (
                <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                  {errorMessage}
                </div>
              )}

              <div className="mt-6 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-wedding-pink text-white py-2 rounded-md hover:bg-wedding-darkPink transition duration-200"
                >
                  Add Guest
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddGuest(false)
                    setErrorMessage('')
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Guest Modal */}
      {showEditGuest && editingGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Edit Guest</h3>
            <form onSubmit={handleEditGuest}>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Name *"
                  value={editingGuest.name}
                  onChange={(e) => setEditingGuest({...editingGuest, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={editingGuest.email || ''}
                  onChange={(e) => setEditingGuest({...editingGuest, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={editingGuest.phone || ''}
                  onChange={(e) => setEditingGuest({...editingGuest, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RSVP Status</label>
                  <select
                    value={editingGuest.rsvp_status}
                    onChange={(e) => setEditingGuest({...editingGuest, rsvp_status: e.target.value as 'pending' | 'confirmed' | 'declined'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Table</label>
                    <select
                      value={editingGuest.table_number || 0}
                      onChange={(e) => setEditingGuest({...editingGuest, table_number: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value={0}>Not Assigned</option>
                      {tables.map(table => (
                        <option key={table.id} value={table.id}>
                          Table {table.table_number} {table.table_name ? `- ${table.table_name}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Seat</label>
                    <input
                      type="number"
                      placeholder="Seat #"
                      value={editingGuest.seat_number || ''}
                      onChange={(e) => setEditingGuest({...editingGuest, seat_number: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                      max="10"
                    />
                  </div>
                </div>
                <input
                  type="number"
                  placeholder="Plus Ones"
                  value={editingGuest.plus_ones}
                  onChange={(e) => setEditingGuest({...editingGuest, plus_ones: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="0"
                />
                <input
                  type="text"
                  placeholder="Dietary Restrictions (optional)"
                  value={editingGuest.dietary_restrictions || ''}
                  onChange={(e) => setEditingGuest({...editingGuest, dietary_restrictions: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <textarea
                  placeholder="Notes (optional)"
                  value={editingGuest.notes || ''}
                  onChange={(e) => setEditingGuest({...editingGuest, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>

              {errorMessage && (
                <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                  {errorMessage}
                </div>
              )}

              <div className="mt-6 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-wedding-pink text-white py-2 rounded-md hover:bg-wedding-darkPink transition duration-200"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditGuest(false)
                    setEditingGuest(null)
                    setErrorMessage('')
                  }}
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