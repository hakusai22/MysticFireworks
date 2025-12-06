import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, GestureRecognizer } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/+esm';

interface GestureControllerProps {
  onFireworkTrigger: () => void;
  onStatusChange: (status: string) => void;
}

const GestureController: React.FC<GestureControllerProps> = ({ onFireworkTrigger, onStatusChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [recognizer, setRecognizer] = useState<GestureRecognizer | null>(null);
  const [lastGesture, setLastGesture] = useState<string>('None');
  const requestRef = useRef<number>();
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    const loadModel = async () => {
      try {
        onStatusChange("Summoning Spirits...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        const gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO"
        });
        setRecognizer(gestureRecognizer);
        onStatusChange("Camera Ready");
      } catch (error) {
        console.error("Failed to load MediaPipe:", error);
        onStatusChange("Vision Failed");
      }
    };

    loadModel();
  }, [onStatusChange]);

  const startCamera = async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener('loadeddata', predictWebcam);
      setCameraActive(true);
      onStatusChange("Eye of Truth Open");
    } catch (err) {
      console.error("Camera error:", err);
      onStatusChange("Camera Denied");
    }
  };

  const predictWebcam = async () => {
    if (!recognizer || !videoRef.current) return;
    
    // Safety check to ensure video is actually playing and has data
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      requestRef.current = requestAnimationFrame(predictWebcam);
      return;
    }

    const nowInMs = Date.now();
    const results = recognizer.recognizeForVideo(videoRef.current, nowInMs);

    if (results.gestures.length > 0) {
      const gesture = results.gestures[0][0];
      const categoryName = gesture.categoryName;
      // score > 0.6 ensures we are confident
      if (gesture.score > 0.6) {
        checkGestureTransition(categoryName);
      }
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  const checkGestureTransition = (currentGesture: string) => {
    setLastGesture((prev) => {
      // Logic: Detect transition from Closed_Fist -> Open_Palm
      if (prev === 'Closed_Fist' && currentGesture === 'Open_Palm') {
        onFireworkTrigger();
      }
      return currentGesture;
    });
  };

  useEffect(() => {
    if (recognizer && !cameraActive) {
      startCamera();
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recognizer]);

  return (
    <div className="fixed bottom-4 right-4 z-50 opacity-80 hover:opacity-100 transition-opacity border-2 border-[#d4af37] rounded-lg overflow-hidden bg-black shadow-[0_0_15px_#d4af37]">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-32 h-24 object-cover transform scale-x-[-1]" // Mirror effect
      />
      <div className="absolute bottom-0 w-full bg-black/70 text-[#d4af37] text-[10px] text-center font-tarot py-1">
        {lastGesture === 'Closed_Fist' ? '✊ HOLD' : lastGesture === 'Open_Palm' ? '✋ RELEASE' : 'Wait...'}
      </div>
    </div>
  );
};

export default GestureController;
