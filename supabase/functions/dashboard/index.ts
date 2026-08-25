import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser } from '../_shared/auth.ts';
import { parsePaginationParams } from '../_shared/validation.ts';

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  const { user, error: authError, client } = await authenticateUser(req);
  if (authError) return authError;
  if (!user) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  if (method !== 'GET') {
    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /dashboard`, 405);
  }

  try {
    // ------------------------------------------------------------------------
    // 1. GET /dashboard/metrics (MetricCards.tsx)
    // ------------------------------------------------------------------------
    if (path.includes('/metrics')) {
      const [
        { data: sales },
        { data: khata },
        { data: inventory },
        { data: pos },
        { data: careTasks },
        { data: mortality },
      ] = await Promise.all([
        client.from('sales').select('total, cash_paid, khata_amount, date'),
        client.from('khata_ledger').select('outstanding_balance, total_purchased, days_overdue'),
        client.from('inventory').select('stock_qty, cost_price, reorder_level, batches'),
        client.from('purchase_orders').select('total_amount, status'),
        client.from('plant_care_tasks').select('is_completed'),
        client.from('mortality_records').select('quantity_lost'),
      ]);

      const safeSales = sales || [];
      const safeKhata = khata || [];
      const safeInventory = inventory || [];
      const safePOs = pos || [];
      const safeCare = careTasks || [];
      const safeMort = mortality || [];

      // Calculations
      const todayDateStr = new Date().toISOString().split('T')[0];
      const todaySalesList = safeSales.filter((s: any) => s.date === todayDateStr || !s.date);
      const todayGross = todaySalesList.reduce((sum: number, s: any) => sum + (Number(s.total) || 0), 0);
      const todayCash = todaySalesList.reduce((sum: number, s: any) => sum + (Number(s.cash_paid) || 0), 0);
      const todayKhata = todaySalesList.reduce((sum: number, s: any) => sum + (Number(s.khata_amount) || 0), 0);

      const totalOutstanding = safeKhata.reduce((sum: number, k: any) => sum + (Number(k.outstanding_balance) || 0), 0);
      const totalPurchasedAll = safeKhata.reduce((sum: number, k: any) => sum + (Number(k.total_purchased) || 0), 0);
      const overdue60d = safeKhata.filter((k: any) => (k.days_overdue || 0) > 60).reduce((sum: number, k: any) => sum + (Number(k.outstanding_balance) || 0), 0);

      const totalInventoryVal = safeInventory.reduce((sum: number, i: any) => sum + (Number(i.stock_qty) || 0) * (Number(i.cost_price) || 0), 0);
      const lowStockCount = safeInventory.filter((i: any) => (Number(i.stock_qty) || 0) <= (Number(i.reorder_level) || 0)).length;

      let expiringSoonCount = 0;
      safeInventory.forEach((item: any) => {
        (item.batches || []).forEach((b: any) => {
          if ((b.daysRemaining || 0) <= 30) expiringSoonCount++;
        });
      });

      const openPOs = safePOs.filter((p: any) => p.status !== 'received');
      const totalOpenPOVal = openPOs.reduce((sum: number, p: any) => sum + (Number(p.total_amount) || 0), 0);

      const totalTasks = safeCare.length;
      const completedTasks = safeCare.filter((t: any) => t.is_completed).length;
      const taskPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
      const totalMortalityUnits = safeMort.reduce((sum: number, m: any) => sum + (Number(m.quantity_lost) || 0), 0);

      return successResponse({
        sales: {
          todayGross,
          todayCash,
          todayKhata,
          transactionCount: todaySalesList.length,
          cashPercentage: todayGross > 0 ? Math.round((todayCash / todayGross) * 100) : 100,
        },
        khata: {
          totalOutstanding,
          overdue60d,
          recoveryRatePct: totalPurchasedAll > 0 ? Math.max(0, Math.min(100, Math.round(((totalPurchasedAll - totalOutstanding) / totalPurchasedAll) * 100))) : 100,
        },
        inventory: {
          totalValuation: totalInventoryVal,
          lowStockCount,
          expiringSoonBatchesCount: expiringSoonCount,
        },
        procurement: {
          openPurchaseOrdersCount: openPOs.length,
          openPipelineValue: totalOpenPOVal,
        },
        nursery: {
          tasksTotal: totalTasks,
          tasksCompleted: completedTasks,
          completionPercentage: taskPercentage,
          mortalityUnitsLost: totalMortalityUnits,
        },
      });
    }

    // ------------------------------------------------------------------------
    // 2. GET /dashboard/alerts (ActionRequired.tsx)
    // ------------------------------------------------------------------------
    if (path.includes('/alerts')) {
      const { data: alerts, error } = await client
        .from('operational_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return errorResponse('DATABASE_ERROR', error.message, 500);

      return successResponse(alerts || []);
    }

    // ------------------------------------------------------------------------
    // 3. GET /dashboard/sales-analytics (SalesAnalytics.tsx)
    // ------------------------------------------------------------------------
    if (path.includes('/sales-analytics')) {
      const range = url.searchParams.get('range') || 'today';
      const { data: sales } = await client.from('sales').select('*').order('created_at', { ascending: false });
      const safeSales = sales || [];

      const totalSales = safeSales.reduce((sum: number, s: any) => sum + (Number(s.total) || 0), 0);
      const totalCash = safeSales.reduce((sum: number, s: any) => sum + (Number(s.cash_paid) || 0), 0);
      const totalKhata = safeSales.reduce((sum: number, s: any) => sum + (Number(s.khata_amount) || 0), 0);

      return successResponse({
        range,
        totalSales,
        totalCash,
        totalKhata,
        estimatedGrossMargin: Math.round(totalSales * 0.172),
        cashRealizationPct: totalSales > 0 ? Math.round((totalCash / totalSales) * 1000) / 10 : 100,
        salesCount: safeSales.length,
        averageTicketSize: safeSales.length > 0 ? Math.round(totalSales / safeSales.length) : 0,
      });
    }

    // ------------------------------------------------------------------------
    // 4. GET /dashboard/inventory-intelligence (InventoryIntelligence.tsx)
    // ------------------------------------------------------------------------
    if (path.includes('/inventory-intelligence')) {
      const { data: items } = await client.from('inventory').select('*');
      const safeItems = items || [];

      const fastMoving = safeItems.filter((i: any) => i.velocity === 'fast');
      const slowMoving = safeItems.filter((i: any) => i.velocity === 'slow');
      const lowStock = safeItems.filter((i: any) => (Number(i.stock_qty) || 0) <= (Number(i.reorder_level) || 0));

      const batchesExpiring30d: any[] = [];
      safeItems.forEach((i: any) => {
        (i.batches || []).forEach((b: any) => {
          if ((b.daysRemaining || 0) <= 30) {
            batchesExpiring30d.push({
              itemId: i.id,
              name: i.name,
              batchNumber: b.batchNumber,
              daysRemaining: b.daysRemaining,
              quantity: b.quantity,
              unit: i.unit,
            });
          }
        });
      });

      return successResponse({
        totalSKUs: safeItems.length,
        fastMovingSKUsCount: fastMoving.length,
        slowMovingSKUsCount: slowMoving.length,
        lowStockSKUsCount: lowStock.length,
        fefoExpiringBatches: batchesExpiring30d,
      });
    }

    // ------------------------------------------------------------------------
    // 5. GET /dashboard/seasonal-intelligence (SeasonalIntelligence.tsx)
    // ------------------------------------------------------------------------
    if (path.includes('/seasonal-intelligence')) {
      const { data: insight } = await client
        .from('seasonal_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return successResponse(insight || {
        seasonName: 'Kharif Sowing 2026',
        currentPhase: 'Late Sowing & Vegetative Growth Phase',
        weatherCondition: 'Humid, 28°C • Monsoon Showers Anticipated',
        highDemandProducts: [
          { name: 'NPK 19:19:19 Foliar Grade', expectedSurge: '+42% Surge', stockStatus: 'adequate', category: 'Fertilizer' },
          { name: 'Chlorpyrifos 20% EC', expectedSurge: '+35% Surge', stockStatus: 'needs_procurement', category: 'Pesticide' },
        ],
        strategicAdvice: 'Prioritize water-soluble foliar nutrients and prophylactic fungicide spray batches before monsoon peak.',
      });
    }

    // ------------------------------------------------------------------------
    // 6. GET /dashboard/activity-log (ComplianceAndActivity.tsx)
    // ------------------------------------------------------------------------
    if (path.includes('/activity-log')) {
      const { page, limit, offset } = parsePaginationParams(url);
      const tag = url.searchParams.get('tag');

      let query = client.from('activity_logs').select('*', { count: 'exact' });
      if (tag) query = query.eq('tag', tag);

      const { data, count, error } = await query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) return errorResponse('DATABASE_ERROR', error.message, 500);

      return successResponse(data || [], {
        page,
        limit,
        total: count || (data || []).length,
      });
    }

    // ------------------------------------------------------------------------
    // 7. GET /dashboard/sensors (NurseryCameraAndSensors.tsx)
    // ------------------------------------------------------------------------
    if (path.includes('/sensors')) {
      const { data: sensors, error } = await client.from('nursery_sensors').select('*').order('created_at', { ascending: true });
      if (error) return errorResponse('DATABASE_ERROR', error.message, 500);

      return successResponse(sensors || []);
    }

    return errorResponse('NOT_FOUND', `Dashboard route ${path} not found`, 404);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
