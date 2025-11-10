import React from 'react';
import { Card } from './common/Card';
import { FaceIdIcon, CheckCircleIcon, XCircleIcon } from './icons/Icons';
import type { Landmark } from '../types';

interface FacialVectorPanelProps {
  vectorData: { landmarks: Landmark[] } | null;
  isLoading: boolean;
  error: string | null;
  isCached: boolean;
  hasSubject: boolean;
}

const Shimmer: React.FC<{className?: string}> = ({className = 'h-4'}) => (
  <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse ${className}`}></div>
);

const StatusDisplay: React.FC<{
    isLoading: boolean;
    error: string | null;
    vectorData: { landmarks: Landmark[] } | null;
    isCached: boolean;
    hasSubject: boolean;
}> = ({ isLoading, error, vectorData, isCached, hasSubject }) => {
    if (isLoading) {
        return (
            <div className="space-y-2">
                <Shimmer />
                <Shimmer className="h-4 w-3/4" />
            </div>
        );
    }
    if (error) {
        return (
            <div className="flex items-center gap-2 text-red-500">
                <XCircleIcon className="w-5 h-5" />
                <div className="flex flex-col">
                    <span className="font-semibold text-sm">Analisis Gagal</span>
                    <span className="text-xs max-w-xs truncate">{error}</span>
                </div>
            </div>
        );
    }
    if (vectorData) {
        return (
            <div className="flex items-center gap-2 text-green-500">
                <CheckCircleIcon className="w-5 h-5" />
                <div>
                    <p className="font-semibold text-sm">{vectorData.landmarks.length} Titik Landmark Terdeteksi</p>
                    <p className={`text-xs ${isCached ? 'text-teal-400' : 'text-green-400'}`}>
                        Status: {isCached ? '✅ Dimuat dari Cache Sesi' : '✅ Dianalisis & Disimpan ke Cache'}
                    </p>
                </div>
            </div>
        );
    }
    if (hasSubject) {
         return <div className="text-sm text-slate-500 dark:text-slate-400">Menunggu analisis komprehensif...</div>;
    }
    return <div className="text-sm text-slate-500 dark:text-slate-400">Unggah gambar subjek untuk memulai.</div>;
};

export const FacialVectorPanel: React.FC<FacialVectorPanelProps> = ({ vectorData, isLoading, error, isCached, hasSubject }) => {
  return (
    <Card 
      title="Analisis Vektor Wajah" 
      titleIcon={<FaceIdIcon />}
      tooltip="Modul ini secara otomatis mengekstrak geometri wajah dari gambar subjek Anda menjadi data vektor. Data ini krusial untuk fitur 'IdentityLock' dan memastikan konsistensi wajah di berbagai generasi. Hasilnya di-cache per sesi."
    >
      <StatusDisplay 
        isLoading={isLoading}
        error={error}
        vectorData={vectorData}
        isCached={isCached}
        hasSubject={hasSubject}
      />
    </Card>
  );
};
