/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Info,
  ChevronRight,
  History,
  Trash2,
  Camera,
  X,
  Plus,
  Eye,
  Scan,
  ImagePlus
} from 'lucide-react';
import { analyzeMachineryImages, type AnalysisResult, AGRICULTURAL_MACHINERY } from './services/gemini';
import { cn } from './lib/utils';

const MAX_IMAGES = 3;

interface UploadedImage {
  id: string;
  base64: string;
  mimeType: string;
}

interface ScanHistoryItem extends AnalysisResult {
  id: string;
  timestamp: number;
  imageUrls: string[];
}

export default function App() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  }, []);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      setError('이미지 파일만 업로드 가능합니다.');
      return;
    }

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setError(`최대 ${MAX_IMAGES}장까지 업로드 가능합니다. 기존 사진을 삭제 후 다시 시도해주세요.`);
      return;
    }

    const toProcess = fileArray.slice(0, remaining);
    setError(null);

    try {
      const newImages: UploadedImage[] = [];
      for (const file of toProcess) {
        const base64 = await compressImage(file);
        newImages.push({
          id: Math.random().toString(36).substring(7),
          base64,
          mimeType: 'image/jpeg',
        });
      }
      setImages(prev => [...prev, ...newImages]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 처리 중 오류가 발생했습니다.');
    }
  }, [images.length, compressImage]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const removeImage = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const analyzeAllImages = useCallback(async () => {
    if (images.length === 0) {
      setError('최소 1장의 사진을 업로드해주세요.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const analysisResult = await analyzeMachineryImages(
        images.map(img => ({ base64: img.base64, mimeType: img.mimeType }))
      );
      setResult(analysisResult);

      const historyItem: ScanHistoryItem = {
        ...analysisResult,
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        imageUrls: images.map(img => img.base64),
      };
      setHistory(prev => [historyItem, ...prev].slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [images]);

  const clearAll = useCallback(() => {
    setImages([]);
    setResult(null);
    setError(null);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold">
              순
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">순천은행</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Agricultural Insurance System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 font-medium hidden sm:inline-block">농기계 보험 판독 시스템</span>
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
              <Camera className="w-4 h-4 text-slate-500" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Upload Section */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Upload className="w-4 h-4 text-green-600" />
                사진 업로드
                {images.length > 0 && (
                  <span className="text-xs font-normal text-slate-400">
                    ({images.length}/{MAX_IMAGES}장)
                  </span>
                )}
              </h2>
              {images.length > 0 && (
                <button 
                  onClick={clearAll}
                  className="text-sm font-medium text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  전체 삭제
                </button>
              )}
            </div>
            
            <div className="p-6">
              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => images.length < MAX_IMAGES && !isAnalyzing && fileInputRef.current?.click()}
                className={cn(
                  "relative rounded-xl border-2 border-dashed transition-all",
                  images.length === 0 ? "aspect-[16/9]" : "min-h-[80px]",
                  "flex flex-col items-center justify-center cursor-pointer",
                  isDragOver 
                    ? "border-green-500 bg-green-50/50" 
                    : images.length >= MAX_IMAGES
                      ? "border-slate-100 bg-slate-50/50 cursor-default"
                      : "border-slate-200 hover:border-green-400 hover:bg-green-50/20",
                  isAnalyzing && "pointer-events-none opacity-70"
                )}
              >
                {images.length === 0 ? (
                  <div className="text-center p-8">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ImagePlus className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-medium mb-1">
                      농기계 사진을 드래그하거나 클릭하세요
                    </p>
                    <p className="text-xs text-slate-400">
                      여러 각도로 찍은 사진 1~{MAX_IMAGES}장 · JPG, PNG (최대 10MB)
                    </p>
                  </div>
                ) : images.length < MAX_IMAGES ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-slate-400 hover:text-green-600 transition-colors">
                    <Plus className="w-4 h-4" />
                    사진 추가 (최대 {MAX_IMAGES}장)
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    최대 {MAX_IMAGES}장 업로드 완료
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
              </div>

              {/* Uploaded Image Thumbnails */}
              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {images.map((img, index) => (
                    <motion.div
                      key={img.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group"
                    >
                      <img
                        src={img.base64}
                        alt={`사진 ${index + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {/* Photo number badge */}
                      <div className="absolute top-2 left-2">
                        <div className="w-6 h-6 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-[11px] text-white font-bold">
                          {index + 1}
                        </div>
                      </div>
                      {/* Hover overlay with actions */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={(e) => { e.stopPropagation(); setPreviewImage(img.base64); }}
                          className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-700 hover:bg-white transition-colors shadow-sm"
                          title="크게 보기"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                          className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-red-500 hover:bg-white transition-colors shadow-sm"
                          title="삭제"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Analyze Button */}
              <div className="mt-5">
                <button
                  onClick={analyzeAllImages}
                  disabled={images.length === 0 || isAnalyzing}
                  className={cn(
                    "w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
                    images.length > 0 && !isAnalyzing
                      ? "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/20 active:scale-[0.98]"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      AI가 {images.length}장의 사진을 종합 분석 중...
                    </>
                  ) : (
                    <>
                      <Scan className="w-4 h-4" />
                      {images.length > 0 
                        ? `${images.length}장 사진 판독 시작`
                        : '사진을 먼저 업로드해주세요'
                      }
                    </>
                  )}
                </button>
              </div>

              {/* Analysis progress */}
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4"
                >
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: '90%' }}
                      transition={{ duration: 8, ease: 'easeInOut' }}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 bg-green-500 rounded-full"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">촬영 각도를 자동 판별하고 교차 검증 중입니다</p>
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700 text-sm"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}
            </div>
          </section>

          {/* Result Section */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.section 
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-md border border-green-100 overflow-hidden"
              >
                <div className="bg-green-600 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-white font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    종합 판독 결과
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white font-medium">
                      {result.angleAnalysis?.length || 0}장 분석
                    </div>
                    <div className={cn(
                      "backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white font-medium",
                      result.confidence >= 0.8 ? "bg-white/20" : "bg-yellow-400/30"
                    )}>
                      신뢰도 {(result.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Main result */}
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">분류된 농기계</span>
                    <h3 className="text-3xl font-bold text-slate-900 mt-1">{result.machineryType}</h3>
                  </div>

                  {/* Confidence bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>판독 신뢰도</span>
                      <span className="font-semibold">{(result.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        className={cn(
                          "h-full rounded-full",
                          result.confidence >= 0.8 ? "bg-green-500" : 
                          result.confidence >= 0.5 ? "bg-yellow-500" : "bg-red-500"
                        )}
                        initial={{ width: '0%' }}
                        animate={{ width: `${result.confidence * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  {/* Overall reason */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-500" />
                      종합 판독 근거
                    </h4>
                    <p className="text-slate-600 text-sm leading-relaxed">{result.reason}</p>
                  </div>

                  {/* Per-photo Analysis — AI가 자동 판별한 각도 포함 */}
                  {result.angleAnalysis && result.angleAnalysis.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-green-600" />
                        사진별 분석
                      </h4>
                      <div className="space-y-3">
                        {result.angleAnalysis.map((analysis, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white border border-slate-200 rounded-xl p-4"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center">
                                <span className="text-[10px] font-bold text-green-700">{analysis.photoNumber}</span>
                              </div>
                              <span className="text-sm font-semibold text-slate-700">
                                사진 {analysis.photoNumber}
                              </span>
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-semibold rounded-full border border-blue-100">
                                {analysis.detectedAngle}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed pl-8">
                              {analysis.observations}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">관찰된 주요 특징</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.features.map((feature, idx) => (
                        <span 
                          key={idx}
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 font-medium flex items-center gap-2"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 space-y-6">
          {/* How to use */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Camera className="w-4 h-4 text-green-600" />
              사진 촬영 안내
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-green-50/50 rounded-lg border border-green-100">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-green-700">✓</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">편하게 찍으세요</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">각도 신경 쓸 필요 없이 자유롭게 1~3장 촬영</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-blue-700">AI</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">AI가 각도를 자동 판별</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">어떤 방향에서 찍었는지 AI가 알아서 분석합니다</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-amber-700">TIP</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">여러 장이면 더 정확해요</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">서로 다른 위치에서 찍을수록 교차 검증이 가능합니다</p>
                </div>
              </div>
            </div>
          </section>

          {/* Supported Machinery List */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />
              판독 가능 농기계 목록
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {AGRICULTURAL_MACHINERY.map((item, idx) => (
                <div 
                  key={idx}
                  className="px-3 py-2 bg-slate-50 rounded-lg text-[11px] text-slate-600 font-medium border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-green-200 transition-all"
                >
                  {item}
                  <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-green-400" />
                </div>
              ))}
            </div>
          </section>

          {/* Scan History */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col max-h-[500px]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                최근 판독 기록
              </h2>
              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                  title="기록 삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">최근 판독 기록이 없습니다</p>
                </div>
              ) : (
                history.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => {
                      setResult(item);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <div className="relative w-12 h-12 shrink-0">
                      {item.imageUrls.slice(0, 2).map((url, i) => (
                        <div 
                          key={i}
                          className={cn(
                            "absolute w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white",
                            i === 0 ? "top-0 left-0 z-10" : "top-1.5 left-1.5 z-0"
                          )}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                      {item.imageUrls.length > 1 && (
                        <div className="absolute -bottom-0.5 -right-0.5 z-20 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center text-[9px] text-white font-bold shadow-sm">
                          {item.imageUrls.length}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-800 truncate">{item.machineryType}</h4>
                      <p className="text-[10px] text-slate-400">
                        {new Date(item.timestamp).toLocaleTimeString()} · {item.imageUrls.length}장 · 신뢰도 {(item.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-xs text-slate-400 font-medium">
            © 2026 순천은행 농기계 보험 관리 시스템 · AI Powered by Gemini
          </p>
        </div>
      </footer>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-3xl max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <img 
                src={previewImage} 
                alt="Preview" 
                className="w-full h-full object-contain bg-white"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
