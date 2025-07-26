'use client'

import { useState } from 'react'
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
        throw new Error('Invalid QR code')
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
          console.error('Error updating check-in:', updateError)
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
    <div className="min-h-screen bg-gray-50">
      {/* Pink Header */}
      <div className="bg-gradient-to-r from-pink-400 to-pink-500 text-white px-8 py-8 text-center">
        <h1 className="text-3xl font-bold">Guest Check-In</h1>
        <p className="text-pink-100 mt-2">Scan QR codes to check in guests</p>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        {scanning && !guestInfo ? (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold mb-2">Scan Guest QR Code</h2>
              <p className="text-gray-600">Point the camera at the guest's QR code</p>
            </div>
            
            <div className="relative aspect-square max-w-md mx-auto rounded-2xl overflow-hidden border-4 border-pink-500">
              <Scanner
                onScan={handleScan}
                onError={(error) => console.error(error)}
                components={{
                  finder: true,
                }}
                styles={{
                  container: {
                    width: '100%',
                    height: '100%'
                  }
                }}
              />
            </div>
            
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-center">
                <p className="font-medium">{error}</p>
                <button
                  onClick={resetScanner}
                  className="mt-2 text-sm underline hover:no-underline"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        ) : guestInfo ? (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Status Header */}
            <div className={`p-6 text-center ${
              success ? 'bg-green-500' : 
              guestInfo.seating.checked_in ? 'bg-yellow-500' : 
              'bg-gray-400'
            } text-white`}>
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                {success ? (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : guestInfo.seating.checked_in ? (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : null}
              </div>
              <h2 className="text-2xl font-bold">
                {success ? 'Successfully Checked In!' : 
                 guestInfo.seating.checked_in ? 'Already Checked In' : 
                 'Guest Information'}
              </h2>
            </div>
            
            <div className="p-8 space-y-6">
              {/* Guest Info */}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800">{guestInfo.guest.name}</h3>
                <p className="text-gray-600 mt-1">{guestInfo.guest.email}</p>
                {guestInfo.guest.plus_ones > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    +{guestInfo.guest.plus_ones} guest{guestInfo.guest.plus_ones > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              
              {/* Seating Assignment */}
              <div className="bg-pink-50 p-6 rounded-xl text-center">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Seating Assignment</h3>
                <div className="flex justify-center gap-8">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Table</p>
                    <p className="text-4xl font-bold text-pink-600">
                      {guestInfo.table.table_number}
                    </p>
                    {guestInfo.table.table_name && (
                      <p className="text-sm text-gray-600 mt-1">{guestInfo.table.table_name}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Seat</p>
                    <p className="text-4xl font-bold text-pink-600">
                      {guestInfo.seating.seat_number}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Dietary Restrictions */}
              {guestInfo.guest.dietary_restrictions && (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-1 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Dietary Restrictions
                  </h4>
                  <p className="text-orange-700">{guestInfo.guest.dietary_restrictions}</p>
                </div>
              )}
              
              {/* Previous Check-in Info */}
              {guestInfo.seating.checked_in && guestInfo.seating.checked_in_at && !success && (
                <div className="text-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <p>Previously checked in at:</p>
                  <p className="font-medium">{new Date(guestInfo.seating.checked_in_at).toLocaleString()}</p>
                </div>
              )}
            </div>
            
            {/* Action Button */}
            <div className="p-6 bg-gray-50">
              <button
                onClick={resetScanner}
                className="w-full bg-pink-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-pink-600 transition-colors"
              >
                Scan Next Guest
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}