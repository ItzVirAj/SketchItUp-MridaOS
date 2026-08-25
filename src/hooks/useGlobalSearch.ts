import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { searchApi, SearchResultItem } from '../lib/api';
import { useApp } from '../context/AppContext';

export interface GroupedSearchResults {
  items: SearchResultItem[];
  batches: SearchResultItem[];
  customers: SearchResultItem[];
  suppliers: SearchResultItem[];
  purchaseOrders: SearchResultItem[];
  sales: SearchResultItem[];
  compliance: SearchResultItem[];
  plantCare: SearchResultItem[];
}

export const useGlobalSearch = (isOpen: boolean) => {
  const {
    inventory,
    khataLedger,
    sales,
    purchaseOrders,
    licenses,
    plantCareTasks,
    userProfile,
  } = useApp();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 30-second in-memory cache
  const cacheRef = useRef<Map<string, { data: SearchResultItem[]; timestamp: number }>>(new Map());
  const debounceTimerRef = useRef<number | null>(null);

  // Client-side fallback search across AppContext state
  const clientFallbackSearch = useCallback(
    (q: string): SearchResultItem[] => {
      const lower = q.toLowerCase();
      const role = userProfile?.role || 'counter_staff';
      const canSeeSuppliersAndPOs = ['procurement_user', 'inventory_manager', 'admin', 'owner'].includes(role);
      const canSeeCompliance = ['owner', 'admin', 'accounts_user'].includes(role);

      const localResults: SearchResultItem[] = [];

      // 1. Items & Batches
      (inventory || []).forEach((item) => {
        const matchesItem =
          item.name.toLowerCase().includes(lower) ||
          item.sku.toLowerCase().includes(lower) ||
          item.category.toLowerCase().includes(lower) ||
          (item.supplierName && item.supplierName.toLowerCase().includes(lower));

        const isNursery = item.category === 'Plant/Sapling' || item.category === 'Pot & Soil';
        const isLowStock = item.stockQty <= item.reorderLevel;

        if (matchesItem) {
          localResults.push({
            entity_type: isNursery ? 'item_nursery' : 'item_fertilizer',
            id: item.id,
            display_name: item.name,
            meta: {
              code: item.sku,
              stock_level: item.stockQty,
              unit: item.unit,
              status: isLowStock ? 'low_stock' : 'in_stock',
              rack: item.rackLocation,
              category: item.category,
            },
            url: isNursery ? '/nursery' : '/inventory',
          });
        }

        // Batches
        (item.batches || []).forEach((b) => {
          if (b.batchNumber?.toLowerCase().includes(lower) || item.name.toLowerCase().includes(lower)) {
            const daysRemaining = Number(b.daysRemaining) || 0;
            localResults.push({
              entity_type: 'batch',
              id: `${item.id}-${b.batchNumber}`,
              display_name: `Lot ${b.batchNumber} (${item.name})`,
              meta: {
                batch_number: b.batchNumber,
                item_name: item.name,
                expiry_date: b.expiryDate,
                days_remaining: daysRemaining,
                is_critical_expiry: daysRemaining <= 30,
                quantity: b.quantity,
                unit: item.unit,
                rack: b.rack,
              },
              url: '/inventory',
            });
          }
        });
      });

      // 2. Customers
      (khataLedger || []).forEach((c) => {
        if (
          c.name.toLowerCase().includes(lower) ||
          (c.phone && c.phone.toLowerCase().includes(lower)) ||
          (c.village && c.village.toLowerCase().includes(lower))
        ) {
          const daysOverdue = Number(c.daysOverdue) || 0;
          let aging = 'current';
          if (daysOverdue > 60) aging = '>60d';
          else if (daysOverdue > 30) aging = '30-60d';

          localResults.push({
            entity_type: 'customer',
            id: c.id,
            display_name: c.name,
            meta: {
              phone: c.phone,
              village: c.village,
              khata_balance: c.outstandingBalance,
              aging_bucket: aging,
              days_overdue: daysOverdue,
              status: c.status,
            },
            url: '/khata',
          });
        }
      });

      // 3. Suppliers & POs
      if (canSeeSuppliersAndPOs) {
        (purchaseOrders || []).forEach((po) => {
          if (
            po.poNumber.toLowerCase().includes(lower) ||
            po.supplierName.toLowerCase().includes(lower)
          ) {
            localResults.push({
              entity_type: 'purchase_order',
              id: po.id,
              display_name: `PO #${po.poNumber}`,
              meta: {
                po_number: po.poNumber,
                supplier_name: po.supplierName,
                status: po.status,
                total_amount: po.totalAmount,
                expected_delivery: po.expectedDelivery,
              },
              url: '/procurement',
            });
          }
        });
      }

      // 4. Sales
      (sales || []).forEach((s) => {
        if (
          s.invoiceNo.toLowerCase().includes(lower) ||
          s.customerName.toLowerCase().includes(lower)
        ) {
          localResults.push({
            entity_type: 'sale',
            id: s.id,
            display_name: `Invoice #${s.invoiceNo}`,
            meta: {
              invoice_no: s.invoiceNo,
              customer_name: s.customerName,
              date: s.date,
              total: s.total,
              payment_mode: s.paymentMode,
              is_khata: s.isKhata,
            },
            url: '/sales-pos',
          });
        }
      });

      // 5. Compliance
      if (canSeeCompliance) {
        (licenses || []).forEach((lic) => {
          if (
            lic.name.toLowerCase().includes(lower) ||
            (lic.licenseNumber && lic.licenseNumber.toLowerCase().includes(lower)) ||
            (lic.authority && lic.authority.toLowerCase().includes(lower))
          ) {
            const daysRemaining = Number(lic.daysRemaining) || 0;
            localResults.push({
              entity_type: 'compliance_license',
              id: lic.id,
              display_name: lic.name,
              meta: {
                license_number: lic.licenseNumber,
                authority: lic.authority,
                expiry_date: lic.expiryDate,
                days_remaining: daysRemaining,
                is_critical: daysRemaining <= 30,
                status: lic.status,
              },
              url: '/compliance',
            });
          }
        });
      }

      // 6. Plant Care
      (plantCareTasks || []).forEach((task) => {
        if (
          task.title.toLowerCase().includes(lower) ||
          task.section.toLowerCase().includes(lower) ||
          task.plantType.toLowerCase().includes(lower)
        ) {
          localResults.push({
            entity_type: 'plant_care_task',
            id: task.id,
            display_name: task.title,
            meta: {
              section: task.section,
              plant_type: task.plantType,
              category: task.category,
              is_completed: task.isCompleted,
              time_slot: task.timeSlot,
            },
            url: '/nursery',
          });
        }
      });

      return localResults.slice(0, 30);
    },
    [inventory, khataLedger, sales, purchaseOrders, licenses, plantCareTasks, userProfile]
  );

  // Debounced search trigger
  useEffect(() => {
    const trimmed = query.trim().toLowerCase();

    if (!isOpen || trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      setSelectedIndex(0);
      return;
    }

    // Check cache
    const cached = cacheRef.current.get(trimmed);
    const now = Date.now();
    if (cached && now - cached.timestamp < 30000) {
      setResults(cached.data);
      setIsLoading(false);
      setSelectedIndex(0);
      return;
    }

    setIsLoading(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        const res = await searchApi.query(trimmed, 35);
        if (res.data?.results && res.data.results.length > 0) {
          setResults(res.data.results);
          cacheRef.current.set(trimmed, { data: res.data.results, timestamp: Date.now() });
        } else {
          // Fallback to client-side search
          const fallback = clientFallbackSearch(trimmed);
          setResults(fallback);
          cacheRef.current.set(trimmed, { data: fallback, timestamp: Date.now() });
        }
      } catch {
        const fallback = clientFallbackSearch(trimmed);
        setResults(fallback);
      } finally {
        setIsLoading(false);
        setSelectedIndex(0);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, isOpen, clientFallbackSearch]);

  // Group results by entity
  const groupedResults = useMemo<GroupedSearchResults>(() => {
    const groups: GroupedSearchResults = {
      items: [],
      batches: [],
      customers: [],
      suppliers: [],
      purchaseOrders: [],
      sales: [],
      compliance: [],
      plantCare: [],
    };

    results.forEach((item) => {
      if (item.entity_type === 'item_fertilizer' || item.entity_type === 'item_nursery') {
        groups.items.push(item);
      } else if (item.entity_type === 'batch') {
        groups.batches.push(item);
      } else if (item.entity_type === 'customer') {
        groups.customers.push(item);
      } else if (item.entity_type === 'supplier') {
        groups.suppliers.push(item);
      } else if (item.entity_type === 'purchase_order') {
        groups.purchaseOrders.push(item);
      } else if (item.entity_type === 'sale') {
        groups.sales.push(item);
      } else if (item.entity_type === 'compliance_license') {
        groups.compliance.push(item);
      } else if (item.entity_type === 'plant_care_task') {
        groups.plantCare.push(item);
      }
    });

    return groups;
  }, [results]);

  // Flattened ordered list for sequential keyboard navigation
  const flatResults = useMemo(() => {
    return [
      ...groupedResults.items,
      ...groupedResults.batches,
      ...groupedResults.customers,
      ...groupedResults.sales,
      ...groupedResults.purchaseOrders,
      ...groupedResults.suppliers,
      ...groupedResults.plantCare,
      ...groupedResults.compliance,
    ];
  }, [groupedResults]);

  const moveNext = useCallback(() => {
    setSelectedIndex((prev) => (flatResults.length > 0 ? (prev + 1) % flatResults.length : 0));
  }, [flatResults.length]);

  const movePrev = useCallback(() => {
    setSelectedIndex((prev) => (flatResults.length > 0 ? (prev - 1 + flatResults.length) % flatResults.length : 0));
  }, [flatResults.length]);

  return {
    query,
    setQuery,
    results,
    flatResults,
    groupedResults,
    isLoading,
    selectedIndex,
    setSelectedIndex,
    moveNext,
    movePrev,
  };
};
