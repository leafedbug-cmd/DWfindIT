// src/components/BarcodeScanner.tsx
import React, { useEffect, useRef, useState } from 'react'
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

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const lastScanned = useRef<string>('')
  const lastScanTime = useRef<number>(0)
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0)
  const cooldownInterval = useRef<NodeJS.Timeout>()

  useEffect(() => {
    html5QrCodeRef.current = new Html5Qrcode('reader')

    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices.length) {
          setCameras(devices)
          const backCamera = devices.find(d => /back|environment/i.test(d.label)) || devices[0]
          setSelectedCameraId(backCamera.id)
        } else {
          throw new Error('No cameras found')
        }
      })
      .catch(err => {
        console.error('Camera access error:', err)
        setError(err.message)
        onScanError?.(err.message)
      })

    return () => {
      html5QrCodeRef.current?.stop().catch(() => {})
      clearInterval(cooldownInterval.current)
    }
  }, [onScanError])

  // start scanner when camera selected
  useEffect(() => {
    if (selectedCameraId && !isScanning && !error) {
      startScanner()
    }
  }, [selectedCameraId, isScanning, error])

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

  const startScanner = async () => {
    if (!html5QrCodeRef.current || !selectedCameraId) return
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
          if (!errorMessage.includes('NotFoundException')) console.debug(errorMessage)
        }
      )
    } catch (err: any) {
      console.error('Failed to start scanner:', err)
      setError(err.message)
      onScanError?.(err.message)
    }
  }

  const handleCameraChange = async (id: string) => {
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
    </div>
  )
}
