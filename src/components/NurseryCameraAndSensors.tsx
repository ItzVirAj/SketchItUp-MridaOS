import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Bell,
  ArrowUpRight,
  CheckCircle,
  Circle,
  Activity,
  Plus,
  Radio,
  Sliders,
} from 'lucide-react';

export const NurseryCameraAndSensors: React.FC = () => {
  const {
    sensors = [],
    careTasks = [],
    toggleCareTask,
    cameras: liveCameras = [],
    setActiveModal,
    setActiveView,
  } = useApp();

  const [currentCameraIdx, setCurrentCameraIdx] = useState(0);
  const [isPhotoSnapped, setIsPhotoSnapped] = useState(false);

  const safeCareTasks = careTasks || [];
  const safeSensors = sensors || [];

  const fallbackCameras = [
    {
      id: 'cam-1',
      title: 'Camera 1 • Greenhouse Sector 08 (Seedlings & Microgreens)',
      url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
      status: 'Live 1080p',
    },
    {
      id: 'cam-2',
      title: 'Camera 2 • Main Fertilizer Storage Godown & Bay 01',
      url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
      status: 'Live 1080p',
    },
    {
      id: 'cam-3',
      title: 'Camera 3 • Polyhouse 03 Exotic Foliage Bench',
      url: 'https://images.unsplash.com/photo-1592150621744-aca64f48394a?auto=format&fit=crop&w=800&q=80',
      status: 'Live 1080p',
    },
    {
      id: 'cam-4',
      title: 'Camera 4 • Rose Bed Nursery & Grafting Station',
      url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=800&q=80',
      status: 'Live 1080p',
    },
  ];

  const cameras = liveCameras && liveCameras.length > 0 ? liveCameras : fallbackCameras;
  const currentCam = cameras[currentCameraIdx] || cameras[0] || fallbackCameras[0];

  const completedCount = safeCareTasks.filter((t) => t.isCompleted).length;
  const progressPercent = safeCareTasks.length > 0 ? Math.round((completedCount / safeCareTasks.length) * 100) : 100;

  const handleSnapPhoto = () => {
    setIsPhotoSnapped(true);
    setTimeout(() => setIsPhotoSnapped(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
      {/* 1. Live Visual CCTV / Greenhouse Camera Feed Card */}
      <div className="lg:col-span-5 bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#D92D20] animate-pulse"></div>
            <span className="text-xs sm:text-sm font-bold text-[#1A1A1A]">
              {currentCam.title.split(' • ')[0]}
            </span>
            <span className="text-[10px] font-semibold text-[#079455] bg-[#E0EAE4] px-2 py-0.5 rounded-full">
              {currentCam.status}
            </span>
          </div>

          <button
            onClick={() => setActiveModal('live_camera')}
            className="w-7 h-7 rounded-xl bg-[#EFF5F1] text-[#6E7E75] hover:bg-[#1A1A1A] hover:text-white transition-colors flex items-center justify-center"
            title="Expand Fullscreen Camera"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Live Camera Viewport with Overlay Controls */}
        <div className="relative w-full h-52 sm:h-56 rounded-2xl overflow-hidden group shadow-inner border border-black/10 bg-black">
          <img
            src={currentCam.url}
            alt="Live Crop Feed"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />

          {/* Top overlay badge */}
          <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-white text-[11px] font-medium flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-[#079455]" />
            <span className="truncate max-w-[200px]">{currentCam.title.split(' • ')[1] || currentCam.title}</span>
          </div>

          {/* Snapshot flash notification */}
          {isPhotoSnapped && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center font-bold text-xs text-[#079455] animate-fade-in">
              📸 Snapshot Saved to Diagnostic Log
            </div>
          )}

          {/* Bottom interactive camera control bar */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-2xl flex items-center justify-between text-white">
            <span className="text-[11px] font-semibold">
              {currentCameraIdx + 1}/{cameras.length}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentCameraIdx((prev) => (prev > 0 ? prev - 1 : cameras.length - 1))}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/30 text-white transition-colors"
                title="Previous Angle"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleSnapPhoto}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/30 text-white transition-colors"
                title="Capture Diagnostic Snapshot"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setActiveModal('quick_view_alerts')}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/30 text-white transition-colors"
                title="Camera Sensor Alerts"
              >
                <Bell className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setCurrentCameraIdx((prev) => (prev < cameras.length - 1 ? prev + 1 : 0))}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/30 text-white transition-colors"
                title="Next Angle"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-[#68776F]">
          <span>Growth Status: <strong>Optimal Telemetry</strong></span>
          <button
            onClick={() => setActiveView('nursery_care')}
            className="text-xs font-bold text-[#079455] hover:underline"
          >
            Sector Report & Analysis →
          </button>
        </div>
      </div>

      {/* 2. Device & Sensor Monitor Card */}
      <div className="lg:col-span-4 bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#1A1A1A] flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#079455]" />
                Sensor & Warehouse Devices
              </h3>
              <p className="text-[11px] text-[#6E7B74]">Active telemetry nodes in godown & polyhouses</p>
            </div>

            <span className="text-[10px] font-bold text-[#1A1A1A] bg-[#EFF5F1] px-2 py-1 rounded-xl">
              {safeSensors.length} Active
            </span>
          </div>

          {/* List of sensors with status dots */}
          <div className="flex flex-col gap-2">
            {safeSensors.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#7A8B82] bg-[#F9FBF9] rounded-2xl border border-dashed border-[#DDE5E0]">
                No active IoT sensors registered yet.
              </div>
            ) : (
              safeSensors.map((sensor) => {
                const isWarning = sensor.status === 'warning';
                return (
                  <div
                    key={sensor.id}
                    className={`p-2.5 rounded-2xl border transition-all ${
                      isWarning
                        ? 'bg-[#FFFAEB]/70 border-[#FEDF89]'
                        : 'bg-[#F9FBFA] border-[#E8EFEA] hover:bg-[#F2F7F4]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isWarning ? 'bg-[#F79009] animate-pulse' : 'bg-[#079455]'
                          }`}
                        ></div>
                        <div>
                          <div className="text-xs font-bold text-[#1A1A1A]">{sensor.name}</div>
                          <div className="text-[10px] text-[#7A8B82]">{sensor.model}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-extrabold text-[#1A1A1A]">{sensor.value}</span>
                        <div className="text-[10px] text-[#6E7E75]">{sensor.location}</div>
                      </div>
                    </div>

                    {sensor.note && (
                      <div className="mt-1.5 pt-1.5 border-t border-black/5 text-[10px] text-[#55655D] flex items-center justify-between">
                        <span>{sensor.note}</span>
                        <span className="text-[9px] text-[#7A8B82]">{sensor.lastSync}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <button
          onClick={() => setActiveView('nursery_care')}
          className="mt-3 w-full py-2 bg-[#EFF5F1] hover:bg-[#E0EAE4] text-[#079455] text-xs font-bold rounded-2xl transition-colors flex items-center justify-center gap-1.5"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Calibrate Sensor Triggers</span>
        </button>
      </div>

      {/* 3. Plant Care & Operations Checklist Card */}
      <div className="lg:col-span-3 bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-bold text-[#1A1A1A]">Daily Nursery Tasks</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E0EAE4] text-[#079455]">
              {progressPercent}% Done
            </span>
          </div>

          <div className="w-full bg-[#E8EFEA] h-1.5 rounded-full mb-3 overflow-hidden">
            <div
              className="bg-[#079455] h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
            {careTasks.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#7A8B82] bg-[#F9FBF9] rounded-2xl border border-dashed border-[#DDE5E0]">
                No care tasks scheduled today.
              </div>
            ) : (
              careTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleCareTask(task.id)}
                  className={`p-2 rounded-2xl border cursor-pointer transition-all flex items-start gap-2 select-none ${
                    task.isCompleted
                      ? 'bg-[#F2F7F4] border-[#D0E2D6] opacity-70'
                      : 'bg-[#F9FBFA] border-[#E8EFEA] hover:border-[#079455]'
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {task.isCompleted ? (
                      <CheckCircle className="w-4 h-4 text-[#079455]" />
                    ) : (
                      <Circle className="w-4 h-4 text-[#8A9B91]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-xs font-bold truncate ${
                        task.isCompleted ? 'line-through text-[#6F7F76]' : 'text-[#1A1A1A]'
                      }`}
                    >
                      {task.title}
                    </div>
                    <div className="text-[10px] text-[#7A8B82] flex items-center gap-1.5">
                      <span>{task.timeSlot}</span>
                      <span>•</span>
                      <span className="truncate">{task.section}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          onClick={() => setActiveModal('plant_care')}
          className="mt-3 w-full py-2 bg-[#1A1A1A] hover:bg-black text-white text-xs font-bold rounded-2xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Schedule Care Task</span>
        </button>
      </div>
    </div>
  );
};
