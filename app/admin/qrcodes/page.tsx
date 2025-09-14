'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import QRCode from 'qrcode'

type Guest = {
  id: string  // UUID de l'invité
  first_name: string
  last_name: string
  table_number: number | null
  table_name: string | null
  color_code: string | null
  color_name: string | null
  qr_code: string | null
  is_assigned: boolean
  status: string
}

export default function QRCodesPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [qrCodes, setQrCodes] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, assigned, unassigned
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadGuests()
  }, [])

  const loadGuests = async () => {
    try {
      const { data, error } = await supabase
        .from('all_guests_status')
        .select('*')
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true })

      if (error) throw error

      if (data) {
        setGuests(data)
        // Générer tous les QR codes
        generateAllQRCodes(data)
      }
    } catch (error) {
      console.error('Error loading guests:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateAllQRCodes = async (guestList: Guest[]) => {
    const codes: { [key: string]: string } = {}
    
    console.log('Génération des QR codes pour', guestList.length, 'invités')
    
    for (const guest of guestList) {
      try {
        // Utiliser le qr_code depuis la base de données (géré pour les homonymes)
        const qrContent = guest.qr_code || `WEDDING-${guest.first_name} ${guest.last_name}`
        
        // Debug: afficher quelques exemples
        if (guest.first_name === 'Carine' || guest.first_name === 'Shalom' || guest.first_name === 'Manuella') {
          console.log(`QR pour ${guest.first_name} ${guest.last_name}: "${qrContent}", ID: ${guest.id}`)
        }
        
        const qrDataUrl = await QRCode.toDataURL(qrContent, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        codes[guest.id] = qrDataUrl
      } catch (error) {
        console.error(`Error generating QR for ${guest.first_name} ${guest.last_name}:`, error)
      }
    }
    
    console.log('QR codes générés:', Object.keys(codes).length)
    setQrCodes(codes)
  }

  const downloadQRCode = (guestId: string, firstName: string, lastName: string) => {
    const qrDataUrl = qrCodes[guestId]
    if (!qrDataUrl) return

    const link = document.createElement('a')
    link.download = `QR_${firstName}_${lastName}.png`
    link.href = qrDataUrl
    link.click()
  }

  const downloadAllQRCodes = async () => {
    // Pour télécharger tous les QR codes, on pourrait créer un ZIP
    // Pour l'instant, on les télécharge un par un
    const filteredGuests = getFilteredGuests()
    
    for (const guest of filteredGuests) {
      if (qrCodes[guest.id]) {
        await new Promise(resolve => setTimeout(resolve, 100)) // Petit délai entre chaque téléchargement
        downloadQRCode(guest.id, guest.first_name, guest.last_name)
      }
    }
  }

  const printQRCodes = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const filteredGuests = getFilteredGuests()
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Codes - Mariage Karel & Lambert</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
            .page-break { page-break-after: always; }
            .qr-grid { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 20px;
              padding: 20px;
            }
            .qr-item {
              text-align: center;
              border: 1px solid #ddd;
              padding: 15px;
              break-inside: avoid;
            }
            .qr-item img { 
              width: 150px; 
              height: 150px; 
              margin-bottom: 10px;
            }
            .guest-name { 
              font-weight: bold; 
              font-size: 14px;
              margin-bottom: 5px;
            }
            .table-info { 
              font-size: 12px; 
              color: #666;
              margin-top: 5px;
            }
            .table-color {
              display: inline-block;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              margin-right: 5px;
              vertical-align: middle;
            }
          </style>
        </head>
        <body>
          <h1 style="text-align: center;">QR Codes - Mariage Karel & Lambert</h1>
          <div class="qr-grid">
            ${filteredGuests.map(guest => `
              <div class="qr-item">
                <img src="${qrCodes[guest.id] || ''}" alt="QR Code" />
                <div class="guest-name">${guest.first_name} ${guest.last_name}</div>
                ${guest.table_number ? `
                  <div class="table-info">
                    <span class="table-color" style="background-color: ${guest.color_code || '#ccc'};"></span>
                    Table ${guest.table_number} - ${guest.table_name || ''}
                  </div>
                ` : '<div class="table-info">Non assigné</div>'}
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    
    printWindow.onload = () => {
      printWindow.print()
    }
  }

  const getFilteredGuests = () => {
    let filtered = guests

    // Filtrer par statut d'assignation
    if (filter === 'assigned') {
      filtered = filtered.filter(g => g.is_assigned === true)
    } else if (filter === 'unassigned') {
      filtered = filtered.filter(g => g.is_assigned === false)
    }

    // Filtrer par recherche
    if (searchTerm) {
      filtered = filtered.filter(g => 
        `${g.first_name} ${g.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.table_name && g.table_name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    return filtered
  }

  const filteredGuests = getFilteredGuests()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des QR codes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <Link href="/admin/seating" className="text-gray-600 hover:text-gray-800">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              QR Codes des Invités
            </h1>
            <div className="w-6"></div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={downloadAllQRCodes}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Télécharger tous les QR
            </button>
            <button
              onClick={printQRCodes}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimer les QR
            </button>
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-3 items-center justify-center mt-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filter === 'all' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Tous ({guests.length})
              </button>
              <button
                onClick={() => setFilter('assigned')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filter === 'assigned' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Assignés ({guests.filter(g => g.is_assigned === true).length})
              </button>
              <button
                onClick={() => setFilter('unassigned')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filter === 'unassigned' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Non assignés ({guests.filter(g => g.is_assigned === false).length})
              </button>
            </div>
            <input
              type="text"
              placeholder="Rechercher un invité..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* QR Codes Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredGuests.map(guest => (
            <div key={guest.id} className="bg-white rounded-xl shadow-lg p-4">
              <div className="text-center">
                {qrCodes[guest.id] && (
                  <img
                    src={qrCodes[guest.id]}
                    alt={`QR Code ${guest.first_name} ${guest.last_name}`}
                    className="w-full h-auto mb-3"
                  />
                )}
                <h3 className="font-semibold text-gray-800 text-sm mb-1">
                  {guest.first_name} {guest.last_name}
                </h3>
                {guest.is_assigned ? (
                  <div className="flex items-center justify-center gap-1 text-xs">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: guest.color_code || '#ccc' }}
                    ></span>
                    <span className="text-gray-600">
                      Table {guest.table_number}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-red-500">Non assigné</span>
                )}
                <button
                  onClick={() => downloadQRCode(guest.id, guest.first_name, guest.last_name)}
                  className="mt-2 px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                >
                  Télécharger
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredGuests.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-gray-500">Aucun invité trouvé</p>
          </div>
        )}
      </div>
    </div>
  )
}