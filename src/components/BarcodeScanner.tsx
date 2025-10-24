// src/components/BarcodeScanner.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void;
  onScanError?: (error: string) => void;
  // Optional sizing tweaks for larger screens
  maxHeightVh?: number; // default 65
  maxPixelHeight?: number; // default 700
}

const SCAN_COOLDOWN_MS = 3000; // 3s cooldown for duplicate scans
const SWITCH_DELAY_MS = 200;   // tiny pause to let video/DOM settle

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanSuccess, onScanError, maxHeightVh = 65, maxPixelHeight = 700 }) => {
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationStatus, setInitializationStatus] = useState<string>('Initializing...');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [isSwitching, setIsSwitching] = useState<boolean>(false); // NEW: serialize transitions

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanned = useRef<string>('');
  const lastScanTime = useRef<number>(0);
  const cooldownInterval = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef<boolean>(true);

  const startCooldown = () => {
    setCooldownRemaining(SCAN_COOLDOWN_MS / 1000);
    if (cooldownInterval.current) clearInterval(cooldownInterval.current);
    cooldownInterval.current = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          if (cooldownInterval.current) clearInterval(cooldownInterval.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const ensureInstance = () => {
    // Some browsers/devices need a fresh instance after stop()
    if (!html5QrCodeRef.current) {
      html5QrCodeRef.current = new Html5Qrcode('reader');
    }
  };

  const stopScanner = useCallback(async () => {
    if (!html5QrCodeRef.current) return;
    try {
      await html5QrCodeRef.current.stop();
      // html5-qrcode sometimes keeps stale video; clearing helps avoid "width is 0"
      try {
        await html5QrCodeRef.current.clear();
      } catch {}
    } catch {
      // ignore
    } finally {
      setIsScanning(false);
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (!mountedRef.current) return;
    if (!selectedCameraId) return;
    if (isScanning) return;

    ensureInstance();
    const inst = html5QrCodeRef.current;
    if (!inst) return;

    setIsScanning(true);
    try {
      // Dynamically size the scan box so labels fit on tablets/desktop
      const dynamicQrBox = (viewfinderWidth: number, viewfinderHeight: number) => {
        const vw = Math.max(0, viewfinderWidth);
        const vh = Math.max(0, viewfinderHeight);
        // Use a wide rectangle helpful for 1D labels; cap for performance
        const width = Math.round(Math.min(600, vw * 0.85));
        const height = Math.round(Math.min(350, vh * 0.55));
        // Ensure sensible minimums
        return { width: Math.max(220, width), height: Math.max(160, height) };
      };

      await inst.start(
        { deviceId: { exact: selectedCameraId } },
        {
          fps: 10,
          qrbox: dynamicQrBox,
          aspectRatio: 16 / 9,
        },
        decodedText => {
          if (!mountedRef.current) return;

          const now = Date.now();
          if (decodedText === lastScanned.current && now - lastScanTime.current < SCAN_COOLDOWN_MS) {
            return;
          }

          lastScanned.current = decodedText;
          lastScanTime.current = now;

          const reader = document.getElementById('reader');
          if (reader) {
            (reader as HTMLElement).style.border = '4px solid #10b981';
            setTimeout(() => {
              if (mountedRef.current) (reader as HTMLElement).style.border = '2px solid #e5e7eb';
            }, 300);
          }

          onScanSuccess(decodedText);
          startCooldown();
        },
        errorMessage => {
          // Noise filter: only log interesting errors
          if (
            !errorMessage.includes('NotFoundException') &&
            !errorMessage.includes('No MultiFormat Readers')
          ) {
            console.debug('Scanner error:', errorMessage);
          }
        }
      );
      console.log('Scanner started');
    } catch (err: any) {
      console.error('Failed to start scanner:', err);
      if (mountedRef.current) {
        setError(err?.message || String(err));
        setIsScanning(false);
        onScanError?.(err?.message || String(err));
      }
    }
  }, [selectedCameraId, isScanning, onScanSuccess, onScanError]);

  // Initialize camera AFTER component mounts
  useEffect(() => {
    mountedRef.current = true;

    const initializeCamera = async () => {
      if (!mountedRef.current) return;

      try {
        setInitializationStatus('Checking for camera access...');

        const readerElement = document.getElementById('reader');
        if (!readerElement) throw new Error('Scanner container not found in DOM');

        if (html5QrCodeRef.current) {
          try {
            await html5QrCodeRef.current.stop();
          } catch {}
          html5QrCodeRef.current = null;
        }

        ensureInstance();

        setInitializationStatus('Requesting camera permissions...');
        const devices = await Html5Qrcode.getCameras();

        if (!mountedRef.current) return;

        if (devices.length) {
          setCameras(devices);

          const backCamera =
            devices.find(d => /back|environment|rear/i.test(d.label)) ?? devices[0];

          setSelectedCameraId(backCamera.id);
          setIsInitialized(true);
          setInitializationStatus('Camera ready!');
        } else {
          throw new Error('No cameras found on this device');
        }
      } catch (err: any) {
        console.error('Camera initialization error:', err);
        if (mountedRef.current) {
          setError(err?.message || String(err));
          setInitializationStatus(`Error: ${err?.message || String(err)}`);
          onScanError?.(err?.message || String(err));
        }
      }
    };

    const initTimeout = setTimeout(initializeCamera, 150);

    return () => {
      mountedRef.current = false;
      clearTimeout(initTimeout);
      if (cooldownInterval.current) clearInterval(cooldownInterval.current);
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start when ready
  useEffect(() => {
    if (selectedCameraId && isInitialized && !isScanning && !error && mountedRef.current && !isSwitching) {
      startScanner();
    }
  }, [selectedCameraId, isInitialized, isScanning, error, isSwitching, startScanner]);

  // NEW: safe switch that serializes stop→wait→(re)create→start
  const safeSwitchTo = useCallback(
    async (id: string) => {
      if (isSwitching) return;
      setIsSwitching(true);

      try {
        await stopScanner();
        await new Promise(res => setTimeout(res, SWITCH_DELAY_MS));
        // Recreate the instance to avoid "InvalidStateError / source width is 0"
        html5QrCodeRef.current = null;
        ensureInstance();
        setSelectedCameraId(id); // triggers auto-start effect
      } finally {
        // Let the effect kick startScanner; give it a tiny window first
        setTimeout(() => setIsSwitching(false), SWITCH_DELAY_MS);
      }
    },
    [isSwitching, stopScanner]
  );

  const handleCameraChange = async (id: string) => {
    // Users may tap quickly; this guards against state-transition clashes
    await safeSwitchTo(id);
  };

  const handleRetry = async () => {
    setError(null);
    setIsInitialized(false);
    setInitializationStatus('Retrying...');
    await safeSwitchTo(selectedCameraId || '');
    // If none selected (rare), just re-run the init flow:
    if (!selectedCameraId) {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!devices.length) throw new Error('No cameras found on this device');
        const backCamera =
          devices.find(d => /back|environment|rear/i.test(d.label)) ?? devices[0];
        setCameras(devices);
        setSelectedCameraId(backCamera.id);
        setIsInitialized(true);
        setInitializationStatus('Camera ready!');
      } catch (e: any) {
        setError(e?.message || String(e));
        onScanError?.(e?.message || String(e));
      }
    }
  };

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded">
        <div className="flex items-center mb-2">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
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
    );
  }

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
            disabled={isSwitching}
          >
            {cameras.map(device => (
              <option key={device.id} value={device.id}>
                {device.label || `Camera ${device.id}`}
              </option>
            ))}
          </select>
          {isSwitching && (
            <div className="text-xs text-gray-500 mt-1">Switching cameras…</div>
          )}
        </div>
      )}

      {/* Scanner container - ALWAYS rendered */}
      <div
        id="reader"
        className="w-full rounded-lg overflow-hidden"
        style={{
          // Keep reasonable size on tablets/desktop
          height: `min(${maxHeightVh}vh, ${maxPixelHeight}px)`,
          maxWidth: 'min(100%, 1000px)',
          margin: '0 auto',
          border: '2px solid #e5e7eb',
          transition: 'border 0.3s ease',
          backgroundColor: isInitialized ? 'black' : '#f3f4f6',
        }}
      />

      {/* Status messages */}
      {cooldownRemaining > 0 && (
        <div className="text-center mt-3 p-2 bg-orange-100 text-orange-800 rounded">
          <span className="text-sm font-medium">Scan cooldown: {cooldownRemaining}s</span>
        </div>
      )}

      {isScanning && (
        <div className="text-center mt-3 text-sm text-gray-600">
          <div className="flex items-center justify-center">
            <div className="w-2 h-2 rounded-full mr-2 animate-pulse" style={{ background: '#22c55e' }}></div>
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
  );
};
