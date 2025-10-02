'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import jsQR from 'jsqr'
import Link from 'next/link'

type GuestInfo = {
  id: string  // UUID - changé de guest_id à id pour correspondre à all_guests_status
  first_name: string
  last_name: string
  full_name?: string
  table_number: number
  table_name: string
  seat_number?: number
  color_code: string
  color_name: string
  is_vip?: boolean
  checked_in: boolean
  checked_in_at?: string
  dietary_restrictions?: string
  special_needs?: string
  was_new_checkin?: boolean  // Pour distinguer un nouveau check-in d'un déjà enregistré
}

type TableAvailability = {
  table_number: number
  table_name: string
  color_code: string
  color_name: string
  available_seats: number
  occupied_seats: number
  capacity: number
  checked_in_count: number
  is_vip: boolean
}

export default function ScannerV2() {
  const [isScanning, setIsScanning] = useState(false)
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    availableSeats: 0,
    checkedIn: 0,
    totalGuests: 0
  })
  const [tableAvailability, setTableAvailability] = useState<TableAvailability[]>([])
  const [showTableDetails, setShowTableDetails] = useState(false)
  const [scanAttempts, setScanAttempts] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    loadStats()
    loadTableAvailability()
    // Recharger les stats toutes les 30 secondes
    const interval = setInterval(() => {
      loadStats()
      loadTableAvailability()
    }, 30000)
    return () => {
      stopCamera()
      clearInterval(interval)
    }
  }, [])

  const loadStats = async () => {
    try {
      const { count: checkedInCount } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('checked_in', true)

      const { count: guestCount } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })

      // Utiliser la vue table_status pour avoir les vrais chiffres (comme page gestion)
      const { data: tableStatus } = await supabase
        .from('table_status')
        .select('available_seats')
        .neq('table_number', 27)  // Exclure la table enfants

      const availableSeats = tableStatus?.reduce((sum, table) => sum + table.available_seats, 0) || 0

      setStats({
        availableSeats: availableSeats,
        checkedIn: checkedInCount || 0,
        totalGuests: guestCount || 0
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadTableAvailability = async () => {
    try {
      const { data: tables } = await supabase
        .from('table_status')
        .select('table_number, table_name, color_code, color_name, available_seats, occupied_seats, capacity, is_vip')
        .neq('table_number', 27)  // Exclure la table enfants
        .order('table_number')

      // Pour chaque table, compter les invités checked-in
      const tablesWithCheckedIn = await Promise.all(
        (tables || []).map(async (table) => {
          const { count } = await supabase
            .from('seating_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('table_id', table.table_number)
            .eq('checked_in', true)

          return {
            ...table,
            checked_in_count: count || 0
          }
        })
      )

      setTableAvailability(tablesWithCheckedIn)
    } catch (error) {
      console.error('Error loading table availability:', error)
    }
  }

  const startCamera = async () => {
    console.log('StartCamera appelé')
    setMessage('⏳ Démarrage de la caméra...')
    
    try {
      console.log('Demande d\'accès à la caméra...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      console.log('Stream obtenu:', stream)
      
      console.log('Configuration du stream...')
      streamRef.current = stream
      setIsScanning(true)
      setMessage('')
      setScanAttempts(0)
      
      // Attendre un peu que le DOM soit prêt puis configurer la vidéo
      setTimeout(() => {
        if (videoRef.current) {
          console.log('VideoRef maintenant disponible, configuration...')
          videoRef.current.srcObject = stream
          // Attendre que la vidéo soit prête
          videoRef.current.onloadedmetadata = () => {
            console.log('Metadata chargées')
            videoRef.current?.play().then(() => {
              console.log('Vidéo en lecture, début du scan...')
              scanQRCode()
            }).catch(err => {
              console.error('Erreur play():', err)
              setMessage('❌ Erreur lors du démarrage de la vidéo')
            })
          }
        } else {
          console.error('videoRef.current toujours null après timeout!')
          setMessage('❌ Référence vidéo non trouvée')
        }
      }, 100)
    } catch (error) {
      setMessage('❌ Impossible d\'accéder à la caméra')
      console.error('Camera error:', error)
      // Afficher plus de détails sur l'erreur
      if (error instanceof Error) {
        console.error('Message:', error.message)
        console.error('Name:', error.name)
      }
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.log('scanQRCode: refs manquantes', { video: !!videoRef.current, canvas: !!canvasRef.current })
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (video.readyState === video.HAVE_ENOUGH_DATA && context) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      try {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        })

        setScanAttempts(prev => prev + 1)

        if (code && code.data) {
          console.log('QR Code détecté:', code.data)
          handleQRCode(code.data)
          return
        }
      } catch (err) {
        console.error('Erreur de scan QR:', err)
      }
    }

    // Continuer le scan
    if (streamRef.current) {
      requestAnimationFrame(scanQRCode)
    }
  }

  const handleQRCode = async (qrCode: string) => {
    setIsLoading(true)
    stopCamera()
    
    try {
      // Le format attendu est WEDDING-{nom complet} ou WEDDING-{nom complet}-{numéro}
      if (!qrCode.startsWith('WEDDING-')) {
        setMessage('❌ QR Code invalide')
        setGuestInfo(null)
        return
      }

      // Rechercher directement par le QR code exact
      const { data: guests, error } = await supabase
        .from('all_guests_status')
        .select('*')
        .eq('qr_code', qrCode)

      if (error || !guests || guests.length === 0) {
        setMessage('❌ Invité non trouvé')
        setGuestInfo(null)
        return
      }

      const data = guests[0]
      console.log('Données récupérées:', data)

      setGuestInfo(data)
      
      // Vibration pour feedback (si supporté)
      if ('vibrate' in navigator) {
        navigator.vibrate(200)
      }

      // Vérifier si la table assignée est pleine
      if (data.table_number) {
        const tableInfo = tableAvailability.find(t => t.table_number === data.table_number)
        if (tableInfo && tableInfo.available_seats === 0) {
          setMessage('⚠️ Attention : La table assignée est complète !')
        }
      }

      // Vérifier si on a bien un id
      if (!data.id) {
        console.error('id manquant dans les données:', data)
        setMessage('❌ Erreur: Identifiant invité manquant')
        return
      }

      // Stocker le statut initial de check-in
      const wasAlreadyCheckedIn = data.checked_in
      
      // Vérifier si déjà check-in
      if (wasAlreadyCheckedIn) {
        setMessage('⚠️ Cet invité a déjà été enregistré !')
        // Afficher quand même les infos mais avec un message d'avertissement
      } else {
        // Faire le check-in
        console.log('Tentative de check-in pour id:', data.id)

        // Mettre à jour guests.checked_in
        const { error: updateError } = await supabase
          .from('guests')
          .update({
            checked_in: true,
            checked_in_at: new Date().toISOString()
          })
          .eq('id', data.id) // id est déjà un UUID

        // Mettre à jour seating_assignments.checked_in aussi
        const { error: assignmentError } = await supabase
          .from('seating_assignments')
          .update({
            checked_in: true,
            checked_in_at: new Date().toISOString()
          })
          .eq('guest_id', data.id)

        if (updateError || assignmentError) {
          console.error('Erreur check-in:', updateError || assignmentError)
          setMessage('❌ Erreur lors du check-in')
        } else {
          setMessage('✅ Check-in réussi!')
          // Mettre à jour l'état local MAIS garder une info sur le fait que c'était un nouveau check-in
          setGuestInfo({ ...data, checked_in: true, was_new_checkin: true })
          // Recharger les stats
          loadStats()
          loadTableAvailability()
        }
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('❌ Erreur lors du scan')
    } finally {
      setIsLoading(false)
    }
  }

  const resetScanner = () => {
    setGuestInfo(null)
    setMessage('')
    startCamera()
    loadStats() // Recharger les stats après check-in
    loadTableAvailability() // Recharger la disponibilité des tables
  }

  const handleCheckout = async () => {
    if (!guestInfo || !guestInfo.id) return

    setIsLoading(true)
    try {
      // Annuler dans guests
      const { error: guestError } = await supabase
        .from('guests')
        .update({
          checked_in: false,
          checked_in_at: null
        })
        .eq('id', guestInfo.id)

      // Annuler dans seating_assignments aussi
      const { error: assignmentError } = await supabase
        .from('seating_assignments')
        .update({
          checked_in: false,
          checked_in_at: null
        })
        .eq('guest_id', guestInfo.id)

      if (guestError || assignmentError) {
        console.error('Erreur checkout:', guestError || assignmentError)
        setMessage('❌ Erreur lors de l\'annulation du check-in')
      } else {
        setMessage('✅ Check-in annulé avec succès')
        // Mettre à jour l'état local
        setGuestInfo({ ...guestInfo, checked_in: false })
        // Recharger les stats
        loadStats()
        loadTableAvailability()
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('❌ Erreur lors de l\'annulation')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header avec bouton retour et stats */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <div className="flex justify-between items-start mb-4">
            <Link href="/" className="text-gray-600 hover:text-gray-800">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Scanner QR Code
              </h1>
              <p className="text-gray-600 mt-1 text-sm">
                Scannez le code de l'invité
              </p>
            </div>
            <div className="w-6"></div>
          </div>
          
          {/* Stats en temps réel */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-green-50 rounded-lg p-2">
              <p className="text-lg font-bold text-green-600">{stats.availableSeats}</p>
              <p className="text-xs text-gray-600">Places libres</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2">
              <p className="text-lg font-bold text-blue-600">{stats.checkedIn}</p>
              <p className="text-xs text-gray-600">Présents</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2">
              <p className="text-lg font-bold text-purple-600">{stats.totalGuests}</p>
              <p className="text-xs text-gray-600">Total invités</p>
            </div>
          </div>
        </div>

        {/* Section Tables Disponibles - Collapsible */}
        <div className="bg-white rounded-xl shadow-lg mb-4 overflow-hidden">
          <button
            onClick={() => setShowTableDetails(!showTableDetails)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className="font-semibold text-gray-700 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Taux de remplissage
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {tableAvailability.length} tables
              </span>
              <svg 
                className={`w-5 h-5 text-gray-400 transform transition-transform ${showTableDetails ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {/* Grille des tables avec taux de remplissage (check-in) */}
          {showTableDetails && (
            <div className="px-4 pb-4 border-t border-gray-100">
              {tableAvailability.length > 0 ? (
                <div className="space-y-3 mt-3">
                  {tableAvailability.map((table) => {
                    const checkinPercentage = (table.checked_in_count / table.capacity) * 100
                    return (
                      <div
                        key={table.table_number}
                        className="p-3 rounded-lg border"
                        style={{
                          borderColor: table.color_code,
                          backgroundColor: `${table.color_code}10`
                        }}
                      >
                        {/* En-tête de la table */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <span
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: table.color_code }}
                            />
                            <span className="font-medium text-sm">
                              {table.table_name}
                              {table.is_vip && <span className="ml-2 text-yellow-500">⭐</span>}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-600 font-semibold">
                              ✓ {table.checked_in_count}/{table.capacity} ({Math.round(checkinPercentage)}%)
                            </div>
                          </div>
                        </div>

                        {/* Barre de progression (taux check-in) */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className="h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${checkinPercentage}%`,
                              backgroundColor: checkinPercentage === 100 ? '#10B981' : checkinPercentage >= 80 ? '#F59E0B' : table.color_code
                            }}
                          />
                        </div>

                        {/* Info places disponibles (non assignées) */}
                        {table.available_seats > 0 && (
                          <div className="text-xs text-green-600 font-medium">
                            📍 {table.available_seats} place{table.available_seats > 1 ? 's' : ''} libre{table.available_seats > 1 ? 's' : ''}
                          </div>
                        )}
                        {table.available_seats === 0 && (
                          <div className="text-xs text-red-600 font-medium">
                            🔴 Table complète (assignation)
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4 text-sm">
                  Aucune table à afficher
                </p>
              )}
            </div>
          )}
        </div>

        {/* Scanner ou Résultat */}
        {!guestInfo ? (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {isScanning ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-[400px] object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Overlay de scan */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 border-4 border-white rounded-lg opacity-50">
                    <div className="w-full h-full border-2 border-white rounded-lg animate-pulse"></div>
                  </div>
                </div>

                {/* Info de débogage */}
                <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-xs">
                  Scan en cours... ({scanAttempts})
                </div>

                {/* Bouton Stop */}
                <button
                  onClick={stopCamera}
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                >
                  Arrêter
                </button>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="mb-6">
                  <svg className="w-24 h-24 mx-auto text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                
                {/* Afficher le message s'il y en a un */}
                {message && (
                  <div className={`mb-4 p-3 rounded-lg ${
                    message.includes('❌') ? 'bg-red-100 text-red-700' : 
                    message.includes('⏳') ? 'bg-blue-100 text-blue-700' : 
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {message}
                  </div>
                )}
                
                <button
                  onClick={startCamera}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  Démarrer le scan
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Résultat du scan avec couleur */
          <div className="space-y-4">
            {/* Carte principale avec couleur de table */}
            <div 
              className="rounded-2xl shadow-xl overflow-hidden"
              style={{ 
                backgroundColor: guestInfo.color_code,
                borderWidth: '4px',
                borderColor: guestInfo.color_code
              }}
            >
              {/* Bandeau VIP si applicable */}
              {guestInfo.is_vip && (
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-center py-2 font-bold">
                  ⭐ INVITÉ VIP ⭐
                </div>
              )}
              
              <div className="bg-white bg-opacity-95 p-6">
                {/* Nom de l'invité */}
                <h2 className="text-3xl font-bold text-gray-800 text-center mb-4">
                  {guestInfo.first_name} {guestInfo.last_name}
                </h2>
                
                {/* Informations de table avec grande visibilité */}
                <div className="bg-gray-50 rounded-xl p-6 mb-4">
                  <div className="text-center mb-4">
                    <div
                      className="inline-block px-6 py-3 rounded-full text-white text-2xl font-bold shadow-lg"
                      style={{ backgroundColor: guestInfo.color_code }}
                    >
                      {guestInfo.table_name}
                    </div>
                    {/* Numéro de table en plus petit dessous */}
                    <p className="text-gray-500 text-sm mt-2">Table {guestInfo.table_number}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-gray-500 text-sm">Couleur</p>
                      <p className="font-semibold flex items-center justify-center">
                        <span
                          className="w-4 h-4 rounded-full mr-2"
                          style={{ backgroundColor: guestInfo.color_code }}
                        ></span>
                        {guestInfo.color_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Siège</p>
                      <p className="text-2xl font-bold">{guestInfo.seat_number || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Statut de check-in */}
                <div className={`text-center p-4 rounded-lg ${
                  guestInfo.checked_in && !guestInfo.was_new_checkin
                    ? 'bg-yellow-100 text-yellow-800' 
                    : guestInfo.checked_in && guestInfo.was_new_checkin
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {guestInfo.checked_in && !guestInfo.was_new_checkin ? (
                    <>
                      <p className="text-2xl mb-1">⚠️</p>
                      <p className="font-semibold">Déjà enregistré</p>
                    </>
                  ) : guestInfo.checked_in && guestInfo.was_new_checkin ? (
                    <>
                      <p className="text-2xl mb-1">✅</p>
                      <p className="font-semibold">Check-in réussi!</p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl mb-1">✨</p>
                      <p className="font-semibold">Nouvel enregistrement</p>
                    </>
                  )}
                </div>

                {/* Informations spéciales */}
                {(guestInfo.dietary_restrictions || guestInfo.special_needs) && (
                  <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                    <p className="font-semibold text-yellow-800 mb-2">⚠️ Informations importantes</p>
                    {guestInfo.dietary_restrictions && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Régime:</span> {guestInfo.dietary_restrictions}
                      </p>
                    )}
                    {guestInfo.special_needs && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Besoins spéciaux:</span> {guestInfo.special_needs}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Message de statut */}
            {message && (
              <div className={`p-4 rounded-lg text-center font-semibold ${
                message.includes('✅') ? 'bg-green-100 text-green-800' :
                message.includes('❌') ? 'bg-red-100 text-red-800' :
                message.includes('⚠️') ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {message}
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex gap-3">
              <button
                onClick={resetScanner}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              >
                Nouveau scan
              </button>
              
              {guestInfo && guestInfo.checked_in && (
                <button
                  onClick={handleCheckout}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Annulation...' : 'Annuler check-in'}
                </button>
              )}
            </div>

            {/* Suggestions de tables alternatives si la table est pleine */}
            {message.includes('complète') && tableAvailability.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="font-semibold text-orange-800 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Tables alternatives disponibles
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {tableAvailability.slice(0, 6).map((table) => (
                    <div 
                      key={table.table_number}
                      className="flex items-center justify-between p-2 bg-white rounded-lg border"
                      style={{ 
                        borderColor: table.color_code,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: table.color_code }}
                        />
                        <span className="font-semibold text-sm">
                          Table {table.table_number}
                          {table.is_vip && <span className="ml-1 text-yellow-500 text-xs">⭐</span>}
                        </span>
                      </div>
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                        {table.available_seats} pl.
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-3 italic">
                  Veuillez réorienter l'invité vers l'une de ces tables
                </p>
              </div>
            )}

          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Vérification...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}