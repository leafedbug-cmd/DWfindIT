import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void;
  onScanError?: (error: string) => void;
}

const SCAN_COOLDOWN_MS = 3000; // 3 seconds between scans of the same barcode

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScanSuccess,
  onScanError,
}) => {
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [lastScanned, setLastScanned] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanTime = useRef(0);
  const cooldownInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize scanner
    html5QrCodeRef.current = new Html5Qrcode("reader");
    
    // Get cameras
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        setCameras(devices);
        // Select back camera by default
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('environment')
        ) || devices[0];
        setSelectedCameraId(backCamera.id);
      }
    }).catch(err => {
      console.error("Error getting cameras:", err);
      setError(err.message);
    });

    return () => {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
      if (cooldownInterval.current) {
        clearInterval(cooldownInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedCameraId && !isScanning) {
      startScanner();
    }
  }, [selectedCameraId]);

  const startCooldown = () => {
    setCooldownRemaining(SCAN_COOLDOWN_MS / 1000);
    
    cooldownInterval.current = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          if (cooldownInterval.current) {
            clearInterval(cooldownInterval.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startScanner = async () => {
    if (!html5QrCodeRef.current || !selectedCameraId || isScanning) return;

    try {
      setIsScanning(true);
      
      await html5QrCodeRef.current.start(
        selectedCameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          const now = Date.now();
          
          // Check if we're in cooldown for this specific barcode
          if (decodedText === lastScanned && now - lastScanTime.current < SCAN_COOLDOWN_MS) {
            console.log(`Ignoring duplicate scan of ${decodedText} (cooldown active)`);
            return;
          }
          
          console.log(`Scanned: ${decodedText}`);
          setLastScanned(decodedText);
          lastScanTime.current = now;
          onScanSuccess(decodedText);
          
          // Start cooldown timer
          startCooldown();
          
          // Flash border green
          const reader = document.getElementById('reader');
          if (reader) {
            reader.style.borderColor = '#10b981';
            reader.style.borderWidth = '4px';
            setTimeout(() => {
              reader.style.borderColor = '#e5e7eb';
              reader.style.borderWidth = '2px';
            }, 300);
          }
        },
        (errorMessage) => {
          // Ignore common errors
          if (!errorMessage.includes("NotFoundException")) {
            console.debug(errorMessage);
          }
        }
      );
    } catch (err: any) {
      console.error("Failed to start scanner:", err);
      setIsScanning(false);
      if (onScanError) onScanError(err.message);
    }
  };

  const handleCameraChange = async (cameraId: string) => {
    if (html5QrCodeRef.current?.isScanning) {
      await html5QrCodeRef.current.stop();
      setIsScanning(false);
    }
    setSelectedCameraId(cameraId);
  };

  const [error, setError] = useState<string | null>(null);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (error && isIOS) {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-medium text-yellow-800 mb-2">iOS Camera Access</h3>
        <p className="text-sm text-yellow-700 mb-3">{error}</p>
        <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1">
          <li>Open this site in Safari (not Chrome)</li>
          <li>Tap the Share button</li>
          <li>Select "Add to Home Screen"</li>
          <li>Open the app from your home screen</li>
        </ol>
      </div>
    );
  }

  return (
    <div className="w-full">
      {cameras.length > 1 && (
        <div className="mb-2 text-sm text-gray-700">
          <label htmlFor="camera-select" className="mr-2 font-medium">Camera:</label>
          <select
            id="camera-select"
            value={selectedCameraId}
            onChange={(e) => handleCameraChange(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.label || `Camera ${camera.id}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        id="reader"
        style={{
          width: '100%',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
          transition: 'border-color 0.3s ease',
          minHeight: '300px'
        }}
      />
      
      {lastScanned && (
        <div className="mt-2 text-xs text-center text-gray-500">
          Last scanned: {lastScanned}
          {cooldownRemaining > 0 && (
            <span className="ml-2 text-orange-600">
              (cooldown: {cooldownRemaining}s)
            </span>
          )}
        </div>
      )}
    </div>
  );
};