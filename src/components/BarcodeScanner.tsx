import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Scan, Camera, X, AlertCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void;
  onScanError?: (error: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ 
  onScanSuccess, 
  onScanError 
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if we're on HTTPS
  useEffect(() => {
    if (window.location.protocol !== 'https:') {
      setError('Camera requires HTTPS connection. Please use https://');
      setHasPermission(false);
    }
  }, []);

  const requestCameraPermission = async () => {
    try {
      // First check if the browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser');
      }

      // Request camera permission explicitly
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });

      // If we got here, permission was granted
      // Stop the stream immediately as we just needed to check permission
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (err: any) {
      console.error('Camera permission error:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is already in use by another application.');
      } else {
        setError(`Camera error: ${err.message}`);
      }
      
      return false;
    }
  };

  const startScanner = async () => {
    try {
      setError(null);
      setIsInitializing(true);
      
      if (!containerRef.current) {
        setError('Scanner container not found');
        return;
      }

      // Check camera permission first
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        setHasPermission(false);
        setIsInitializing(false);
        return;
      }

      setHasPermission(true);
      
      // Initialize scanner if not already done
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('reader');
      }
      
      const scanner = scannerRef.current;
      
      // Configuration optimized for mobile
      const config = {
        fps: 10,
        qrbox: { 
          width: Math.min(250, window.innerWidth - 50), 
          height: 150 
        },
        aspectRatio: 1.0,
        // Disable verbose logging
        verbose: false,
        // Enable experimental features for better mobile support
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        formatsToSupport: [
          Html5Qrcode.FORMATS.CODE_128,
          Html5Qrcode.FORMATS.QR_CODE,
          Html5Qrcode.FORMATS.UPC_A,
          Html5Qrcode.FORMATS.UPC_E,
          Html5Qrcode.FORMATS.EAN_13,
          Html5Qrcode.FORMATS.EAN_8
        ]
      };
      
      setIsScanning(true);
      setIsInitializing(false);
      
      // Start scanning with better error handling
      await scanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          console.log(`Scanned: ${decodedText}`);
          onScanSuccess(decodedText);
          // Optional: Auto-stop after successful scan
          // stopScanner();
        },
        (errorMessage) => {
          // Ignore "no QR code found" messages
          if (!errorMessage.includes("NotFoundException")) {
            console.debug("Scan error:", errorMessage);
          }
        }
      ).catch((err) => {
        console.error("Failed to start scanner:", err);
        setError(`Failed to start scanner: ${err.message || err}`);
        setIsScanning(false);
        setHasPermission(false);
      });
      
    } catch (err: any) {
      console.error("Scanner error:", err);
      setIsScanning(false);
      setIsInitializing(false);
      setError(err.message || 'Failed to start scanner');
      if (onScanError) onScanError(err.message);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        console.log("Scanner stopped");
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
      setIsScanning(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  // Permission denied UI
  if (hasPermission === false) {
    return (
      <div className="p-4 bg-red-50 rounded-lg text-center">
        <AlertCircle className="mx-auto mb-2 text-red-600 h-8 w-8" />
        <h3 className="text-lg font-medium text-red-800">Camera Access Denied</h3>
        <p className="mt-2 text-sm text-red-700">
          {error || 'Please allow camera access to scan barcodes.'}
        </p>
        <div className="mt-4 text-xs text-gray-600">
          <p className="font-semibold">To enable camera:</p>
          <p className="mt-1">iOS: Settings → Safari → Camera → Allow</p>
          <p>Android: Browser menu → Settings → Site settings → Camera</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-md text-sm"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div 
        id="reader" 
        ref={containerRef}
        className="w-full overflow-hidden rounded-lg bg-gray-50 border-2 border-gray-200"
        style={{ minHeight: '250px' }}
      >
        {isInitializing && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Initializing camera...</p>
            </div>
          </div>
        )}
      </div>
      
      {error && !hasPermission && (
        <div className="mt-2 p-2 bg-red-50 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
      
      <div className="mt-4 flex justify-center">
        {!isScanning ? (
          <button
            onClick={startScanner}
            disabled={isInitializing}
            className="flex items-center justify-center px-6 py-3 bg-orange-600 text-white rounded-full shadow-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="mr-2 h-5 w-5" />
            {isInitializing ? 'Initializing...' : 'Start Scanner'}
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition-colors"
          >
            <X className="mr-2 h-5 w-5" />
            Stop Scanner
          </button>
        )}
      </div>
    </div>
  );
};