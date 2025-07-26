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

    if (!supabase) {
      setError('Configuration error. Please contact support.')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('invitation_code', invitationCode.toUpperCase())
        .single()

      if (error) throw new Error('Invitation code not found')
      
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
    if (!guestData || !supabase) return
    
    setLoading(true)
    setError('')

    try {
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

      const qrData = `WEDDING-${guestData.id}-${Date.now()}`
      
      const { data: existingAssignment } = await supabase
        .from('seating_assignments')
        .select('*')
        .eq('guest_id', guestData.id)
        .single()

      if (!existingAssignment) {
        const { data: availableSeats } = await supabase
          .from('seating_assignments')
          .select('table_id, seat_number')
          .order('table_id', { ascending: true })
          .order('seat_number', { ascending: true })

        const occupiedSeats = new Set(
          availableSeats?.map(s => `${s.table_id}-${s.seat_number}`) || []
        )

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
        await supabase
          .from('seating_assignments')
          .update({ qr_code: qrData })
          .eq('guest_id', guestData.id)
      }

      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#EC4899',
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
    if (!guestData || !supabase) return
    
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
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-gray-800">Thank You!</h2>
            <p className="text-gray-600 mb-8">Your RSVP has been confirmed. Please save this QR code for entry.</p>
            
            <div className="bg-gray-50 p-6 rounded-xl mb-8">
              <img src={qrCodeUrl} alt="Your QR Code" className="mx-auto" />
            </div>
            
            <div className="space-y-3 text-sm text-gray-600">
              <p className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Screenshot this page
              </p>
              <p className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Or take a photo
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (submitted && !qrCodeUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">We'll Miss You</h2>
          <p className="text-gray-600">Thank you for letting us know. We're sorry you can't make it.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full">
        {/* Pink Header */}
        <div className="bg-gradient-to-r from-pink-400 to-pink-500 text-white p-8 rounded-t-2xl text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
            <h1 className="text-3xl font-bold">Wedding RSVP</h1>
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
          </div>
          <p className="text-pink-100">Join us for our special day</p>
        </div>
        
        <div className="p-8">
          {!guestData ? (
            <form onSubmit={findInvitation} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invitation Code
                </label>
                <input
                  type="text"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Enter your code"
                  required
                />
                <p className="mt-2 text-xs text-gray-500">
                  Find this code on your invitation card
                </p>
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-pink-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-pink-600 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Searching...
                  </span>
                ) : (
                  'Find My Invitation'
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="text-center pb-6 border-b border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800">
                  Welcome, {guestData.name}!
                </h2>
                <p className="text-gray-600 mt-2">Will you be joining us?</p>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Guests
                  </label>
                  <select
                    value={plusOnes}
                    onChange={(e) => setPlusOnes(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    {[0, 1, 2, 3, 4, 5].map(num => (
                      <option key={num} value={num}>
                        {num === 0 ? 'Just me' : `Me +${num}`}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dietary Restrictions
                  </label>
                  <textarea
                    value={dietaryRestrictions}
                    onChange={(e) => setDietaryRestrictions(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                    rows={3}
                    placeholder="Vegetarian, allergies, etc."
                  />
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={confirmAttendance}
                  disabled={loading}
                  className="flex-1 bg-pink-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-pink-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Yes, I\'ll be there!'}
                </button>
                <button
                  onClick={declineInvitation}
                  disabled={loading}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Can\'t make it'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}