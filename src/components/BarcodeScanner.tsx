// src/components/BarcodeScanner.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeCameraType } from 'html5-qrcode'

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void
  onScanError?: (error: string) => void
}

const SCAN_COOLDOWN_MS = 3000

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanSuccess, onScanError }) => {
  const [cameras, setCameras] = useState<any[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [initializationStatus, setInitializationStatus] = useState<string>('Initializing camera…')
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0)

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const lastScanned = useRef<string>('')
  const lastScanTime = useRef<number>(0)
  const cooldownInterval = useRef<NodeJS.Timeout>()
  const mountedRef = useRef<boolean>(true)

  // ---------- helpers ----------
  const startCooldown = () => {
    setCooldownRemaining(SCAN_COOLDOWN_MS / 1000)
    clearInterval(cooldownInterval.current)
    cooldownInterval.current = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          clearInterval(cooldownInterval.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const ensureVideoInline = () => {
    // html5-qrcode creates its own <video>; nudge iOS to behave.
    const video = document.querySelector<HTMLVideoElement>('#reader video')
    if (video) {
      video.setAttribute('playsinline', 'true')
      video.setAttribute('autoplay', 'true')
      video.muted = true
    }
  }

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
      } catch (_) {
        // already stopped
      }
      try {
        await html5QrCodeRef.current.clear()
      } catch (_) {}
    }
    setIsScanning(false)
  }, [])

  const startScanner = useCallback(async () => {
    if (!html5QrCodeRef.current || !selectedCameraId || isScanning || !mountedRef.current) return

    setIsScanning(true)
    setError(null)

    // Prefer explicit deviceId (fixes many iOS/Safari issues)
    const primaryConstraints = { deviceId: { exact: selectedCameraId } } as any
    const fallbackConstraints = { facingMode: Html5QrcodeCameraType.BACK } as any

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      // niceties when supported:
      showTorchButtonIfSupported: true,
      showZoomSliderIfSupported: true,
    } as any

    const onSuccess = (decodedText: string) => {
      if (!mountedRef.current) return
      const now = Date.now()
      if (decodedText === lastScanned.current && now - lastScanTime.current < SCAN_COOLDOWN_MS) return

      lastScanned.current = decodedText
      lastScanTime.current = now

      const reader = document.getElementById('reader')
      if (reader) {
        reader.style.border = '4px solid #10b981'
        setTimeout(() => {
          if (mountedRef.current) reader.style.border = '2px solid #e5e7eb'
        }, 300)
      }
      onScanSuccess(decodedText)
      startCooldown()
    }

    const onErr = (msg: string) => {
      // ignore frequent "NotFoundException" noise
      if (!/NotFoundException|No MultiFormat Readers/i.test(msg)) {
        console.debug('Scanner error:', msg)
      }
    }

    try {
      // try explicit deviceId
      await html5QrCodeRef.current.start(primaryConstraints, config, onSuccess, onErr)
      ensureVideoInline()
    } catch (e1: any) {
      console.warn('start with deviceId failed, trying fallback…', e1?.message)
      try {
        // fallback to facingMode
        await html5QrCodeRef.current.start(fallbackConstraints, config, onSuccess, onErr)
        ensureVideoInline()
      } catch (e2: any) {
        console.error('Failed to start scanner:', e2)
        if (mountedRef.current) {
          setError(e2.message || 'Could not start video source')
          setIsScanning(false)
          onScanError?.(e2.message || 'Could not start video source')
        }
      }
    }
  }, [selectedCameraId, isScanning, onScanSuccess, onScanError])

  // ---------- init ----------
  useEffect(() => {
    mountedRef.current = true

    const initialize = async () => {
      try {
        setInitializationStatus('Preparing camera container…')
        await new Promise(r => setTimeout(r, 60))

        const container = document.getElementById('reader')
        if (!container) throw new Error('Scanner container not found')

        // clean any previous instance
        if (html5QrCodeRef.current) {
          await stopScanner()
          html5QrCodeRef.current = null
        }

        html5QrCodeRef.current = new Html5Qrcode('reader', /* verbose= */ false)
        setInitializationStatus('Requesting camera access…')

        const devices = await Html5Qrcode.getCameras()
        if (!mountedRef.current) return

        if (!devices || devices.length === 0) {
          throw new Error('No cameras found on this device')
        }

        setCameras(devices)

        // prefer back/environment camera
        const back = devices.find(d =>
          /back|environment|rear/i.test(d.label || '')
        ) || devices[0]

        setSelectedCameraId(back.id)
        setIsInitialized(true)
        setInitializationStatus('Camera ready')
      } catch (err: any) {
        console.error('Camera init error:', err)
        if (mountedRef.current) {
          setError(err.message)
          setInitializationStatus(`Error: ${err.message}`)
          onScanError?.(err.message)
        }
      }
    }

    const t = setTimeout(initialize, 150)
    return () => {
      mountedRef.current = false
      clearTimeout(t)
      clearInterval(cooldownInterval.current)
      stopScanner()
    }
  }, [onScanError, stopScanner])

  // autostart when ready
  useEffect(() => {
    if (selectedCameraId && isInitialized && !isScanning && !error && mountedRef.current) {
      startScanner()
    }
  }, [selectedCameraId, isInitialized, isScanning, error, startScanner])

  const handleCameraChange = async (id: string) => {
    await stopScanner()
    setSelectedCameraId(id)
  }

  const handleRetry = async () => {
    setError(null)
    setIsInitialized(false)
    setInitializationStatus('Retrying…')
    await stopScanner()
    // soft re-init without full page reload
    setTimeout(() => {
      if (mountedRef.current) setIsInitialized(false)
    }, 50)
  }

  // ---------- UI ----------
  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded">
        <div className="flex items-center mb-2">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">Camera Error</span>
        </div>
        <p className="mb-3">{error}</p>
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="w-full">
      {!isInitialized && (
        <div className="p-4 bg-blue-100 text-blue-700 rounded mb-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
            <span>{initializationStatus}</span>
          </div>
        </div>
      )}

      {cameras.length > 1 && isInitialized && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
