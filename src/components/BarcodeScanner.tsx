// src/components/BarcodeScanner.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void
  onScanError?: (error: string) => void
}

const SCAN_COOLDOWN_MS = 3000 // 3s cooldown for duplicate scans

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanSuccess, onScanError }) => {
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
  const cooldownInterval = useRef<NodeJS.Timeout>()
  const mountedRef = useRef<boolean>(true)

  const startScanner = useCallback(async () => {
    if (!html5QrCodeRef.current || !selectedCameraId || isScanning || !mountedRef.current) return
    
    console.log('Starting scanner with camera:', selectedCameraId)
    setIsScanning(true)

    try {
      await html5QrCodeRef.current.start(
        selectedCameraId,
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        decodedText => {
          if (!mountedRef.current) return
          
          const now = Date.now()
          if (decodedText === lastScanned.current && now - lastScanTime.current < SCAN_COOLDOWN_MS) {
            return
          }
          
          console.log('Barcode scanned:', decodedText)
          lastScanned.current = decodedText
          lastScanTime.current = now
          
          // Flash border to show successful scan
          const reader = document.getElementById('reader')
          if (reader) {
            reader.style.border = '4px solid #10b981'
            setTimeout(() => {
              if (mountedRef.current) reader.style.border = '2px solid #e5e7eb'
            }, 300)
          }
          
          // Call the success handler
          onScanSuccess(decodedText)
          
          // Start cooldown to prevent duplicate scans
          startCooldown()
        },
        errorMessage => {
          if (!errorMessage.includes('NotFoundException') && !errorMessage.includes('No MultiFormat Readers')) {
            console.debug('Scanner error:', errorMessage)
          }
        }
      )
      console.log('Scanner started successfully')
    } catch (err: any) {
      console.error('Failed to start scanner:', err)
      if (mountedRef.current) {
        setError(err.message)
        setIsScanning(false)
        onScanError?.(err.message)
      }
    }
  }, [selectedCameraId, isScanning, onScanSuccess, onScanError])

  const startCooldown = () => {
    setCooldownRemaining(SCAN_COOLDOWN_MS / 1000)
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

  // Initialize camera AFTER component renders
  useEffect(() => {
    mountedRef.current = true

    const initializeCamera = async () => {
      if (!mountedRef.current) return

      try {
        setInitializationStatus('Checking for camera access...')
        console.log('Initializing Html5Qrcode scanner...')
        
        // Wait a moment for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Verify the reader element exists
        const readerElement = document.getElementById('reader')
        if (!readerElement) {
          throw new Error('Scanner container not found in DOM')
        }
        
        console.log('Reader element found:', readerElement)
        
        // Clean up any existing scanner first
        if (html5QrCodeRef.current) {
          try {
            await html5QrCodeRef.current.stop()
          } catch {}
          html5QrCodeRef.current = null
        }
        
        html5QrCodeRef.current = new Html5Qrcode('reader')

        setInitializationStatus('Requesting camera permissions...')
        console.log('Getting available cameras...')
        const devices = await Html5Qrcode.getCameras()
        
        if (!mountedRef.current) return

        if (devices.length) {
          console.log('Found cameras:', devices.map(d => ({ id: d.id, label: d.label })))
          setCameras(devices)
          
          // Prefer back/environment camera
          const backCamera = devices.find(d => 
            /back|environment/i.test(d.label) || 
            /rear/i.test(d.label)
          ) || devices[0]
          
          console.log('Selected camera:', backCamera)
          setSelectedCameraId(backCamera.id)
          setIsInitialized(true)
          setInitializationStatus('Camera ready!')
        } else {
          throw new Error('No cameras found on this device')
        }
      } catch (err: any) {
        console.error('Camera initialization error:', err)
        if (mountedRef.current) {
          setError(err.message)
          setInitializationStatus(`Error: ${err.message}`)
          onScanError?.(err.message)
        }
      }
    }

    // Only initialize if not already initialized
    if (!isInitialized) {
      const initTimeout = setTimeout(initializeCamera, 200)
      return () => {
        clearTimeout(initTimeout)
      }
    }

    return () => {
      mountedRef.current = false
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop().catch(() => {})
        } catch (err) {
          console.log('Cleanup error:', err)
        }
      }
      clearInterval(cooldownInterval.current)
    }
  }, []) // Remove onScanError dependency to prevent re-initialization

  // Start scanner when camera is selected and initialized
  useEffect(() => {
    if (selectedCameraId && isInitialized && !isScanning && !error && mountedRef.current) {
      console.log('Auto-starting scanner...')
      startScanner()
    }
  }, [selectedCameraId, isInitialized, isScanning, error, startScanner])

  const handleCameraChange = async (id: string) => {
    console.log('Changing camera to:', id)
    if (html5QrCodeRef.current) {
      try {
        // Simple check - just try to stop regardless of state
        await html5QrCodeRef.current.stop()
      } catch (err) {
        console.log('Scanner was already stopped or not running:', err)
      }
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

  // ALWAYS render the scanner container, regardless of initialization state
  return (
    <div className="w-full">
      {/* Initialization status */}
      {!isInitialized && (
        <div className="p-4 bg-blue-100 text-blue-700 rounded mb-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
            <span>{initializationStatus}</span>
          </div>
        </div>
      )}

      {/* Camera selection */}
      {cameras.length > 1 && isInitialized && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Camera:
          </label>
          <select 
            value={selectedCameraId} 
            onChange={e => handleCameraChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
          >
            {cameras.map(device => (
              <option key={device.id} value={device.id}>
                {device.label || `Camera ${device.id}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Scanner container - ALWAYS rendered */}
      <div
        id="reader"
        className="w-full rounded-lg overflow-hidden"
        style={{
          minHeight: '300px',
          border: '2px solid #e5e7eb',
          transition: 'border 0.3s ease',
          backgroundColor: isInitialized ? 'black' : '#f3f4f6'
        }}
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

      {/* Status messages */}
      {cooldownRemaining > 0 && (
        <div className="text-center mt-3 p-2 bg-orange-100 text-orange-800 rounded">
          <span className="text-sm font-medium">
            Scan cooldown: {cooldownRemaining}s
          </span>
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
        <div className="text-center mt-3 text-sm text-gray-500">
          Camera ready - waiting for barcode
        </div>
      )}
    </div>
  )
}