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
    if (!guestData) return
    
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
          dark: '#8B5A3C',
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
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="wedding-card max-w-md w-full animate-fadeIn">
          <div className="gold-gradient p-1">
            <div className="bg-white p-8 sm:p-10">
              <div className="text-center">
                <div className="mb-6">
                  <svg className="w-16 h-16 mx-auto text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold mb-4 text-gray-800">Merci pour votre confirmation!</h2>
                <p className="text-gray-600 mb-8">Voici votre code QR. Présentez-le à l'entrée de la réception.</p>
                
                <div className="bg-gradient-to-br from-amber-50 to-white p-6 rounded-xl shadow-inner mb-6">
                  <img src={qrCodeUrl} alt="Votre code QR" className="mx-auto animate-pulse-subtle" />
                </div>
                
                <div className="space-y-3 text-sm text-gray-600">
                  <p className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Prenez une capture d'écran de cette page
                  </p>
                  <p className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Ou photographiez le code QR
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (submitted && !qrCodeUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="wedding-card max-w-md w-full animate-fadeIn">
          <div className="p-8 sm:p-10 text-center">
            <div className="mb-6">
              <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4">Nous sommes désolés</h2>
            <p className="text-gray-600">Nous regrettons que vous ne puissiez pas être des nôtres. Vous nous manquerez!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="wedding-card max-w-md w-full animate-fadeIn">
        <div className="gold-gradient p-1">
          <div className="bg-white">
            {/* Header with decorative element */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-transparent opacity-30" />
              <div className="relative p-8 sm:p-10 text-center">
                <div className="mb-6">
                  <div className="flex justify-center items-center gap-3 mb-4">
                    <div className="h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent w-16" />
                    <svg className="w-8 h-8 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                    </svg>
                    <div className="h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent w-16" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Confirmation de Présence</h1>
                  <p className="mt-2 text-gray-600">Notre Mariage</p>
                </div>
              </div>
            </div>
            
            <div className="p-8 sm:p-10">
              {!guestData ? (
                <form onSubmit={findInvitation} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Code d'invitation
                    </label>
                    <input
                      type="text"
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value)}
                      className="wedding-input"
                      placeholder="Exemple: ABC123"
                      required
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Vous trouverez ce code sur votre carte d'invitation
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
                    className="wedding-button w-full gold-gradient text-white hover:shadow-lg disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Recherche...
                      </span>
                    ) : (
                      'Trouver mon invitation'
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-6 animate-fadeIn">
                  <div className="text-center pb-6 border-b border-gray-100">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
                      Bienvenue, {guestData.name}!
                    </h2>
                    <p className="text-gray-600 mt-2">Serez-vous des nôtres pour célébrer?</p>
                  </div>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre d'accompagnants
                      </label>
                      <select
                        value={plusOnes}
                        onChange={(e) => setPlusOnes(parseInt(e.target.value) || 0)}
                        className="wedding-input"
                      >
                        {[0, 1, 2, 3, 4, 5].map(num => (
                          <option key={num} value={num}>
                            {num === 0 ? 'Aucun accompagnant' : `${num} personne${num > 1 ? 's' : ''}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Restrictions alimentaires ou allergies
                      </label>
                      <textarea
                        value={dietaryRestrictions}
                        onChange={(e) => setDietaryRestrictions(e.target.value)}
                        className="wedding-input"
                        rows={3}
                        placeholder="Végétarien, Sans gluten, Allergies aux noix..."
                      />
                    </div>
                  </div>
                  
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                      onClick={confirmAttendance}
                      disabled={loading}
                      className="wedding-button flex-1 gold-gradient text-white hover:shadow-lg disabled:opacity-50"
                    >
                      {loading ? 'Traitement...' : 'Oui, je serai présent(e)!'}
                    </button>
                    <button
                      onClick={declineInvitation}
                      disabled={loading}
                      className="wedding-button flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md disabled:opacity-50"
                    >
                      {loading ? 'Traitement...' : 'Désolé(e), je ne pourrai pas'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}