'use client'

import { useState } from 'react'

interface Guest {
  id: string
  name: string
  email?: string
  seat_number?: number
  plus_ones?: number
}

interface TableSeatMapProps {
  tableId: number
  tableNumber: number
  tableName?: string
  capacity: number
  guests: Guest[]
  onSeatClick: (seatNumber: number, guest?: Guest) => void
  onGuestMove?: (guestId: string, fromSeat: number | null, toSeat: number | null) => void
  selectedGuest?: string | null
  highlightedSeats?: number[]
}

export default function TableSeatMap({
  tableId,
  tableNumber,
  tableName,
  capacity,
  guests,
  onSeatClick,
  onGuestMove,
  selectedGuest,
  highlightedSeats = []
}: TableSeatMapProps) {
  const [hoveredSeat, setHoveredSeat] = useState<number | null>(null)
  const [draggedGuest, setDraggedGuest] = useState<Guest | null>(null)

  // Create a map of seat numbers to guests
  const seatMap = new Map<number, Guest>()
  guests.forEach(guest => {
    if (guest.seat_number) {
      seatMap.set(guest.seat_number, guest)
    }
  })

  // Calculate grid dimensions based on capacity
  const getGridDimensions = (capacity: number) => {
    if (capacity <= 4) return { cols: 2, rows: 2 }
    if (capacity <= 6) return { cols: 3, rows: 2 }
    if (capacity <= 8) return { cols: 4, rows: 2 }
    if (capacity <= 10) return { cols: 5, rows: 2 }
    if (capacity <= 12) return { cols: 4, rows: 3 }
    if (capacity <= 16) return { cols: 4, rows: 4 }
    if (capacity <= 20) return { cols: 5, rows: 4 }
    return { cols: 5, rows: Math.ceil(capacity / 5) }
  }

  const { cols, rows } = getGridDimensions(capacity)

  const handleDragStart = (e: React.DragEvent, guest: Guest) => {
    setDraggedGuest(guest)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, seatNumber: number) => {
    e.preventDefault()
    if (draggedGuest && onGuestMove) {
      onGuestMove(draggedGuest.id, draggedGuest.seat_number || null, seatNumber)
    }
    setDraggedGuest(null)
  }

  const getSeatColor = (seatNumber: number, guest?: Guest) => {
    if (highlightedSeats.includes(seatNumber)) {
      return 'bg-yellow-300 border-yellow-500'
    }
    if (guest) {
      if (selectedGuest === guest.id) {
        return 'bg-wedding-pink border-wedding-darkPink'
      }
      return 'bg-wedding-lightPink border-wedding-pink'
    }
    return 'bg-gray-100 border-gray-300 hover:bg-gray-200'
  }

  const getSeatContent = (guest?: Guest) => {
    if (!guest) return null
    
    const initials = guest.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    
    return (
      <div className="text-xs font-semibold text-gray-700">
        {initials}
        {guest.plus_ones && guest.plus_ones > 0 && (
          <span className="text-[10px] absolute -top-1 -right-1 bg-wedding-gold rounded-full w-4 h-4 flex items-center justify-center">
            +{guest.plus_ones}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="text-center mb-3">
        <h3 className="font-bold text-lg">Table {tableNumber}</h3>
        {tableName && <p className="text-sm text-gray-600">{tableName}</p>}
        <p className="text-xs text-gray-500 mt-1">
          {guests.filter(g => g.seat_number).length}/{capacity} place(s) occupée(s)
        </p>
      </div>
      
      <div 
        className="inline-grid gap-1 mx-auto"
        style={{ 
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          maxWidth: `${cols * 48 + (cols - 1) * 4}px`
        }}
      >
        {Array.from({ length: capacity }, (_, i) => {
          const seatNumber = i + 1
          const guest = seatMap.get(seatNumber)
          const isHovered = hoveredSeat === seatNumber
          
          return (
            <div
              key={seatNumber}
              className={`
                relative w-12 h-12 border-2 rounded cursor-pointer transition-all duration-200
                flex items-center justify-center
                ${getSeatColor(seatNumber, guest)}
                ${isHovered ? 'transform scale-110 z-10' : ''}
              `}
              onClick={() => onSeatClick(seatNumber, guest)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, seatNumber)}
              onMouseEnter={() => setHoveredSeat(seatNumber)}
              onMouseLeave={() => setHoveredSeat(null)}
              draggable={!!guest}
              onDragStart={(e) => guest && handleDragStart(e, guest)}
              title={guest ? `${guest.name}${guest.email ? ` - ${guest.email}` : ''}` : `Seat ${seatNumber}`}
            >
              {getSeatContent(guest)}
              <span className="absolute bottom-0 right-0 text-[8px] text-gray-400 pr-1">
                {seatNumber}
              </span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-wedding-lightPink border border-wedding-pink rounded"></div>
          <span>Occupied</span>
        </div>
      </div>

      {/* Tooltip for hovered seat */}
      {hoveredSeat && seatMap.get(hoveredSeat) && (
        <div className="absolute z-20 bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: '100%',
            marginBottom: '4px'
          }}
        >
          {seatMap.get(hoveredSeat)!.name}
        </div>
      )}
    </div>
  )
}