'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Détection mobile pour le bon backend DnD
const isTouchDevice = () => {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

type Guest = {
  id: string
  first_name: string
  last_name: string
  email?: string
  table_id?: number
  seat_number?: number
  checked_in: boolean
  qr_code: string
}

type Table = {
  id: number
  table_number: number
  table_name: string
  capacity: number
  color_code: string
  color_name: string
  is_vip: boolean
  occupied_seats: number
  available_seats: number
  seated_guests: any[]
}

// Composant Invité draggable avec statut (pour la liste complète)
function DraggableGuestWithStatus({ guest, onDelete }: { guest: any, onDelete?: (id: string) => void }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'guest',
    item: guest,
    canDrag: !guest.checked_in, // Empêcher de déplacer un invité déjà présent
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }))

  const guestName = `${guest.first_name} ${guest.last_name}`

  return (
    <div
      ref={!guest.checked_in ? drag : undefined}
      className={`flex items-center justify-between p-2 bg-white rounded-lg shadow-sm transition-all ${
        guest.checked_in 
          ? 'opacity-60 cursor-not-allowed' 
          : isDragging 
            ? 'opacity-50 scale-95' 
            : 'hover:shadow-md cursor-move'
      }`}
      style={{ touchAction: 'none' }}
    >
      <div className="flex items-center gap-2 flex-1">
        <span className="text-sm font-medium truncate" title={guestName}>
          {guestName}
        </span>
        {guest.table_number && (
          <span 
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ 
              backgroundColor: guest.color_code ? `${guest.color_code}20` : '#e5e7eb',
              color: guest.color_code || '#6b7280'
            }}
          >
            T{guest.table_number}
          </span>
        )}
      </div>
      <div className="flex gap-1">
        {guest.checked_in && (
          <span className="text-green-600" title="Présent">
            ✓
          </span>
        )}
        {guest.is_assigned && !guest.checked_in && (
          <span className="text-blue-600" title="Assigné">
            ◉
          </span>
        )}
        {!guest.is_assigned && (
          <>
            <span className="text-gray-400" title="Non assigné">
              ○
            </span>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(guest.id)
                }}
                className="ml-1 text-red-500 hover:text-red-700"
                title="Supprimer définitivement"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Composant pour un invité draggable
