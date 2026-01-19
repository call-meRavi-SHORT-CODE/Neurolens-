import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Camera, 
  RotateCcw, 
  Check, 
  X, 
  Wand2,
  ZoomIn,
  Move,
  Loader2,
  Download,
  Video
} from "lucide-react";

interface FundusVideoExtractorProps {
  open: boolean;
  onClose: () => void;
  onImageExtracted: (imageDataUrl: string) => void;
}

interface CropSettings {
  centerX: number;
  centerY: number;
  radius: number;
  isManuallyAdjusted: boolean;
}

interface QualityMetrics {
  sharpness: number;
  contrast: number;
  brightness: number;
  glare: number;
  total: number;
}

export const FundusVideoExtractor = ({ open, onClose, onImageExtracted }: FundusVideoExtractorProps) => {
  // State management
  const [step, setStep] = useState<'upload' | 'select' | 'crop' | 'process' | 'result'>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState<HTMLCanvasElement | null>(null);
  const [enhancedFrame, setEnhancedFrame] = useState<HTMLCanvasElement | null>(null);
  const [totalFrames, setTotalFrames] = useState(0);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [processingMode, setProcessingMode] = useState<'manual' | 'auto'>('manual');
  const [cropSettings, setCropSettings] = useState<CropSettings>({
    centerX: 0,
    centerY: 0,
    radius: 0,
    isManuallyAdjusted: false
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'move' | 'resize'>('move');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewOriginalRef = useRef<HTMLCanvasElement>(null);
  const previewCroppedRef = useRef<HTMLCanvasElement>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      // Reset all state when dialog closes
      setStep('upload');
      setVideoFile(null);
      setVideoUrl(null);
      setCurrentFrame(null);
      setEnhancedFrame(null);
      setTotalFrames(0);
      setCurrentFrameIndex(0);
      setIsPlaying(false);
      setProcessingProgress(0);
      setProcessingStage('');
      setQualityMetrics(null);
      setError(null);
    }
  }, [open]);

  // Handle video upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setStep('select');
      setError(null);
    } else {
      setError('Please upload a valid video file (MP4, MOV)');
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setStep('select');
      setError(null);
    } else {
      setError('Please upload a valid video file (MP4, MOV)');
    }
  };

  // Video loaded handler
  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const fps = 30; // Assuming 30 fps
      const frames = Math.floor(videoRef.current.duration * fps);
      setTotalFrames(frames);
    }
  };

  // Seek to frame
  const seekToFrame = (frameIndex: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = frameIndex / 30;
      setCurrentFrameIndex(frameIndex);
    }
  };

  // Extract current frame
  const extractCurrentFrame = useCallback(() => {
    if (!videoRef.current) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
    }
    return canvas;
  }, []);

  // Capture frame and go to crop step
  const captureFrame = () => {
    const canvas = extractCurrentFrame();
    if (canvas) {
      setCurrentFrame(canvas);
      detectFundusRegion(canvas);
      setStep('crop');
    }
  };

  // Auto analyze video for best frame
  const analyzeVideoForBestFrame = async () => {
    if (!videoRef.current) return;
    
    setProcessingStage('Analyzing video for best frame...');
    
    const samplesToAnalyze = Math.min(30, totalFrames);
    const step = Math.floor(totalFrames / samplesToAnalyze);
    
    let bestFrame: HTMLCanvasElement | null = null;
    let bestScore = -Infinity;
    let bestFrameIndex = 0;
    
    for (let i = 0; i < totalFrames; i += step) {
      seekToFrame(i);
      await delay(100); // Wait for video to seek
      
      const canvas = extractCurrentFrame();
      if (canvas) {
        const score = analyzeFrameQuality(canvas);
        if (score.total > bestScore) {
          bestScore = score.total;
          bestFrame = canvas;
          bestFrameIndex = i;
          setQualityMetrics(score);
        }
      }
      
      setProcessingProgress((i / totalFrames) * 100);
    }
    
    if (bestFrame) {
      setCurrentFrameIndex(bestFrameIndex);
      seekToFrame(bestFrameIndex);
      setCurrentFrame(bestFrame);
      detectFundusRegion(bestFrame);
      setStep('crop');
    }
    
    setProcessingProgress(0);
    setProcessingStage('');
  };

  // Analyze frame quality
  const analyzeFrameQuality = (canvas: HTMLCanvasElement): QualityMetrics => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return { sharpness: 0, contrast: 0, brightness: 0, glare: 0, total: 0 };
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Calculate sharpness (Laplacian variance)
    let sharpness = 0;
    let sharpCount = 0;
    for (let y = 1; y < canvas.height - 1; y++) {
      for (let x = 1; x < canvas.width - 1; x++) {
        const idx = (y * canvas.width + x) * 4;
        const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
        
        const idxUp = ((y - 1) * canvas.width + x) * 4;
        const idxDown = ((y + 1) * canvas.width + x) * 4;
        const idxLeft = (y * canvas.width + (x - 1)) * 4;
        const idxRight = (y * canvas.width + (x + 1)) * 4;
        
        const grayUp = data[idxUp] * 0.299 + data[idxUp + 1] * 0.587 + data[idxUp + 2] * 0.114;
        const grayDown = data[idxDown] * 0.299 + data[idxDown + 1] * 0.587 + data[idxDown + 2] * 0.114;
        const grayLeft = data[idxLeft] * 0.299 + data[idxLeft + 1] * 0.587 + data[idxLeft + 2] * 0.114;
        const grayRight = data[idxRight] * 0.299 + data[idxRight + 1] * 0.587 + data[idxRight + 2] * 0.114;
        
        const laplacian = Math.abs(grayUp + grayDown + grayLeft + grayRight - 4 * gray);
        sharpness += laplacian * laplacian;
        sharpCount++;
      }
    }
    sharpness = Math.min(100, (sharpness / sharpCount) * 10);
    
    // Calculate contrast
    let min = 255, max = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      min = Math.min(min, gray);
      max = Math.max(max, gray);
    }
    const contrast = ((max - min) / 255) * 100;
    
    // Calculate brightness
    let brightnessSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      brightnessSum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
    const avgBrightness = brightnessSum / (data.length / 4);
    const brightness = 100 - Math.abs(128 - avgBrightness) / 1.28;
    
    // Calculate glare
    let overexposed = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
        overexposed++;
      }
    }
    const glare = (overexposed / (data.length / 4)) * 100;
    
    const total = sharpness * 0.4 + contrast * 0.3 + brightness * 0.2 + (100 - glare) * 0.1;
    
    return { sharpness, contrast, brightness, glare, total };
  };

  // Detect fundus region
  const detectFundusRegion = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Find bright pixels (likely fundus area)
    const brightPixels: { x: number; y: number; brightness: number }[] = [];
    
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        const brightness = (r + g + b) / 3;
        
        if (brightness > 50 && brightness < 230) {
          brightPixels.push({ x, y, brightness });
        }
      }
    }
    
    if (brightPixels.length === 0) {
      setCropSettings({
        centerX: canvas.width / 2,
        centerY: canvas.height / 2,
        radius: Math.min(canvas.width, canvas.height) * 0.35,
        isManuallyAdjusted: false
      });
      return;
    }
    
    // Find center of mass
    let sumX = 0, sumY = 0, totalWeight = 0;
    for (const pixel of brightPixels) {
      sumX += pixel.x * pixel.brightness;
      sumY += pixel.y * pixel.brightness;
      totalWeight += pixel.brightness;
    }
    
    const centerX = sumX / totalWeight;
    const centerY = sumY / totalWeight;
    
    // Find optimal radius
    const maxRadius = Math.min(canvas.width, canvas.height) / 2;
    let bestRadius = maxRadius * 0.35;
    
    setCropSettings({
      centerX,
      centerY,
      radius: bestRadius,
      isManuallyAdjusted: false
    });
  };

  // Draw crop overlay
  const drawCropOverlay = useCallback(() => {
    const overlayCanvas = overlayCanvasRef.current;
    const cropCanvas = cropCanvasRef.current;
    if (!overlayCanvas || !cropCanvas || !currentFrame) return;
    
    overlayCanvas.width = cropCanvas.width;
    overlayCanvas.height = cropCanvas.height;
    
    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Scale factor
    const scale = cropCanvas.width / currentFrame.width;
    const scaledCenterX = cropSettings.centerX * scale;
    const scaledCenterY = cropSettings.centerY * scale;
    const scaledRadius = cropSettings.radius * scale;
    
    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Clear the circular area
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(scaledCenterX, scaledCenterY, scaledRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw circle border
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(scaledCenterX, scaledCenterY, scaledRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw center crosshair
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(scaledCenterX - 15, scaledCenterY);
    ctx.lineTo(scaledCenterX + 15, scaledCenterY);
    ctx.moveTo(scaledCenterX, scaledCenterY - 15);
    ctx.lineTo(scaledCenterX, scaledCenterY + 15);
    ctx.stroke();
    
    // Draw resize handle
    ctx.fillStyle = '#667eea';
    ctx.beginPath();
    ctx.arc(scaledCenterX + scaledRadius, scaledCenterY, 10, 0, Math.PI * 2);
    ctx.fill();
  }, [cropSettings, currentFrame]);

  // Update crop preview
  const updateCropPreview = useCallback(() => {
    if (!currentFrame || !previewCroppedRef.current) return;
    
    const previewCropped = previewCroppedRef.current;
    const ctxCrop = previewCropped.getContext('2d');
    if (!ctxCrop) return;
    
    previewCropped.width = 200;
    previewCropped.height = 200;
    
    // Black background
    ctxCrop.fillStyle = 'black';
    ctxCrop.fillRect(0, 0, 200, 200);
    
    // Draw cropped circular region
    ctxCrop.save();
    ctxCrop.beginPath();
    ctxCrop.arc(100, 100, 100, 0, Math.PI * 2);
    ctxCrop.clip();
    
    const size = cropSettings.radius * 2;
    ctxCrop.drawImage(
      currentFrame,
      cropSettings.centerX - cropSettings.radius,
      cropSettings.centerY - cropSettings.radius,
      size,
      size,
      0,
      0,
      200,
      200
    );
    ctxCrop.restore();
  }, [cropSettings, currentFrame]);

  // Draw crop canvas
  useEffect(() => {
    if (step === 'crop' && currentFrame && cropCanvasRef.current) {
      const canvas = cropCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Set canvas size to fit container while maintaining aspect ratio
      const maxWidth = 500;
      const scale = Math.min(maxWidth / currentFrame.width, maxWidth / currentFrame.height);
      canvas.width = currentFrame.width * scale;
      canvas.height = currentFrame.height * scale;
      
      ctx.drawImage(currentFrame, 0, 0, canvas.width, canvas.height);
      
      drawCropOverlay();
      updateCropPreview();
    }
  }, [step, currentFrame, cropSettings, drawCropOverlay, updateCropPreview]);

  // Handle mouse events for crop adjustment
  const handleCropMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = cropCanvasRef.current;
    if (!canvas || !currentFrame) return;
    
    const rect = canvas.getBoundingClientRect();
    const scale = currentFrame.width / canvas.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;
    
    const distToCenter = Math.sqrt(
      Math.pow(x - cropSettings.centerX, 2) + 
      Math.pow(y - cropSettings.centerY, 2)
    );
    
    if (Math.abs(distToCenter - cropSettings.radius) < 30) {
      setDragMode('resize');
      setIsDragging(true);
    } else if (distToCenter < cropSettings.radius) {
      setDragMode('move');
      setIsDragging(true);
    }
    
    setDragStart({ x, y });
  };

  const handleCropMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !cropCanvasRef.current || !currentFrame) return;
    
    const rect = cropCanvasRef.current.getBoundingClientRect();
    const scale = currentFrame.width / cropCanvasRef.current.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;
    
    if (dragMode === 'move') {
      const newCenterX = Math.max(cropSettings.radius, 
        Math.min(currentFrame.width - cropSettings.radius, 
          cropSettings.centerX + x - dragStart.x));
      const newCenterY = Math.max(cropSettings.radius, 
        Math.min(currentFrame.height - cropSettings.radius, 
          cropSettings.centerY + y - dragStart.y));
      
      setCropSettings(prev => ({
        ...prev,
        centerX: newCenterX,
        centerY: newCenterY,
        isManuallyAdjusted: true
      }));
    } else if (dragMode === 'resize') {
      const newRadius = Math.sqrt(
        Math.pow(x - cropSettings.centerX, 2) + 
        Math.pow(y - cropSettings.centerY, 2)
      );
      const clampedRadius = Math.max(50, Math.min(
        Math.min(cropSettings.centerX, currentFrame.width - cropSettings.centerX),
        Math.min(cropSettings.centerY, currentFrame.height - cropSettings.centerY),
        newRadius
      ));
      
      setCropSettings(prev => ({
        ...prev,
        radius: clampedRadius,
        isManuallyAdjusted: true
      }));
    }
    
    setDragStart({ x, y });
  };

  const handleCropMouseUp = () => {
    setIsDragging(false);
  };

  // Reset crop to auto
  const resetCropToAuto = () => {
    if (currentFrame) {
      detectFundusRegion(currentFrame);
    }
  };

  // Process and enhance image
  const processAndEnhance = async () => {
    if (!currentFrame) return;
    
    setStep('process');
    setProcessingProgress(0);
    
    const stages = [
      { name: 'Smart Cropping', progress: 15 },
      { name: 'Glare Removal', progress: 30 },
      { name: 'Color Correction', progress: 45 },
      { name: 'Contrast Enhancement', progress: 60 },
      { name: 'Noise Reduction', progress: 75 },
      { name: 'Vessel Enhancement', progress: 90 },
      { name: 'Final Processing', progress: 100 }
    ];
    
    let processedCanvas = currentFrame;
    
    for (const stage of stages) {
      setProcessingStage(stage.name);
      setProcessingProgress(stage.progress);
      
      switch (stage.name) {
        case 'Smart Cropping':
          processedCanvas = smartCrop(processedCanvas);
          break;
        case 'Glare Removal':
          processedCanvas = removeGlare(processedCanvas);
          break;
        case 'Color Correction':
          processedCanvas = correctColors(processedCanvas);
          break;
        case 'Contrast Enhancement':
          processedCanvas = enhanceContrast(processedCanvas);
          break;
        case 'Noise Reduction':
          processedCanvas = reduceNoise(processedCanvas);
          break;
        case 'Vessel Enhancement':
          processedCanvas = enhanceVessels(processedCanvas);
          break;
        case 'Final Processing':
          processedCanvas = upscaleImage(processedCanvas);
          break;
      }
      
      await delay(300);
    }
    
    setEnhancedFrame(processedCanvas);
    setStep('result');
  };

  // Enhancement functions
  const smartCrop = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const newCanvas = document.createElement('canvas');
    const ctx = newCanvas.getContext('2d');
    if (!ctx) return canvas;
    
    const size = Math.ceil(cropSettings.radius * 2);
    newCanvas.width = size;
    newCanvas.height = size;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);
    
    // Create circular mask
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    
    ctx.drawImage(
      canvas,
      cropSettings.centerX - cropSettings.radius,
      cropSettings.centerY - cropSettings.radius,
      size,
      size,
      0,
      0,
      size,
      size
    );
    ctx.restore();
    
    return newCanvas;
  };

  const removeGlare = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const threshold = 235;
    
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (brightness > threshold) {
        const factor = (threshold / brightness) * 0.9;
        data[i] = Math.round(data[i] * factor);
        data[i + 1] = Math.round(data[i + 1] * factor);
        data[i + 2] = Math.round(data[i + 2] * factor);
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  const correctColors = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let avgR = 0, avgG = 0, avgB = 0, count = 0;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const sampleRadius = Math.min(canvas.width, canvas.height) * 0.3;
    
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        if (dist < sampleRadius) {
          const idx = (y * canvas.width + x) * 4;
          if (data[idx + 3] > 0) {
            avgR += data[idx];
            avgG += data[idx + 1];
            avgB += data[idx + 2];
            count++;
          }
        }
      }
    }
    
    if (count > 0) {
      avgR /= count;
      avgG /= count;
      avgB /= count;
      
      const gray = (avgR + avgG + avgB) / 3;
      const maxCorrection = 1.3;
      const minCorrection = 0.7;
      
      const correctionR = Math.max(minCorrection, Math.min(maxCorrection, gray / avgR));
      const correctionG = Math.max(minCorrection, Math.min(maxCorrection, gray / avgG));
      const correctionB = Math.max(minCorrection, Math.min(maxCorrection, gray / avgB));
      
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) {
          data[i] = Math.min(255, Math.round(data[i] * correctionR));
          data[i + 1] = Math.min(255, Math.round(data[i + 1] * correctionG));
          data[i + 2] = Math.min(255, Math.round(data[i + 2] * correctionB));
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  const enhanceContrast = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let min = 255, max = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        min = Math.min(min, gray);
        max = Math.max(max, gray);
      }
    }
    
    const range = max - min;
    if (range > 0) {
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) {
          data[i] = Math.round(((data[i] - min) / range) * 255);
          data[i + 1] = Math.round(((data[i + 1] - min) / range) * 255);
          data[i + 2] = Math.round(((data[i + 2] - min) / range) * 255);
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  const reduceNoise = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    // Simple blur for noise reduction
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    
    ctx.filter = 'blur(0.5px)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';
    
    return canvas;
  };

  const enhanceVessels = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    
    // Apply unsharp mask
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const output = new Uint8ClampedArray(data);
    const amount = 0.3;
    
    for (let y = 1; y < canvas.height - 1; y++) {
      for (let x = 1; x < canvas.width - 1; x++) {
        const idx = (y * canvas.width + x) * 4;
        if (data[idx + 3] === 0) continue;
        
        for (let c = 0; c < 3; c++) {
          const center = data[idx + c];
          const neighbors = (
            data[((y - 1) * canvas.width + x) * 4 + c] +
            data[((y + 1) * canvas.width + x) * 4 + c] +
            data[(y * canvas.width + (x - 1)) * 4 + c] +
            data[(y * canvas.width + (x + 1)) * 4 + c]
          ) / 4;
          
          const diff = center - neighbors;
          output[idx + c] = Math.max(0, Math.min(255, Math.round(center + diff * amount)));
        }
      }
    }
    
    ctx.putImageData(new ImageData(output, canvas.width, canvas.height), 0, 0);
    return canvas;
  };

  const upscaleImage = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const targetSize = 1024; // Good size for analysis
    
    const upscaledCanvas = document.createElement('canvas');
    upscaledCanvas.width = targetSize;
    upscaledCanvas.height = targetSize;
    const ctx = upscaledCanvas.getContext('2d');
    if (!ctx) return canvas;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, targetSize, targetSize);
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    const scale = targetSize / Math.max(canvas.width, canvas.height);
    const newWidth = canvas.width * scale;
    const newHeight = canvas.height * scale;
    const offsetX = (targetSize - newWidth) / 2;
    const offsetY = (targetSize - newHeight) / 2;
    
    ctx.drawImage(canvas, offsetX, offsetY, newWidth, newHeight);
    
    return upscaledCanvas;
  };

  // Use extracted image
  const useExtractedImage = () => {
    if (enhancedFrame) {
      const dataUrl = enhancedFrame.toDataURL('image/jpeg', 0.95);
      onImageExtracted(dataUrl);
      onClose();
    }
  };

  // Draw result canvas
  useEffect(() => {
    if (step === 'result' && enhancedFrame && resultCanvasRef.current) {
      const canvas = resultCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      canvas.width = 400;
      canvas.height = 400;
      
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 400, 400);
      
      const scale = Math.min(400 / enhancedFrame.width, 400 / enhancedFrame.height);
      const width = enhancedFrame.width * scale;
      const height = enhancedFrame.height * scale;
      const x = (400 - width) / 2;
      const y = (400 - height) / 2;
      
      ctx.drawImage(enhancedFrame, x, y, width, height);
    }
  }, [step, enhancedFrame]);

  // Utility
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            🔬 Fundus Video Frame Extractor
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Extract and enhance high-quality fundus images from video recordings
          </DialogDescription>
        </DialogHeader>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div
            className="border-2 border-dashed border-slate-600 rounded-xl p-12 text-center cursor-pointer hover:border-sky-500 hover:bg-slate-800/50 transition-all"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-sky-500/20 flex items-center justify-center">
              <Video className="w-10 h-10 text-sky-400" />
            </div>
            <p className="text-xl font-bold text-white mb-2">Upload Fundus Video</p>
            <p className="text-slate-400 mb-4">Supports MP4, MOV formats</p>
            <Button className="bg-sky-400 hover:bg-sky-500 text-black font-semibold">
              <Upload className="w-4 h-4 mr-2" />
              Select Video File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime"
              className="hidden"
              onChange={handleVideoUpload}
            />
          </div>
        )}

        {/* Step: Select Frame */}
        {step === 'select' && videoUrl && (
          <div className="space-y-6">
            <div className="flex gap-4 justify-center">
              <Button
                variant={processingMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setProcessingMode('manual')}
                className={processingMode === 'manual' ? 'bg-sky-400 text-black font-semibold' : 'bg-transparent border-slate-500 text-white hover:bg-slate-700'}
              >
                Manual Selection
              </Button>
              <Button
                variant={processingMode === 'auto' ? 'default' : 'outline'}
                onClick={() => setProcessingMode('auto')}
                className={processingMode === 'auto' ? 'bg-sky-400 text-black font-semibold' : 'bg-transparent border-slate-500 text-white hover:bg-slate-700'}
              >
                Auto Selection (AI)
              </Button>
            </div>

            <div className="rounded-xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full max-h-[400px] object-contain"
                onLoadedMetadata={handleVideoLoaded}
              />
            </div>

            {processingMode === 'manual' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sky-100 text-sm w-20 font-medium">Frame:</span>
                  <Slider
                    value={[currentFrameIndex]}
                    max={totalFrames - 1}
                    step={1}
                    onValueChange={(value) => seekToFrame(value[0])}
                    className="flex-1 [&_[data-slot=track]]:bg-slate-600 [&_[data-slot=range]]:bg-sky-400 [&_[data-slot=thumb]]:bg-white [&_[data-slot=thumb]]:border-sky-500 [&>span:first-child]:bg-slate-600 [&>span:first-child>span]:bg-sky-400 [&>span:last-child]:bg-white [&>span:last-child]:border-sky-500"
                  />
                  <span className="text-white text-sm w-24 text-right font-medium">
                    {currentFrameIndex}/{totalFrames}
                  </span>
                </div>

                <div className="flex justify-center gap-4">
                  <Button variant="outline" size="sm" className="bg-transparent border-slate-500 text-white hover:bg-slate-700" onClick={() => seekToFrame(Math.max(0, currentFrameIndex - 10))}>
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="bg-transparent border-slate-500 text-white hover:bg-slate-700" onClick={() => seekToFrame(Math.max(0, currentFrameIndex - 1))}>
                    -1
                  </Button>
                  <Button 
                    className="bg-sky-400 hover:bg-sky-500 text-black font-semibold"
                    onClick={captureFrame}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Capture Frame
                  </Button>
                  <Button variant="outline" size="sm" className="bg-transparent border-slate-500 text-white hover:bg-slate-700" onClick={() => seekToFrame(Math.min(totalFrames - 1, currentFrameIndex + 1))}>
                    +1
                  </Button>
                  <Button variant="outline" size="sm" className="bg-transparent border-slate-500 text-white hover:bg-slate-700" onClick={() => seekToFrame(Math.min(totalFrames - 1, currentFrameIndex + 10))}>
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {processingMode === 'auto' && (
              <div className="text-center space-y-4">
                <Button 
                  className="bg-sky-400 hover:bg-sky-500 text-black font-semibold"
                  onClick={analyzeVideoForBestFrame}
                  disabled={!!processingStage}
                >
                  {processingStage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {processingStage}
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Analyze & Find Best Frame
                    </>
                  )}
                </Button>
                {processingProgress > 0 && (
                  <Progress value={processingProgress} className="w-full h-2 bg-slate-700 [&>div]:bg-sky-400" />
                )}
                {qualityMetrics && (
                  <div className="grid grid-cols-4 gap-4 mt-4">
                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                      <div className="text-2xl font-bold text-sky-400">{qualityMetrics.sharpness.toFixed(0)}</div>
                      <div className="text-xs text-sky-100">Sharpness</div>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                      <div className="text-2xl font-bold text-green-400">{qualityMetrics.contrast.toFixed(0)}</div>
                      <div className="text-xs text-sky-100">Contrast</div>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                      <div className="text-2xl font-bold text-yellow-400">{qualityMetrics.brightness.toFixed(0)}</div>
                      <div className="text-xs text-sky-100">Brightness</div>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                      <div className="text-2xl font-bold text-red-400">{qualityMetrics.glare.toFixed(0)}</div>
                      <div className="text-xs text-sky-100">Glare</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step: Crop Adjustment */}
        {step === 'crop' && currentFrame && (
          <div className="space-y-6">
            <p className="text-center text-sky-100 font-medium">
              Adjust the circular crop area. Drag to move, drag the edge to resize.
            </p>

            <div className="flex justify-center">
              <div className="relative inline-block border-2 border-sky-500 rounded-lg overflow-hidden">
                <canvas
                  ref={cropCanvasRef}
                  className="cursor-crosshair"
                  onMouseDown={handleCropMouseDown}
                  onMouseMove={handleCropMouseMove}
                  onMouseUp={handleCropMouseUp}
                  onMouseLeave={handleCropMouseUp}
                />
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute top-0 left-0 pointer-events-none"
                />
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <p className="text-xs text-sky-100 mb-2 font-medium">Cropped Preview</p>
                <canvas ref={previewCroppedRef} className="rounded-lg border border-slate-600" />
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="outline" className="bg-transparent border-slate-500 text-white hover:bg-slate-700" onClick={resetCropToAuto}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Auto
              </Button>
              <Button 
                className="bg-sky-400 hover:bg-sky-500 text-black font-semibold"
                onClick={processAndEnhance}
              >
                <Check className="w-4 h-4 mr-2" />
                Confirm & Process
              </Button>
            </div>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'process' && (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <Loader2 className="w-16 h-16 animate-spin text-sky-400 mx-auto mb-4" />
              <p className="text-xl font-bold text-white mb-2">{processingStage}</p>
              <p className="text-sky-100">Enhancing your fundus image...</p>
            </div>
            <Progress value={processingProgress} className="w-full h-2 bg-slate-700 [&>div]:bg-sky-400" />
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && enhancedFrame && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="bg-black p-4 rounded-xl">
                <canvas ref={resultCanvasRef} className="rounded-lg" />
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="outline" className="bg-transparent border-slate-500 text-white hover:bg-slate-700" onClick={() => setStep('crop')}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Adjust Crop
              </Button>
              <Button 
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                onClick={useExtractedImage}
              >
                <Check className="w-4 h-4 mr-2" />
                Use This Image
              </Button>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-slate-700">
          <Button variant="outline" className="bg-transparent border-slate-500 text-white hover:bg-slate-700" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
