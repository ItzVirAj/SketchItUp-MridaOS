import React, { useEffect, useRef } from 'react';
import { useGlobalSearch, GroupedSearchResults } from '../hooks/useGlobalSearch';
import { useApp } from '../context/AppContext';
import {
  Search,
  X,
  Boxes,
  Sprout,
  User,
  Truck,
  FileText,
  Receipt,
  ShieldCheck,
  Clock,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  Command,
  CornerDownLeft,
  ChevronRight,
  IndianRupee,
  Layers,
} from 'lucide-react';
import { SearchResultItem } from '../lib/api';

interface SearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchPalette: React.FC<SearchPaletteProps> = ({ isOpen, onClose }) => {
  const { setActiveView } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const {
    query,
    setQuery,
    flatResults,
    groupedResults,
    isLoading,
    selectedIndex,
    setSelectedIndex,
    moveNext,
    movePrev,
  } = useGlobalSearch(isOpen);

  // Autofocus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
    }
  }, [isOpen, setQuery]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveNext();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      movePrev();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatResults[selectedIndex]) {
        handleSelectResult(flatResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const activeEl = listContainerRef.current?.querySelector('[data-selected="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Navigate to URL and close palette
  const handleSelectResult = (item: SearchResultItem) => {
    onClose();
    const cleanUrl = item.url.replace(/^\//, '');
    setActiveView(cleanUrl);
  };

  if (!isOpen) return null;

  const hasQuery = query.trim().length >= 2;
  const hasResults = flatResults.length > 0;

  let runningIndex = -1;

  const renderEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'item_fertilizer':
        return <Boxes className="w-4 h-4 text-[#079455]" />;
      case 'item_nursery':
        return <Sprout className="w-4 h-4 text-[#12B76A]" />;
      case 'batch':
        return <Layers className="w-4 h-4 text-[#F79009]" />;
      case 'customer':
        return <User className="w-4 h-4 text-[#7A5AF8]" />;
      case 'supplier':
        return <Truck className="w-4 h-4 text-[#067A46]" />;
      case 'purchase_order':
        return <FileText className="w-4 h-4 text-[#0284C7]" />;
      case 'sale':
        return <Receipt className="w-4 h-4 text-[#079455]" />;
      case 'compliance_license':
        return <ShieldCheck className="w-4 h-4 text-[#E04F16]" />;
      case 'plant_care_task':
        return <Clock className="w-4 h-4 text-[#35C56E]" />;
      default:
        return <Search className="w-4 h-4 text-[#6E7B74]" />;
    }
  };

  const renderGroup = (title: string, items: SearchResultItem[], icon: React.ReactNode) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#6E7B74]">
          {icon}
          <span>{title}</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#E0EAE4] text-[#1A1A1A]">
            {items.length}
          </span>
        </div>

        <div className="flex flex-col gap-1.5 mt-1">
          {items.map((item) => {
            runningIndex++;
            const itemIndex = runningIndex;
            const isSelected = itemIndex === selectedIndex;

            return (
              <div
                key={`${item.entity_type}-${item.id}`}
                role="option"
                aria-selected={isSelected}
                data-selected={isSelected}
                onClick={() => handleSelectResult(item)}
                onMouseEnter={() => setSelectedIndex(itemIndex)}
                className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#079455]/10 border border-[#079455]/40 shadow-xs'
                    : 'bg-[#FDFEFE] hover:bg-[#F6F8F6] border border-[#E2EAE5]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                      isSelected ? 'bg-[#079455] text-white scale-105' : 'bg-[#E0EAE4]/60 text-[#1A1A1A]'
                    }`}
                  >
                    {renderEntityIcon(item.entity_type)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-[#1A1A1A] truncate group-hover:text-[#079455] transition-colors">
                        {item.display_name}
                      </span>

                      {/* Item Badges */}
                      {item.meta.code && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#F4EDDE] text-[#6E7B74]">
                          {item.meta.code}
                        </span>
                      )}

                      {item.meta.status === 'low_stock' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FEF3F2] text-[#D92D20] border border-[#FECDCA]">
                          Low Stock
                        </span>
                      )}

                      {item.meta.is_critical_expiry && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FEF3F2] text-[#D92D20] border border-[#FECDCA] flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>Expiring &lt;30d</span>
                        </span>
                      )}
                    </div>

                    {/* Secondary Meta Info */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#6E7B74] mt-0.5">
                      {item.meta.stock_level !== undefined && (
                        <span>Stock: <strong className="text-[#1A1A1A]">{item.meta.stock_level} {item.meta.unit || 'units'}</strong></span>
                      )}

                      {item.meta.rack && <span>• Rack: {item.meta.rack}</span>}

                      {item.meta.phone && <span>• Phone: {item.meta.phone}</span>}

                      {item.meta.khata_balance !== undefined && item.meta.khata_balance > 0 && (
                        <span className="flex items-center gap-1">
                          • Khata Due:{' '}
                          <strong
                            className={`font-bold ${
                              item.meta.aging_bucket === '>60d'
                                ? 'text-[#D92D20]'
                                : item.meta.aging_bucket === '30-60d'
                                ? 'text-[#F79009]'
                                : 'text-[#079455]'
                            }`}
                          >
                            ₹{Number(item.meta.khata_balance).toLocaleString('en-IN')}
                          </strong>
                        </span>
                      )}

                      {item.meta.total_amount !== undefined && (
                        <span>• Value: <strong className="text-[#1A1A1A]">₹{Number(item.meta.total_amount).toLocaleString('en-IN')}</strong></span>
                      )}

                      {item.meta.total !== undefined && (
                        <span>• Bill: <strong className="text-[#1A1A1A]">₹{Number(item.meta.total).toLocaleString('en-IN')}</strong></span>
                      )}

                      {item.meta.section && <span>• {item.meta.section} ({item.meta.plant_type})</span>}

                      {item.meta.expiry_date && (
                        <span>• Expiry: {item.meta.expiry_date} ({item.meta.days_remaining}d left)</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <div
                    className={`p-1.5 rounded-lg text-xs transition-opacity ${
                      isSelected ? 'opacity-100 bg-[#079455] text-white' : 'opacity-0 group-hover:opacity-100 text-[#6E7B74]'
                    }`}
                  >
                    <CornerDownLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-title"
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3.5 sm:px-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#FDFEFE] rounded-3xl border border-[#E2EAE5] shadow-2xl overflow-hidden flex flex-col max-h-[82vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Input */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-[#E2EAE5] bg-white">
          <Search className="w-5 h-5 text-[#079455] shrink-0 mr-3" />
          <input
            ref={inputRef}
            id="search-title"
            aria-label="Global search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items, batches, customers, invoices, POs, licenses..."
            className="w-full bg-transparent text-sm sm:text-base font-medium text-[#1A1A1A] placeholder:text-[#8E9B94] focus:outline-none"
          />

          <div className="flex items-center gap-2 shrink-0 ml-2">
            {isLoading && (
              <div className="w-4 h-4 border-2 border-[#079455] border-t-transparent rounded-full animate-spin mr-1" />
            )}

            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded-lg text-[#6E7B74] hover:text-[#1A1A1A] hover:bg-[#E0EAE4]/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold font-mono text-[#6E7B74] bg-[#F4EDDE] border border-[#CCD8D1] rounded-lg shadow-2xs">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results Container */}
        <div ref={listContainerRef} role="listbox" className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {/* 1. Empty Query State: Suggestions */}
          {!hasQuery && (
            <div className="py-6 px-2 text-left">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#6E7B74] mb-3">
                <Sparkles className="w-4 h-4 text-[#079455]" />
                <span>Suggested Shortcuts & Quick Queries</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {[
                  'NPK 19:19:19',
                  'Tomato Sapling',
                  'Ramesh Patil',
                  'PO-2026',
                  'Bay 01',
                  'Urea 46%',
                  'Insecticide License',
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="px-3 py-1.5 rounded-xl bg-[#F4EDDE] hover:bg-[#E0EAE4] text-xs font-bold text-[#1A1A1A] border border-[#CCD8D1] transition-colors flex items-center gap-1.5"
                  >
                    <Search className="w-3 h-3 text-[#079455]" />
                    <span>{s}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs text-[#6E7B74] border-t border-[#E2EAE5] pt-4">
                <div className="p-2 rounded-xl bg-[#F6F8F6]">
                  <Boxes className="w-4 h-4 text-[#079455] mx-auto mb-1" />
                  <span>Fertilizers</span>
                </div>
                <div className="p-2 rounded-xl bg-[#F6F8F6]">
                  <Sprout className="w-4 h-4 text-[#12B76A] mx-auto mb-1" />
                  <span>Nursery</span>
                </div>
                <div className="p-2 rounded-xl bg-[#F6F8F6]">
                  <User className="w-4 h-4 text-[#7A5AF8] mx-auto mb-1" />
                  <span>Khata Ledger</span>
                </div>
                <div className="p-2 rounded-xl bg-[#F6F8F6]">
                  <Receipt className="w-4 h-4 text-[#0284C7] mx-auto mb-1" />
                  <span>Invoices</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. No Results State */}
          {hasQuery && !isLoading && !hasResults && (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#FEF3F2] border border-[#FECDCA] text-[#D92D20] flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#1A1A1A]">No results found for "{query}"</h3>
              <p className="text-xs text-[#6E7B74] mt-1 max-w-sm mx-auto">
                Check for spelling mistakes or try searching by SKU, farmer name, PO number, or batch lot.
              </p>
            </div>
          )}

          {/* 3. Grouped Results List */}
          {hasQuery && hasResults && (
            <>
              {renderGroup('Fertilizer & Nursery Items', groupedResults.items, <Boxes className="w-3.5 h-3.5 text-[#079455]" />)}
              {renderGroup('Batches & Lots', groupedResults.batches, <Layers className="w-3.5 h-3.5 text-[#F79009]" />)}
              {renderGroup('Customers & Khata', groupedResults.customers, <User className="w-3.5 h-3.5 text-[#7A5AF8]" />)}
              {renderGroup('Sales Invoices', groupedResults.sales, <Receipt className="w-3.5 h-3.5 text-[#079455]" />)}
              {renderGroup('Purchase Orders', groupedResults.purchaseOrders, <FileText className="w-3.5 h-3.5 text-[#0284C7]" />)}
              {renderGroup('Suppliers & Vendors', groupedResults.suppliers, <Truck className="w-3.5 h-3.5 text-[#067A46]" />)}
              {renderGroup('Plant Care Tasks', groupedResults.plantCare, <Clock className="w-3.5 h-3.5 text-[#35C56E]" />)}
              {renderGroup('Statutory Compliance', groupedResults.compliance, <ShieldCheck className="w-3.5 h-3.5 text-[#E04F16]" />)}
            </>
          )}
        </div>

        {/* Footer Shortcut Legend */}
        <div className="px-4 py-2.5 border-t border-[#E2EAE5] bg-[#F6F8F6] flex flex-wrap items-center justify-between text-[11px] text-[#6E7B74]">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#CCD8D1] font-mono text-[10px] font-bold text-[#1A1A1A]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#CCD8D1] font-mono text-[10px] font-bold text-[#1A1A1A]">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#CCD8D1] font-mono text-[10px] font-bold text-[#1A1A1A]">↵</kbd>
              <span>to select</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span>MridaOS Unified Search</span>
          </div>
        </div>
      </div>
    </div>
  );
};
