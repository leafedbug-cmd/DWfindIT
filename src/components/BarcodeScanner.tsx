// src/components/BarcodeScanner.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void;
  onScanError?: (error: string) => void;
  autoStart?: boolean;
  overlay?: React.ReactNode;
}

const SCAN_COOLDOWN_MS = 3000;

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScanSuccess,
  onScanError,
  autoStart = true,
  overlay,
}) => {
  // unique container id for this instance (avoids "Scanner container not found")
  const containerIdRef = useRef<string>(`reader-${Math.random().toString(36).slice(2)}`);
  const containerElRef = useRef<HTMLDivElement | null>(null);

  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [initStatus, setInitStatus] = useState('Initializing…');
  const [error, setError] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef<boolean>(true);

  const lastScanned = useRef<string>('');
  const lastScanTime = useRef<number>(0);
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

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

  const stopScanner = useCallback(async () => {
    if (!html5QrCodeRef.current) return;
    try {
      if (isScanning) await html5QrCodeRef.current.stop();
    } catch {}
    try {
      await html5QrCodeRef.current.clear();
    } catch {}
    setIsScanning(false);
  }, [isScanning]);

  const startScanner = useCallback(async () => {
    if (!html5QrCodeRef.current || !selectedCameraId || isScanning || !mountedRef.current) return;

    try {
      setIsScanning(true);
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
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        },
        (decodedText) => {
          if (!mountedRef.current) return;
          const now = Date.now();
          if (decodedText === lastScanned.current && now - lastScanTime.current < SCAN_COOLDOWN_MS) return;

          lastScanned.current = decodedText;
          lastScanTime.current = now;

          // quick success flash
          const el = containerElRef.current;
          if (el) {
            el.style.border = '4px solid #10b981';
            setTimeout(() => { if (mountedRef.current && el) el.style.border = '2px solid #e5e7eb'; }, 300);
          }

          onScanSuccess(decodedText);
          startCooldown();
        },
        // ignore noisy decode errors so logs don’t spam
        () => {}
      );
    } catch (err: any) {
      if (!mountedRef.current) return;
      const msg = err?.message || String(err);
      setError(msg);
      setIsScanning(false);
      onScanError?.(msg);
    }
  }, [selectedCameraId, isScanning, onScanSuccess, onScanError]);

  // initialize after the container is in the DOM
  const initialize = useCallback(async () => {
    try {
      setError(null);
      setInitStatus('Checking camera access…');

      // wait a frame to ensure the div is mounted
      await new Promise(requestAnimationFrame);

      const containerId = containerIdRef.current;
      if (!containerElRef.current || !containerId) {
        throw new Error('Scanner container not found');
      }

      // dispose previous instance if any
      if (html5QrCodeRef.current) {
        try { await html5QrCodeRef.current.stop(); } catch {}
        try { await html5QrCodeRef.current.clear(); } catch {}
        html5QrCodeRef.current = null;
      }

      html5QrCodeRef.current = new Html5Qrcode(containerId);

      setInitStatus('Requesting camera…');
      const devices = await Html5Qrcode.getCameras();
      if (!devices?.length) throw new Error('No cameras found');

      const mapped = devices.map((d: any) => ({ id: d.id, label: d.label || `Camera ${d.id}` }));
      setCameras(mapped);
      const back = mapped.find(d => /back|environment|rear/i.test(d.label)) || mapped[0];
      setSelectedCameraId(back.id);

      setIsInitialized(true);
      setInitStatus('Camera ready');

      if (autoStart) startScanner();
    } catch (err: any) {
      const msg = err?.message || String(err);
      setError(msg);
      setInitStatus(`Error: ${msg}`);
      onScanError?.(msg);
    }
  }, [autoStart, onScanError, startScanner]);

  // mount / unmount
  useEffect(() => {
    mountedRef.current = true;
    const t = setTimeout(() => { if (mountedRef.current) initialize(); }, 0);
    return () => {
      clearTimeout(t);
      mountedRef.current = false;
      if (cooldownInterval.current) clearInterval(cooldownInterval.current);
      (async () => {
        try { await stopScanner(); } catch {}
        html5QrCodeRef.current = null;
      })();
    };
  }, [initialize, stopScanner]);

  // auto-start if user switches camera
  const handleCameraChange = async (id: string) => {
    await stopScanner();
    setSelectedCameraId(id);
    if (autoStart) startScanner();
  };

  const handleRetry = async () => {
    await stopScanner();
    setIsInitialized(false);
    setInitStatus('Retrying…');
    initialize();
  };

  if (error) {
    return (
      <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
        <div className="font-semibold mb-1">Camera Error</div>
        <p className="mb-2">{error}</p>
        <button
          onClick={handleRetry}
          className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {!isInitialized && (
        <div className="p-2 bg-blue-100 text-blue-800 rounded-md mb-2 text-sm">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span>{initStatus}</span>
          </div>
        </div>
      )}

      {cameras.length > 1 && isInitialized && (
        <div className="mb-2 p-2 bg-gray-50 rounded-md">
          <label className="block text-xs font-medium text-gray-700 mb-1">Select Camera:</label>
          <select
            value={selectedCameraId}
            onChange={(e) => handleCameraChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-sm"
          >
            {cameras.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>
      )}

      <div className="relative">
        <div
          id={containerIdRef.current}
          ref={containerElRef}
          className="w-full rounded-lg overflow-hidden"
          style={{
            minHeight: '220px',
            border: '2px solid #e5e7eb',
            transition: 'border 0.3s ease',
            backgroundColor: isInitialized ? 'black' : '#f3f4f6',
          }}
        />
        {overlay && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2">
            <div className="pointer-events-auto rounded-lg bg-white/80 backdrop-blur shadow border border-gray-200">
              {overlay}
            </div>
          </div>
        )}
      </div>

      {/* Manual start fallback if autoplay was blocked */}
      {isInitialized && !isScanning && (
        <div className="mt-2">
          <button
            type="button"
            onClick={startScanner}
            className="w-full px-3 py-2 rounded-md bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700"
          >
            Start Camera
          </button>
        </div>
      )}

      {cooldownInterval.current && cooldownRemaining > 0 && (
        <div className="text-center mt-2 p-1.5 bg-orange-100 text-orange-800 rounded text-xs">
          Scan cooldown: {cooldownRemaining}s
        </div>
      )}

      {isScanning && (
        <div className="text-center mt-2 text-xs text-gray-600">
          <div className="flex items-center justify-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Scanning…
          </div>
        </div>
      )}
      {!isScanning && isInitialized && (
        <div className="text-center mt-2 text-xs text-gray-500">Camera ready</div>
      )}
    </div>
  );
};