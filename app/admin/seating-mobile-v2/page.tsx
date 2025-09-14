'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Guest = {
  id: string
  first_name: string
  last_name: string
  table_number: number | null
  table_name: string | null
  is_assigned: boolean
  checked_in: boolean
  color_code: string | null
}

type Table = {
  id: string
  table_number: number
  table_name: string
  capacity: number
  color_code: string
  color_name: string
  occupied_seats: number
  available_seats: number
  seated_guests: any[]
}

export default function SeatingMobileV2Page() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [viewMode, setViewMode] = useState<'tables' | 'guests'>('tables')
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [movingGuest, setMovingGuest] = useState<Guest | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Charger les tables
      const { data: tablesData } = await supabase
        .from('table_status')
        .select('*')
        .order('table_number')

      // Charger les invités
      const { data: guestsData } = await supabase
        .from('all_guests_status')
        .select('*')
        .order('last_name', { ascending: true })

      setTables(tablesData || [])
      setGuests(guestsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMoveGuest = async (guest: Guest, targetTableId: number) => {
    setLoading(true)
    try {
      // Supprimer l'ancienne assignation
      await supabase
        .from('seating_assignments')
        .delete()
        .eq('guest_id', guest.id)

      // Trouver le prochain siège disponible
      const { data: existingSeats } = await supabase
        .from('seating_assignments')
        .select('seat_number')
        .eq('table_id', targetTableId)

      const occupiedSeats = existingSeats?.map(s => s.seat_number) || []
      let nextSeat = 1
      while (occupiedSeats.includes(nextSeat) && nextSeat <= 10) {
        nextSeat++
      }

      // Créer la nouvelle assignation
      const { error } = await supabase
        .from('seating_assignments')
        .insert({
          guest_id: guest.id,
          table_id: targetTableId,
          seat_number: nextSeat,
          qr_code: `WEDDING-${guest.id}-TABLE${targetTableId}`,
          checked_in: false
        })

      if (error) throw error

      setMessage(`✅ ${guest.first_name} déplacé à la table ${targetTableId}`)
      setMovingGuest(null)
      await loadData()

      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error moving guest:', error)
      setMessage('❌ Erreur lors du déplacement')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFromTable = async (guestId: string) => {
    if (!confirm('Retirer cet invité de sa table ?')) return

    setLoading(true)
    try {
      await supabase
        .from('seating_assignments')
        .delete()
        .eq('guest_id', guestId)

      setMessage('✅ Invité retiré de la table')
      await loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error removing guest:', error)
      setMessage('❌ Erreur lors du retrait')
    } finally {
      setLoading(false)
    }
  }

  const filteredGuests = guests.filter(g =>
    !searchTerm ||
    `${g.first_name} ${g.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 pb-20">
      {/* Header fixe */}
      <div className="sticky top-0 z-40 bg-white shadow-md">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/admin/seating" className="text-purple-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold">Gestion Mobile V2</h1>
          <div className="w-6"></div>
        </div>

        {/* Tabs */}
        <div className="flex border-t">
          <button
            onClick={() => setViewMode('tables')}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              viewMode === 'tables'
                ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500'
            }`}
          >
            <div>Tables</div>
            <div className="text-xs">({tables.length})</div>
          </button>
          <button
            onClick={() => setViewMode('guests')}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              viewMode === 'guests'
                ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500'
            }`}
          >
            <div>Invités</div>
            <div className="text-xs">({guests.filter(g => !g.is_assigned).length} non assignés)</div>
          </button>
        </div>

        {/* Stats */}
        <div className="px-4 py-2 bg-gray-50 flex justify-around text-sm">
          <div className="text-center">
            <div className="font-bold text-purple-600">{guests.length}</div>
            <div className="text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-blue-600">{guests.filter(g => g.is_assigned).length}</div>
            <div className="text-gray-500">Assignés</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-green-600">
              {tables.filter(t => t.table_number <= 26).reduce((acc, t) => acc + t.available_seats, 0)}
            </div>
            <div className="text-gray-500">Places libres</div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mx-4 mt-3 p-2 rounded text-center text-sm font-medium ${
          message.includes('✅') ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}

      {/* Mode déplacement actif */}
      {movingGuest && (
        <div className="mx-4 mt-3 p-3 bg-blue-100 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-blue-600">Déplacement en cours :</div>
              <div className="font-bold">{movingGuest.first_name} {movingGuest.last_name}</div>
            </div>
            <button
              onClick={() => setMovingGuest(null)}
              className="text-red-600 font-medium"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Vue Tables */}
      {viewMode === 'tables' && (
        <div className="p-4 space-y-3">
          {tables.map(table => (
            <div
              key={table.table_number}
              className="bg-white rounded-lg shadow-sm overflow-hidden"
              style={{
                borderLeft: `4px solid ${table.color_code}`
              }}
            >
              {/* En-tête de table */}
              <div
                className="p-3 flex items-center justify-between"
                style={{ backgroundColor: `${table.color_code}10` }}
              >
                <div>
                  <div className="font-bold flex items-center gap-2">
                    Table {table.table_number}
                    {table.table_number <= 3 && <span className="text-yellow-500">⭐</span>}
                  </div>
                  <div className="text-sm text-gray-600">{table.table_name}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">
                    {table.occupied_seats}/{table.capacity}
                  </div>
                  <div className={`text-sm ${
                    table.available_seats === 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {table.available_seats === 0
                      ? 'Complète'
                      : `${table.available_seats} libre${table.available_seats > 1 ? 's' : ''}`
                    }
                  </div>
                </div>
              </div>

              {/* Liste des invités */}
              {table.seated_guests && table.seated_guests.length > 0 && (
                <div className="p-2 space-y-1">
                  {table.seated_guests.map((guest: any) => (
                    <div
                      key={guest.guest_id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm font-medium">
                          {guest.guest_name}
                        </span>
                        {guest.checked_in && (
                          <span className="text-green-600 text-xs">✓</span>
                        )}
                      </div>
                      {!guest.checked_in && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              const guestObj = guests.find(g => g.id === guest.guest_id)
                              if (guestObj) setMovingGuest(guestObj)
                            }}
                            className="p-1 text-blue-600"
                            title="Déplacer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRemoveFromTable(guest.guest_id)}
                            className="p-1 text-red-600"
                            title="Retirer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Bouton d'ajout si places disponibles ou mode déplacement */}
              {(table.available_seats > 0 || movingGuest) && (
                <div className="p-2 border-t">
                  {movingGuest ? (
                    <button
                      onClick={() => handleMoveGuest(movingGuest, table.table_number)}
                      disabled={table.available_seats === 0 && movingGuest.table_number !== table.table_number}
                      className={`w-full py-2 rounded font-medium transition-colors ${
                        table.available_seats === 0 && movingGuest.table_number !== table.table_number
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-purple-600 text-white active:bg-purple-700'
                      }`}
                    >
                      {movingGuest.table_number === table.table_number
                        ? 'Garder ici'
                        : `Déplacer ici (${table.available_seats} place${table.available_seats > 1 ? 's' : ''})`
                      }
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setViewMode('guests')
                        // Pré-sélectionner cette table pour assignation
                      }}
                      className="w-full py-2 text-purple-600 font-medium"
                    >
                      + Ajouter un invité
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Vue Invités */}
      {viewMode === 'guests' && (
        <div className="p-4">
          {/* Recherche */}
          <input
            type="text"
            placeholder="Rechercher un invité..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-4"
          />

          {/* Liste des invités non assignés */}
          <div className="space-y-2">
            {filteredGuests
              .filter(g => !g.is_assigned)
              .map(guest => (
                <div
                  key={guest.id}
                  className="bg-white p-3 rounded-lg shadow-sm flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">
                      {guest.first_name} {guest.last_name}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMovingGuest(guest)
                      setViewMode('tables')
                    }}
                    className="px-3 py-1 bg-purple-600 text-white rounded text-sm"
                  >
                    Assigner
                  </button>
                </div>
              ))}
          </div>

          {filteredGuests.filter(g => !g.is_assigned).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Tous les invités sont assignés
            </div>
          )}
        </div>
      )}
    </div>
  )
}