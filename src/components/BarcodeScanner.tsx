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

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const lastScanned = useRef<string>('')
  const lastScanTime = useRef<number>(0)
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0)
  const cooldownInterval = useRef<NodeJS.Timeout>()

  const startScanner = useCallback(async () => {
    if (!html5QrCodeRef.current || !selectedCameraId || isScanning) return
    
    console.log('Starting scanner with camera:', selectedCameraId)
    setIsScanning(true)

    try {
      await html5QrCodeRef.current.start(
        selectedCameraId,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        decodedText => {
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
            setTimeout(() => (reader.style.border = '2px solid #e5e7eb'), 300)
          }
        },
        errorMessage => {
          if (!errorMessage.includes('NotFoundException')) {
            console.debug('Scanner error:', errorMessage)
          }
        }
      )
      console.log('Scanner started successfully')
    } catch (err: any) {
      console.error('Failed to start scanner:', err)
      setError(err.message)
      setIsScanning(false)
      onScanError?.(err.message)
    }
  }, [selectedCameraId, isScanning, onScanSuccess, onScanError])

  // Initialize camera once DOM is ready
  useEffect(() => {
    let mounted = true
    let retryCount = 0
    const maxRetries = 10

    const waitForElement = (selector: string, timeout = 5000): Promise<Element> => {
      return new Promise((resolve, reject) => {
        const element = document.getElementById(selector.replace('#', ''))
        if (element) {
          resolve(element)
          return
        }

        const observer = new MutationObserver(() => {
          const element = document.getElementById(selector.replace('#', ''))
          if (element) {
            observer.disconnect()
            resolve(element)
          }
        })

        observer.observe(document.body, {
          childList: true,
          subtree: true
        })

        setTimeout(() => {
          observer.disconnect()
          reject(new Error(`Element ${selector} not found within ${timeout}ms`))
        }, timeout)
      })
    }

    const initializeCamera = async () => {
      try {
        console.log('Waiting for reader element...')
        
        // Wait for DOM element to be available with retry logic
        await waitForElement('reader', 5000)
        
        if (!mounted) return

        console.log('Reader element found, initializing Html5Qrcode scanner...')
        html5QrCodeRef.current = new Html5Qrcode('reader')

        console.log('Getting available cameras...')
        const devices = await Html5Qrcode.getCameras()
        
        if (!mounted) return

        if (devices.length) {
          console.log('Found cameras:', devices.map(d => ({ id: d.id, label: d.label })))
          setCameras(devices)
          const backCamera = devices.find(d => /back|environment/i.test(d.label)) || devices[0]
          console.log('Selected camera:', backCamera)
          setSelectedCameraId(backCamera.id)
          setIsInitialized(true)
        } else {
          throw new Error('No cameras found on this device')
        }
      } catch (err: any) {
        console.error('Camera initialization error:', err)
        if (mounted && retryCount < maxRetries) {
          retryCount++
          console.log(`Retrying camera initialization (${retryCount}/${maxRetries})...`)
          setTimeout(initializeCamera, 500)
        } else if (mounted) {
          setError(err.message)
          onScanError?.(err.message)
        }
      }
    }

    // Start initialization
    initializeCamera()

    return () => {
      mounted = false
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {})
      }
      clearInterval(cooldownInterval.current)
    }
  }, [onScanError])

  // Start scanner when camera is selected and initialized
  useEffect(() => {
    if (selectedCameraId && isInitialized && !isScanning && !error) {
      console.log('Auto-starting scanner...')
      startScanner()
    }
  }, [selectedCameraId, isInitialized, isScanning, error, startScanner])

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

  const handleCameraChange = async (id: string) => {
    console.log('Changing camera to:', id)
    if (html5QrCodeRef.current?.isScanning) {
      await html5QrCodeRef.current.stop()
      setIsScanning(false)
    }
    setSelectedCameraId(id)
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded">
        <p>Error initializing camera:</p>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!isInitialized) {
    return (
      <div className="p-4 bg-blue-100 text-blue-700 rounded">
        <p>Initializing camera...</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {cameras.length > 1 && (
        <div className="mb-2">
          <label className="mr-2">Camera:</label>
          <select value={selectedCameraId} onChange={e => handleCameraChange(e.target.value)}>
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
        style={{
          width: '100%',
          minHeight: '300px',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          transition: 'border 0.3s ease',
        }}
      />

      {cooldownRemaining > 0 && (
        <div className="text-center mt-2 text-sm text-orange-600">
          Cooldown: {cooldownRemaining}s
        </div>
      )}

      {!isScanning && isInitialized && (
        <div className="text-center mt-2 text-sm text-gray-600">
          Point camera at barcode or QR code
        </div>
      )}
    </div>
  )
}