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
      setError('Configuration Supabase manquante. Veuillez configurer les variables d\'environnement.')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('invitation_code', invitationCode.toUpperCase())
        .single()

      if (error) throw new Error('Code invitation non trouvé')
      
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
          dark: '#D4AF37',
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

  // Success State with QR Code
  if (submitted && qrCodeUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="elegant-card max-w-lg w-full animate-fadeInScale">
          <div className="p-8 sm:p-10">
            {/* Success Header */}
            <div className="text-center mb-8">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center animate-pulse-gentle">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="responsive-heading font-bold mb-4 text-gray-800">
                Merci pour votre confirmation!
              </h2>
              <p className="responsive-body text-gray-600">
                Voici votre code QR. Présentez-le à l'entrée de la réception.
              </p>
            </div>
            
            {/* QR Code Display */}
            <div className="bg-gradient-to-br from-amber-50 to-rose-50 p-8 rounded-2xl shadow-inner mb-8">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <img 
                  src={qrCodeUrl} 
                  alt="Votre code QR" 
                  className="mx-auto animate-pulse-gentle" 
                />
              </div>
            </div>
            
            {/* Instructions */}
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p>Prenez une capture d'écran de cette page</p>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p>Ou photographiez le code QR</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Decline State
  if (submitted && !qrCodeUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="elegant-card max-w-md w-full animate-fadeInScale">
          <div className="p-8 sm:p-10 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h2 className="responsive-heading font-bold mb-4 text-gray-800">
              Nous sommes désolés
            </h2>
            <p className="responsive-body text-gray-600">
              Nous regrettons que vous ne puissiez pas être des nôtres. Vous nous manquerez!
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="elegant-card max-w-lg w-full animate-fadeInUp">
        <div className="p-8 sm:p-10">
          {/* Elegant Header */}
          <div className="text-center mb-8">
            <div className="mb-6">
              <div className="decorative-divider">
                <div className="decorative-icon">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                  </svg>
                </div>
              </div>
              <h1 className="responsive-heading font-bold text-gray-800 mb-2">
                Confirmation de Présence
              </h1>
              <p className="responsive-body text-gray-600">
                Notre Mariage
              </p>
            </div>
          </div>
          
          {/* Form Content */}
          {!guestData ? (
            <form onSubmit={findInvitation} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Code d'invitation
                </label>
                <input
                  type="text"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                  className="elegant-input"
                  placeholder="Exemple: ABC123"
                  required
                />
                <p className="mt-2 text-xs text-gray-500">
                  Vous trouverez ce code sur votre carte d'invitation
                </p>
              </div>
              
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm animate-fadeInScale">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="elegant-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="elegant-spinner" />
                    Recherche...
                  </span>
                ) : (
                  'Trouver mon invitation'
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6 animate-fadeInScale">
              {/* Guest Welcome */}
              <div className="text-center pb-6 border-b border-gray-100">
                <h2 className="responsive-heading font-bold text-gray-800 mb-2">
                  Bienvenue, {guestData.name}!
                </h2>
                <p className="responsive-body text-gray-600">
                  Serez-vous des nôtres pour célébrer?
                </p>
              </div>
              
              {/* Guest Details Form */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Nombre d'accompagnants
                  </label>
                  <select
                    value={plusOnes}
                    onChange={(e) => setPlusOnes(parseInt(e.target.value) || 0)}
                    className="elegant-select"
                  >
                    {[0, 1, 2, 3, 4, 5].map(num => (
                      <option key={num} value={num}>
                        {num === 0 ? 'Aucun accompagnant' : `${num} personne${num > 1 ? 's' : ''}`}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Restrictions alimentaires ou allergies
                  </label>
                  <textarea
                    value={dietaryRestrictions}
                    onChange={(e) => setDietaryRestrictions(e.target.value)}
                    className="elegant-textarea"
                    placeholder="Végétarien, Sans gluten, Allergies aux noix..."
                  />
                </div>
              </div>
              
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm animate-fadeInScale">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={confirmAttendance}
                  disabled={loading}
                  className="elegant-button flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="elegant-spinner" />
                      Traitement...
                    </span>
                  ) : (
                    'Oui, je serai présent(e)!'
                  )}
                </button>
                <button
                  onClick={declineInvitation}
                  disabled={loading}
                  className="elegant-button-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="elegant-spinner" />
                      Traitement...
                    </span>
                  ) : (
                    'Désolé(e), je ne pourrai pas'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}