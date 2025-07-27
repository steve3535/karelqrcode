'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'

// Dynamically import the scanner to avoid SSR issues
const EnhancedScanner = dynamic(() => import('./enhanced-scanner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
      <p>Chargement du scanner...</p>
    </div>
  )
})

export default function ScanPage() {
  const [scanResult, setScanResult] = useState<any>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState('')
  const [manualCode, setManualCode] = useState('')

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await checkInGuest(manualCode)
  }

  const checkInGuest = async (qrCode: string) => {
    try {
      setError('')
      
      let assignment = null
      
      // First try to find by full QR code
      const { data: qrAssignment, error: qrError } = await supabase
        .from('seating_assignments')
        .select(`
          *,
          guests (*),
          tables (*)
        `)
        .eq('qr_code', qrCode)
        .single()
      
      if (qrAssignment) {
        assignment = qrAssignment
      } else {
        // If not found, try to find by guest code
        const { data: guestData, error: guestError } = await supabase
          .from('guests')
          .select(`
            *,
            seating_assignments (
              id,
              table_id,
              seat_number,
              qr_code,
              checked_in,
              checked_in_at
            )
          `)
          .eq('guest_code', qrCode.toUpperCase())
          .single()
        
        if (guestData && guestData.seating_assignments?.[0]) {
          // Get the full assignment data with table info
          const { data: fullAssignment } = await supabase
            .from('seating_assignments')
            .select(`
              *,
              guests (*),
              tables (*)
            `)
            .eq('id', guestData.seating_assignments[0].id)
            .single()
          
          if (fullAssignment) {
            assignment = fullAssignment
          }
        }
      }

      if (!assignment) {
        setError('Code QR ou code invité invalide. Veuillez réessayer.')
        return
      }

      if (assignment.checked_in) {
        setError('Cet invité a déjà été enregistré.')
        setScanResult(assignment)
        return
      }

      // Update check-in status
      const { error: updateError } = await supabase
        .from('seating_assignments')
        .update({
          checked_in: true,
          checked_in_at: new Date().toISOString()
        })
        .eq('id', assignment.id)

      if (updateError) throw updateError

      setScanResult({
        ...assignment,
        justCheckedIn: true
      })
      setManualCode('')
      setIsScanning(false)
    } catch (error) {
      console.error('Error checking in guest:', error)
      setError('Une erreur s\'est produite. Veuillez réessayer.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-wedding-lightPink to-wedding-cream">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-wedding-darkPink mb-2">
              Scanner d'Entrée Invités
            </h1>
            <p className="text-gray-700 text-sm md:text-base">
              Scannez les codes QR ou entrez manuellement
            </p>
          </div>

          {/* Scanner Section */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg md:text-xl font-bold mb-4">Scanner de Code QR</h2>
            
            {!isScanning ? (
              <button
                onClick={() => setIsScanning(true)}
                className="w-full bg-wedding-pink text-white py-3 px-4 rounded-md hover:bg-wedding-darkPink transition duration-200"
              >
                Démarrer le Scanner
              </button>
            ) : (
              <div className="space-y-4">
                <EnhancedScanner 
                  isActive={isScanning}
                  onScan={(data) => {
                    console.log('Scanned QR code:', data)
                    checkInGuest(data)
                  }}
                />
                <p className="text-sm text-gray-600 text-center">
                  Positionnez le code QR dans le cadre. Le scanner détectera automatiquement les codes QR.
                </p>
                <button
                  onClick={() => setIsScanning(false)}
                  className="w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition duration-200"
                >
                  Arrêter le Scanner
                </button>
              </div>
            )}

            <div className="mt-6 border-t pt-6">
              <h3 className="font-semibold mb-2 text-sm md:text-base">Entrer le code QR ou code invité manuellement:</h3>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Entrez le code invité (ex: CZDVPNNH) ou code QR complet"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-wedding-pink focus:border-wedding-pink text-sm"
                />
                <button
                  type="submit"
                  className="bg-wedding-pink text-white px-4 md:px-6 py-2 rounded-md hover:bg-wedding-darkPink transition duration-200 text-sm md:text-base"
                >
                  Enregistrer
                </button>
              </form>
              <p className="text-xs text-gray-600 mt-2">
                Vous pouvez entrer soit le code invité de 8 caractères ou les données complètes du code QR
              </p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Guest Info Display */}
          {scanResult && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-center mb-6">
                {scanResult.justCheckedIn ? (
                  <div className="text-5xl mb-2">✅</div>
                ) : (
                  <div className="text-5xl mb-2">ℹ️</div>
                )}
                <h2 className="text-2xl font-bold text-wedding-darkPink">
                  {scanResult.justCheckedIn ? 'Check-In Successful!' : 'Guest Information'}
                </h2>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="font-semibold">Name:</span>
                  <span>{scanResult.guests?.name}</span>
                </div>
                {scanResult.guests?.email && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold">Email:</span>
                    <span>{scanResult.guests?.email}</span>
                  </div>
                )}
                {scanResult.guests?.phone && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold">Phone:</span>
                    <span>{scanResult.guests?.phone}</span>
                  </div>
                )}
                {scanResult.table_id ? (
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold text-sm md:text-base">Table:</span>
                    <span className="text-base md:text-lg font-bold text-wedding-pink">
                      Table {scanResult.table_id} - {scanResult.tables?.table_name || ''}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold text-sm md:text-base">Table:</span>
                    <span className="text-sm text-gray-600">Pas encore attribuée</span>
                  </div>
                )}
                {scanResult.seat_number && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold">Seat:</span>
                    <span className="text-lg font-bold">Seat {scanResult.seat_number}</span>
                  </div>
                )}
                {scanResult.guests?.dietary_restrictions && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold">Dietary:</span>
                    <span>{scanResult.guests.dietary_restrictions}</span>
                  </div>
                )}
                {scanResult.guests?.plus_ones > 0 && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold">Plus Ones:</span>
                    <span>{scanResult.guests.plus_ones}</span>
                  </div>
                )}
                {scanResult.guests?.guest_code && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold">Guest Code:</span>
                    <span className="font-mono">{scanResult.guests.guest_code}</span>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <span className="font-semibold">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    scanResult.checked_in ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {scanResult.checked_in ? 'Checked In' : 'Not Checked In'}
                  </span>
                </div>
              </div>

              {!scanResult.justCheckedIn && !scanResult.checked_in && (
                <button
                  onClick={() => checkInGuest(scanResult.qr_code)}
                  className="w-full mt-6 bg-wedding-pink text-white py-3 px-4 rounded-md hover:bg-wedding-darkPink transition duration-200"
                >
                  Check In This Guest
                </button>
              )}

              <button
                onClick={() => {
                  setScanResult(null)
                  setError('')
                }}
                className="w-full mt-4 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition duration-200"
              >
                Scan Another Guest
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}