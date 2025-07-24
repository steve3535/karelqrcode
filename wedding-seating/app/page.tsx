'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import QRCode from 'qrcode'

export default function Home() {
  const [invitationCode, setInvitationCode] = useState('')
  const [guestData, setGuestData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [plusOnes, setPlusOnes] = useState(0)
  const [dietaryRestrictions, setDietaryRestrictions] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const findInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('invitation_code', invitationCode.toUpperCase())
        .single()

      if (error) throw new Error('Invitation not found')
      
      setGuestData(data)
      setPlusOnes(data.plus_ones || 0)
      setDietaryRestrictions(data.dietary_restrictions || '')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const confirmAttendance = async () => {
    if (!guestData) return
    
    setLoading(true)
    setError('')

    try {
      // Update guest RSVP status
      const { error: updateError } = await supabase
        .from('guests')
        .update({
          rsvp_status: 'confirmed',
          plus_ones: plusOnes,
          dietary_restrictions: dietaryRestrictions,
          updated_at: new Date().toISOString()
        })
        .eq('id', guestData.id)

      if (updateError) throw updateError

      // Generate unique QR code data
      const qrData = `WEDDING-${guestData.id}-${Date.now()}`
      
      // Check if seating assignment exists
      const { data: existingAssignment } = await supabase
        .from('seating_assignments')
        .select('*')
        .eq('guest_id', guestData.id)
        .single()

      if (!existingAssignment) {
        // Auto-assign to next available seat
        const { data: availableSeats } = await supabase
          .from('seating_assignments')
          .select('table_id, seat_number')
          .order('table_id', { ascending: true })
          .order('seat_number', { ascending: true })

        const occupiedSeats = new Set(
          availableSeats?.map(s => `${s.table_id}-${s.seat_number}`) || []
        )

        // Find next available seat
        let assigned = false
        for (let tableId = 1; tableId <= 25; tableId++) {
          for (let seatNumber = 1; seatNumber <= 10; seatNumber++) {
            if (!occupiedSeats.has(`${tableId}-${seatNumber}`)) {
              const { error: assignError } = await supabase
                .from('seating_assignments')
                .insert({
                  guest_id: guestData.id,
                  table_id: tableId,
                  seat_number: seatNumber,
                  qr_code: qrData
                })

              if (!assignError) {
                assigned = true
                break
              }
            }
          }
          if (assigned) break
        }
      } else {
        // Update existing assignment with QR code
        await supabase
          .from('seating_assignments')
          .update({ qr_code: qrData })
          .eq('guest_id', guestData.id)
      }

      // Generate QR code image
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      setQrCodeUrl(qrCodeDataUrl)
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const declineInvitation = async () => {
    if (!guestData) return
    
    setLoading(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('guests')
        .update({
          rsvp_status: 'declined',
          updated_at: new Date().toISOString()
        })
        .eq('id', guestData.id)

      if (updateError) throw updateError
      
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (submitted && qrCodeUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4 text-green-600">Thank You for Confirming!</h2>
          <p className="mb-6">Save this QR code. You'll need it at the entrance.</p>
          <img src={qrCodeUrl} alt="Your QR Code" className="mx-auto mb-4" />
          <p className="text-sm text-gray-600">
            Screenshot this page or take a photo of the QR code
          </p>
        </div>
      </div>
    )
  }

  if (submitted && !qrCodeUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4">Thank You</h2>
          <p>We're sorry you can't make it. We'll miss you!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-8">Wedding RSVP</h1>
        
        {!guestData ? (
          <form onSubmit={findInvitation} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Your Invitation Code
              </label>
              <input
                type="text"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ABC123"
                required
              />
            </div>
            
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Find My Invitation'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold">Welcome, {guestData.name}!</h2>
              <p className="text-gray-600 mt-2">Will you be joining us?</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Plus Ones
                </label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={plusOnes}
                  onChange={(e) => setPlusOnes(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dietary Restrictions (Optional)
                </label>
                <textarea
                  value={dietaryRestrictions}
                  onChange={(e) => setDietaryRestrictions(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Vegetarian, Vegan, Gluten-free, Allergies..."
                />
              </div>
            </div>
            
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            
            <div className="flex gap-4">
              <button
                onClick={confirmAttendance}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Yes, I\'ll be there!'}
              </button>
              <button
                onClick={declineInvitation}
                disabled={loading}
                className="flex-1 bg-gray-400 text-white py-2 px-4 rounded-lg hover:bg-gray-500 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Sorry, can\'t make it'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}