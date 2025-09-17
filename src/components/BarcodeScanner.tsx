// src/components/BarcodeScanner.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void
  onScanError?: (error: string) => void
  /** if false, do NOT auto-start. if true/undefined, auto-start when ready */
  autoStart?: boolean
  /** optional UI rendered on top of the camera preview (bottom overlay) */
  overlay?: React.ReactNode
}

const SCAN_COOLDOWN_MS = 3000

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScanSuccess,
  onScanError,
  autoStart,
  overlay,
}) => {
  const [cameras, setCameras] = useState<any[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [initializationStatus, setInitializationStatus] = useState<string>('Initializing...')

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const lastScanned = useRef<string>('')
  const lastScanTime = useRef<number>(0)
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0)
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef<boolean>(true)

  const startCooldown = () => {
    setCooldownRemaining(SCAN_COOLDOWN_MS / 1000)
    if (cooldownInterval.current) clearInterval(cooldownInterval.current)
    cooldownInterval.current = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          if (cooldownInterval.current) clearInterval(cooldownInterval.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const startScanner = useCallback(async () => {
    if (!html5QrCodeRef.current || !selectedCameraId || isScanning || !mountedRef.current) return

    try {
      setIsScanning(true)
      await html5QrCodeRef.current.start(
        { deviceId: { exact: selectedCameraId } },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE
          ],
          experimentalFeatures: { useBarCodeDetectorIfSupported: true }
        },
        decodedText => {
          if (!mountedRef.current) return
          const now = Date.now()
          if (decodedText === lastScanned.current && now - lastScanTime.current < SCAN_COOLDOWN_MS) return

          lastScanned.current = decodedText
          lastScanTime.current = now

          const reader = document.getElementById('reader')
          if (reader) {
            reader.style.border = '4px solid #10b981'
            setTimeout(() => { if (mountedRef.current) reader.style.border = '2px solid #e5e7eb' }, 300)
          }

          onScanSuccess(decodedText)
          startCooldown()
        },
        errMsg => {
          if (!/NotFoundException|No MultiFormat Readers/i.test(errMsg)) {
            console.debug('Scanner decode error:', errMsg)
          }
        }
      )
    } catch (err: any) {
      if (!mountedRef.current) return
      const msg = err?.message || String(err)
      setError(msg)
      setIsScanning(false)
      onScanError?.(msg)
    }
  }, [selectedCameraId, isScanning, onScanSuccess, onScanError])

  // Initialize after mount
  useEffect(() => {
    mountedRef.current = true

    const initializeCamera = async () => {
      try {
        setInitializationStatus('Checking for camera access...')
        await new Promise(r => setTimeout(r, 50))

        const readerElement = document.getElementById('reader')
        if (!readerElement) throw new Error('Scanner container not found in DOM')

        if (html5QrCodeRef.current) {
          try { await html5QrCodeRef.current.stop() } catch {}
          try { await html5QrCodeRef.current.clear() } catch {}
          html5QrCodeRef.current = null
        }

        html5QrCodeRef.current = new Html5Qrcode('reader')

        setInitializationStatus('Requesting camera permissions...')
        const devices = await Html5Qrcode.getCameras()
        if (!devices?.length) throw new Error('No cameras found on this device')

        setCameras(devices)
        const back = devices.find(d => /back|environment|rear/i.test(d.label)) || devices[0]
        setSelectedCameraId(back.id)
        setIsInitialized(true)
        setInitializationStatus('Camera ready!')
      } catch (err: any) {
        if (!mountedRef.current) return
        const msg = err?.message || String(err)
        setError(msg)
        setInitializationStatus(`Error: ${msg}`)
        onScanError?.(msg)
      }
    }

    const t = setTimeout(initializeCamera, 100)
    return () => {
      clearTimeout(t)
      mountedRef.current = false
      if (cooldownInterval.current) clearInterval(cooldownInterval.current)
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
          html5QrCodeRef.current?.clear().catch(() => {})
          html5QrCodeRef.current = null
        })
      }
    }
  }, [onScanError])

  // Auto-start when ready (unless explicitly disabled)
  useEffect(() => {
    if (selectedCameraId && isInitialized && !isScanning && !error && mountedRef.current) {
      if (autoStart === false) return
      startScanner()
    }
  }, [selectedCameraId, isInitialized, isScanning, error, startScanner, autoStart])

  const handleCameraChange = async (id: string) => {
    if (html5QrCodeRef.current) {
      try { await html5QrCodeRef.current.stop() } catch {}
      try { await html5QrCodeRef.current.clear() } catch {}
      setIsScanning(false)
    }
    setSelectedCameraId(id)
  }

  const handleRetry = () => {
    setError(null)
    setIsInitialized(false)
    setInitializationStatus('Retrying...')
    window.location.reload()
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded">
        <div className="flex items-center mb-2 font-medium">Camera Error</div>
        <p className="mb-3">{error}</p>
        <button onClick={handleRetry} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Retry</button>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Camera:</label>
          <select
            value={selectedCameraId}
            onChange={e => handleCameraChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
          >
            {cameras.map(d => <option key={d.id} value={d.id}>{d.label || `Camera ${d.id}`}</option>)}
          </select>
        </div>
      )}

      {/* Preview container with overlay */}
      <div className="relative">
        <div
          id="reader"
          className="w-full rounded-lg overflow-hidden"
          style={{ minHeight: '300px', border: '2px solid #e5e7eb', transition: 'border 0.3s ease', backgroundColor: isInitialized ? 'black' : '#f3f4f6' }}
        >
          {!isInitialized && (
            <div className="flex items-center justify-center h-full p-8 text-gray-500">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
                <p>Preparing camera...</p>
              </div>
            </div>
          )}
        </div>

        {/* bottom overlay slot */}
        {overlay && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2">
            <div className="pointer-events-auto rounded-xl bg-white/80 backdrop-blur shadow-md border border-gray-200">
              {overlay}
            </div>
          </div>
        )}
      </div>

      {cooldownInterval.current && cooldownRemaining > 0 && (
        <div className="text-center mt-3 p-2 bg-orange-100 text-orange-800 rounded">
          <span className="text-sm font-medium">Scan cooldown: {cooldownRemaining}s</span>
        </div>
      )}

      {isScanning && (
        <div className="text-center mt-3 text-sm text-gray-600">
          <div className="flex items-center justify-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Point camera at barcode or QR code
          </div>
        </div>
      )}

      {!isScanning && isInitialized && (
        <div className="text-center mt-3 text-sm text-gray-500">Camera ready - waiting for barcode</div>
      )}
    </div>
  )
}
