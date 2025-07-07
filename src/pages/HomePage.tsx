// src/pages/HomePage.tsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { BottomNav } from '../components/BottomNav'
import { Scan, ClipboardList, Package, X } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../services/supabase'
import { useStore } from '../contexts/StoreContext'

export const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { selectedStore } = useStore()
  const [isQuickScanning, setIsQuickScanning] = useState(false)
  const [quickScanResult, setQuickScanResult] = useState<any>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scannerRef, setScannerRef] = useState<Html5Qrcode | null>(null)

  useEffect(() => {
    // Cleanup scanner on unmount
    return () => {
      if (scannerRef) {
        scannerRef.stop().catch(() => {})
      }
    }
  }, [scannerRef])

  const startQuickScan = async () => {
    setScanError(null)
    setQuickScanResult(null)

    // small delay so DOM has #quick-scanner container
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode('quick-scanner')
        setScannerRef(html5QrCode)

        const cameras = await Html5Qrcode.getCameras()
        if (!cameras.length) throw new Error('No cameras found')

        const camera =
          cameras.find((cam) =>
            cam.label.toLowerCase().includes('back')
          ) || cameras[0]

        await html5QrCode.start(
          camera.id,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            await html5QrCode.stop()
            setScannerRef(null)

            console.log(`Quick scan: ${decodedText} @ store ${selectedStore}`)

            // <-- use maybeSingle() here to avoid 406
            const { data: partData, error: partError } = await supabase
              .from('parts')
              .select('*')
              .eq('part_number', decodedText)
              .eq('store_location', selectedStore)
              .maybeSingle()

            if (partError) {
              console.error('Lookup error:', partError)
              setScanError(`Part "${decodedText}" not found in store ${selectedStore}`)
            } else if (!partData) {
              setScanError(`Part "${decodedText}" not found in store ${selectedStore}`)
            } else {
              console.log('Part found:', partData)
              setQuickScanResult(partData)
            }
          },
          (errorMessage) => {
            if (!errorMessage.includes('NotFoundException')) {
              console.debug('Scanner error:', errorMessage)
            }
          }
        )
      } catch (err: any) {
        console.error('Quick scan error:', err)
        setScanError(err.message || 'Failed to start scanner')
      }
    }, 100)
  }

  const handleQuickScan = () => {
    setIsQuickScanning(true)
    startQuickScan()
  }

  const closeQuickScan = async () => {
    if (scannerRef) {
      await scannerRef.stop().catch(() => {})
      setScannerRef(null)
    }
    setIsQuickScanning(false)
    setQuickScanResult(null)
    setScanError(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title="Inventory Scanner" />

      <main className="flex-1 p-4">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-orange-100 mb-4">Your mobile inventory scanning assistant</p>
          <p className="text-orange-200 text-sm mb-6">Store: {selectedStore}</p>

          <button
            onClick={() => navigate('/scan')}
            className="bg-white text-orange-600 px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-shadow flex items-center"
          >
            <Scan className="mr-2 h-5 w-5" />
            Start Scanning
          </button>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/lists')}
              className="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-md transition-shadow"
            >
              <ClipboardList className="h-12 w-12 text-orange-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">View Lists</h3>
              <p className="text-sm text-gray-600">Manage your inventory lists</p>
            </button>
            <button
              onClick={handleQuickScan}
              className="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-md transition-shadow"
            >
              <Scan className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Quick Scan</h3>
              <p className="text-sm text-gray-600">One-time bin lookup</p>
            </button>
          </div>
        </div>
      </main>

      {/* Quick Scan Modal */}
      {isQuickScanning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Quick Scan - Store {selectedStore}</h3>
              <button onClick={closeQuickScan} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            {!quickScanResult && !scanError && (
              <>
                <div
                  id="quick-scanner"
                  className="w-full rounded-lg overflow-hidden border-2 border-gray-200"
                  style={{ minHeight: '300px' }}
                />
                <p className="text-sm text-gray-600 text-center mt-2">
                  Point camera at barcode
                </p>
              </>
            )}

            {quickScanResult && (
              <div className="p-6 bg-green-50 rounded-lg">
                <div className="text-center mb-4">
                  <Package className="h-16 w-16 text-green-600 mx-auto" />
                </div>
                <div className="space-y-2">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Part Number</p>
                    <p className="text-lg font-medium">{quickScanResult.part_number}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Bin Location</p>
                    <p className="text-2xl font-bold text-green-600">
                      {quickScanResult.bin_location}
                    </p>
                  </div>
                  <div className="text-center mt-2">
                    <p className="text-xs text-gray-500">
                      Store {quickScanResult.store_location}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeQuickScan}
                  className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Done
                </button>
              </div>
            )}

            {scanError && (
              <div className="p-6 bg-red-50 rounded-lg text-center">
                <p className="text-red-700">{scanError}</p>
                <button
                  onClick={() => {
                    setScanError(null)
                    startQuickScan()
                  }}
                  className="mt-4 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 mr-2"
                >
                  Try Again
                </button>
                <button
                  onClick={closeQuickScan}
                  className="mt-4 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