function DraggableGuest({ guest, onRemove, compact = false }: { 
  guest: Guest; 
  onRemove?: () => void;
  compact?: boolean;
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'guest',
    item: guest,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))

  const guestName = `${guest.first_name} ${guest.last_name}`

  if (compact) {
    // Version compacte pour les tables avec beaucoup d'invités
    return (
      <div
        ref={drag}
        className={`inline-flex items-center gap-1 px-2 py-1 bg-white rounded-md shadow-sm cursor-move transition-all text-xs ${
          isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'
        }`}
        style={{ touchAction: 'none' }}
      >
        <span className="font-medium truncate max-w-[120px]" title={guestName}>
          {guestName}
        </span>
        {guest.checked_in && <span className="text-green-600">✓</span>}
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 ml-1"
          >
            ✕
          </button>
        )}
      </div>
    )
  }

  // Version normale pour la liste des invités sans table
  return (
    <div
      ref={drag}
      className={`p-2 bg-white rounded-lg shadow cursor-move transition-all ${
        isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'
      }`}
      style={{ touchAction: 'none' }}
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium text-sm">{guestName}</p>
          {guest.checked_in && (
            <span className="text-xs text-green-600">✓ Présent</span>
          )}
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

// Composant pour une table droppable
function DroppableTable({ table, onDrop, onRemoveGuest }: { 
  table: Table; 
  onDrop: (guest: Guest, tableId: number) => void;
  onRemoveGuest: (guestId: string) => void;
}) {
  const isFull = table.available_seats === 0
  
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'guest',
    drop: (item: Guest) => {
      if (!isFull) {
        onDrop(item, table.table_number)  // Utiliser table_number au lieu de id
      }
    },
    canDrop: () => !isFull,
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }))

  // Utiliser la version compacte si plus de 4 invités
  const useCompactMode = table.seated_guests && table.seated_guests.length > 4

  return (
    <div
      ref={drop}
      className={`border-2 rounded-xl p-4 transition-all min-h-[200px] ${
        isOver && canDrop ? 'border-blue-500 bg-blue-50 scale-105' : 
        isOver && !canDrop ? 'border-red-500 bg-red-50' : 
        'border-gray-200'
      } ${isFull ? 'bg-gray-50' : ''}`}
      style={{ 
        borderColor: isOver ? undefined : table.color_code,
        backgroundColor: isOver ? undefined : isFull ? '#f9fafb' : `${table.color_code}20`
      }}
    >
      {/* En-tête de table */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-base flex items-center">
            <span 
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: table.color_code }}
            ></span>
            Table {table.table_number}
            {table.is_vip && (
              <span className="ml-1 text-yellow-500 text-sm">⭐</span>
            )}
          </h3>
          <span className={`text-sm font-bold ${isFull ? 'text-red-600' : 'text-gray-700'}`}>
            {table.occupied_seats}/{table.capacity}
          </span>
        </div>
        
        {table.table_name && (
          <p className="text-xs text-gray-600">{table.table_name}</p>
        )}
        <p className="text-xs text-gray-500">{table.color_name}</p>
      </div>

      {/* Liste des invités */}
      <div className={useCompactMode ? "flex flex-wrap gap-1" : "space-y-2"}>
        {table.seated_guests && table.seated_guests.length > 0 ? (
          table.seated_guests.map((guest: any) => (
            <DraggableGuest
              key={guest.guest_id}
              guest={{
                id: guest.guest_id,
                first_name: guest.guest_name.split(' ')[0],
                last_name: guest.guest_name.split(' ').slice(1).join(' '),
                checked_in: guest.checked_in,
                table_id: table.id,
                seat_number: guest.seat_number,
                qr_code: ''
              }}
              onRemove={() => onRemoveGuest(guest.guest_id)}
              compact={useCompactMode}
            />
          ))
        ) : (
          <p className="text-gray-400 text-center text-sm italic py-8">
            Glissez des invités ici
          </p>
        )}
      </div>

      {/* Indicateur de places libres ou table pleine */}
      <div className="mt-3 text-center">
        {isFull ? (
          <span className="text-xs text-red-600 font-bold bg-red-100 px-2 py-1 rounded">
            Table complète
          </span>
        ) : (
          <span className="text-xs text-green-600 font-medium">
            {table.available_seats} place{table.available_seats > 1 ? 's' : ''} libre{table.available_seats > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Message d'avertissement lors du survol avec une table pleine */}
      {isOver && !canDrop && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg">
            Table pleine !
          </div>
        </div>
      )}
    </div>
  )
}

