import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { identifyStudent } from '../lib/gemini';
import { 
  Camera, 
  Scan, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  MapPin,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Student } from '../types';

import { resizeImage } from '../lib/imageUtils';

export default function VerificationTerminal() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<{ success: boolean; studentName?: string; studentPhoto?: string; message: string } | null>(null);
  const [selectedAction, setSelectedAction] = useState<'board' | 'exit'>('board');
  const [currentBusId, setCurrentBusId] = useState('BUS-001');
  
  // Camera & Capture states
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isCameraActive && stream) {
      // Only set srcObject if it's different to prevent "new load request" interruption
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }

      // play() returns a promise, we should handle it to catch AbortErrors from interruptions
      video.play().catch(e => {
        // AbortError is expected if we stop the camera or change the source quickly
        if (e.name !== 'AbortError') {
          console.error("Autoplay failed:", e);
        }
      });
    } else {
      video.srcObject = null;
    }
  }, [isCameraActive, stream]);

  const startCamera = async () => {
    try {
      const constraints = {
        video: { 
          facingMode: 'user',
          width: { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 }
        },
        audio: false 
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setIsCameraActive(true);
      setCapturedImage(null);
      setResult(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      // Fallback to simpler constraints
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(fallbackStream);
        setIsCameraActive(true);
      } catch (fallbackErr) {
        alert("Could not access camera. Please ensure you have granted permissions and are using HTTPS.");
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Wait for video to be ready and have dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        alert("Camera is starting up. Please wait a second.");
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const rawBase64 = canvas.toDataURL('image/jpeg', 0.9);
        
        try {
          const compressed = await resizeImage(rawBase64);
          setCapturedImage(compressed);
          stopCamera();
          performVerification(compressed);
        } catch (err) {
          console.error("Resize error:", err);
          setCapturedImage(rawBase64);
          stopCamera();
          performVerification(rawBase64);
        }
      }
    }
  };

  const handleSimulateCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const compressed = await resizeImage(base64);
        setCapturedImage(compressed);
        setResult(null);
        await performVerification(compressed);
      } catch (err) {
        console.error("Resize error:", err);
        setCapturedImage(base64);
        setResult(null);
        await performVerification(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const performVerification = async (imageBase64: string) => {
    setIsVerifying(true);
    setResult(null);

    try {
      // 1. Get all students to check against
      const studentsSnap = await getDocs(collection(db, 'students'));
      const students = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Student & { id: string })[];

      if (students.length === 0) {
        setResult({
          success: false,
          message: "No students registered in the system."
        });
        return;
      }

      // 2. Perform AI identification in a single pass
      const identify = await identifyStudent(imageBase64, students.map(s => ({ id: s.id, photoUrl: s.photoUrl })));
      
      const student = identify.matchId ? students.find(s => s.id === identify.matchId) : null;

      if (student && identify.confidence > 0.5) {
        // 3. Log the entry/exit
        const logPath = 'attendance_logs';
        try {
          await addDoc(collection(db, logPath), {
            studentId: student.id,
            busId: currentBusId,
            action: selectedAction,
            timestamp: serverTimestamp(),
            location: {
              lat: 18.5204, // Pune Coordinate
              lng: 73.8567,
              stopName: 'Campus Gate A'
            }
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, logPath);
        }

        // 4. Update bus occupancy
        const busPath = `buses/${currentBusId}`;
        try {
          const busRef = doc(db, 'buses', currentBusId);
          await setDoc(busRef, {
            currentOccupancy: increment(selectedAction === 'board' ? 1 : -1),
            lastUpdated: serverTimestamp()
          }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, busPath);
        }

        setResult({
          success: true,
          studentName: student.name,
          studentPhoto: student.photoUrl,
          message: `Successfully ${selectedAction}ed.`
        });
      } else {
        setResult({
          success: false,
          message: identify.reason || "ID check failed. Face does not match registered records."
        });
      }
    } catch (error) {
      console.error(error);
      setResult({
        success: false,
        message: "A system error occurred during verification."
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Verification Terminal</h1>
        <p className="text-gray-500 mt-2">Point camera at student to verify identity and route access.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Camera Area */}
        <div className="space-y-6">
          <div className="relative aspect-video bg-black rounded-[32px] overflow-hidden border-4 border-white shadow-2xl flex items-center justify-center group">
            {isCameraActive ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover"
              />
            ) : capturedImage ? (
              <img src={capturedImage} alt="Capture" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-8">
                <Camera className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">System Ready. Please start the camera to verify.</p>
              </div>
            )}
            
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Scaning Animation */}
            {isVerifying && (
              <motion.div 
                initial={{ top: 0 }}
                animate={{ top: '100%' }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute left-0 right-0 h-1 bg-green-400 shadow-[0_0_15px_rgba(74,222,128,1)] z-10"
              />
            )}

            {/* Overlay Status */}
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full", isCameraActive ? "bg-green-500 animate-pulse" : "bg-gray-500")} />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">{isCameraActive ? 'Live Camera' : 'Camera Off'}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex gap-4">
              {!isCameraActive ? (
                <button 
                  onClick={startCamera}
                  disabled={isVerifying}
                  className="flex-1 bg-black text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-800 transition-all disabled:opacity-50"
                >
                  <RefreshCw className="w-5 h-5" />
                  Start Camera
                </button>
              ) : (
                <button 
                  onClick={capturePhoto}
                  disabled={isVerifying}
                  className="flex-1 bg-red-600 text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-red-700 transition-all animate-pulse"
                >
                  <Camera className="w-5 h-5" />
                  Capture & Verify
                </button>
              )}
              
              <button 
                onClick={handleSimulateCapture}
                disabled={isVerifying || isCameraActive}
                className="px-6 py-4 border border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
                title="Upload Photo (Simulation)"
              >
                <Scan className="w-5 h-5" />
              </button>

              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange}
              />
            </div>

            {capturedImage && !isCameraActive && (
              <button 
                onClick={() => { setCapturedImage(null); setResult(null); }}
                className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors"
              >
                Reset / Retake
              </button>
            )}
          </div>
        </div>

        {/* Controls & Results */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Scan className="w-5 h-5" /> Terminal Config
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Operation Mode</label>
                <div className="flex p-1 bg-gray-50 rounded-2xl gap-1">
                  <button 
                    onClick={() => setSelectedAction('board')}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all",
                      selectedAction === 'board' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'
                    )}
                  >
                    Boarding
                  </button>
                  <button 
                    onClick={() => setSelectedAction('exit')}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all",
                      selectedAction === 'exit' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'
                    )}
                  >
                    Exiting
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Location Information</label>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-bold tracking-tight">Main Campus Gate</div>
                    <div className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase">GPS: 18.5204N, 73.8567E</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results Area */}
          <AnimatePresence mode="wait">
            {isVerifying ? (
              <motion.div 
                key="verifying"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-blue-50 border border-blue-100 p-8 rounded-[32px] text-center"
              >
                <RefreshCw className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-bold text-blue-600">AI Processing...</h3>
                <p className="text-blue-500/80 text-sm mt-1">Comparing face with student database</p>
              </motion.div>
            ) : result ? (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "p-8 rounded-[32px] text-center border shadow-sm",
                  result.success ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                )}
              >
                {result.success ? (
                  <div className="space-y-4">
                    {result.studentPhoto && (
                      <div className="w-24 h-24 rounded-2xl overflow-hidden mx-auto border-4 border-white shadow-md">
                        <img src={result.studentPhoto} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                    <h3 className="text-xl font-bold text-green-900 uppercase tracking-tight">Authorized</h3>
                    <div className="mt-4 p-4 bg-white/50 rounded-2xl">
                      <div className="text-2xl font-bold text-green-800">{result.studentName}</div>
                      <div className="text-xs font-bold text-green-600/70 uppercase mt-1 tracking-widest">{selectedAction === 'board' ? 'Parent Notified: Boarded' : 'Parent Notified: Exited'}</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-red-900 uppercase tracking-tight">Unauthorized</h3>
                    <p className="text-red-700/80 text-sm mt-2 font-medium">{result.message}</p>
                    <div className="mt-6 flex items-center justify-center gap-2 text-red-800 bg-red-100 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">
                      <AlertCircle className="w-4 h-4" /> Alert Admin
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 p-12 rounded-[32px] text-center flex flex-col items-center justify-center h-48">
                <Scan className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-400 font-medium italic">Awaiting Capture...</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
