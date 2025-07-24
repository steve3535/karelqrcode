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
      // Find seating assignment by QR code
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

      // If not already checked in, update the status
      if (!seatingData.checked_in) {
        const { error: updateError } = await supabase
          .from('seating_assignments')
          .update({
            checked_in: true,
            checked_in_at: new Date().toISOString()
          })
          .eq('id', seatingData.id)

        if (updateError) {
          console.error('Error updating check-in status:', updateError)
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
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Guest Check-In Scanner</h1>
        
        {scanning && !guestInfo ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Scan Guest QR Code</h2>
              <p className="text-gray-600">Point the camera at the guest's QR code</p>
            </div>
            
            <div className="relative aspect-square max-w-md mx-auto">
              <Scanner
                onScan={handleScan}
                onError={(error) => console.error(error)}
                components={{
                  audio: false,
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
              <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
                {error}
              </div>
            )}
          </div>
        ) : guestInfo ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className={`mb-6 p-4 rounded-lg ${success ? 'bg-green-100' : guestInfo.seating.checked_in ? 'bg-yellow-100' : 'bg-gray-100'}`}>
              <h2 className={`text-2xl font-bold ${success ? 'text-green-800' : guestInfo.seating.checked_in ? 'text-yellow-800' : 'text-gray-800'}`}>
                {success ? 'Successfully Checked In!' : guestInfo.seating.checked_in ? 'Already Checked In' : 'Guest Information'}
              </h2>
            </div>
            
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-2">Guest Details</h3>
                <p className="text-2xl font-bold">{guestInfo.guest.name}</p>
                <p className="text-gray-600">{guestInfo.guest.email}</p>
                {guestInfo.guest.plus_ones > 0 && (
                  <p className="text-sm mt-1">Plus {guestInfo.guest.plus_ones} guest(s)</p>
                )}
              </div>
              
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Seating Assignment</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Table</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {guestInfo.table.table_number}
                    </p>
                    {guestInfo.table.table_name && (
                      <p className="text-sm">{guestInfo.table.table_name}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Seat</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {guestInfo.seating.seat_number}
                    </p>
                  </div>
                </div>
              </div>
              
              {guestInfo.guest.dietary_restrictions && (
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-1">Dietary Restrictions</h4>
                  <p className="text-orange-700">{guestInfo.guest.dietary_restrictions}</p>
                </div>
              )}
              
              {guestInfo.seating.checked_in && guestInfo.seating.checked_in_at && !success && (
                <div className="text-sm text-gray-600">
                  Previously checked in at: {new Date(guestInfo.seating.checked_in_at).toLocaleString()}
                </div>
              )}
            </div>
            
            <button
              onClick={resetScanner}
              className="mt-6 w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Scan Next Guest
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}