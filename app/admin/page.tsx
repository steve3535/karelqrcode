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
    if (!confirm('Are you sure you want to delete this guest?')) return

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
        alert('This seat is already taken!')
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
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Wedding Admin Dashboard</h1>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Guests</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Confirmed</p>
            <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Declined</p>
            <p className="text-2xl font-bold text-red-600">{stats.declined}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Checked In</p>
            <p className="text-2xl font-bold text-blue-600">{stats.checkedIn}</p>
          </div>
        </div>

        {/* Add Guest Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New Guest</h2>
          <form onSubmit={addGuest} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="Name"
              value={newGuest.name}
              onChange={(e) => setNewGuest({...newGuest, name: e.target.value})}
              className="px-4 py-2 border rounded-lg"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={newGuest.email}
              onChange={(e) => setNewGuest({...newGuest, email: e.target.value})}
              className="px-4 py-2 border rounded-lg"
              required
            />
            <input
              type="tel"
              placeholder="Phone (optional)"
              value={newGuest.phone}
              onChange={(e) => setNewGuest({...newGuest, phone: e.target.value})}
              className="px-4 py-2 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Invitation Code"
              value={newGuest.invitation_code}
              onChange={(e) => setNewGuest({...newGuest, invitation_code: e.target.value})}
              className="px-4 py-2 border rounded-lg"
              required
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add Guest
            </button>
          </form>
        </div>

        {/* Guests List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="text-xl font-semibold p-6 border-b">Guest List</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Table/Seat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {guests.map((guest) => (
                  <tr key={guest.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {guest.name}
                      {guest.plus_ones > 0 && (
                        <span className="text-sm text-gray-500 ml-2">+{guest.plus_ones}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {guest.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                      {guest.invitation_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${guest.rsvp_status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                          guest.rsvp_status === 'declined' ? 'bg-red-100 text-red-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                        {guest.rsvp_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {guest.seating_assignments && guest.seating_assignments[0] ? (
                        <span>
                          Table {guest.seating_assignments[0].tables.table_number}, 
                          Seat {guest.seating_assignments[0].seat_number}
                          {guest.seating_assignments[0].checked_in && (
                            <span className="ml-2 text-green-600">✓ Checked In</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => deleteGuest(guest.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}