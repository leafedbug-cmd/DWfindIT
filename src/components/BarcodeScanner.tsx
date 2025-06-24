import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { AlertCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void;
  onScanError?: (error: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ 
  onScanSuccess, 
  onScanError 
}) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        supportedScanTypes: ["camera"]
      },
      false
    );

    scanner.render(
      (decodedText) => {
        console.log(`Code scanned: ${decodedText}`);
        onScanSuccess(decodedText);
      },
      (error) => {
        if (!error.includes("NotFoundException")) {
          console.log(error);
        }
      }
    );

    return () => {
      scanner.clear().catch(error => {
        console.error("Failed to clear scanner", error);
      });
    };
  }, [onScanSuccess]);

  return (
    <div className="w-full">
      <div id="reader" />
    </div>
  );
};