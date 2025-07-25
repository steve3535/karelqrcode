'use client'

import { useState, useEffect } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { supabase } from '@/lib/supabase'

interface GuestInfo {
  guest: {
    name: string
    email: string
    plus_ones: number
    dietary_restrictions: string | null
  }
  table: {
    table_number: number
    table_name: string | null
  }
  seating: {
    seat_number: number
    checked_in: boolean
    checked_in_at: string | null
  }
}

export default function ScanPage() {
  const [scanning, setScanning] = useState(true)
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleScan = async (result: any) => {
    if (!result || !result[0]?.rawValue) return
    
    const qrCode = result[0].rawValue
    setScanning(false)
    setError('')
    
    try {
      const { data: seatingData, error: seatingError } = await supabase
        .from('seating_assignments')
        .select(`
          *,
          guests (*),
          tables (*)
        `)
        .eq('qr_code', qrCode)
        .single()

      if (seatingError || !seatingData) {
        throw new Error('Code QR invalide')
      }

      setGuestInfo({
        guest: seatingData.guests,
        table: seatingData.tables,
        seating: {
          seat_number: seatingData.seat_number,
          checked_in: seatingData.checked_in,
          checked_in_at: seatingData.checked_in_at
        }
      })

      if (!seatingData.checked_in) {
        const { error: updateError } = await supabase
          .from('seating_assignments')
          .update({
            checked_in: true,
            checked_in_at: new Date().toISOString()
          })
          .eq('id', seatingData.id)

        if (updateError) {
          console.error('Erreur mise à jour:', updateError)
        } else {
          setSuccess(true)
        }
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetScanner = () => {
    setScanning(true)
    setGuestInfo(null)
    setError('')
    setSuccess(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">Scanner d'Entrée</h1>
          <p className="text-gray-600">Scannez le code QR des invités</p>
        </div>
        
        {scanning && !guestInfo ? (
          <div className="wedding-card animate-fadeIn">
            <div className="gold-gradient p-1">
              <div className="bg-white p-6 sm:p-8">
                <div className="mb-6">
                  <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-center">Scanner le Code QR</h2>
                  <p className="text-gray-600 text-center text-sm sm:text-base">Pointez la caméra vers le code QR de l'invité</p>
                </div>
                
                <div className="scanner-frame aspect-square max-w-md mx-auto">
                  <Scanner
                    onScan={handleScan}
                    onError={(error) => console.error(error)}
                    components={{
                      finder: true,
                    }}
                    styles={{
                      container: {
                        width: '100%',
                        height: '100%',
                        borderRadius: '16px'
                      }
                    }}
                  />
                </div>
                
                {error && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-center animate-fadeIn">
                    <p className="font-medium">{error}</p>
                    <button
                      onClick={resetScanner}
                      className="mt-2 text-sm underline hover:no-underline"
                    >
                      Réessayer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : guestInfo ? (
          <div className="wedding-card animate-fadeIn">
            <div className="gold-gradient p-1">
              <div className="bg-white overflow-hidden">
                {/* Status Header */}
                <div className={`p-6 text-center ${
                  success ? 'bg-gradient-to-br from-green-50 to-green-100' : 
                  guestInfo.seating.checked_in ? 'bg-gradient-to-br from-amber-50 to-amber-100' : 
                  'bg-gradient-to-br from-gray-50 to-gray-100'
                }`}>
                  <div className="mb-4">
                    {success ? (
                      <svg className="w-20 h-20 mx-auto text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : guestInfo.seating.checked_in ? (
                      <svg className="w-20 h-20 mx-auto text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : null}
                  </div>
                  <h2 className={`text-2xl sm:text-3xl font-bold ${
                    success ? 'text-green-800' : 
                    guestInfo.seating.checked_in ? 'text-amber-800' : 
                    'text-gray-800'
                  }`}>
                    {success ? 'Enregistrement Réussi!' : 
                     guestInfo.seating.checked_in ? 'Déjà Enregistré' : 
                     'Informations de l\'Invité'}
                  </h2>
                </div>
                
                <div className="p-6 sm:p-8 space-y-6">
                  {/* Guest Info */}
                  <div className="text-center border-b pb-6">
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-800">{guestInfo.guest.name}</h3>
                    <p className="text-gray-600 mt-1">{guestInfo.guest.email}</p>
                    {guestInfo.guest.plus_ones > 0 && (
                      <p className="text-sm mt-2 text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          Plus {guestInfo.guest.plus_ones} accompagnant{guestInfo.guest.plus_ones > 1 ? 's' : ''}
                        </span>
                      </p>
                    )}
                  </div>
                  
                  {/* Seating Assignment */}
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold mb-4 text-center text-gray-800">
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Placement
                      </span>
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Table</p>
                        <p className="text-4xl sm:text-5xl font-bold text-amber-700">
                          {guestInfo.table.table_number}
                        </p>
                        {guestInfo.table.table_name && (
                          <p className="text-sm mt-1 text-gray-600">{guestInfo.table.table_name}</p>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Place</p>
                        <p className="text-4xl sm:text-5xl font-bold text-amber-700">
                          {guestInfo.seating.seat_number}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Dietary Restrictions */}
                  {guestInfo.guest.dietary_restrictions && (
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Restrictions Alimentaires
                      </h4>
                      <p className="text-orange-700">{guestInfo.guest.dietary_restrictions}</p>
                    </div>
                  )}
                  
                  {/* Previous Check-in Info */}
                  {guestInfo.seating.checked_in && guestInfo.seating.checked_in_at && !success && (
                    <div className="text-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      <p>Enregistré précédemment le:</p>
                      <p className="font-medium">{new Date(guestInfo.seating.checked_in_at).toLocaleString('fr-FR')}</p>
                    </div>
                  )}
                </div>
                
                {/* Action Button */}
                <div className="p-6 bg-gray-50">
                  <button
                    onClick={resetScanner}
                    className="wedding-button w-full gold-gradient text-white hover:shadow-lg text-center"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      Scanner le Prochain Invité
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}