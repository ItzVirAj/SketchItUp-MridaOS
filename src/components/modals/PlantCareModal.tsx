import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Sprout,
  Plus,
  Clock,
  MapPin,
} from 'lucide-react';

export const PlantCareModal: React.FC = () => {
  const { addPlantCareTask, setActiveModal } = useApp();

  const [title, setTitle] = useState('Foliar Seaweed Spray & Nutrient Boost');
  const [category, setCategory] = useState<'Watering' | 'Fertilizing' | 'Pest Inspection' | 'Pruning' | 'Repotting'>('Fertilizing');
  const [section, setSection] = useState('Greenhouse Sector 02 (Exotic Foliage)');
  const [timeSlot, setTimeSlot] = useState('02:00 PM - 03:00 PM');
  const [plantType, setPlantType] = useState('Monstera & Bonsai Saplings');
  const [quantity, setQuantity] = useState('50 Pots • 25ml foliar solution');
  const [notes, setNotes] = useState('Check moisture meter before misting');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPlantCareTask({
      title,
      category,
      section,
      timeSlot,
      plantType,
      quantity,
      notes,
    });
    setActiveModal('none');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#E2EAE5] overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 bg-[#F9FBF9] border-b border-[#E5ECE7] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#079455] text-white flex items-center justify-center shadow-2xs">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A]">Schedule Plant Care Task</h3>
              <p className="text-xs text-[#6E7B74]">Assign nursery watering, fertilizing or pest check</p>
            </div>
          </div>

          <button
            onClick={() => setActiveModal('none')}
            className="p-2 rounded-xl text-[#788880] hover:text-[#1A1A1A] hover:bg-[#EFF5F1] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-3.5 text-xs">
          <div>
            <label className="block font-bold text-[#1A1A1A] mb-1">Task Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#DCE6DF] font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">Care Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#DCE6DF] bg-white font-semibold"
              >
                <option value="Watering">Watering & Misting</option>
                <option value="Fertilizing">Fertilizing & Foliar</option>
                <option value="Pest Inspection">Pest Inspection</option>
                <option value="Pruning">Pruning & Trimming</option>
                <option value="Repotting">Repotting & Soil</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">Time Window</label>
              <input
                type="text"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#DCE6DF] font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#1A1A1A] mb-1">Greenhouse / Nursery Sector</label>
            <input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#DCE6DF] font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">Target Plant Batch</label>
              <input
                type="text"
                value={plantType}
                onChange={(e) => setPlantType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#DCE6DF] font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">Quantity / Dose</label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#DCE6DF] font-medium"
              />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveModal('none')}
              className="px-4 py-2 rounded-2xl border border-[#DCE6DF] font-bold text-[#55635C] hover:bg-[#F2F7F4]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-2xl bg-[#079455] hover:bg-[#067A46] text-white font-bold shadow-sm transition-all"
            >
              Save Care Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
