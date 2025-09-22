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
  const [searchMode, setSearchMode] = useState<'all' | 'unassigned'>('all')
  const [expandedTables, setExpandedTables] = useState<Set<number>>(new Set())
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [newGuest, setNewGuest] = useState({
    first_name: '',
    last_name: '',
    email: '',
    table_id: null as number | null
  })

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

  const handleAddNewGuest = async () => {
    if (!newGuest.first_name || !newGuest.last_name) {
      setMessage('❌ Prénom et nom sont obligatoires')
      return
    }

    setLoading(true)
    try {
      // Générer un QR code unique pour l'invité
      const qrCode = `WEDDING-${newGuest.first_name.trim()} ${newGuest.last_name.trim()}-${Date.now()}`

      // Créer l'invité
      const { data: createdGuest, error: guestError } = await supabase
        .from('guests')
        .insert({
          first_name: newGuest.first_name.trim(),
          last_name: newGuest.last_name.trim(),
          email: newGuest.email?.trim() || null,
          qr_code: qrCode,
          invitation_sent: false,
          rsvp_status: 'confirmed',
          checked_in: false
        })
        .select()
        .single()

      if (guestError) throw guestError

      // Si une table est sélectionnée, assigner directement
      if (newGuest.table_id) {
        // Trouver le prochain siège disponible
        const { data: existingSeats } = await supabase
          .from('seating_assignments')
          .select('seat_number')
          .eq('table_id', newGuest.table_id)

        const occupiedSeats = existingSeats?.map(s => s.seat_number) || []
        let nextSeat = 1
        while (occupiedSeats.includes(nextSeat) && nextSeat <= 10) {
          nextSeat++
        }

        // Créer l'assignation
        const { error: assignError } = await supabase
          .from('seating_assignments')
          .insert({
            guest_id: createdGuest.id,
            table_id: newGuest.table_id,
            seat_number: nextSeat,
            qr_code: `WEDDING-${createdGuest.first_name} ${createdGuest.last_name}-${Date.now()}`,
            checked_in: false
          })

        if (assignError) {
          console.error('Error assigning seat:', assignError)
          setMessage(`✅ ${newGuest.first_name} ajouté mais non assigné`)
        } else {
          setMessage(`✅ ${newGuest.first_name} ajouté à la table ${newGuest.table_id}`)
        }
      } else {
        setMessage(`✅ ${newGuest.first_name} ajouté (non assigné)`)
      }

      // Réinitialiser le formulaire
      setNewGuest({ first_name: '', last_name: '', email: '', table_id: null })
      setShowAddGuest(false)
      await loadData()

    } catch (error) {
      console.error('Error adding guest:', error)
      setMessage('❌ Erreur lors de l\'ajout')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGuest = async (guestId: string) => {
    if (!confirm('Supprimer définitivement cet invité ?')) {
      return
    }

    setLoading(true)
    try {
      // Supprimer d'abord les assignations si elles existent
      await supabase
        .from('seating_assignments')
        .delete()
        .eq('guest_id', guestId)

      // Puis supprimer l'invité
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestId)

      if (error) throw error

      setMessage('✅ Invité supprimé')
      await loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error deleting guest:', error)
      setMessage('❌ Erreur lors de la suppression')
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

  const toggleTableExpansion = (tableNumber: number) => {
    const newExpanded = new Set(expandedTables)
    if (newExpanded.has(tableNumber)) {
      newExpanded.delete(tableNumber)
    } else {
      newExpanded.add(tableNumber)
    }
    setExpandedTables(newExpanded)
  }

  const filteredGuests = guests.filter(g => {
    const matchesSearch = !searchTerm ||
      `${g.first_name} ${g.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())

    if (viewMode === 'guests' && searchMode === 'unassigned') {
      return matchesSearch && !g.is_assigned
    }
    return matchesSearch
  })

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
          <Link href="/" className="text-purple-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold">Gestion des Places</h1>
          <button
            onClick={() => setShowAddGuest(true)}
            className="bg-green-600 text-white p-2 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
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
              {tables.filter(t => t.table_number !== 27).reduce((acc, t) => acc + t.available_seats, 0)}
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
        <div className="p-4">
          {/* Barre de recherche permanente */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Rechercher un invité dans les tables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {searchTerm && (
              <p className="text-xs text-gray-500 mt-2">
                Affichage des tables contenant "{searchTerm}"
              </p>
            )}
          </div>

          <div className="space-y-3">

          {tables.map(table => {
            // Si recherche active, n'afficher que les tables avec des invités correspondants
            const hasMatchingGuests = searchTerm
              ? table.seated_guests?.some((guest: any) =>
                  guest.guest_name.toLowerCase().includes(searchTerm.toLowerCase())
                )
              : true

            if (!hasMatchingGuests) return null

            return (
            <div
              key={table.table_number}
              className="bg-white rounded-lg shadow-sm overflow-hidden"
              style={{
                borderLeft: `4px solid ${table.color_code}`
              }}
            >
              {/* En-tête de table */}
              <button
                onClick={() => toggleTableExpansion(table.table_number)}
                className="w-full p-3 flex items-center justify-between hover:bg-gray-50"
                style={{ backgroundColor: `${table.color_code}10` }}
              >
                <div>
                  <div className="font-bold flex items-center gap-2">
                    Table {table.table_number}
                    {table.table_number <= 3 && <span className="text-yellow-500">⭐</span>}
                  </div>
                  <div className="text-sm text-gray-600">{table.table_name}</div>
                </div>
                <div className="flex items-center gap-3">
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
                  <svg
                    className={`w-5 h-5 text-gray-400 transform transition-transform ${
                      expandedTables.has(table.table_number) ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Liste des invités (expandable) */}
              {expandedTables.has(table.table_number) && (
                <>
                  {table.seated_guests && table.seated_guests.length > 0 ? (
                    <div className="p-2 space-y-1 border-t">
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
                              <span className="text-green-600 text-xs">✓ Présent</span>
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
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-sm border-t">
                      Aucun invité assigné
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
                          }}
                          className="w-full py-2 text-purple-600 font-medium"
                        >
                          + Ajouter un invité
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            )
          })}
          </div>
        </div>
      )}

      {/* Vue Invités */}
      {viewMode === 'guests' && (
        <div className="p-4">
          {/* Recherche */}
          <div className="space-y-3 mb-4">
            <input
              type="text"
              placeholder="Rechercher un invité..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />

            {/* Filtres de recherche */}
            <div className="flex gap-2">
              <button
                onClick={() => setSearchMode('all')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  searchMode === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Tous ({guests.length})
              </button>
              <button
                onClick={() => setSearchMode('unassigned')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  searchMode === 'unassigned'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Non assignés ({guests.filter(g => !g.is_assigned).length})
              </button>
            </div>
          </div>

          {/* Liste des invités */}
          <div className="space-y-2">
            {filteredGuests
              .filter(g => searchMode === 'all' || !g.is_assigned)
              .map(guest => (
                <div
                  key={guest.id}
                  className="bg-white p-3 rounded-lg shadow-sm flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {guest.first_name} {guest.last_name}
                    </div>
                    {guest.is_assigned && guest.table_number && (
                      <div className="text-xs text-gray-500">
                        Table {guest.table_number} - {guest.table_name}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setMovingGuest(guest)
                        setViewMode('tables')
                      }}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        guest.is_assigned
                          ? 'bg-blue-600 text-white'
                          : 'bg-purple-600 text-white'
                      }`}
                    >
                      {guest.is_assigned ? 'Déplacer' : 'Assigner'}
                    </button>
                    {!guest.is_assigned && (
                      <button
                        onClick={() => handleDeleteGuest(guest.id)}
                        className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                        title="Supprimer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {filteredGuests.filter(g => searchMode === 'all' || !g.is_assigned).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm
                ? 'Aucun invité trouvé'
                : searchMode === 'unassigned'
                  ? 'Tous les invités sont assignés'
                  : 'Aucune donnée'}
            </div>
          )}
        </div>
      )}

      {/* Modal d'ajout d'invité - Version Mobile */}
      {showAddGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white rounded-t-2xl p-6 w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Nouvel invité</h3>
              <button
                onClick={() => {
                  setShowAddGuest(false)
                  setNewGuest({ first_name: '', last_name: '', email: '', table_id: null })
                }}
                className="text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom *
                </label>
                <input
                  type="text"
                  value={newGuest.first_name}
                  onChange={(e) => setNewGuest({ ...newGuest, first_name: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Jean"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  value={newGuest.last_name}
                  onChange={(e) => setNewGuest({ ...newGuest, last_name: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Dupont"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (optionnel)
                </label>
                <input
                  type="email"
                  value={newGuest.email}
                  onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="jean.dupont@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Table (optionnel)
                </label>
                <select
                  value={newGuest.table_id || ''}
                  onChange={(e) => setNewGuest({ ...newGuest, table_id: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">-- Non assigné --</option>
                  {tables
                    .filter(t => t.available_seats > 0)
                    .map(table => (
                      <option key={table.table_number} value={table.table_number}>
                        Table {table.table_number} ({table.available_seats} pl.)
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleAddNewGuest}
              disabled={!newGuest.first_name || !newGuest.last_name}
              className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg font-semibold disabled:bg-gray-300 disabled:text-gray-500"
            >
              Ajouter l'invité
            </button>
          </div>
        </div>
      )}
    </div>
  )
}