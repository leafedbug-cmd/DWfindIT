// src/pages/AutoCountPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { Loader2, Move, RotateCcw, CameraOff, Check } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

type OverlayRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DragHandle = 'move' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type CountAnnotation = {
  label: string;
  centerX: number;
  centerY: number;
  confidence?: number | null;
};

export const AutoCountPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isCameraSwitching, setIsCameraSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [overlayRect, setOverlayRect] = useState<OverlayRect>({ x: 0.15, y: 0.15, width: 0.7, height: 0.6 });
  const [dragState, setDragState] = useState<{
    handle: DragHandle;
    startPointer: { x: number; y: number };
    startRect: OverlayRect;
  } | null>(null);

  const [isCounting, setIsCounting] = useState(false);
  const [countResult, setCountResult] = useState<number | null>(null);
  const [countError, setCountError] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<CountAnnotation[]>([]);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      try {
        setIsCameraSwitching(true);
        setError(null);
        setCapturedImage(null);
        setCountResult(null);
        setCountError(null);
        setAnnotations([]);
        setIsCameraReady(false);

        streamRef.current?.getTracks().forEach((track) => track.stop());

        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? {
                deviceId: { exact: deviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        streamRef.current = stream;

        const [track] = stream.getVideoTracks();
        const activeDeviceId = track?.getSettings().deviceId ?? deviceId ?? null;
        if (activeDeviceId) {
          setSelectedCameraId(activeDeviceId);
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            setError('Unable to start camera preview. Tap to retry.');
          }
        }

        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((mediaDevice) => mediaDevice.kind === 'videoinput');
          setAvailableCameras(videoInputs);
        } catch (enumerateError) {
          console.warn('Unable to enumerate cameras', enumerateError);
        }

        setIsCameraReady(true);
      } catch (cameraError: any) {
        console.error('Camera error', cameraError);
        setError(cameraError?.message ?? 'Unable to access camera. Check permissions and try again.');
        setIsCameraReady(false);
      } finally {
        setIsCameraSwitching(false);
      }
    },
    []
  );

  useEffect(() => {
    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [startCamera]);

  const handleRetake = useCallback(() => {
    startCamera(selectedCameraId ?? undefined);
  }, [selectedCameraId, startCamera]);

  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      setError('Camera not ready yet. Give it another second.');
      return;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/png');
    setCapturedImage(dataUrl);
    setCountResult(null);
    setCountError(null);
    setAnnotations([]);
    video.pause();
  }, []);

  const handlePreviewTap = useCallback(() => {
    if (capturedImage || !isCameraReady || isCounting || isCameraSwitching) {
      return;
    }
    handleCapture();
  }, [capturedImage, handleCapture, isCameraReady, isCounting, isCameraSwitching]);

  const handlePreviewKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLVideoElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      if (capturedImage || !isCameraReady || isCounting || isCameraSwitching) {
        return;
      }
      event.preventDefault();
      handleCapture();
    },
    [capturedImage, handleCapture, isCameraReady, isCounting, isCameraSwitching]
  );

  const handleCameraSelectChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newCameraId = event.target.value;
      if (!newCameraId || newCameraId === selectedCameraId) {
        return;
      }
      setSelectedCameraId(newCameraId);
      startCamera(newCameraId);
    },
    [selectedCameraId, startCamera]
  );

  const handleOverlayPointerDown = (handle: DragHandle, event: React.PointerEvent) => {
    if (!containerRef.current) return;
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    setDragState({
      handle,
      startPointer: { x: event.clientX, y: event.clientY },
      startRect: overlayRect,
    });
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragState || !containerRef.current) return;
      const containerBounds = containerRef.current.getBoundingClientRect();
      if (!containerBounds.width || !containerBounds.height) return;

      const deltaX = (event.clientX - dragState.startPointer.x) / containerBounds.width;
      const deltaY = (event.clientY - dragState.startPointer.y) / containerBounds.height;
      const minSize = 0.1;

      setOverlayRect((prev) => {
        let { x, y, width, height } = dragState.startRect;

        if (dragState.handle === 'move') {
          const newX = clamp(x + deltaX, 0, 1 - width);
          const newY = clamp(y + deltaY, 0, 1 - height);
          return { x: newX, y: newY, width, height };
        }

        if (dragState.handle.includes('left')) {
          const maxX = x + width - minSize;
          const newX = clamp(x + deltaX, 0, maxX);
          const newWidth = clamp(width + (x - newX), minSize, 1 - newX);
          x = newX;
          width = newWidth;
        }

        if (dragState.handle.includes('right')) {
          const newWidth = clamp(width + deltaX, minSize, 1 - x);
          width = newWidth;
        }

        if (dragState.handle.includes('top')) {
          const maxY = y + height - minSize;
          const newY = clamp(y + deltaY, 0, maxY);
          const newHeight = clamp(height + (y - newY), minSize, 1 - newY);
          y = newY;
          height = newHeight;
        }

        if (dragState.handle.includes('bottom')) {
          const newHeight = clamp(height + deltaY, minSize, 1 - y);
          height = newHeight;
        }

        return { x, y, width, height };
      });
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (dragState) {
        (event.target as HTMLElement).releasePointerCapture(event.pointerId);
      }
      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState]);

  const overlayStyle = useMemo(() => {
    return {
      left: `${overlayRect.x * 100}%`,
      top: `${overlayRect.y * 100}%`,
      width: `${overlayRect.width * 100}%`,
      height: `${overlayRect.height * 100}%`,
    } as React.CSSProperties;
  }, [overlayRect]);

  const handleCountItems = async () => {
    if (!capturedImage || !canvasRef.current) return;
    setIsCounting(true);
    setCountError(null);

    try {
      const baseImage = new Image();
      baseImage.src = capturedImage;
      await baseImage.decode();

      const hiddenCanvas = document.createElement('canvas');
      hiddenCanvas.width = baseImage.width;
      hiddenCanvas.height = baseImage.height;
      const hiddenCtx = hiddenCanvas.getContext('2d');
      if (!hiddenCtx) throw new Error('Unable to prepare captured image.');
      hiddenCtx.drawImage(baseImage, 0, 0);

      const cropCanvas = document.createElement('canvas');
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) throw new Error('Unable to inspect capture.');

      const cropX = overlayRect.x * baseImage.width;
      const cropY = overlayRect.y * baseImage.height;
      const cropWidth = overlayRect.width * baseImage.width;
      const cropHeight = overlayRect.height * baseImage.height;

      cropCanvas.width = Math.max(1, Math.round(cropWidth));
      cropCanvas.height = Math.max(1, Math.round(cropHeight));
      cropCtx.drawImage(
        baseImage,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropCanvas.width,
        cropCanvas.height
      );

      const cropDataUrl = cropCanvas.toDataURL('image/png');

        const { data, error } = await supabase.functions.invoke<{
          count: number;
          items?: Array<{ label?: string; center_x?: number; center_y?: number; confidence?: number }>;
        }>('autocount', {
          body: { imageDataUrl: cropDataUrl },
        });

        if (error) {
          throw new Error(error.message ?? 'AutoCount service error');
        }

        if (!data || typeof data.count !== 'number') {
          throw new Error('AutoCount service did not return a valid count.');
        }

        const formattedAnnotations: CountAnnotation[] = Array.isArray(data.items)
          ? data.items
              .map((item, index) => ({
                label: String(item.label ?? index + 1),
                centerX: clamp(item.center_x ?? 0.5, 0, 1),
                centerY: clamp(item.center_y ?? 0.5, 0, 1),
                confidence: typeof item.confidence === 'number' ? item.confidence : null,
              }))
              .filter(Boolean)
          : [];

        setAnnotations(formattedAnnotations);
        setCountResult(data.count);
        if (data.count === 0) {
          setCountError('AutoCount did not detect any parts. Try retaking the photo or adjusting the zone.');
        } else if (formattedAnnotations.length === 0) {
          setCountError('AutoCount returned a count but no marker positions. Try retaking the photo.');
        } else {
          setCountError(null);
        }
    } catch (countingError: any) {
      console.error('AutoCount failed', countingError);
      setAnnotations([]);
      setCountResult(null);
      setCountError(countingError?.message ?? 'Unable to count items in this capture.');
    } finally {
      setIsCounting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col pb-16 text-gray-900 dark:text-gray-100">
      <Header title="AutoCount" showBackButton />
      <main className="flex-1 p-4 space-y-4">
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <h1 className="text-xl font-semibold mb-2">Capture & Count</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Tap anywhere on the live preview to freeze the frame, adjust the green AutoCount zone, then press Done to
            count the items inside automatically.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          {availableCameras.length > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <label
                htmlFor="camera-select"
                className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Camera
              </label>
              <div className="flex items-center gap-2">
                {isCameraSwitching && <Loader2 className="h-4 w-4 animate-spin text-orange-500" />}
                <select
                  id="camera-select"
                  value={selectedCameraId ?? ''}
                  onChange={handleCameraSelectChange}
                  disabled={isCameraSwitching}
                  className="min-w-[10rem] rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {availableCameras.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div
            ref={containerRef}
            className="relative w-full rounded-2xl overflow-hidden bg-black aspect-[3/4] sm:aspect-video"
          >
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  onClick={handlePreviewTap}
                  onKeyDown={handlePreviewKeyDown}
                  role="button"
                  tabIndex={0}
                  aria-label="Tap to capture the current frame"
                  className="absolute inset-0 h-full w-full object-cover cursor-pointer focus:outline-none"
                />
                {isCameraReady && !error && !isCameraSwitching && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between py-4 text-white">
                    <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
                      <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                      Live preview
                    </div>
                    <div className="rounded-full bg-slate-900/70 px-4 py-1 text-sm font-medium shadow-lg shadow-black/40">
                      Tap to capture
                    </div>
                  </div>
                )}
                {!isCameraReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/70 text-white space-y-3">
                    <Loader2 className="h-10 w-10 animate-spin" />
                    <p className="text-sm">Warming up the camera...</p>
                  </div>
                )}
                {error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/70 text-white text-center px-4 space-y-3">
                    <CameraOff className="h-10 w-10" />
                    <p>{error}</p>
                    <button
                      onClick={() => {
                        startCamera(selectedCameraId ?? undefined);
                      }}
                      disabled={isCameraSwitching}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 rounded-full font-medium transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <img src={capturedImage} alt="Captured frame" className="absolute inset-0 h-full w-full object-contain bg-black" />
                <div
                  className="absolute border-2 border-black/80 dark:border-white/80 rounded-xl cursor-move relative bg-transparent"
                  style={{ ...overlayStyle, touchAction: 'none' }}
                  onPointerDown={(event) => handleOverlayPointerDown('move', event)}
                >
                  <button
                    className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium bg-emerald-500 text-white px-2 py-1 rounded-full flex items-center gap-1"
                    onPointerDown={(event) => handleOverlayPointerDown('move', event)}
                  >
                    <Move className="h-3 w-3" /> Drag to reposition
                  </button>
                  {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((handle) => {
                    const handleStyle: React.CSSProperties = {
                      width: '18px',
                      height: '18px',
                      borderRadius: '9999px',
                      background: '#10b981',
                      border: '2px solid white',
                      position: 'absolute',
                      touchAction: 'none',
                    };

                    if (handle.includes('top')) handleStyle.top = '-9px';
                    if (handle.includes('bottom')) handleStyle.bottom = '-9px';
                    if (handle.includes('left')) handleStyle.left = '-9px';
                    if (handle.includes('right')) handleStyle.right = '-9px';

                    return (
                      <div
                        key={handle}
                        role="button"
                        tabIndex={0}
                        className="cursor-grab active:cursor-grabbing"
                        style={handleStyle}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          handleOverlayPointerDown(handle, event);
                        }}
                      />
                    );
                  })}
                  {annotations.map((annotation) => (
                    <div
                      key={annotation.label}
                      className="absolute flex items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-semibold h-6 w-6 -translate-x-1/2 -translate-y-1/2 shadow-lg shadow-emerald-500/30"
                      style={{
                        left: `${annotation.centerX * 100}%`,
                        top: `${annotation.centerY * 100}%`,
                      }}
                    >
                      {annotation.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 space-y-4">
          {!capturedImage ? (
            <div className="text-center text-sm text-gray-600 dark:text-gray-300">
              Align the parts you want to count within the preview, then tap the live view to freeze the frame. You can
              switch cameras above if needed.
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleRetake}
                disabled={isCameraSwitching}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Retake
              </button>
              <button
                onClick={handleCountItems}
                disabled={isCounting || isCameraSwitching}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium transition-colors"
              >
                {isCounting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {isCounting ? 'Counting...' : 'Done'}
              </button>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {countResult !== null && !countError && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-400 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              AutoCount found <span className="font-semibold">{countResult}</span> item{countResult === 1 ? '' : 's'} inside the zone.
            </div>
          )}

          {countError && (
            <div className="rounded-xl bg-red-500/10 border border-red-400 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {countError}
            </div>
          )}

          {!!capturedImage && !isCounting && !countResult && !countError && (
            <div className="rounded-xl bg-slate-100 dark:bg-slate-900 px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
              Tip: Resize the AutoCount zone so it tightly fits the parts you want tallied. The green handles can be dragged independently.
            </div>
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  );
};
