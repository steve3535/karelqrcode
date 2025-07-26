'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import QRCode from 'qrcode'

export default function Home() {
  const [invitationCode, setInvitationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [guestInfo, setGuestInfo] = useState<any>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  const handleRSVP = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      // Find guest by invitation code
      const { data: guest, error: guestError } = await supabase
        .from('guests')
        .select('*')
        .eq('invitation_code', invitationCode.toUpperCase())
        .single()

      if (guestError || !guest) {
        setMessage('Invalid invitation code. Please check and try again.')
        setIsLoading(false)
        return
      }

      if (guest.rsvp_status === 'confirmed') {
        setMessage('You have already confirmed your attendance.')
        setIsLoading(false)
        return
      }

      // Update RSVP status
      const { error: updateError } = await supabase
        .from('guests')
        .update({ 
          rsvp_status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', guest.id)

      if (updateError) throw updateError

      // Check if seating assignment exists
      const { data: existingAssignment } = await supabase
        .from('seating_assignments')
        .select('*')
        .eq('guest_id', guest.id)
        .single()

      if (!existingAssignment) {
        // Find next available seat
        const { data: assignments } = await supabase
          .from('seating_assignments')
          .select('table_id, seat_number')
          .order('table_id', { ascending: true })
          .order('seat_number', { ascending: true })

        // Find next available seat
        let nextTable = 1
        let nextSeat = 1
        
        if (assignments && assignments.length > 0) {
          // Find the first available seat
          for (let table = 1; table <= 25; table++) {
            for (let seat = 1; seat <= 10; seat++) {
              const isOccupied = assignments.some(
                a => a.table_id === table && a.seat_number === seat
              )
              if (!isOccupied) {
                nextTable = table
                nextSeat = seat
                break
              }
            }
            if (nextSeat !== 1) break
          }
        }

        // Generate QR code
        const qrCodeData = `WEDDING-${guest.id}-${Date.now()}`
        
        // Create seating assignment
        const { error: seatError } = await supabase
          .from('seating_assignments')
          .insert({
            guest_id: guest.id,
            table_id: nextTable,
            seat_number: nextSeat,
            qr_code: qrCodeData
          })

        if (seatError) throw seatError

        // Generate QR code image
        const qrUrl = await QRCode.toDataURL(qrCodeData)
        setQrCodeUrl(qrUrl)
      } else {
        // Generate QR code image for existing assignment
        const qrUrl = await QRCode.toDataURL(existingAssignment.qr_code)
        setQrCodeUrl(qrUrl)
      }

      setGuestInfo(guest)
      setShowSuccess(true)
    } catch (error) {
      console.error('Error:', error)
      setMessage('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-wedding-lightPink to-wedding-cream">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-wedding-darkPink mb-4">
              💕 Wedding RSVP 💕
            </h1>
            <p className="text-gray-700">
              Please enter your invitation code to confirm your attendance
            </p>
          </div>

          {!showSuccess ? (
            <form onSubmit={handleRSVP} className="bg-white rounded-lg shadow-lg p-8">
              <div className="mb-6">
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  Invitation Code
                </label>
                <input
                  type="text"
                  id="code"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-wedding-pink focus:border-wedding-pink"
                  placeholder="Enter your code"
                  required
                />
              </div>

              {message && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-wedding-pink text-white py-2 px-4 rounded-md hover:bg-wedding-darkPink transition duration-200 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Confirm Attendance'}
              </button>
            </form>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="mb-6">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-wedding-darkPink mb-2">
                  Thank You, {guestInfo?.name}!
                </h2>
                <p className="text-gray-700 mb-4">
                  Your attendance has been confirmed. Please save your QR code for check-in.
                </p>
              </div>

              {qrCodeUrl && (
                <div className="mb-6">
                  <img src={qrCodeUrl} alt="QR Code" className="mx-auto" />
                  <p className="text-sm text-gray-600 mt-2">
                    Show this QR code at the venue
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  setShowSuccess(false)
                  setInvitationCode('')
                  setGuestInfo(null)
                  setQrCodeUrl('')
                }}
                className="bg-wedding-pink text-white py-2 px-4 rounded-md hover:bg-wedding-darkPink transition duration-200"
              >
                RSVP for Another Guest
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}