"use client";

import { useState } from "react";
import { X, Download, ExternalLink, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

interface CertificateViewerProps {
  isOpen: boolean;
  onClose: () => void;
  certificates: Array<{
    id: string;
    title: string;
    file: string;
    fileType?: string;
    collectionId: string;
  }>;
  currentIndex: number;
  onNavigate?: (index: number) => void;
}

export function CertificateViewer({ 
  isOpen, 
  onClose, 
  certificates, 
  currentIndex,
  onNavigate 
}: CertificateViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);

  if (!isOpen || certificates.length === 0) return null;

  const currentCert = certificates[currentIndex];
  const fileUrl = `${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/${currentCert.collectionId}/${currentCert.id}/${currentCert.file}`;
  
  const isImage = currentCert.file?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPDF = currentCert.file?.match(/\.pdf$/i);

  const handlePrev = () => {
    if (currentIndex > 0) {
      onNavigate?.(currentIndex - 1);
      setZoom(1);
      setLoading(true);
    }
  };

  const handleNext = () => {
    if (currentIndex < certificates.length - 1) {
      onNavigate?.(currentIndex + 1);
      setZoom(1);
      setLoading(true);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'ArrowRight') handleNext();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex flex-col"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-900 text-white">
        <div>
          <h3 className="font-semibold text-lg">{currentCert.title}</h3>
          <p className="text-sm text-gray-400">
            {currentIndex + 1} of {certificates.length}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <button 
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={18} />
            </button>
            <span className="px-2 text-sm font-medium">{Math.round(zoom * 100)}%</span>
            <button 
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={18} />
            </button>
          </div>

          {/* Download */}
          <a
            href={fileUrl}
            download
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Download"
          >
            <Download size={20} />
          </a>

          {/* Close */}
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors ml-2"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Viewer Content */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
          </div>
        )}

        {isImage ? (
          <img
            src={fileUrl}
            alt={currentCert.title}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
            onLoad={() => setLoading(false)}
          />
        ) : isPDF ? (
          <iframe
            src={`${fileUrl}#toolbar=1&navpanes=0`}
            className="w-full h-full max-w-4xl bg-white rounded-lg"
            onLoad={() => setLoading(false)}
            title={currentCert.title}
          />
        ) : (
          <div className="text-center text-white">
            <p className="mb-4">Preview not available for this file type</p>
            <a 
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              <ExternalLink size={18} />
              Open in New Tab
            </a>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      {certificates.length > 1 && (
        <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-t border-gray-800">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-4 py-2 text-white disabled:opacity-30 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
            Previous
          </button>

          <div className="flex gap-2">
            {certificates.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onNavigate?.(idx);
                  setZoom(1);
                  setLoading(true);
                }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentIndex ? 'bg-white' : 'bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex === certificates.length - 1}
            className="flex items-center gap-2 px-4 py-2 text-white disabled:opacity-30 hover:bg-gray-800 rounded-lg transition-colors"
          >
            Next
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}