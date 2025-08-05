'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import TableSeatMap from '@/components/table-seat-map'

type Guest = {
  id: string
  name: string
  email?: string
  phone?: string
  plus_ones?: number
  dietary_restrictions?: string
  seat_number?: number
  seating_assignment_id?: number
}

type TableInfo = {
  id: number
  table_number: number
  table_name?: string
  capacity: number
  occupied_seats: number
  available_seats: number
  guests: Guest[]
}

export default function TableManagement() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null)
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTable, setEditingTable] = useState<any>(null)
  const [assignmentMode, setAssignmentMode] = useState(false)

  useEffect(() => {
    fetchTables()
  }, [])

  const fetchTables = async () => {
    try {
      // Fetch all tables
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .order('table_number')

      if (tablesError) throw tablesError

      // For each table, fetch the guests with their seat assignments
      const tablesWithGuests = await Promise.all(
        (tablesData || []).map(async (table) => {
          const { data: seatingData } = await supabase
            .from('seating_assignments')
            .select(`
              id,
              seat_number,
              guests!inner (
                id,
                name,
                email,
                phone,
                plus_ones,
                dietary_restrictions,
                rsvp_status
              )
            `)
            .eq('table_id', table.id)
            .eq('guests.rsvp_status', 'confirmed')

          const guests = (seatingData || []).map(seat => ({
            ...seat.guests,
            seat_number: seat.seat_number,
            seating_assignment_id: seat.id
          }))

          const occupiedSeats = guests.filter(g => g.seat_number).length

          return {
            ...table,
            guests,
            occupied_seats: occupiedSeats,
            available_seats: table.capacity - occupiedSeats
          }
        })
      )

      setTables(tablesWithGuests)
    } catch (error) {
      console.error('Error fetching tables:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSeatClick = async (tableId: number, seatNumber: number, guest?: Guest) => {
    if (guest) {
      setSelectedGuest(guest)
      return
    }

    // If we have a selected guest in assignment mode, assign them to this seat
    if (assignmentMode && selectedGuest) {
      await assignGuestToSeat(selectedGuest, tableId, seatNumber)
    }
  }

  const assignGuestToSeat = async (guest: Guest, tableId: number, seatNumber: number | null) => {
    try {
      if (guest.seating_assignment_id) {
        // Update existing assignment
        const { error } = await supabase
          .from('seating_assignments')
          .update({
            table_id: tableId,
            seat_number: seatNumber
          })
          .eq('id', guest.seating_assignment_id)

        if (error) throw error
      } else {
        // Create new assignment if guest doesn't have one
        const { error } = await supabase
          .from('seating_assignments')
          .update({
            seat_number: seatNumber
          })
          .eq('guest_id', guest.id)
          .eq('table_id', tableId)

        if (error) throw error
      }

      setSelectedGuest(null)
      setAssignmentMode(false)
      fetchTables()
    } catch (error) {
      console.error('Error assigning seat:', error)
      alert('Error assigning seat. Seat might be already taken.')
    }
  }

  const handleGuestMove = async (guestId: string, fromSeat: number | null, toSeat: number | null, toTableId?: number) => {
    try {
      const guest = tables.flatMap(t => t.guests).find(g => g.id === guestId)
      if (!guest || !guest.seating_assignment_id) return

      const targetTableId = toTableId || tables.find(t => t.guests.some(g => g.id === guestId))?.id
      if (!targetTableId) return

      await assignGuestToSeat(guest, targetTableId, toSeat)
    } catch (error) {
      console.error('Error moving guest:', error)
    }
  }

  const handleEditTable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTable) return

    try {
      const { error } = await supabase
        .from('tables')
        .update({
          table_name: editingTable.table_name,
          capacity: editingTable.capacity
        })
        .eq('id', editingTable.id)

      if (error) throw error

      setShowEditModal(false)
      setEditingTable(null)
      fetchTables()
    } catch (error) {
      console.error('Error updating table:', error)
      alert('Error updating table')
    }
  }

  const removeGuestFromSeat = async (guest: Guest) => {
    if (!guest.seating_assignment_id) return

    try {
      const { error } = await supabase
        .from('seating_assignments')
        .update({ seat_number: null })
        .eq('id', guest.seating_assignment_id)

      if (error) throw error
      
      setSelectedGuest(null)
      fetchTables()
    } catch (error) {
      console.error('Error removing guest from seat:', error)
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-wedding-pink to-wedding-darkPink text-white p-6">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Plan de Table</h1>
              <p className="text-white/90">Gestion des places assises</p>
            </div>
            <Link
              href="/admin"
              className="bg-white text-wedding-pink px-4 py-2 rounded-md hover:bg-gray-100 transition duration-200"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Tables</p>
            <p className="text-2xl font-bold">{tables.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Capacité Totale</p>
            <p className="text-2xl font-bold">
              {tables.reduce((sum, t) => sum + t.capacity, 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Places occupées</p>
            <p className="text-2xl font-bold">
              {tables.reduce((sum, t) => sum + t.guests.filter(g => g.seat_number).length, 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Places disponibles</p>
            <p className="text-2xl font-bold">
              {tables.reduce((sum, t) => sum + (t.capacity - t.guests.filter(g => g.seat_number).length), 0)}
            </p>
          </div>
        </div>

        {/* Table Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Plan de Table</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tables.map((table) => (
              <div key={table.id} className="relative">
                <TableSeatMap
                  tableId={table.id}
                  tableNumber={table.table_number}
                  tableName={table.table_name}
                  capacity={table.capacity}
                  guests={table.guests}
                  onSeatClick={(seatNumber, guest) => handleSeatClick(table.id, seatNumber, guest)}
                  onGuestMove={(guestId, fromSeat, toSeat) => 
                    handleGuestMove(guestId, fromSeat, toSeat, table.id)
                  }
                  selectedGuest={selectedGuest?.id}
                />
                <button
                  onClick={() => {
                    setEditingTable(table)
                    setShowEditModal(true)
                  }}
                  className="absolute top-2 right-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  Editer
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Guest Info */}
        {selectedGuest && (
          <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold">{selectedGuest.name}</h3>
              <button
                onClick={() => setSelectedGuest(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            {selectedGuest.email && <p className="text-sm text-gray-600">{selectedGuest.email}</p>}
            {selectedGuest.phone && <p className="text-sm text-gray-600">{selectedGuest.phone}</p>}
            {selectedGuest.plus_ones && selectedGuest.plus_ones > 0 && (
              <p className="text-sm text-gray-600">+{selectedGuest.plus_ones} guest(s)</p>
            )}
            {selectedGuest.seat_number && (
              <p className="text-sm font-medium mt-2">
                Actuellement à la Table {tables.find(t => t.guests.some(g => g.id === selectedGuest.id))?.table_number}, 
                Place {selectedGuest.seat_number}
              </p>
            )}
            <div className="mt-3 space-y-2">
              <button
                onClick={() => {
                  setAssignmentMode(true)
                  alert('Click on an empty seat to assign this guest')
                }}
                className="w-full bg-wedding-pink text-white px-3 py-1 rounded text-sm hover:bg-wedding-darkPink"
              >
                Changer de place
              </button>
              {selectedGuest.seat_number && (
                <button
                  onClick={() => removeGuestFromSeat(selectedGuest)}
                  className="w-full bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
                >
                  Retirer de la place
                </button>
              )}
            </div>
          </div>
        )}

        {/* Unseated Guests */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Invités sans place assise</h2>
          <UnseatedGuests 
            tables={tables} 
            onAssign={(guest) => {
              setSelectedGuest(guest)
              setAssignmentMode(true)
              alert('Click on an empty seat to assign this guest')
            }}
            onRefresh={fetchTables}
          />
        </div>
      </div>

      {/* Edit Table Modal */}
      {showEditModal && editingTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Editer {editingTable.table_number}</h3>
            <form onSubmit={handleEditTable}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Table Name</label>
                  <input
                    type="text"
                    value={editingTable.table_name || ''}
                    onChange={(e) => setEditingTable({...editingTable, table_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Head Table, Family Table"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={editingTable.capacity}
                    onChange={(e) => setEditingTable({...editingTable, capacity: parseInt(e.target.value) || 10})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="1"
                    max="20"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Current seated: {editingTable.guests?.filter((g: Guest) => g.seat_number).length || 0} guests
                  </p>
                </div>
              </div>
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
                    setShowEditModal(false)
                    setEditingTable(null)
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

// Component for unseated guests
function UnseatedGuests({ 
  tables, 
  onAssign,
  onRefresh 
}: { 
  tables: TableInfo[]
  onAssign: (guest: Guest) => void
  onRefresh: () => void
}) {
  const [unseatedGuests, setUnseatedGuests] = useState<Guest[]>([])

  useEffect(() => {
    fetchUnseatedGuests()
  }, [tables])

  const fetchUnseatedGuests = async () => {
    const { data, error } = await supabase
      .from('seating_assignments')
      .select(`
        id,
        seat_number,
        table_id,
        guests!inner (
          id,
          name,
          email,
          phone,
          plus_ones,
          dietary_restrictions,
          rsvp_status
        )
      `)
      .eq('guests.rsvp_status', 'confirmed')
      .or('seat_number.is.null,table_id.is.null')

    if (data) {
      const unseated = data
        .filter(item => !item.seat_number)
        .map(item => ({
          id: (item.guests as any).id,
          name: (item.guests as any).name,
          email: (item.guests as any).email,
          phone: (item.guests as any).phone,
          plus_ones: (item.guests as any).plus_ones,
          dietary_restrictions: (item.guests as any).dietary_restrictions,
          seating_assignment_id: item.id
        })) as Guest[]
      setUnseatedGuests(unseated)
    }
  }

  if (unseatedGuests.length === 0) {
    return <p className="text-gray-500">Tous les invités confirmés ont été assignés à une place.</p>
  }

  return (
    <div className="space-y-2">
      {unseatedGuests.map((guest) => (
        <div key={guest.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
          <div>
            <p className="font-medium">{guest.name}</p>
            {guest.email && <p className="text-sm text-gray-600">{guest.email}</p>}
            {guest.plus_ones && guest.plus_ones > 0 && (
              <p className="text-sm text-gray-600">+{guest.plus_ones} guest(s)</p>
            )}
          </div>
          <button
            onClick={() => onAssign(guest)}
            className="bg-wedding-pink text-white px-3 py-1 rounded text-sm hover:bg-wedding-darkPink"
          >
            Assigner une place
          </button>
        </div>
      ))}
    </div>
  )
}