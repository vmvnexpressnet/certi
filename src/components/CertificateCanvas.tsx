import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Download,
  Share2,
  RefreshCw,
  Check,
  RotateCcw,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Move,
  Trash2,
  Layout,
  Upload,
  SlidersHorizontal,
  Sun,
  Contrast,
  Flame,
  Palette,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Runner, CertificateConfig } from '../types';
import { drawCertificate, drawCollageFrame, PhotoFilters } from '../utils/canvasDrawer';
import {
  saveBackgroundImage,
  getSavedBackgroundImage,
  savePersonalPhoto,
  getSavedPersonalPhoto,
  removeSavedPersonalPhoto,
} from '../utils/imageStorage';
import generatedBgUrl from '../assets/images/vm_quynhon_certificate_bg_1789117795867.jpg';

// High-quality sample marathon runner photo for instant testing
const SAMPLE_RUNNER_PHOTO =
  'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=1600&auto=format&fit=crop';

// Neutral default filters: NO filters applied automatically
const DEFAULT_PHOTO_FILTERS: PhotoFilters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  smoothing: 0,
};

interface CertificateCanvasProps {
  runner: Runner;
  config: CertificateConfig;
  onChangeConfig: (newConfig: CertificateConfig) => void;
  onOpenSheetModal?: () => void;
}

