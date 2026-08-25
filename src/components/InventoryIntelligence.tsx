import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Boxes,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  MapPin,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { InventoryItem, Batch } from '../types';

export const InventoryIntelligence: React.FC = () => {
  const { inventory, setActiveModal, setActiveView } = useApp();
  const [filterTab, setFilterTab] = useState<'all' | 'expiring' | 'low_stock' | 'fast_moving' | 'slow_moving'>('expiring');
  const [localSearch] = useState('');

  // Collect all batches for FEFO analysis
  const allBatches: { item: InventoryItem; batch: Batch }[] = [];
  inventory.forEach((item) => {
    (item.batches || []).forEach((b) => {
      allBatches.push({ item, batch: b });
    });
  });

  // Sort batches by FEFO (First Expiry First Out)
  allBatches.sort((a, b) => a.batch.daysRemaining - b.batch.daysRemaining);

  const lowStockItems = inventory.filter((i) => i.stockQty <= i.reorderLevel);

  const filteredItems = inventory.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(localSearch.toLowerCase()) ||
                          item.sku.toLowerCase().includes(localSearch.toLowerCase()) ||
                          item.category.toLowerCase().includes(localSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (filterTab === 'low_stock') return item.stockQty <= item.reorderLevel;
    if (filterTab === 'fast_moving') return item.velocity === 'fast';
    if (filterTab === 'slow_moving') return item.velocity === 'slow';
    return true;
  });

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E0EAE4] text-[#079455] flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1A1A1A] tracking-tight">
                Inventory Intelligence & FEFO Batch Radar
              </h3>
              <p className="text-[11px] text-[#6E7B74]">
                Strict First-Expiry First-Out tracking, automated reorder triggers & rack management
              </p>
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#EFF5F1] p-1 rounded-2xl">
          <button
            onClick={() => setFilterTab('expiring')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterTab === 'expiring' ? 'bg-[#1A1A1A] text-white shadow-2xs' : 'text-[#607067] hover:text-[#1A1A1A]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#F9AD19]" />
            <span>FEFO Expiry Radar</span>
            <span className="text-[10px] bg-[#D92D20] text-white px-1.5 py-0.2 rounded-full font-bold">
              {allBatches.filter((b) => b.batch.daysRemaining <= 30).length}
            </span>
          </button>

          <button
            onClick={() => setFilterTab('low_stock')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterTab === 'low_stock' ? 'bg-[#1A1A1A] text-white shadow-2xs' : 'text-[#607067] hover:text-[#1A1A1A]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#B54708]" />
            <span>Low Buffer Stock</span>
            <span className="text-[10px] bg-[#FEF0C7] text-[#B54708] px-1.5 py-0.2 rounded-full font-bold">
              {lowStockItems.length}
            </span>
          </button>

          <button
            onClick={() => setFilterTab('fast_moving')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterTab === 'fast_moving' ? 'bg-[#1A1A1A] text-white shadow-2xs' : 'text-[#607067] hover:text-[#1A1A1A]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#079455]" />
            <span>Fast Movers</span>
          </button>

          <button
            onClick={() => setFilterTab('slow_moving')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterTab === 'slow_moving' ? 'bg-[#1A1A1A] text-white shadow-2xs' : 'text-[#607067] hover:text-[#1A1A1A]'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5 text-[#98A2B3]" />
            <span>Slow / Dead Stock</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {filterTab === 'expiring' ? (
        allBatches.length === 0 ? (
          <div className="py-12 px-4 text-center bg-[#F9FBF9] rounded-2xl border border-dashed border-[#CCD8D0]">
            <Boxes className="w-8 h-8 text-[#8C9C93] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-[#1A1A1A]">No Batches Logged</p>
            <p className="text-xs text-[#6E7B74] mt-1 max-w-sm mx-auto">
              There are no active product batches recorded in your inventory.
            </p>
            <button
              onClick={() => setActiveModal('stock_adjust')}
              className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#079455] text-white text-xs font-bold shadow-2xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Inward Stock / Add Batch</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5ECE7] text-[#7A8B82] font-semibold">
                  <th className="py-2.5 px-3">Product Name & Category</th>
                  <th className="py-2.5 px-3">Batch Number</th>
                  <th className="py-2.5 px-3">Shelf / Rack</th>
                  <th className="py-2.5 px-3">Stock Quantity</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3">FEFO Countdown</th>
                  <th className="py-2.5 px-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F5F2]">
                {allBatches.map(({ item, batch }, idx) => {
                  const isCritical = batch.daysRemaining <= 30;
                  const isWarning = batch.daysRemaining > 30 && batch.daysRemaining <= 60;
                  return (
                    <tr key={idx} className="hover:bg-[#F9FBF9] transition-colors group">
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#1A1A1A] group-hover:text-[#079455] transition-colors">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-[#7A8B82] flex items-center gap-2 mt-0.5">
                          <span className="bg-[#EFF5F1] px-1.5 py-0.5 rounded font-medium text-[#079455]">
                            {item.category}
                          </span>
                          <span>SKU: {item.sku}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-[#1A1A1A] bg-[#F2F7F4] px-2 py-0.5 rounded border border-[#DCE8E0]">
                          {batch.batchNumber}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 font-semibold text-[#54625A]">
                          <MapPin className="w-3 h-3 text-[#7A8B82]" />
                          <span>{batch.rack}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-bold text-[#1A1A1A]">
                        {batch.quantity} {item.unit}
                      </td>

                      <td className="py-3 px-3 font-medium text-[#404D46]">
                        {batch.expiryDate}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                            isCritical
                              ? 'bg-[#FEE4E2] text-[#D92D20]'
                              : isWarning
                              ? 'bg-[#FEF0C7] text-[#B54708]'
                              : 'bg-[#E0EAE4] text-[#079455]'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{batch.daysRemaining} days remaining</span>
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveModal('new_sale')}
                            className="px-2.5 py-1 rounded-xl bg-[#079455] hover:bg-[#067A46] text-white text-[11px] font-bold transition-all shadow-2xs"
                            title="Offer clearance discount at counter"
                          >
                            Push Sale (FEFO)
                          </button>
                          <button
                            onClick={() => setActiveModal('stock_adjust')}
                            className="p-1 rounded-xl bg-[#EFF5F1] hover:bg-[#D0E2D7] text-[#6E7B74] hover:text-[#1A1A1A]"
                            title="Write-off / RTV Adjustment"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        filteredItems.length === 0 ? (
          <div className="py-12 px-4 text-center bg-[#F9FBF9] rounded-2xl border border-dashed border-[#CCD8D0]">
            <Boxes className="w-8 h-8 text-[#8C9C93] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-[#1A1A1A]">No SKUs Match Filter</p>
            <p className="text-xs text-[#6E7B74] mt-1 max-w-sm mx-auto">
              No inventory items found matching the current velocity or stock criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5ECE7] text-[#7A8B82] font-semibold">
                  <th className="py-2.5 px-3">Item & Category</th>
                  <th className="py-2.5 px-3">Current Stock</th>
                  <th className="py-2.5 px-3">Reorder Threshold</th>
                  <th className="py-2.5 px-3">Unit MRP</th>
                  <th className="py-2.5 px-3">Velocity / Status</th>
                  <th className="py-2.5 px-3">Supplier Partner</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F5F2]">
                {filteredItems.map((item) => {
                  const isBelowReorder = item.stockQty <= item.reorderLevel;
                  return (
                    <tr key={item.id} className="hover:bg-[#F9FBF9] transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#1A1A1A]">{item.name}</div>
                        <div className="text-[10px] text-[#7A8B82]">{item.sku} • Rack: {item.rackLocation}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`font-extrabold text-sm ${isBelowReorder ? 'text-[#D92D20]' : 'text-[#1A1A1A]'}`}>
                          {item.stockQty} {item.unit}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-[#54625A]">
                        {item.reorderLevel} {item.unit}
                        <span className="text-[10px] text-[#8C9C93] block">(Suggest: +{item.suggestedReorderQty})</span>
                      </td>

                      <td className="py-3 px-3 font-bold text-[#1A1A1A]">
                        ₹{item.unitPrice.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            item.velocity === 'fast'
                              ? 'bg-[#E0EAE4] text-[#079455]'
                              : item.velocity === 'slow'
                              ? 'bg-[#FEE4E2] text-[#D92D20]'
                              : 'bg-[#EFF5F1] text-[#55635C]'
                          }`}
                        >
                          {item.velocity} velocity
                        </span>
                        {item.daysWithoutMovement && (
                          <span className="text-[10px] text-[#8C9C93] block">{item.daysWithoutMovement}d idle</span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-medium text-[#404D46] truncate max-w-[160px]">
                        {item.supplierName}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setActiveModal('create_po')}
                          className="px-3 py-1 rounded-xl bg-[#1A1A1A] hover:bg-black text-white text-xs font-bold transition-all shadow-2xs"
                        >
                          + Create PO
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Footer CTA */}
      <div className="mt-4 pt-3 border-t border-[#F0F5F2] flex items-center justify-between">
        <div className="text-xs text-[#6E7B74]">
          FEFO Policy Active: Warehouse picking slips automatically recommend earliest expiry batches first.
        </div>
        <button
          onClick={() => setActiveView('inventory_fefo')}
          className="text-xs font-bold text-[#079455] hover:underline flex items-center gap-1"
        >
          <span>Open Full Warehouse Catalog</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
