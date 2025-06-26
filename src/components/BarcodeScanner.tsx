import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig, CameraDevice } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void;
  onScanError?: (error: string) => void;
}

const SCAN_INTERVAL_MS = 2000;
const QR_BOX = { width: 250, height: 250 };

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScanSuccess,
  onScanError,
}) => {
  const [isIOS, setIsIOS] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState('');
  const lastScanTime = useRef(0);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const handleSuccessfulScan = useCallback((decodedText: string) => {
    const now = Date.now();
    if (decodedText === lastScanned && now - lastScanTime.current < SCAN_INTERVAL_MS) return;

    lastScanTime.current = now;
    setLastScanned(decodedText);
    onScanSuccess(decodedText);
    flashSuccessIndicator();
  }, [lastScanned, onScanSuccess]);

  const flashSuccessIndicator = () => {
    const el = document.getElementById('reader');
    if (el) {
      el.style.borderColor = '#10b981';
      el.style.borderWidth = '4px';
      setTimeout(() => {
        el.style.borderColor = '#e5e7eb';
        el.style.borderWidth = '2px';
      }, 300);
    }
  };

  const startScannerWithCamera = useCallback(async (cameraId: string) => {
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("reader");
      }

      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      }

      await new Promise(res => setTimeout(res, 100)); // Wait for DOM to stabilize

      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: QR_BOX,
        aspectRatio: 1.777778,
      };

      await html5QrCodeRef.current.start(
        cameraId,
        config,
        handleSuccessfulScan,
        (errorMessage) => {
          if (typeof errorMessage === "string" && !errorMessage.includes("NotFoundException")) {
            console.debug("Scan error:", errorMessage);
          }
        }
      );
    } catch (err: any) {
      console.error("Scanner start error:", err);
      setError(err.message);
      onScanError?.(err.message);
    }
  }, [handleSuccessfulScan, onScanError]);

  const initScanner = useCallback(async () => {
    const devices = await Html5Qrcode.getCameras();
    if (devices.length === 0) throw new Error("No cameras found");

    setCameras(devices);

    const preferred = devices.find(cam =>
      cam.label.toLowerCase().includes("back") || cam.label.toLowerCase().includes("environment")
    ) || devices[0];

    setSelectedCameraId(preferred.id);
  }, []);

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    initScanner().catch(err => {
      console.error("Init scanner failed:", err);
      setError(err.message);
      onScanError?.(err.message);
    });

    return () => {
      html5QrCodeRef.current?.stop().catch(console.error);
      html5QrCodeRef.current?.clear().catch(console.error);
    };
  }, [initScanner, onScanError]);

  useEffect(() => {
    if (selectedCameraId) {
      const timeout = setTimeout(() => {
        startScannerWithCamera(selectedCameraId);
      }, 300); // slight delay to avoid white screen bug
      return () => clearTimeout(timeout);
    }
  }, [selectedCameraId, startScannerWithCamera]);

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
            value={selectedCameraId || ''}
            onChange={(e) => setSelectedCameraId(e.target.value)}
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
        }}
      />
      {lastScanned && (
        <div className="mt-2 text-xs text-center text-gray-500">
          Last scanned: {lastScanned}
        </div>
      )}
      {isIOS && (
        <div className="mt-1 text-xs text-gray-500 text-center">
          Using iOS camera mode - Scanner stays active
        </div>
      )}
    </div>
  );
};
