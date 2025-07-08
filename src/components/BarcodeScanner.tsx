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
  const [initializationStatus, setInitializationStatus] = useState<string>('Waiting for camera...')

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const lastScanned = useRef<string>('')
  const lastScanTime = useRef<number>(0)
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0)
  const cooldownInterval = useRef<NodeJS.Timeout>()
  const mountedRef = useRef<boolean>(true)

  // DEBUG: Add this useEffect to test if the element exists
  useEffect(() => {
    const checkElement = () => {
      const readerEl = document.getElementById('reader')
      console.log('DEBUG: reader element exists?', !!readerEl, readerEl)
      console.log('DEBUG: All elements with id containing "reader":', 
        Array.from(document.querySelectorAll('[id*="reader"]')))
    }
    
    // Check immediately
    checkElement()
    
    // Check after small delays
    setTimeout(checkElement, 100)
    setTimeout(checkElement, 500)
    setTimeout(checkElement, 1000)
  }, [])

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
          lastScanned.current = decodedText
          lastScanTime.current = now
          onScanSuccess(decodedText)
          startCooldown()

          // flash border
          const reader = document.getElementById('reader')
          if (reader) {
            reader.style.border = '4px solid #10b981'
            setTimeout(() => {
              if (mountedRef.current) reader.style.border = '2px solid #e5e7eb'
            }, 300)
          }
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

  // Initialize camera once DOM is ready
  useEffect(() => {
    mountedRef.current = true
    let retryCount = 0
    const maxRetries = 5

    const waitForElement = (id: string): Promise<HTMLElement> => {
      return new Promise((resolve, reject) => {
        const checkElement = () => {
          const element = document.getElementById(id)
          if (element) {
            resolve(element)
            return
          }

          if (retryCount >= maxRetries) {
            reject(new Error(`Element #${id} not found after ${maxRetries} retries`))
            return
          }

          retryCount++
          console.log(`Waiting for #${id} element... (${retryCount}/${maxRetries})`)
          setTimeout(checkElement, 200)
        }

        checkElement()
      })
    }

    const initializeCamera = async () => {
      if (!mountedRef.current) return

      try {
        setInitializationStatus('Looking for scanner container...')
        console.log('Waiting for reader element...')
        
        // Wait for DOM element to be available
        await waitForElement('reader')
        
        if (!mountedRef.current) return

        setInitializationStatus('Initializing camera scanner...')
        console.log('Reader element found, initializing Html5Qrcode scanner...')
        
        // Clean up any existing scanner first
        if (html5QrCodeRef.current) {
          try {
            await html5QrCodeRef.current.stop()
          } catch {}
        }
        
        html5QrCodeRef.current = new Html5Qrcode('reader')

        setInitializationStatus('Requesting camera access...')
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

    // Start initialization after a small delay
    const initTimeout = setTimeout(initializeCamera, 100)

    return () => {
      mountedRef.current = false
      clearTimeout(initTimeout)
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {})
      }
      clearInterval(cooldownInterval.current)
    }
  }, [onScanError])

  // Start scanner when camera is selected and initialized
  useEffect(() => {
    if (selectedCameraId && isInitialized && !isScanning && !error && mountedRef.current) {
      console.log('Auto-starting scanner...')
      startScanner()
    }
  }, [selectedCameraId, isInitialized, isScanning, error, startScanner])

  const handleCameraChange = async (id: string) => {
    console.log('Changing camera to:', id)
    if (html5QrCodeRef.current?.isScanning) {
      await html5QrCodeRef.current.stop()
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

  if (!isInitialized) {
    return (
      <div className="p-4 bg-blue-100 text-blue-700 rounded">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
          <span>{initializationStatus}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* DEBUG: Add this debug div to verify JSX is rendering */}
      <div style={{background: 'yellow', padding: '10px', marginBottom: '10px', color: 'black'}}>
        DEBUG: BarcodeScanner component is rendering. isInitialized: {isInitialized.toString()}
      </div>

      {cameras.length > 1 && (
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

      <div
        id="reader"
        className="w-full bg-black rounded-lg overflow-hidden"
        style={{
          minHeight: '300px',
          border: '2px solid #e5e7eb',
          transition: 'border 0.3s ease',
          background: 'lightblue' // DEBUG: Add background to verify div renders
        }}
      >
        <div style={{padding: '20px', textAlign: 'center', color: 'black'}}>
          DEBUG: This is the #reader div. Element ID should be "reader"
        </div>
      </div>

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