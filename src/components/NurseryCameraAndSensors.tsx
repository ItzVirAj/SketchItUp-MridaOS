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
  AlertCircle,
  Plus,
  Radio,
  Sliders,
  Check,
} from 'lucide-react';

export const NurseryCameraAndSensors: React.FC = () => {
  const { sensors, careTasks, toggleCareTask, setActiveModal, setActiveView } = useApp();

  const [currentCameraIdx, setCurrentCameraIdx] = useState(0);
  const [isPhotoSnapped, setIsPhotoSnapped] = useState(false);

  const cameras = [
    {
      id: 1,
      name: 'Camera 1 • Greenhouse Sector 08 (Spinach & Seedlings)',
      imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
      status: 'Live 1080p',
    },
    {
      id: 2,
      name: 'Camera 2 • Main Fertilizer Storage Godown & Bay 01',
      imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
      status: 'Live 1080p',
    },
    {
      id: 3,
      name: 'Camera 3 • Polyhouse 03 Exotic Foliage Bench',
      imageUrl: 'https://images.unsplash.com/photo-1592150621744-aca64f48394a?auto=format&fit=crop&w=800&q=80',
      status: 'Live 1080p',
    },
    {
      id: 4,
      name: 'Camera 4 • Rose Bed Nursery & Grafting Station',
      imageUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=800&q=80',
      status: 'Live 1080p',
    },
  ];

  const currentCam = cameras[currentCameraIdx];

  const completedCount = careTasks.filter((t) => t.isCompleted).length;
  const progressPercent = careTasks.length > 0 ? Math.round((completedCount / careTasks.length) * 100) : 100;

  const handleSnapPhoto = () => {
    setIsPhotoSnapped(true);
    setTimeout(() => setIsPhotoSnapped(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
      {/* 1. Live Visual CCTV / Greenhouse Camera Feed Card (matching Reference Images 1 & 5) */}
      <div className="lg:col-span-5 bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#D92D20] animate-pulse"></div>
            <span className="text-xs sm:text-sm font-bold text-[#1A1A1A]">
              {currentCam.name.split(' • ')[0]}
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
            src={currentCam.imageUrl}
            alt="Live Crop Feed"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />

          {/* Top overlay badge */}
          <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-white text-[11px] font-medium flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-[#079455]" />
            <span className="truncate max-w-[200px]">{currentCam.name.split(' • ')[1]}</span>
          </div>

          {/* Snapshot flash notification */}
          {isPhotoSnapped && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center font-bold text-xs text-[#079455] animate-fade-in">
              📸 Snapshot Saved to Diagnostic Log
            </div>
          )}

          {/* Bottom interactive camera control bar (matching Reference Image 1 camera controls) */}
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
          <span>AI Growth Metric: <strong>94% Vigor</strong></span>
          <button
            onClick={() => setActiveView('nursery_care')}
            className="text-xs font-bold text-[#079455] hover:underline"
          >
            Sector Report & Analysis →
          </button>
        </div>
      </div>

      {/* 2. Device & Sensor Monitor Card (matching Reference Image 1) */}
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
              {sensors.length} Sensors Active
            </span>
          </div>

          {/* List of sensors with status dots */}
          <div className="flex flex-col gap-2">
            {sensors.map((sensor) => {
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
                      <span className="text-xs font-extrabold text-[#1A1A1A]">{sensor.value}</span>
                      <span className="text-[10px] text-[#8C9C93] block">{sensor.location.split(' (')[0]}</span>
                    </div>
                  </div>

                  {isWarning && (
                    <div className="mt-1.5 pt-1.5 border-t border-[#FEDF89] text-[10px] font-semibold text-[#B54708] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{sensor.note}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-[#F0F5F2] flex items-center justify-between">
          <span className="text-[11px] text-[#788880]">Live Mesh: 2.4GHz Zigbee / LoRa</span>
          <span className="text-[10px] font-bold text-[#079455] bg-[#E0EAE4] px-2 py-0.5 rounded-full">
            All Gateways Online
          </span>
        </div>
      </div>

      {/* 3. Daily Care & Operating Tasks (matching Reference Image 1 Task Card) */}
      <div className="lg:col-span-3 bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-bold text-[#1A1A1A]">Daily Care Tasks</h3>
            <button
              onClick={() => setActiveView('nursery_care')}
              className="text-[#788880] hover:text-[#1A1A1A]"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Bar (matching Reference Image 1) */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#1A1A1A] mb-1">
              <span>{progressPercent}%</span>
              <span className="text-[#6E7B74] font-medium">
                {completedCount}/{careTasks.length} Completed
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#EFF5F1] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#079455] transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Tasks List */}
          <div className="flex flex-col gap-2">
            {careTasks.length === 0 ? (
              <div className="py-5 px-3 text-center bg-[#F9FBFA] rounded-2xl border border-dashed border-[#CCD8D0]">
                <p className="text-xs font-bold text-[#1A1A1A]">No Scheduled Tasks</p>
                <p className="text-[10px] text-[#7A8B82] mt-0.5">
                  All daily irrigation & fertilization tasks are clear.
                </p>
              </div>
            ) : (
              careTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleCareTask(task.id)}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                    task.isCompleted
                      ? 'bg-[#F2F7F4] border-[#D0E2D7] opacity-80'
                      : 'bg-white border-[#E5EFE8] hover:border-[#079455]'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {task.isCompleted ? (
                        <div className="w-4 h-4 rounded-full bg-[#079455] text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-[#A0B3A8] hover:border-[#079455]"></div>
                      )}
                    </div>
                    <div>
                      <h5 className={`text-xs font-bold ${task.isCompleted ? 'line-through text-[#6E7B74]' : 'text-[#1A1A1A]'}`}>
                        {task.title}
                      </h5>
                      <p className="text-[10px] text-[#7A8B82] line-clamp-1">{task.quantity}</p>
                      <span className="text-[9px] font-semibold text-[#079455] block mt-0.5">
                        {task.timeSlot}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-[#F0F5F2] flex items-center justify-between">
          <button
            onClick={() => setActiveModal('plant_care')}
            className="w-full py-1.5 rounded-xl bg-[#EFF5F1] hover:bg-[#E0EAE4] text-xs font-bold text-[#079455] flex items-center justify-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Schedule Task</span>
          </button>
        </div>
      </div>
    </div>
  );
};
