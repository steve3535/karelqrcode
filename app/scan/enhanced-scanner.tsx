'use client'

import { useRef, useEffect, useCallback } from 'react'
import jsQR from 'jsqr'

interface EnhancedScannerProps {
  onScan: (data: string) => void
  isActive: boolean
}

export default function EnhancedScanner({ onScan, isActive }: EnhancedScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)

  const scan = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isActive) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scan)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      })

      if (code && code.data) {
        console.log('QR Code detected:', code.data)
        onScan(code.data)
      }
    } catch (err) {
      console.error('QR scan error:', err)
    }

    animationRef.current = requestAnimationFrame(scan)
  }, [isActive, onScan])

  useEffect(() => {
    if (isActive) {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          })

          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.play()
            scan()
          }
        } catch (err) {
          console.error('Camera error:', err)
        }
      }

      startCamera()
    } else {
      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive, scan])

  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full rounded-lg"
        style={{ maxHeight: '400px' }}
      />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 border-2 border-wedding-pink rounded-lg">
          <div className="w-full h-full border-8 border-transparent relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-wedding-pink"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-wedding-pink"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-wedding-pink"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-wedding-pink"></div>
          </div>
        </div>
      </div>
    </div>
  )
}