// src/components/BarcodeScanner.tsx
import React, { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError: (errorMessage: string) => void;
}

const SCANNER_CONTAINER_ID = 'barcode-scanner-container';

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanSuccess, onScanError }) => {
  // Use a ref to hold the scanner instance to prevent re-initialization on re-renders
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // This effect runs only once after the component mounts, ensuring the div exists.
    if (!scannerRef.current) {
      const scanner = new Html5Qrcode(SCANNER_CONTAINER_ID);
      scannerRef.current = scanner;

      const startScanner = async () => {
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (!cameras || cameras.length === 0) {
            onScanError('No cameras found on this device.');
            return;
          }

          // Prefer the back camera
          const cameraId = cameras.find(c => c.label.toLowerCase().includes('back'))?.id || cameras[0].id;

          await scanner.start(
            cameraId,
            {
              fps: 10,
              qrbox: (viewfinderWidth, viewfinderHeight) => {
                const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                const qrboxSize = Math.floor(minEdge * 0.8);
                return { width: qrboxSize, height: qrboxSize };
              },
            },
            onScanSuccess,
            (errorMessage) => {
              // We can ignore the common "QR code not found" message
              if (!errorMessage.includes('NotFoundException')) {
                onScanError(errorMessage);
              }
            }
          );
        } catch (err: any) {
          onScanError(err.message || 'Failed to start scanner.');
        }
      };

      startScanner();
    }

    // This is the cleanup function. It runs when the component is unmounted.
    return () => {
      if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
        scannerRef.current.stop().catch(err => {
          console.error('Failed to stop the scanner on cleanup:', err);
        });
      }
    };
  }, [onScanSuccess, onScanError]); // Dependencies ensure the effect runs only once

  return (
    <div 
      id={SCANNER_CONTAINER_ID} 
      className="w-full border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"
      style={{ minHeight: '300px' }}
    />
  );
};