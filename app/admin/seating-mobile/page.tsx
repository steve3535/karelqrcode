'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Guest = {
  id: string
  first_name: string
  last_name: string
  table_id?: string
  table_number?: number
  checked_in: boolean
  is_assigned: boolean
}

type Table = {
  id: string
  table_number: number
  table_name: string
  capacity: number
  occupied_seats: number
  available_seats: number
  color_code: string
  color_name: string
}

type TableWithGuests = Table & {
  guests: Guest[]
}

export default function SeatingMobilePage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [tableGuests, setTableGuests] = useState<{[tableId: string]: Guest[]}>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [selectedTable, setSelectedTable] = useState<TableWithGuests | null>(null)
  const [showTableModal, setShowTableModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(true)
  const [step, setStep] = useState<'selectGuest' | 'selectTable'>('selectGuest')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Charger tous les invités
      const { data: guestsData, error: guestsError } = await supabase
        .from('all_guests_status')
        .select('*')
        .order('last_name')

      if (guestsError) throw guestsError

      // Charger les tables
      const { data: tablesData, error: tablesError } = await supabase
        .from('table_status')
        .select('*')
        .order('table_number')

      if (tablesError) throw tablesError

      // Charger les invités par table
      const guestsByTable: {[tableId: string]: Guest[]} = {}
      if (guestsData) {
        guestsData.forEach(guest => {
          if (guest.table_id) {
            if (!guestsByTable[guest.table_id]) {
              guestsByTable[guest.table_id] = []
            }
            guestsByTable[guest.table_id].push(guest)
          }
        })
      }

      setGuests(guestsData || [])
      setTables(tablesData || [])
      setTableGuests(guestsByTable)
    } catch (error) {
      console.error('Error loading data:', error)
      setMessage('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectGuest = (guest: Guest) => {
    if (guest.checked_in) {
      setMessage('⚠️ Cet invité est déjà présent')
      return
    }
    setSelectedGuest(guest)
    setStep('selectTable')
    setMessage('')
  }

  const handleTableClick = (table: Table) => {
    // Préparer les données de la table avec ses occupants
    const tableWithGuests: TableWithGuests = {
      ...table,
      guests: tableGuests[table.id] || []
    }
    setSelectedTable(tableWithGuests)
    setShowTableModal(true)
  }

  const handleAssignTable = async (tableId: string) => {
    if (!selectedGuest) return

    setShowTableModal(false)
    setLoading(true)
    try {
      // Supprimer les anciennes assignations
      await supabase
        .from('seating_assignments')
        .delete()
        .eq('guest_id', selectedGuest.id)

      // Trouver le prochain siège disponible
      const { data: existingSeats } = await supabase
        .from('seating_assignments')
        .select('seat_number')
        .eq('table_id', tableId)

      const occupiedSeats = existingSeats?.map(s => s.seat_number) || []
      let nextSeat = 1
      while (occupiedSeats.includes(nextSeat) && nextSeat <= 10) {
        nextSeat++
      }

      // Créer la nouvelle assignation
      const { error } = await supabase
        .from('seating_assignments')
        .insert({
          guest_id: selectedGuest.id,
          table_id: tableId,
          seat_number: nextSeat,
          qr_code: `WEDDING-${selectedGuest.id}-TABLE${tableId}`,
          checked_in: false
        })

      if (error) throw error

      setMessage('✅ Invité assigné avec succès!')
      await loadData()
      
      // Réinitialiser
      setSelectedGuest(null)
      setStep('selectGuest')
      setSearchTerm('')
      
      // Effacer le message après 3 secondes
      setTimeout(() => setMessage(''), 3000)
      
    } catch (error) {
      console.error('Error assigning guest:', error)
      setMessage('❌ Erreur lors de l\'assignation')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFromTable = async (guestId: string) => {
    if (confirm('Retirer cet invité de sa table ?')) {
      setLoading(true)
      try {
        await supabase
          .from('seating_assignments')
          .delete()
          .eq('guest_id', guestId)

        setMessage('✅ Invité retiré de la table')
        await loadData()
        setSelectedGuest(null)
        setStep('selectGuest')
        
        setTimeout(() => setMessage(''), 3000)
      } catch (error) {
        console.error('Error removing guest:', error)
        setMessage('❌ Erreur lors du retrait')
      } finally {
        setLoading(false)
      }
    }
  }

  const filteredGuests = guests.filter(guest => {
    const matchesSearch = `${guest.first_name} ${guest.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
    
    if (showOnlyUnassigned) {
      return matchesSearch && !guest.is_assigned && !guest.checked_in
    }
    return matchesSearch
  })

  if (loading && !guests.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Header simplifié */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <Link href="/" className="p-2 -ml-2">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold text-gray-800">Gestion des Places</h1>
            <div className="w-10"></div>
          </div>
          
          {/* Bouton QR Codes plus visible */}
          <Link 
            href="/admin/qrcodes" 
            className="block w-full py-2 bg-purple-100 text-purple-700 rounded-lg text-center text-sm font-medium"
          >
            📱 Voir les QR Codes
          </Link>
        </div>

        {/* Stats */}
        <div className="px-4 pb-3 flex justify-around text-sm">
          <div className="text-center">
            <div className="font-bold text-lg">{guests.filter(g => !g.is_assigned).length}</div>
            <div className="text-gray-500">Non assignés</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-blue-600">{guests.filter(g => g.is_assigned && !g.checked_in).length}</div>
            <div className="text-gray-500">Assignés</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-green-600">{tables.reduce((acc, t) => acc + t.available_seats, 0)}</div>
            <div className="text-gray-500">Places libres</div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mx-4 mb-3 p-2 rounded text-center text-sm font-medium ${
            message.includes('✅') ? 'bg-green-100 text-green-800' :
            message.includes('❌') ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Étape 1: Sélection de l'invité */}
      {step === 'selectGuest' && (
        <div className="p-4">
          {/* Barre de recherche */}
          <div className="mb-4 space-y-3">
            <input
              type="text"
              placeholder="Rechercher un invité..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              autoFocus
            />
            
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showOnlyUnassigned}
                onChange={(e) => setShowOnlyUnassigned(e.target.checked)}
                className="rounded"
              />
              <span>Afficher uniquement les non assignés</span>
            </label>
          </div>

          {/* Liste des invités */}
          <div className="space-y-2 pb-20">
            {filteredGuests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'Aucun invité trouvé' : 'Tous les invités sont assignés'}
              </div>
            ) : (
              filteredGuests.map(guest => (
                <button
                  key={guest.id}
                  onClick={() => handleSelectGuest(guest)}
                  disabled={guest.checked_in}
                  className={`w-full p-4 bg-white rounded-lg shadow-sm text-left flex items-center justify-between transition-all ${
                    guest.checked_in 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'active:scale-95 hover:shadow-md'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {guest.first_name} {guest.last_name}
                    </div>
                    {guest.table_number && (
                      <div className="text-sm text-gray-500 mt-1">
                        Table {guest.table_number}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {guest.checked_in && (
                      <span className="text-green-600">✓</span>
                    )}
                    {guest.is_assigned && !guest.checked_in && (
                      <span className="text-blue-600">◉</span>
                    )}
                    {!guest.is_assigned && (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Étape 2: Sélection de la table */}
      {step === 'selectTable' && selectedGuest && (
        <div className="p-4">
          {/* Invité sélectionné */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Assigner à une table :</div>
                <div className="font-bold text-lg">
                  {selectedGuest.first_name} {selectedGuest.last_name}
                </div>
                {selectedGuest.table_number && (
                  <div className="text-sm text-orange-600 mt-1">
                    Actuellement : Table {selectedGuest.table_number}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedGuest(null)
                  setStep('selectGuest')
                }}
                className="text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Bouton pour retirer de la table actuelle */}
            {selectedGuest.is_assigned && (
              <button
                onClick={() => handleRemoveFromTable(selectedGuest.id)}
                className="mt-3 w-full py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium"
              >
                Retirer de la table actuelle
              </button>
            )}
          </div>

          {/* Grille des tables */}
          <div className="grid grid-cols-2 gap-3 pb-20">
            {tables.map(table => {
              const guestsAtTable = tableGuests[table.id] || []
              const displayGuests = guestsAtTable.slice(0, 2)
              
              return (
                <button
                  key={table.id}
                  onClick={() => handleTableClick(table)}
                  disabled={table.available_seats === 0}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    table.available_seats === 0
                      ? 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
                      : 'bg-white active:scale-95 hover:shadow-md'
                  }`}
                  style={{
                    borderColor: table.available_seats > 0 ? table.color_code : undefined,
                    backgroundColor: table.available_seats > 0 ? `${table.color_code}10` : undefined
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: table.color_code }}
                    />
                    <span className="text-xs font-medium">
                      {table.occupied_seats}/{table.capacity}
                    </span>
                  </div>
                  <div className="font-bold text-sm">
                    Table {table.table_number}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {table.table_name}
                  </div>
                  
                  {/* Aperçu des invités */}
                  {guestsAtTable.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      {displayGuests.map((guest, idx) => (
                        <div key={guest.id} className="text-xs text-gray-700 truncate">
                          • {guest.first_name} {guest.last_name}
                        </div>
                      ))}
                      {guestsAtTable.length > 2 && (
                        <div className="text-xs text-gray-500 italic">
                          +{guestsAtTable.length - 2} autres...
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className={`text-xs mt-2 font-medium ${
                    table.available_seats === 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {table.available_seats === 0 
                      ? 'Complète' 
                      : `${table.available_seats} place${table.available_seats > 1 ? 's' : ''}`
                    }
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal détails de table */}
      {showTableModal && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
            {/* Header du modal */}
            <div 
              className="p-4 border-b"
              style={{ backgroundColor: `${selectedTable.color_code}20` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">Table {selectedTable.table_number}</h3>
                  <p className="text-sm text-gray-600">{selectedTable.table_name}</p>
                  <p className="text-sm mt-1">
                    <span className="font-medium">{selectedTable.occupied_seats}/{selectedTable.capacity}</span> places occupées
                  </p>
                </div>
                <button
                  onClick={() => setShowTableModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Liste des invités */}
            <div className="p-4 max-h-[50vh] overflow-y-auto">
              {selectedTable.guests.length > 0 ? (
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-3">Invités à cette table :</h4>
                  <div className="space-y-2">
                    {selectedTable.guests.map((guest, index) => (
                      <div 
                        key={guest.id} 
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-500">
                            {index + 1}.
                          </span>
                          <span className="text-sm font-medium">
                            {guest.first_name} {guest.last_name}
                          </span>
                        </div>
                        {guest.checked_in && (
                          <span className="text-green-600 text-sm">✓ Présent</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Aucun invité assigné à cette table</p>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t bg-gray-50">
              {selectedTable.available_seats > 0 ? (
                <button
                  onClick={() => handleAssignTable(selectedTable.id)}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium"
                >
                  Assigner {selectedGuest?.first_name} {selectedGuest?.last_name} ici
                </button>
              ) : (
                <div className="text-center text-red-600 font-medium">
                  Table complète - Aucune place disponible
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          </div>
        </div>
      )}
    </div>
  )
}