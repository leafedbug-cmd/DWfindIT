import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner, Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';

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
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState('');
  const lastScanTime = useRef(0);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
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

  const initStandardScanner = useCallback(() => {
    scannerRef.current = new Html5QrcodeScanner(
      'reader',
      {
        fps: 10,
        qrbox: QR_BOX,
        rememberLastUsedCamera: true,
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        disableFlip: false,
      },
      false
    );

    scannerRef.current.render(
      handleSuccessfulScan,
      (err) => {
        if (typeof err === 'string' && !err.includes('NotFoundException')) {
          console.debug('Scanner Error:', err);
        }
      }
    );
  }, [handleSuccessfulScan]);

  const initIOSScanner = useCallback(async () => {
    try {
      html5QrCodeRef.current = new Html5Qrcode('reader');
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras.length) throw new Error('No cameras found');

      const backCamera = cameras.find(c =>
        c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment')
      ) || cameras[0];

      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: QR_BOX,
        aspectRatio: 1.777778,
      };

      await html5QrCodeRef.current.start(
        backCamera.id,
        config,
        handleSuccessfulScan,
        (err) => {
          if (typeof err === 'string' && !err.includes('NotFoundException')) {
            console.debug('iOS Scan Error:', err);
          }
        }
      );
    } catch (err: any) {
      console.error('iOS Scanner Error:', err);
      setError('Camera not available. Try adding this site to your home screen.');
      onScanError?.(err.message);
    }
  }, [handleSuccessfulScan, onScanError]);

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    iOS ? initIOSScanner() : initStandardScanner();

    return () => {
      scannerRef.current?.clear().catch(console.error);
      html5QrCodeRef.current?.stop().catch(console.error);
    };
  }, [initIOSScanner, initStandardScanner]);

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
