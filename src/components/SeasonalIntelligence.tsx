import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  CloudSun,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  Package,
  Calendar,
} from 'lucide-react';
import { seasonalIntelligence } from '../data/mockData';

export const SeasonalIntelligence: React.FC = () => {
  const { setActiveModal, setActiveView } = useApp();

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F4EDDE] text-[#B57C1E] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1A1A1A] tracking-tight">
                Seasonal Agriculture Intelligence & Sowing Forecast
              </h3>
              <p className="text-[11px] text-[#6E7B74]">
                Proactive crop season demand modeling & buffer procurement recommendations
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-[#F4EDDE] text-[#6E4F18] border border-[#EBE0C8] rounded-full text-xs font-bold flex items-center gap-1.5">
            <CloudSun className="w-3.5 h-3.5 text-[#B57C1E]" />
            <span>{seasonalIntelligence.seasonName.split(' & ')[0]}</span>
          </span>
        </div>
      </div>

      {/* Strategic Banner */}
      <div className="p-3.5 bg-gradient-to-r from-[#F4EDDE] to-[#E0EAE4] rounded-2xl border border-[#E0EAE4] mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-xl bg-white text-[#079455] flex items-center justify-center flex-shrink-0 shadow-2xs">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#1A1A1A] flex items-center gap-2">
              <span>Phase: {seasonalIntelligence.currentPhase}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#079455]"></span>
              <span className="text-[#55635C] font-medium">{seasonalIntelligence.weatherCondition}</span>
            </div>
            <p className="text-xs text-[#4F390D] mt-0.5 font-medium leading-relaxed">
              {seasonalIntelligence.strategicAdvice}
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveModal('create_po')}
          className="px-3.5 py-1.5 rounded-xl bg-[#1A1A1A] text-white hover:bg-black text-xs font-bold transition-all shadow-2xs whitespace-nowrap self-start md:self-auto"
        >
          Procure Recommended Buffer
        </button>
      </div>

      {/* High Demand Sowing Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {seasonalIntelligence.highDemandProducts.map((prod, idx) => {
          const isCriticalStock = prod.stockStatus === 'critical';
          const isNeedsProcure = prod.stockStatus === 'needs_procurement';

          return (
            <div
              key={idx}
              className="p-3 bg-[#F9FBF9] rounded-2xl border border-[#E5ECE7] hover:border-[#079455] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-[#079455] bg-[#E0EAE4] px-2 py-0.5 rounded-full">
                    {prod.category}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isCriticalStock
                        ? 'bg-[#FEE4E2] text-[#D92D20]'
                        : isNeedsProcure
                        ? 'bg-[#FEF0C7] text-[#B54708]'
                        : 'bg-[#E0EAE4] text-[#079455]'
                    }`}
                  >
                    {isCriticalStock ? 'Stockout Risk' : isNeedsProcure ? 'Reorder Needed' : 'Stock Adequate'}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-[#1A1A1A] line-clamp-1">{prod.name}</h4>
                <p className="text-[11px] text-[#55635C] mt-1 line-clamp-2 leading-relaxed">
                  {prod.expectedSurge}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-[#EBEFEA] flex items-center justify-between text-xs">
                <span className="text-[10px] text-[#7A8B82]">Forecast: +45% Demand</span>
                <button
                  onClick={() => setActiveModal('create_po')}
                  className="text-xs font-bold text-[#079455] hover:underline"
                >
                  + Add to PO
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
