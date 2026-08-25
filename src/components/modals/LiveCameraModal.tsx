import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Camera,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const LiveCameraModal: React.FC = () => {
  const { cameras: liveCameras, setActiveModal } = useApp();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [photoSnapped, setPhotoSnapped] = useState(false);

  const fallbackCameras = [
    {
      id: 'cam-1',
      title: 'Greenhouse Sector 08 • High Density Seedlings & Microgreens',
      url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80',
      sensorsInfo: 'Moisture: 68% • Temp: 24.2°C • PAR Light: 450 µmol',
      status: 'Live 1080p 30fps',
    },
    {
      id: 'cam-2',
      title: 'Main Fertilizer Godown • Bay 01 & 02 Pallet Racks',
      url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
      sensorsInfo: 'Humidity: 82% (Warning) • Temp: 28°C • Smoke: Clean',
      status: 'Live 1080p 30fps',
    },
    {
      id: 'cam-3',
      title: 'Polyhouse 03 • Exotic Foliage & Bonsai Propagation Benches',
      url: 'https://images.unsplash.com/photo-1592150621744-aca64f48394a?auto=format&fit=crop&w=1200&q=80',
      sensorsInfo: 'Misting Active • pH: 6.8 • Temp: 23.5°C',
      status: 'Live 1080p 30fps',
    },
    {
      id: 'cam-4',
      title: 'Outdoor Nursery & Seedling Beds • Sector North',
      url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=1200&q=80',
      sensorsInfo: 'Soil Moisture: 54% • UV Index: 6.2 Mod',
      status: 'Live 1080p 30fps',
    },
  ];

  const cameras = liveCameras && liveCameras.length > 0 ? liveCameras : fallbackCameras;
  const cam = cameras[currentIdx] || cameras[0];

  const handleSnap = () => {
    setPhotoSnapped(true);
    setTimeout(() => setPhotoSnapped(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#1A1A1A] w-full max-w-4xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-black/40 border-b border-white/10 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#D92D20] animate-pulse"></div>
            <div>
              <h3 className="text-sm font-bold">{cam.title}</h3>
              <p className="text-xs text-white/60">{cam.sensorsInfo || 'Real-time Camera Stream'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#079455] bg-[#079455]/20 px-2.5 py-0.5 rounded-full">
              {cam.status}
            </span>
            <button
              onClick={() => setActiveModal('none')}
              className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="relative w-full h-80 sm:h-[450px] bg-black flex items-center justify-center overflow-hidden">
          <img
            src={cam.url}
            alt="Live Crop Feed"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />

          {photoSnapped && (
            <div className="absolute inset-0 bg-white/90 flex items-center justify-center font-bold text-sm text-[#079455] animate-fade-in">
              📸 Snapshot Saved to Diagnostic Log
            </div>
          )}

          {/* Bottom Nav Bar */}
          <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center justify-between text-white border border-white/10">
            <div className="text-xs font-bold">
              Camera Feed {currentIdx + 1} of {cameras.length}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentIdx((prev) => (prev > 0 ? prev - 1 : cameras.length - 1))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/30 text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handleSnap}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/30 text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Snapshot</span>
              </button>

              <button
                onClick={() => setCurrentIdx((prev) => (prev < cameras.length - 1 ? prev + 1 : 0))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/30 text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
