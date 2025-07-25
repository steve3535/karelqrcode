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
    if (!result || !result[0]?.rawValue || !supabase) return
    
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
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Elegant Header */}
        <div className="text-center mb-8 animate-fadeInUp">
          <div className="mb-6">
            <div className="decorative-divider">
              <div className="decorative-icon">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                </svg>
              </div>
            </div>
            <h1 className="responsive-heading font-bold text-gray-800 mb-2">
              Scanner d'Entrée
            </h1>
            <p className="responsive-body text-gray-600">
              Scannez le code QR des invités
            </p>
          </div>
        </div>
        
        {scanning && !guestInfo ? (
          <div className="elegant-card animate-fadeInScale">
            <div className="p-8 sm:p-10">
              <div className="mb-8">
                <h2 className="responsive-subheading font-semibold mb-3 text-center text-gray-800">
                  Scanner le Code QR
                </h2>
                <p className="responsive-body text-gray-600 text-center">
                  Pointez la caméra vers le code QR de l'invité
                </p>
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
                <div className="mt-8 p-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-center animate-fadeInScale">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-semibold">{error}</p>
                  </div>
                  <button
                    onClick={resetScanner}
                    className="elegant-button-secondary text-sm px-6 py-2"
                  >
                    Réessayer
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : guestInfo ? (
          <div className="elegant-card animate-fadeInScale">
            <div className="overflow-hidden">
              {/* Status Header */}
              <div className={`p-8 text-center ${
                success ? 'bg-gradient-to-br from-green-50 to-green-100' : 
                guestInfo.seating.checked_in ? 'bg-gradient-to-br from-amber-50 to-amber-100' : 
                'bg-gradient-to-br from-blue-50 to-blue-100'
              }`}>
                <div className="mb-6">
                  {success ? (
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center animate-pulse-gentle">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : guestInfo.seating.checked_in ? (
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  ) : null}
                </div>
                <h2 className={`responsive-heading font-bold ${
                  success ? 'text-green-800' : 
                  guestInfo.seating.checked_in ? 'text-amber-800' : 
                  'text-blue-800'
                }`}>
                  {success ? 'Enregistrement Réussi!' : 
                   guestInfo.seating.checked_in ? 'Déjà Enregistré' : 
                   'Informations de l\'Invité'}
                </h2>
              </div>
              
              <div className="p-8 space-y-8">
                {/* Guest Info */}
                <div className="text-center border-b border-gray-100 pb-8">
                  <h3 className="responsive-heading font-bold text-gray-800 mb-2">
                    {guestInfo.guest.name}
                  </h3>
                  <p className="responsive-body text-gray-600 mb-4">
                    {guestInfo.guest.email}
                  </p>
                  {guestInfo.guest.plus_ones > 0 && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-full">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span className="text-sm font-semibold text-amber-700">
                        Plus {guestInfo.guest.plus_ones} accompagnant{guestInfo.guest.plus_ones > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Seating Assignment */}
                <div className="bg-gradient-to-br from-amber-50 to-rose-50 p-8 rounded-2xl shadow-inner">
                  <h3 className="text-xl font-semibold mb-6 text-center text-gray-800">
                    <span className="flex items-center justify-center gap-3">
                      <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Placement
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl font-bold text-white">
                          {guestInfo.table.table_number}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">Table</p>
                      {guestInfo.table.table_name && (
                        <p className="text-sm text-gray-500">{guestInfo.table.table_name}</p>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-rose-400 to-rose-600 rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl font-bold text-white">
                          {guestInfo.seating.seat_number}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Place</p>
                    </div>
                  </div>
                </div>
                
                {/* Dietary Restrictions */}
                {guestInfo.guest.dietary_restrictions && (
                  <div className="bg-orange-50 border border-orange-200 p-6 rounded-2xl">
                    <h4 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
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
                  <div className="text-center p-6 bg-gray-50 rounded-2xl">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-medium text-gray-600">Enregistré précédemment le:</p>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(guestInfo.seating.checked_in_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Action Button */}
              <div className="p-8 bg-gray-50">
                <button
                  onClick={resetScanner}
                  className="elegant-button w-full text-center"
                >
                  <span className="flex items-center justify-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    Scanner le Prochain Invité
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}