'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  FileCheck, 
  AlertCircle,
  Loader2,
  Maximize2
} from 'lucide-react';

interface PdfViewerProps {
  base64Data?: string;
  pdfBase64?: string;
  filename?: string;
  fileName?: string;
  title?: string;
  height?: string;
}

export default function PdfViewer({ base64Data, pdfBase64, filename, fileName, title, height = '650px' }: PdfViewerProps) {
  const actualBase64 = base64Data || pdfBase64 || '';
  const actualFilename = filename || fileName || 'documento.pdf';

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!actualBase64) {
      setError('No se proporcionaron datos de PDF válidos.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Limpiar prefijo base64 si existe
      let cleanB64 = actualBase64;
      if (cleanB64.includes('base64,')) {
        cleanB64 = cleanB64.split('base64,')[1];
      }

      // Decodificar Base64 a Uint8Array binario
      const binaryString = window.atob(cleanB64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Crear Blob URL con tipo MIME application/pdf
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      setIsLoading(false);

      // Limpieza de memoria Blob URL al desmontar
      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (err: any) {
      console.error('Error procesando PDF para visualización:', err);
      setError('No se pudo decodificar el documento PDF.');
      setIsLoading(false);
    }
  }, [actualBase64]);

  const handleOpenInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  const handleDownload = () => {
    if (!actualBase64) return;
    let cleanB64 = actualBase64;
    if (cleanB64.includes('base64,')) {
      cleanB64 = cleanB64.split('base64,')[1];
    }
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${cleanB64}`;
    link.download = actualFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => {
    if (zoomLevel < 200) setZoomLevel(prev => prev + 15);
  };

  const handleZoomOut = () => {
    if (zoomLevel > 50) setZoomLevel(prev => prev - 15);
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  return (
    <div className="w-full flex flex-col rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl">
      
      {/* Barra de Herramientas Flotante del Visor PDF (Estilo Export) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-3 px-4 border-b border-slate-800">
        
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <FileCheck className="w-4 h-4 text-amber-400" />
          <span className="truncate max-w-[280px]" title={filename}>
            {title || filename}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-950 rounded-lg p-1 border border-slate-800 text-xs">
            <button
              onClick={handleZoomOut}
              title="Reducir Zoom"
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-slate-300 font-mono text-[11px] min-w-[42px] text-center font-bold">
              {zoomLevel}%
            </span>
            <button
              onClick={handleZoomIn}
              title="Ampliar Zoom"
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              title="Restablecer Zoom"
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors border-l border-slate-800 ml-1 pl-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Abrir en pestaña nueva */}
          <button
            onClick={handleOpenInNewTab}
            disabled={!blobUrl}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer disabled:opacity-50"
            title="Abrir PDF en pestaña independiente del navegador"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nueva Pestaña</span>
          </button>

          {/* Descargar PDF */}
          <button
            onClick={handleDownload}
            disabled={!base64Data}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-600/20"
            title="Descargar archivo PDF a su equipo"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar</span>
          </button>
        </div>

      </div>

      {/* Contenedor Principal del Visor */}
      <div 
        className="w-full relative bg-slate-900/50 overflow-auto flex items-center justify-center p-2"
        style={{ height }}
      >
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 text-slate-400 p-8">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            <span className="text-xs font-medium">Cargando documento PDF de SuperCías...</span>
          </div>
        )}

        {error && (
          <div className="p-6 bg-red-950/60 border border-red-800 rounded-xl text-red-200 text-xs flex flex-col items-center gap-3 text-center max-w-md">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <div>
              <h5 className="font-bold text-sm text-red-300">Error al cargar el PDF</h5>
              <p className="mt-1 text-slate-300">{error}</p>
            </div>
            <button
              onClick={handleDownload}
              className="mt-2 px-4 py-2 bg-red-800 hover:bg-red-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
            >
              Descargar PDF Directo
            </button>
          </div>
        )}

        {!isLoading && !error && blobUrl && (
          <div 
            className="w-full h-full transition-all duration-200 ease-out origin-top"
            style={{ 
              transform: `scale(${zoomLevel / 100})`, 
              transformOrigin: 'top center',
              width: zoomLevel > 100 ? `${zoomLevel}%` : '100%',
              height: zoomLevel > 100 ? `${zoomLevel}%` : '100%' 
            }}
          >
            <iframe
              src={blobUrl}
              className="w-full h-full rounded-lg border-none"
              title={title || filename || "Visor PDF SuperCías"}
            />
          </div>
        )}
      </div>

    </div>
  );
}
