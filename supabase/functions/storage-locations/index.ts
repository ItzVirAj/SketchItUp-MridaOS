import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser, requireRoles } from '../_shared/auth.ts';

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const method = req.method;
  const { user, error: authError, client } = await authenticateUser(req);
  if (authError) return authError;
  if (!user) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    if (method === 'GET') {
      const { data: inventory } = await client.from('inventory').select('rack_location');
      const rackLocations = new Set<string>();
      (inventory || []).forEach((i: any) => i.rack_location && rackLocations.add(i.rack_location));

      const standardLocations = [
        { id: 'bay-01', code: 'Bay 01', name: 'Main Fertilizer Godown Bay 01', capacityPct: 78, type: 'godown' },
        { id: 'bay-02', code: 'Bay 02', name: 'Bio-Fertilizer Climate Bay 02', capacityPct: 45, type: 'godown' },
        { id: 'rack-a1', code: 'Rack A1', name: 'Chemical Pesticide Secure Cage A1', capacityPct: 62, type: 'rack' },
        { id: 'rack-b2', code: 'Rack B2', name: 'Seed Cold Storage Shelf B2', capacityPct: 84, type: 'rack' },
        { id: 'poly-03', code: 'Polyhouse 03', name: 'Greenhouse Bench Sector 08', capacityPct: 91, type: 'polyhouse' },
      ];

      return successResponse(standardLocations);
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /storage-locations`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
