'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function ScanPage() {
  const [scanResult, setScanResult] = useState<any>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState('')
  const [manualCode, setManualCode] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsScanning(true)
        scanQRCode()
      }
    } catch (err) {
      setError('Unable to access camera. Please ensure camera permissions are granted.')
      console.error('Camera error:', err)
    }
  }

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  const scanQRCode = () => {
    const scan = () => {
      if (!isScanning || !videoRef.current || !canvasRef.current) return

      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext('2d')

      if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // In a real implementation, you would use a QR code scanning library here
        // For now, we'll use manual input
      }

      if (isScanning) {
        requestAnimationFrame(scan)
      }
    }
    scan()
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await checkInGuest(manualCode)
  }

  const checkInGuest = async (qrCode: string) => {
    try {
      setError('')
      
      // Find seating assignment by QR code
      const { data: assignment, error: assignmentError } = await supabase
        .from('seating_assignments')
        .select(`
          *,
          guests (*),
          tables (*)
        `)
        .eq('qr_code', qrCode)
        .single()

      if (assignmentError || !assignment) {
        setError('Invalid QR code. Please try again.')
        return
      }

      if (assignment.checked_in) {
        setError('This guest has already been checked in.')
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
    } catch (error) {
      console.error('Error checking in guest:', error)
      setError('An error occurred. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-wedding-lightPink to-wedding-cream">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-wedding-darkPink mb-2">
              Guest Check-In Scanner
            </h1>
            <p className="text-gray-700">
              Scan guest QR codes or enter manually
            </p>
          </div>

          {/* Scanner Section */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">QR Code Scanner</h2>
            
            {!isScanning ? (
              <button
                onClick={startScanning}
                className="w-full bg-wedding-pink text-white py-3 px-4 rounded-md hover:bg-wedding-darkPink transition duration-200"
              >
                Start Camera Scanner
              </button>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-wedding-pink rounded-lg"></div>
                  </div>
                </div>
                <button
                  onClick={stopScanning}
                  className="w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition duration-200"
                >
                  Stop Scanner
                </button>
              </div>
            )}

            <div className="mt-6 border-t pt-6">
              <h3 className="font-semibold mb-2">Or enter QR code manually:</h3>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter QR code"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-wedding-pink focus:border-wedding-pink"
                />
                <button
                  type="submit"
                  className="bg-wedding-pink text-white px-6 py-2 rounded-md hover:bg-wedding-darkPink transition duration-200"
                >
                  Check In
                </button>
              </form>
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
                <div className="flex justify-between py-2 border-b">
                  <span className="font-semibold">Email:</span>
                  <span>{scanResult.guests?.email}</span>
                </div>
                {scanResult.guests?.phone && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold">Phone:</span>
                    <span>{scanResult.guests?.phone}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b">
                  <span className="font-semibold">Table:</span>
                  <span className="text-lg font-bold text-wedding-pink">
                    Table {scanResult.table_id}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="font-semibold">Seat:</span>
                  <span className="text-lg font-bold">Seat {scanResult.seat_number}</span>
                </div>
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