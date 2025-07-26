'use client'

import { useState, useRef } from 'react'

export default function CameraTest() {
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = async () => {
    try {
      setError('')
      setInfo('Requesting camera...')
      
      // Try simplest constraints first
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false 
      })
      
      setInfo(`Got stream with ${stream.getVideoTracks().length} video tracks`)
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setInfo('Stream attached to video element')
        setIsActive(true)
      }
    } catch (err: any) {
      setError(`Error: ${err.name} - ${err.message}`)
      console.error('Camera error:', err)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsActive(false)
    setInfo('')
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Camera Test Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <button
            onClick={isActive ? stopCamera : startCamera}
            className={`px-4 py-2 rounded ${
              isActive 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isActive ? 'Stop Camera' : 'Start Camera'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {info && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
            {info}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-2">Video Preview:</h2>
          <div className="border-2 border-gray-300 rounded">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto"
              style={{ maxHeight: '500px', backgroundColor: '#000' }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            If camera is active but no video shows, check browser console for errors.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mt-4">
          <h2 className="text-lg font-semibold mb-2">Debugging Info:</h2>
          <ul className="text-sm space-y-1">
            <li>Protocol: <span suppressHydrationWarning>{typeof window !== 'undefined' ? window.location.protocol : 'loading...'}</span></li>
            <li>Host: <span suppressHydrationWarning>{typeof window !== 'undefined' ? window.location.host : 'loading...'}</span></li>
            <li>User Agent: <span suppressHydrationWarning>{typeof window !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'loading...'}</span></li>
          </ul>
        </div>
      </div>
    </div>
  )
}