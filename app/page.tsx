'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import QRCode from 'qrcode'

export default function Home() {
  const [step, setStep] = useState<'access' | 'register' | 'success'>('access')
  const [accessCode, setAccessCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [guestInfo, setGuestInfo] = useState({
    name: '',
    email: '',
    phone: '',
    plus_ones: 0,
    dietary_restrictions: ''
  })
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [guestCode, setGuestCode] = useState('')

  const handleAccessCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const { data, error } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', accessCode.toUpperCase())
        .eq('is_active', true)
        .single()

      if (error || !data) {
        setMessage('Invalid access code. Please check and try again.')
        setIsLoading(false)
        return
      }

      setStep('register')
    } catch (error) {
      console.error('Error:', error)
      setMessage('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const generateGuestCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const generatedGuestCode = generateGuestCode()
      const invitationCode = `GUEST-${generatedGuestCode}`

      // Create guest record
      const { data: guest, error: guestError } = await supabase
        .from('guests')
        .insert({
          name: guestInfo.name,
          email: guestInfo.email || null,
          phone: guestInfo.phone || null,
          invitation_code: invitationCode,
          guest_code: generatedGuestCode,
          plus_ones: guestInfo.plus_ones,
          dietary_restrictions: guestInfo.dietary_restrictions || null,
          rsvp_status: 'confirmed'
        })
        .select()
        .single()

      if (guestError) throw guestError

      // Generate QR code data
      const qrCodeData = `WEDDING-${guest.id}-${Date.now()}`
      
      // Create seating assignment without table (to be assigned by admin)
      const { error: seatError } = await supabase
        .from('seating_assignments')
        .insert({
          guest_id: guest.id,
          table_id: 1, // Default to table 1, admin will reassign
          seat_number: 1, // Default seat, admin will reassign
          qr_code: qrCodeData
        })

      if (seatError) throw seatError

      // Generate QR code image
      const qrUrl = await QRCode.toDataURL(qrCodeData)
      setQrCodeUrl(qrUrl)
      setGuestCode(generatedGuestCode)
      setStep('success')
    } catch (error) {
      console.error('Error:', error)
      setMessage('An error occurred during registration. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 'access') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-wedding-lightPink to-wedding-cream">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-wedding-darkPink mb-4">
                💕 Wedding RSVP 💕
              </h1>
              <p className="text-gray-700">
                Please enter the access code to continue
              </p>
            </div>

            <form onSubmit={handleAccessCode} className="bg-white rounded-lg shadow-lg p-8">
              <div className="mb-6">
                <label htmlFor="access" className="block text-sm font-medium text-gray-700 mb-2">
                  Access Code
                </label>
                <input
                  type="text"
                  id="access"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-wedding-pink focus:border-wedding-pink"
                  placeholder="Enter access code"
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
                {isLoading ? 'Verifying...' : 'Continue'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'register') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-wedding-lightPink to-wedding-cream">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-wedding-darkPink mb-4">
                Register for the Wedding
              </h1>
              <p className="text-gray-700">
                Please fill in your details to confirm your attendance
              </p>
            </div>

            <form onSubmit={handleRegistration} className="bg-white rounded-lg shadow-lg p-8">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={guestInfo.name}
                    onChange={(e) => setGuestInfo({...guestInfo, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-wedding-pink focus:border-wedding-pink"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={guestInfo.email}
                    onChange={(e) => setGuestInfo({...guestInfo, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-wedding-pink focus:border-wedding-pink"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={guestInfo.phone}
                    onChange={(e) => setGuestInfo({...guestInfo, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-wedding-pink focus:border-wedding-pink"
                  />
                </div>

                <div>
                  <label htmlFor="plus_ones" className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Additional Guests
                  </label>
                  <input
                    type="number"
                    id="plus_ones"
                    min="0"
                    max="5"
                    value={guestInfo.plus_ones}
                    onChange={(e) => setGuestInfo({...guestInfo, plus_ones: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-wedding-pink focus:border-wedding-pink"
                  />
                </div>

                <div>
                  <label htmlFor="dietary" className="block text-sm font-medium text-gray-700 mb-2">
                    Dietary Restrictions (Optional)
                  </label>
                  <textarea
                    id="dietary"
                    value={guestInfo.dietary_restrictions}
                    onChange={(e) => setGuestInfo({...guestInfo, dietary_restrictions: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-wedding-pink focus:border-wedding-pink"
                    rows={3}
                  />
                </div>
              </div>

              {message && (
                <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-6 bg-wedding-pink text-white py-2 px-4 rounded-md hover:bg-wedding-darkPink transition duration-200 disabled:opacity-50"
              >
                {isLoading ? 'Registering...' : 'Confirm Attendance'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-wedding-lightPink to-wedding-cream">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-wedding-darkPink mb-2">
                Thank You, {guestInfo.name}!
              </h2>
              <p className="text-gray-700 mb-4">
                Your attendance has been confirmed. Please save your QR code for check-in.
              </p>
              <div className="bg-wedding-lightPink/20 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-gray-700">Your Guest Code:</p>
                <p className="text-2xl font-bold text-wedding-darkPink">{guestCode}</p>
                <p className="text-xs text-gray-600 mt-1">Keep this code for your records</p>
              </div>
            </div>

            {qrCodeUrl && (
              <div className="mb-6">
                <img src={qrCodeUrl} alt="QR Code" className="mx-auto" />
                <p className="text-sm text-gray-600 mt-2">
                  Show this QR code at the venue
                </p>
                <a
                  href={qrCodeUrl}
                  download={`wedding-qr-${guestCode}.png`}
                  className="inline-block mt-2 text-wedding-pink hover:text-wedding-darkPink underline"
                >
                  Download QR Code
                </a>
              </div>
            )}

            <button
              onClick={() => {
                setStep('register')
                setGuestInfo({
                  name: '',
                  email: '',
                  phone: '',
                  plus_ones: 0,
                  dietary_restrictions: ''
                })
                setQrCodeUrl('')
                setGuestCode('')
              }}
              className="bg-wedding-pink text-white py-2 px-4 rounded-md hover:bg-wedding-darkPink transition duration-200"
            >
              Register Another Guest
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}