export const CertificateCanvas: React.FC<CertificateCanvasProps> = ({
  runner,
  config,
  onChangeConfig,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const personalFileInputRef = useRef<HTMLInputElement>(null);
  const certFileInputRef = useRef<HTMLInputElement>(null);

  // View mode: 'single' (Chỉ chứng nhận) | 'collage' (Ghép ảnh cá nhân 2:1 + Chứng nhận)
  const [viewMode, setViewMode] = useState<'single' | 'collage'>('collage');

  // Personal Photo State for Collage
  const [personalPhotoUrl, setPersonalPhotoUrl] = useState<string | null>(null);
  const [photoSide, setPhotoSide] = useState<'left' | 'right'>('right'); // Default: Cert on Left, Photo on Right
  const [photoZoom, setPhotoZoom] = useState<number>(1.0);
  const [photoOffsetX, setPhotoOffsetX] = useState<number>(0);
  const [photoOffsetY, setPhotoOffsetY] = useState<number>(0);

  // Manual Photo Filter & Smoothing State (Default: 100% neutral, user can adjust manually)
  const [photoFilters, setPhotoFilters] = useState<PhotoFilters>(DEFAULT_PHOTO_FILTERS);
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);

  // Check if any filter is non-default
  const isFilterActive =
    (photoFilters.brightness ?? 100) !== 100 ||
    (photoFilters.contrast ?? 100) !== 100 ||
    (photoFilters.saturation ?? 100) !== 100 ||
    (photoFilters.warmth ?? 0) !== 0 ||
    (photoFilters.smoothing ?? 0) > 0;

  // Interactive Pan on Canvas State
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number }>({
    clientX: 0,
    clientY: 0,
    startX: 0,
    startY: 0,
  });

  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Cached image elements
  const customImgRef = useRef<HTMLImageElement | null>(null);
  const generatedImgRef = useRef<HTMLImageElement | null>(null);
  const personalImgRef = useRef<HTMLImageElement | null>(null);
  const [imagesReady, setImagesReady] = useState(false);

  // Load custom certificate background from server or IndexedDB on mount
  useEffect(() => {
    async function loadSavedBg() {
      try {
        const check = await fetch('/api/background-status');
        const status = await check.json();
        if (status.exists && status.url) {
          onChangeConfig({
            ...config,
            bgMode: 'custom',
            customBgDataUrl: status.url,
          });
          return;
        }
      } catch {
        // fallback
      }

      const saved = await getSavedBackgroundImage();
      if (saved) {
        onChangeConfig({
          ...config,
          bgMode: 'custom',
          customBgDataUrl: saved,
        });
      }
    }
    loadSavedBg();
  }, []);

  // Load saved personal photo from IndexedDB on mount
  useEffect(() => {
    async function loadPersonalPhoto() {
      try {
        const savedPhoto = await getSavedPersonalPhoto();
        if (savedPhoto) {
          setPersonalPhotoUrl(savedPhoto);
        } else {
          // Preload sample runner photo so user has instant visual preview
          setPersonalPhotoUrl(SAMPLE_RUNNER_PHOTO);
        }
      } catch {
        setPersonalPhotoUrl(SAMPLE_RUNNER_PHOTO);
      }
    }
    loadPersonalPhoto();
  }, []);

  // Preload generated image as fallback
  useEffect(() => {
    const genImg = new Image();
    genImg.crossOrigin = 'anonymous';
    genImg.src = generatedBgUrl;
    genImg.onload = () => {
      generatedImgRef.current = genImg;
      setImagesReady((prev) => !prev);
    };
  }, []);

  // Preload custom cert background image if any
  useEffect(() => {
    if (config.customBgDataUrl) {
      const custImg = new Image();
      custImg.crossOrigin = 'anonymous';
      custImg.src = config.customBgDataUrl;
      custImg.onload = () => {
        customImgRef.current = custImg;
        setImagesReady((prev) => !prev);
      };
    } else {
      customImgRef.current = null;
      setImagesReady((prev) => !prev);
    }
  }, [config.customBgDataUrl]);

  // Preload personal runner photo for collage
  useEffect(() => {
    if (personalPhotoUrl) {
      const pImg = new Image();
      pImg.crossOrigin = 'anonymous';
      pImg.src = personalPhotoUrl;
      pImg.onload = () => {
        personalImgRef.current = pImg;
        setImagesReady((prev) => !prev);
      };
      pImg.onerror = () => {
        // In case external URL is blocked, continue gracefully
        personalImgRef.current = null;
        setImagesReady((prev) => !prev);
      };
    } else {
      personalImgRef.current = null;
      setImagesReady((prev) => !prev);
    }
  }, [personalPhotoUrl]);

  // Render on canvas whenever runner, config, viewMode, or personal photo params change
  const renderCurrent = useCallback(async () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const certW = customImgRef.current?.naturalWidth || 1080;
    const certH = customImgRef.current?.naturalHeight || 2400;

    if (viewMode === 'single') {
      if (canvas.width !== certW || canvas.height !== certH) {
        canvas.width = certW;
        canvas.height = certH;
      }
      await drawCertificate({
        canvas,
        runner,
        config,
        customImageObj: customImgRef.current,
        generatedImageObj: generatedImgRef.current,
      });
    } else {
      // Collage mode: Personal photo is 2x cert width, same height.
      // Total canvas: 3x cert width, 1x cert height.
      const totalW = certW * 3;
      const totalH = certH;
      if (canvas.width !== totalW || canvas.height !== totalH) {
        canvas.width = totalW;
        canvas.height = totalH;
      }
      await drawCollageFrame({
        canvas,
        runner,
        config,
        personalImageObj: personalImgRef.current,
        customImageObj: customImgRef.current,
        generatedImageObj: generatedImgRef.current,
        photoSide,
        photoZoom,
        photoOffsetX,
        photoOffsetY,
        photoFilters,
      });
    }
  }, [
    runner,
    config,
    viewMode,
    photoSide,
    photoZoom,
    photoOffsetX,
    photoOffsetY,
    photoFilters,
    imagesReady,
  ]);

  useEffect(() => {
    renderCurrent();
  }, [renderCurrent]);

  // Process certificate background file upload
  const processCertBgFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      await saveBackgroundImage(dataUrl);
      try {
        await fetch('/api/upload-background', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl }),
        });
      } catch {
        // ignore
      }
      onChangeConfig({
        ...config,
        bgMode: 'custom',
        customBgDataUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  // Process personal runner photo file upload
  const processPersonalPhotoFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      await savePersonalPhoto(dataUrl);
      setPersonalPhotoUrl(dataUrl);
      setPhotoOffsetX(0);
      setPhotoOffsetY(0);
      setPhotoZoom(1.0);
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop onto canvas
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (viewMode === 'collage') {
      processPersonalPhotoFile(file);
    } else {
      processCertBgFile(file);
    }
  };

  // Support Ctrl+V paste image directly from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            if (viewMode === 'collage') {
              processPersonalPhotoFile(file);
            } else {
              processCertBgFile(file);
            }
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [viewMode, config]);

  // Interactive Pan / Drag handlers on canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (viewMode !== 'collage') return;
    setIsPanning(true);
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: photoOffsetX,
      startY: photoOffsetY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanning || viewMode !== 'collage' || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleFactor = canvasRef.current.width / rect.width;
    const deltaX = (e.clientX - panStartRef.current.clientX) * scaleFactor;
    const deltaY = (e.clientY - panStartRef.current.clientY) * scaleFactor;
    setPhotoOffsetX(panStartRef.current.startX + deltaX);
    setPhotoOffsetY(panStartRef.current.startY + deltaY);
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (viewMode !== 'collage' || e.touches.length !== 1) return;
    setIsPanning(true);
    const touch = e.touches[0];
    panStartRef.current = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      startX: photoOffsetX,
      startY: photoOffsetY,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isPanning || viewMode !== 'collage' || !canvasRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleFactor = canvasRef.current.width / rect.width;
    const deltaX = (touch.clientX - panStartRef.current.clientX) * scaleFactor;
    const deltaY = (touch.clientY - panStartRef.current.clientY) * scaleFactor;
    setPhotoOffsetX(panStartRef.current.startX + deltaX);
    setPhotoOffsetY(panStartRef.current.startY + deltaY);
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
  };

  // Reset Photo Offset & Zoom
  const handleResetPhotoPosition = () => {
    setPhotoOffsetX(0);
    setPhotoOffsetY(0);
    setPhotoZoom(1.0);
  };

  // Reset Photo Filters back to original untouched
  const handleResetFilters = () => {
    setPhotoFilters(DEFAULT_PHOTO_FILTERS);
  };

  // Apply Quick Style Presets
  const applyPreset = (preset: 'original' | 'smooth' | 'vivid' | 'warm' | 'cool' | 'bw') => {
    switch (preset) {
      case 'original':
        setPhotoFilters(DEFAULT_PHOTO_FILTERS);
        break;
      case 'smooth':
        setPhotoFilters({
          brightness: 104,
          contrast: 98,
          saturation: 102,
          warmth: 4,
          smoothing: 2.5,
        });
        break;
      case 'vivid':
        setPhotoFilters({
          brightness: 105,
          contrast: 112,
          saturation: 120,
          warmth: 0,
          smoothing: 0,
        });
        break;
      case 'warm':
        setPhotoFilters({
          brightness: 102,
          contrast: 104,
          saturation: 108,
          warmth: 16,
          smoothing: 1.0,
        });
        break;
      case 'cool':
        setPhotoFilters({
          brightness: 102,
          contrast: 106,
          saturation: 95,
          warmth: -16,
          smoothing: 0,
        });
        break;
      case 'bw':
        setPhotoFilters({
          brightness: 105,
          contrast: 120,
          saturation: 0,
          warmth: 0,
          smoothing: 0,
        });
        break;
    }
  };

  // Remove personal photo
  const handleRemovePhoto = async () => {
    await removeSavedPersonalPhoto();
    setPersonalPhotoUrl(null);
    setPhotoOffsetX(0);
    setPhotoOffsetY(0);
    setPhotoZoom(1.0);
    setPhotoFilters(DEFAULT_PHOTO_FILTERS);
  };

  // Set sample runner photo
  const handleUseSamplePhoto = () => {
    setPersonalPhotoUrl(SAMPLE_RUNNER_PHOTO);
    setPhotoOffsetX(0);
    setPhotoOffsetY(0);
    setPhotoZoom(1.0);
  };

  // High Resolution Export Download
  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      const certW = customImgRef.current?.naturalWidth || 1080;
      const certH = customImgRef.current?.naturalHeight || 2400;

      const exportCanvas = document.createElement('canvas');
      const safeName = runner.name.replace(/[^a-zA-Z0-9]/g, '_');

      if (viewMode === 'single') {
        exportCanvas.width = certW;
        exportCanvas.height = certH;
        await drawCertificate({
          canvas: exportCanvas,
          runner,
          config,
          customImageObj: customImgRef.current,
          generatedImageObj: generatedImgRef.current,
        });

        const dataUrl = exportCanvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.download = `VM_QuyNhon2026_Certificate_${runner.bib}_${safeName}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Collage: 3x width, 1x height
        exportCanvas.width = certW * 3;
        exportCanvas.height = certH;
        await drawCollageFrame({
          canvas: exportCanvas,
          runner,
          config,
          personalImageObj: personalImgRef.current,
          customImageObj: customImgRef.current,
          generatedImageObj: generatedImgRef.current,
          photoSide,
          photoZoom,
          photoOffsetX,
          photoOffsetY,
          photoFilters,
        });

        const dataUrl = exportCanvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.download = `VM_QuyNhon2026_Collage_Finisher_${runner.bib}_${safeName}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Trigger celebration confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2dd4bf', '#38bdf8', '#f59e0b', '#ffffff'],
      });
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Share certificate
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}?bib=${runner.bib}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Chứng nhận VnExpress Marathon Quy Nhơn 2026 - ${runner.name} (BIB: ${runner.bib})`,
          text: `Chúc mừng ${runner.name} đã hoàn thành cự ly ${runner.distance} tại VnExpress Marathon Quy Nhon 2026 với thành tích Chip Time: ${runner.chipTime}!`,
          url: shareUrl,
        });
        return;
      } catch (e) {
        // Fallback
      }
    }

    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div
      className={`flex flex-col items-center w-full transition-all duration-300 ${
        viewMode === 'collage' ? 'max-w-5xl' : 'max-w-2xl'
      } mx-auto`}
      id="certificate-canvas-wrapper"
    >
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={personalFileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processPersonalPhotoFile(file);
        }}
      />
      <input
        type="file"
        ref={certFileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processCertBgFile(file);
        }}
      />

      {/* Top Mode Segmented Switcher & Action Toolbar */}
      <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-3 px-1">
        {/* Mode Toggle: Single vs Collage */}
        <div className="inline-flex p-1 bg-stone-100 border border-stone-200 rounded-xl shadow-xs self-start sm:self-auto">
          <button
            type="button"
            id="mode-single-btn"
            onClick={() => setViewMode('single')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'single'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80 font-bold'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <span>Chứng nhận đơn</span>
            <span className="text-[10px] text-stone-400 font-normal">(1080×2400)</span>
          </button>
          <button
            type="button"
            id="mode-collage-btn"
            onClick={() => setViewMode('collage')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'collage'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80 font-bold'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Ghép ảnh cá nhân</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 font-bold border border-teal-200/60">2:1</span>
          </button>
        </div>

        {/* Action Buttons: Share, Download */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            id="share-cert-btn"
            onClick={handleShare}
            className="p-2 px-3 rounded-xl bg-white border border-stone-200 text-stone-700 hover:text-stone-900 hover:bg-stone-50 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            title="Chia sẻ đường dẫn"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-stone-500" />}
            <span className="hidden sm:inline">{copiedLink ? 'Đã sao chép' : 'Chia sẻ'}</span>
          </button>

          <button
            type="button"
            id="download-cert-btn"
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isDownloading ? <RefreshCw className="w-4 h-4 animate-spin text-stone-300" /> : <Download className="w-4 h-4" />}
            <span>
              {isDownloading
                ? 'Đang xuất ảnh...'
                : viewMode === 'collage'
                ? 'Tải ảnh ghép HD (3240×2400)'
                : 'Tải chứng nhận HD (1080×2400)'}
            </span>
          </button>
        </div>
      </div>

      {/* Collage Control Panel (Only visible in collage mode) */}
      {viewMode === 'collage' && (
        <div
          id="collage-control-bar"
          className="w-full mb-3 p-3 bg-white border border-stone-200/90 rounded-2xl shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 text-xs"
        >
          {/* Left: Upload & Photo Source Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="upload-personal-photo-btn"
              onClick={() => personalFileInputRef.current?.click()}
              className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Tải ảnh chạy bộ của bạn lên"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{personalPhotoUrl ? 'Đổi ảnh cá nhân' : 'Chọn ảnh cá nhân'}</span>
            </button>

            {personalPhotoUrl ? (
              <button
                type="button"
                id="remove-personal-photo-btn"
                onClick={handleRemovePhoto}
                className="px-2.5 py-1.5 bg-white hover:bg-rose-50 hover:text-rose-600 border border-stone-200 text-stone-600 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                title="Xóa ảnh hiện tại"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xóa ảnh</span>
              </button>
            ) : (
              <button
                type="button"
                id="sample-photo-btn"
                onClick={handleUseSamplePhoto}
                className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                title="Dùng ảnh vận động viên mẫu để xem trước"
              >
                <ImageIcon className="w-3.5 h-3.5 text-stone-500" />
                <span>Dùng ảnh mẫu</span>
              </button>
            )}

            {/* Layout switch: Photo on Left (2/3) vs Photo on Right (2/3) */}
            <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
              <button
                type="button"
                id="layout-photo-left-btn"
                onClick={() => setPhotoSide('left')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  photoSide === 'left' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
                }`}
                title="Ảnh cá nhân bên Trái, Chứng nhận bên Phải"
              >
                Ảnh Trái • Certi Phải
              </button>
              <button
                type="button"
                id="layout-photo-right-btn"
                onClick={() => setPhotoSide('right')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  photoSide === 'right' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
                }`}
                title="Chứng nhận bên Trái, Ảnh cá nhân bên Phải"
              >
                Certi Trái • Ảnh Phải
              </button>
            </div>
          </div>

          {/* Right: Zoom & Pan & Badge options */}
          <div className="flex items-center gap-2.5 flex-wrap md:justify-end">
            {/* Zoom Slider */}
            <div className="flex items-center gap-2 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200">
              <ZoomOut className="w-3.5 h-3.5 text-stone-400" />
              <input
                id="photo-zoom-slider"
                type="range"
                min="0.8"
                max="2.5"
                step="0.05"
                value={photoZoom}
                onChange={(e) => setPhotoZoom(parseFloat(e.target.value))}
                className="w-20 accent-stone-800 h-1 bg-stone-200 rounded cursor-pointer"
                title="Phóng to / Thu nhỏ ảnh"
              />
              <ZoomIn className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-[11px] font-mono text-stone-700 w-9 text-right font-medium">
                {Math.round(photoZoom * 100)}%
              </span>
            </div>

            {/* Reset position button */}
            <button
              type="button"
              id="reset-photo-pos-btn"
              onClick={handleResetPhotoPosition}
              className="p-1.5 text-stone-500 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors cursor-pointer"
              title="Đặt lại vị trí căn giữa ban đầu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Toggle Filter & Smoothing Panel */}
            <button
              type="button"
              id="toggle-photo-filters-btn"
              onClick={() => setShowFilterPanel((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showFilterPanel || isFilterActive
                  ? 'bg-stone-900 border-stone-900 text-white shadow-xs'
                  : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
              }`}
              title="Mở bảng chỉnh màu sắc, độ sáng, độ nét và làm mịn da"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Chỉnh màu & Làm mịn</span>
              {isFilterActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Manual Photo Filter & Smoothing Sub-Panel */}
      {viewMode === 'collage' && showFilterPanel && (
        <div
          id="photo-filters-panel"
          className="w-full mb-3 p-3.5 bg-white border border-stone-200/90 rounded-2xl shadow-sm space-y-3 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* Header with Presets & Reset */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-stone-700" />
              <div>
                <span className="text-xs font-bold text-stone-900 block sm:inline mr-1.5">
                  Bộ lọc & Làm mịn ảnh
                </span>
                <span className="text-[10px] text-stone-500 font-normal">
                  (Tùy chỉnh thủ công nhẹ nhàng)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-stone-500">Mẫu:</span>
              <div className="inline-flex gap-1 p-0.5 bg-stone-100 rounded-lg border border-stone-200 text-[10px]">
                <button
                  type="button"
                  onClick={() => applyPreset('original')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                    !isFilterActive
                      ? 'bg-white text-stone-900 shadow-xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="Ảnh gốc không qua chỉnh sửa"
                >
                  Gốc
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('smooth')}
                  className="px-2 py-0.5 rounded font-medium text-stone-600 hover:text-stone-900 hover:bg-white transition-colors cursor-pointer"
                  title="Làm mịn da và sáng nhẹ"
                >
                  Mịn da
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('vivid')}
                  className="px-2 py-0.5 rounded font-medium text-stone-600 hover:text-stone-900 hover:bg-white transition-colors cursor-pointer"
                  title="Màu tươi tắn, tương phản cao"
                >
                  Tươi tắn
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('warm')}
                  className="px-2 py-0.5 rounded font-medium text-stone-600 hover:text-stone-900 hover:bg-white transition-colors cursor-pointer"
                  title="Tông nắng ấm"
                >
                  Nắng ấm
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('cool')}
                  className="px-2 py-0.5 rounded font-medium text-stone-600 hover:text-stone-900 hover:bg-white transition-colors cursor-pointer"
                  title="Tông dịu mát"
                >
                  Dịu mát
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('bw')}
                  className="px-2 py-0.5 rounded font-medium text-stone-600 hover:text-stone-900 hover:bg-white transition-colors cursor-pointer"
                  title="Trắng đen cổ điển"
                >
                  Trắng đen
                </button>
              </div>

              {isFilterActive && (
                <button
                  type="button"
                  id="reset-filters-btn"
                  onClick={handleResetFilters}
                  className="px-2 py-1 text-[11px] text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  title="Đặt lại màu gốc nguyên bản"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Đặt lại gốc</span>
                </button>
              )}
            </div>
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
            {/* Làm mịn da / Blur nhẹ hạt ảnh */}
            <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/80 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label
                  htmlFor="filter-smooth-slider"
                  className="text-stone-700 font-medium flex items-center gap-1.5 text-[11px]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  <span>Làm mịn da</span>
                </label>
                <span className="text-stone-900 font-mono font-bold text-[11px]">
                  {(photoFilters.smoothing ?? 0) === 0
                    ? 'Tắt'
                    : `${(photoFilters.smoothing ?? 0).toFixed(1)}`}
                </span>
              </div>
              <input
                id="filter-smooth-slider"
                type="range"
                min="0"
                max="8"
                step="0.5"
                value={photoFilters.smoothing ?? 0}
                onChange={(e) =>
                  setPhotoFilters({
                    ...photoFilters,
                    smoothing: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-stone-800 h-1 bg-stone-200 rounded cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-stone-400">
                <span>0 (Gốc)</span>
                <span>4 (Vừa)</span>
                <span>8 (Mịn cao)</span>
              </div>
            </div>

            {/* Độ sáng */}
            <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/80 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label
                  htmlFor="filter-brightness-slider"
                  className="text-stone-700 font-medium flex items-center gap-1.5 text-[11px]"
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Độ sáng</span>
                </label>
                <span className="text-stone-900 font-mono font-bold text-[11px]">
                  {photoFilters.brightness ?? 100}%
                </span>
              </div>
              <input
                id="filter-brightness-slider"
                type="range"
                min="60"
                max="140"
                step="2"
                value={photoFilters.brightness ?? 100}
                onChange={(e) =>
                  setPhotoFilters({
                    ...photoFilters,
                    brightness: parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-stone-800 h-1 bg-stone-200 rounded cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-stone-400">
                <span>60%</span>
                <span>100%</span>
                <span>140%</span>
              </div>
            </div>

            {/* Độ tương phản */}
            <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/80 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label
                  htmlFor="filter-contrast-slider"
                  className="text-stone-700 font-medium flex items-center gap-1.5 text-[11px]"
                >
                  <Contrast className="w-3.5 h-3.5 text-sky-600" />
                  <span>Tương phản</span>
                </label>
                <span className="text-stone-900 font-mono font-bold text-[11px]">
                  {photoFilters.contrast ?? 100}%
                </span>
              </div>
              <input
                id="filter-contrast-slider"
                type="range"
                min="60"
                max="140"
                step="2"
                value={photoFilters.contrast ?? 100}
                onChange={(e) =>
                  setPhotoFilters({
                    ...photoFilters,
                    contrast: parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-stone-800 h-1 bg-stone-200 rounded cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-stone-400">
                <span>60%</span>
                <span>100%</span>
                <span>140%</span>
              </div>
            </div>

            {/* Độ bão hòa màu */}
            <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/80 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label
                  htmlFor="filter-saturation-slider"
                  className="text-stone-700 font-medium flex items-center gap-1.5 text-[11px]"
                >
                  <Palette className="w-3.5 h-3.5 text-teal-600" />
                  <span>Tươi màu</span>
                </label>
                <span className="text-stone-900 font-mono font-bold text-[11px]">
                  {photoFilters.saturation ?? 100}%
                </span>
              </div>
              <input
                id="filter-saturation-slider"
                type="range"
                min="0"
                max="180"
                step="5"
                value={photoFilters.saturation ?? 100}
                onChange={(e) =>
                  setPhotoFilters({
                    ...photoFilters,
                    saturation: parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-stone-800 h-1 bg-stone-200 rounded cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-stone-400">
                <span>Trắng đen</span>
                <span>100%</span>
                <span>180%</span>
              </div>
            </div>

            {/* Tông ấm / lạnh */}
            <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/80 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label
                  htmlFor="filter-warmth-slider"
                  className="text-stone-700 font-medium flex items-center gap-1.5 text-[11px]"
                >
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span>Tông ấm / lạnh</span>
                </label>
                <span className="text-stone-900 font-mono font-bold text-[11px]">
                  {(photoFilters.warmth ?? 0) > 0
                    ? `+${photoFilters.warmth}`
                    : (photoFilters.warmth ?? 0) < 0
                    ? `${photoFilters.warmth}`
                    : 'Chuẩn'}
                </span>
              </div>
              <input
                id="filter-warmth-slider"
                type="range"
                min="-40"
                max="40"
                step="2"
                value={photoFilters.warmth ?? 0}
                onChange={(e) =>
                  setPhotoFilters({
                    ...photoFilters,
                    warmth: parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-stone-800 h-1 bg-stone-200 rounded cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-stone-400">
                <span>Lạnh (-40)</span>
                <span>Chuẩn (0)</span>
                <span>Ấm (+40)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Display Frame with Drag-and-Drop & Pan Support */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative w-full rounded-2xl overflow-hidden shadow-xs border bg-[#f4f4f4] flex flex-col items-center justify-center p-2 sm:p-4 group transition-all ${
          isDragging ? 'border-stone-900 ring-2 ring-stone-900/10' : 'border-stone-200/90'
        }`}
      >
        {/* Visual helper badge */}
        <div className="absolute top-3 left-3 z-10 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/90 border border-stone-200 backdrop-blur-md text-[11px] text-stone-600 shadow-xs pointer-events-none">
          {viewMode === 'collage' ? (
            <>
              <Move className="w-3.5 h-3.5 text-stone-500" />
              <span>Kéo chuột trên ảnh để căn chỉnh vị trí</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
              <span>Kéo thả ảnh để đổi phôi chứng nhận</span>
            </>
          )}
        </div>

        {/* Canvas Element with interactive drag-to-pan in collage mode */}
        <canvas
          ref={canvasRef}
          id="certificate-canvas"
          width={viewMode === 'collage' ? 3240 : 1080}
          height={2400}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`w-full max-h-[78vh] object-contain rounded-xl shadow-md transition-transform duration-150 ${
            viewMode === 'collage' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
          }`}
        />
      </div>
    </div>
  );
};
