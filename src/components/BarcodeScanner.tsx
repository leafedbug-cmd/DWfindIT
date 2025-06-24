import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void;
  onScanError?: (error: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ 
  onScanSuccess, 
  onScanError 
}) => {
  const [isIOS, setIsIOS] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Detect iOS devices
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // iOS-specific implementation
      initIOSScanner();
    } else {
      // Android/Desktop implementation
      initStandardScanner();
    }

    return () => {
      // Cleanup
      const element = document.getElementById("reader");
      if (element) {
        element.innerHTML = "";
      }
    };
  }, [onScanSuccess]);

  const initStandardScanner = () => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true
      },
      false
    );

    scanner.render(
      (decodedText) => {
        console.log(`Code scanned: ${decodedText}`);
        onScanSuccess(decodedText);
      },
      (error) => {
        if (!error.includes("NotFoundException") && !error.includes("No MultiFormat Readers")) {
          console.log(error);
        }
      }
    );
  };

  const initIOSScanner = async () => {
    try {
      // For iOS, try a more direct approach
      const html5QrCode = new Html5Qrcode("reader");
      
      // iOS-specific config
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.777778 // 16:9 aspect ratio works better on iOS
      };

      // Get available cameras
      const cameras = await Html5Qrcode.getCameras();
      
      if (cameras && cameras.length > 0) {
        // Prefer back camera on iOS
        const backCamera = cameras.find(camera => 
          camera.label.toLowerCase().includes('back') || 
          camera.label.toLowerCase().includes('environment')
        ) || cameras[0];

        await html5QrCode.start(
          backCamera.id,
          config,
          (decodedText) => {
            console.log(`iOS scan: ${decodedText}`);
            onScanSuccess(decodedText);
          },
          (errorMessage) => {
            if (!errorMessage.includes("NotFoundException")) {
              console.debug(errorMessage);
            }
          }
        );
      } else {
        throw new Error("No cameras found");
      }
    } catch (err: any) {
      console.error("iOS Scanner Error:", err);
      setError("Camera not available. Try adding this site to your home screen.");
      if (onScanError) onScanError(err.message);
    }
  };

  if (error && isIOS) {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-medium text-yellow-800 mb-2">iOS Camera Access</h3>
        <p className="text-sm text-yellow-700 mb-3">{error}</p>
        <div className="text-xs text-gray-600 space-y-2">
          <p className="font-semibold">For best results on iPhone:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open this site in Safari (not Chrome)</li>
            <li>Tap the Share button</li>
            <li>Select "Add to Home Screen"</li>
            <li>Open the app from your home screen</li>
          </ol>
          <p className="mt-3">Or try:</p>
          <p>Settings → Safari → Camera → Ask/Allow</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div id="reader" style={{ width: "100%" }} />
      {isIOS && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Using iOS camera mode
        </div>
      )}
    </div>
  );
};