// Composant principal
function SeatingManagement() {
  const router = useRouter()
  const [tables, setTables] = useState<Table[]>([])
  const [allGuests, setAllGuests] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'unassigned' | 'assigned' | 'checked_in'>('all')
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [newGuest, setNewGuest] = useState({
    first_name: '',
    last_name: '',
    email: '',
    table_id: null as number | null
  })

  // Détecter si on est sur mobile et rediriger
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth <= 768
      if (isMobile) {
        router.push('/admin/seating-mobile-v2')
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [router])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Charger les tables avec leurs invités
      const { data: tablesData, error: tablesError } = await supabase
        .from('table_status')
        .select('*')
        .order('table_number')

      if (tablesError) throw tablesError

      // Charger TOUS les invités avec leur statut
      const { data: guestsData, error: guestsError } = await supabase
        .from('all_guests_status')
        .select('*')
        .order('last_name')

      if (guestsError) throw guestsError

      setTables(tablesData || [])
      setAllGuests(guestsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
      setMessage('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = async (guest: any, tableId: number) => {
    try {
      // Vérifier si l'invité est déjà assigné à cette même table
      if (guest.table_id === tableId) {
        setMessage('ℹ️ Cet invité est déjà à cette table')
        return
      }
      
      // Vérifier d'abord si la table a de la place
      const targetTable = tables.find(t => t.table_number === tableId)
      if (targetTable && targetTable.available_seats === 0) {
        setMessage('❌ Table pleine ! Plus de places disponibles sur cette table.')
        return
      }

      // D'abord, SUPPRIMER toutes les anciennes assignations de cet invité
      const { error: deleteError } = await supabase
        .from('seating_assignments')
        .delete()
        .eq('guest_id', guest.id)

      if (deleteError) {
        console.error('Error deleting old assignments:', deleteError)
      }

      // Trouver le prochain siège disponible pour cette table
      const { data: existingSeats } = await supabase
        .from('seating_assignments')
        .select('seat_number')
        .eq('table_id', tableId)
        .order('seat_number')

      const usedSeats = existingSeats?.map(s => s.seat_number) || []

      // Vérifier qu'il y a vraiment une place libre (utiliser la capacité réelle de la table)
      const tableCapacity = targetTable?.capacity || 10
      if (usedSeats.length >= tableCapacity) {
        setMessage(`❌ Table pleine ! Cette table a déjà ${tableCapacity} invités.`)
        return
      }

      let nextSeat = 1
      for (let i = 1; i <= tableCapacity; i++) {
        if (!usedSeats.includes(i)) {
          nextSeat = i
          break
        }
      }

      // Créer la nouvelle assignation
      const { error } = await supabase
        .from('seating_assignments')
        .insert({
          guest_id: guest.id,
          table_id: tableId,
          seat_number: nextSeat,
          qr_code: `WEDDING-${guest.id}-TABLE${tableId}`,
          checked_in: false
        })

      if (error) {
        // Message d'erreur plus clair selon le type d'erreur
        if (error.message.includes('duplicate key')) {
          setMessage('❌ Cette place est déjà occupée. Veuillez réessayer.')
        } else if (error.message.includes('unique constraint')) {
          setMessage('❌ Conflit de place. Veuillez rafraîchir la page.')
        } else {
          setMessage('❌ Impossible d\'assigner cette place.')
        }
        console.error('Error:', error)
        return
      }

      setMessage('✅ Place assignée avec succès')
      await loadData() // Recharger les données
    } catch (error) {
      console.error('Error assigning seat:', error)
      setMessage('❌ Une erreur est survenue. Veuillez réessayer.')
    }
  }

  const handleAddNewGuest = async () => {
    if (!newGuest.first_name || !newGuest.last_name) {
      setMessage('❌ Prénom et nom sont obligatoires')
      return
    }

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
          setMessage(`✅ Invité créé mais non assigné à la table`)
        } else {
          setMessage(`✅ ${newGuest.first_name} ajouté et assigné à la table ${newGuest.table_id}`)
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
      setMessage('❌ Erreur lors de l\'ajout de l\'invité')
    }
  }

  const handleDeleteGuest = async (guestId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cet invité ?')) {
      return
    }

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

      setMessage('✅ Invité supprimé définitivement')
      await loadData()
    } catch (error) {
      console.error('Error deleting guest:', error)
      setMessage('❌ Erreur lors de la suppression')
    }
  }

  const handleRemoveGuest = async (guestId: string) => {
    try {
      console.log('Removing guest:', guestId)
      
      // SUPPRIMER toutes les assignations de cet invité
      const { data, error } = await supabase
        .from('seating_assignments')
        .delete()
        .eq('guest_id', guestId)
        .select()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log(`Deleted ${data?.length || 0} assignments for guest ${guestId}`)

      setMessage('✅ Invité retiré de la table')
      await loadData()
    } catch (error) {
      console.error('Error removing guest:', error)
      setMessage(`❌ Erreur lors du retrait: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  const filteredGuests = allGuests
    .filter(guest => {
      // Filtrer par statut
      if (filterStatus === 'unassigned' && guest.is_assigned) return false
      if (filterStatus === 'assigned' && (!guest.is_assigned || guest.checked_in)) return false
      if (filterStatus === 'checked_in' && !guest.checked_in) return false
      
      // Filtrer par recherche
      return `${guest.first_name} ${guest.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-800">
            Gestion des Places
          </h1>
          <div className="flex gap-3">
            <Link href="/admin/qrcodes" className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 transition-all flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              QR Codes
            </Link>
            <Link href="/" className="bg-white text-gray-600 px-4 py-2 rounded-lg shadow hover:shadow-lg transition-all flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="bg-white px-4 py-2 rounded-lg shadow">
            <span className="text-gray-600">Total invités: </span>
            <span className="font-bold">{allGuests.length}</span>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg shadow">
            <span className="text-gray-600">Places occupées: </span>
            <span className="font-bold">{tables.filter(t => t.table_number !== 27).reduce((acc, t) => acc + t.occupied_seats, 0)}</span>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg shadow">
            <span className="text-gray-600">Places libres: </span>
            <span className="font-bold text-green-600">{tables.filter(t => t.table_number !== 27).reduce((acc, t) => acc + t.available_seats, 0)}</span>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`max-w-7xl mx-auto mb-4 p-4 rounded-lg ${
          message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panneau de tous les invités */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-4 sticky top-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-lg">Tous les invités</h2>
              <button
                onClick={() => setShowAddGuest(true)}
                className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition text-sm"
              >
                + Ajouter
              </button>
            </div>

            {/* Filtres */}
            <div className="flex gap-1 mb-3">
              <button
                onClick={() => setFilterStatus('all')}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  filterStatus === 'all' ? 'bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilterStatus('unassigned')}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  filterStatus === 'unassigned' ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Non assignés
              </button>
              <button
                onClick={() => setFilterStatus('assigned')}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  filterStatus === 'assigned' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Assignés
              </button>
              <button
                onClick={() => setFilterStatus('checked_in')}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  filterStatus === 'checked_in' ? 'bg-green-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Présents
              </button>
            </div>
            
            {/* Recherche */}
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />
            
            {/* Liste des invités */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredGuests.length > 0 ? (
                filteredGuests.map(guest => (
                  <DraggableGuestWithStatus
                    key={guest.id}
                    guest={guest}
                    onDelete={!guest.is_assigned ? handleDeleteGuest : undefined}
                  />
                ))
              ) : (
                <p className="text-gray-400 text-center text-sm italic">
                  Aucun invité trouvé
                </p>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Total :</span>
                  <span className="font-bold">{allGuests.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Non assignés :</span>
                  <span className="font-bold text-red-600">{allGuests.filter(g => !g.is_assigned).length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Assignés :</span>
                  <span className="font-bold text-blue-600">{allGuests.filter(g => g.is_assigned && !g.checked_in).length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Présents :</span>
                  <span className="font-bold text-green-600">{allGuests.filter(g => g.checked_in).length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grille des tables */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tables.map(table => (
              <DroppableTable
                key={table.id}
                table={table}
                onDrop={handleDrop}
                onRemoveGuest={handleRemoveGuest}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modal d'ajout d'invité */}
      {showAddGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Ajouter un nouvel invité</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom *
                </label>
                <input
                  type="text"
                  value={newGuest.first_name}
                  onChange={(e) => setNewGuest({ ...newGuest, first_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="jean.dupont@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigner à une table (optionnel)
                </label>
                <select
                  value={newGuest.table_id || ''}
                  onChange={(e) => setNewGuest({ ...newGuest, table_id: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">-- Non assigné --</option>
                  {tables
                    .filter(t => t.available_seats > 0)
                    .map(table => (
                      <option key={table.id} value={table.id}>
                        Table {table.table_number} - {table.table_name} ({table.available_seats} places libres)
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddNewGuest}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium"
              >
                Ajouter l'invité
              </button>
              <button
                onClick={() => {
                  setShowAddGuest(false)
                  setNewGuest({ first_name: '', last_name: '', email: '', table_id: null })
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Export avec le bon provider DnD
export default function SeatingPage() {
  const Backend = isTouchDevice() ? TouchBackend : HTML5Backend
  
  return (
    <DndProvider backend={Backend}>
      <SeatingManagement />
    </DndProvider>
  )
}