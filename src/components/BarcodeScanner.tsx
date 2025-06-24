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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = async () => {
    try {
      setError(null);
      
      if (!containerRef.current) return;
      
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('reader');
      }
      
      const scanner = scannerRef.current;
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.0,
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
      
      await navigator.mediaDevices.getUserMedia({ video: true });
      setHasPermission(true);
      
      await scanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          onScanSuccess(decodedText);
        },
        (errorMessage) => {
          console.error("QR Code scanning error: ", errorMessage);
        }
      );
    } catch (err: any) {
      setIsScanning(false);
      setError(err.message || 'Failed to start scanner');
      setHasPermission(false);
      if (onScanError) onScanError(err.message);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  if (hasPermission === false) {
    return (
      <div className="p-4 bg-red-50 rounded-lg text-center">
        <AlertCircle className="mx-auto mb-2 text-red-600 h-8 w-8" />
        <h3 className="text-lg font-medium text-red-800">Camera Access Denied</h3>
        <p className="mt-2 text-sm text-red-700">
          Please allow camera access to scan barcodes. You may need to update your browser settings.
        </p>
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
      ></div>
      
      {error && (
        <div className="mt-2 p-2 bg-red-50 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
      
      <div className="mt-4 flex justify-center">
        {!isScanning ? (
          <button
            onClick={startScanner}
            className="flex items-center justify-center px-6 py-3 bg-orange-600 text-white rounded-full shadow-md hover:bg-orange-700 transition-colors"
          >
            <Camera className="mr-2 h-5 w-5" />
            Start Scanner
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