import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser, requireRoles } from '../_shared/auth.ts';
import { validateRequiredFields } from '../_shared/validation.ts';

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  const { user, error: authError, client } = await authenticateUser(req);
  if (authError) return authError;
  if (!user) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    const parts = path.split('/').filter(Boolean);
    const isAcknowledge = path.endsWith('/acknowledge');
    const isUpload = path.endsWith('/upload');

    // 1. PATCH /licenses/:id/acknowledge
    if (method === 'PATCH' && isAcknowledge) {
      const roleErr = requireRoles(user, ['owner', 'admin']);
      if (roleErr) return roleErr;

      const licId = parts[parts.length - 2];
      const body = await req.json().catch(() => ({}));

      const { data: updated, error } = await client
        .from('compliance_licenses')
        .update({
          status: 'valid',
          days_remaining: 365,
          issue_date: new Date().toISOString().split('T')[0],
          expiry_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
        })
        .eq('id', licId)
        .select()
        .single();

      if (error) return errorResponse('DATABASE_ERROR', error.message, 500);

      await client.from('activity_logs').insert({
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        action: 'Statutory License Renewed',
        details: `Acknowledged regulatory renewal for ${updated.name} (Lic #${updated.license_number})`,
        user_name: user.fullName,
        time: 'Just now',
        tag: 'compliance',
        reference_id: updated.license_number,
      });

      return successResponse(updated);
    }

    // 2. POST /licenses/:id/upload
    if (method === 'POST' && isUpload) {
      const roleErr = requireRoles(user, ['owner', 'admin']);
      if (roleErr) return roleErr;

      const licId = parts[parts.length - 2];
      const body = await req.json().catch(() => ({}));
      const docName = body.doc_name || 'Renewal_Certificate_2026.pdf';

      return successResponse({
        licenseId: licId,
        uploadedDocument: docName,
        fileUrl: `https://storage.mridaos.in/compliance/${licId}/${docName}`,
        status: 'verified',
      });
    }

    // 3. GET /licenses
    if (method === 'GET') {
      const status = url.searchParams.get('status');
      const expiringWithinDays = parseInt(url.searchParams.get('expiring_within_days') || '0', 10);

      let query = client.from('compliance_licenses').select('*');
      if (status) query = query.eq('status', status);

      const { data, error } = await query.order('days_remaining', { ascending: true });
      if (error) return errorResponse('DATABASE_ERROR', error.message, 500);

      let items = data || [];
      if (expiringWithinDays > 0) {
        items = items.filter((lic: any) => lic.days_remaining <= expiringWithinDays);
      }

      return successResponse(items);
    }

    // 4. POST /licenses (Create License)
    if (method === 'POST') {
      const roleErr = requireRoles(user, ['owner', 'admin']);
      if (roleErr) return roleErr;

      const body = await req.json();
      const validation = validateRequiredFields(body, ['name', 'authority', 'license_number', 'expiry_date']);
      if (!validation.valid) {
        return errorResponse('VALIDATION_ERROR', `Missing required field: ${validation.missingField}`, 400);
      }

      const daysRemaining = Math.max(0, Math.ceil((new Date(body.expiry_date).getTime() - Date.now()) / (1000 * 3600 * 24)));

      const newLicense = {
        id: body.id || `lic-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: body.name,
        authority: body.authority,
        license_number: body.license_number,
        issue_date: body.issue_date || new Date().toISOString().split('T')[0],
        expiry_date: body.expiry_date,
        days_remaining: daysRemaining,
        status: daysRemaining <= 0 ? 'expired' : daysRemaining <= 30 ? 'critical' : daysRemaining <= 60 ? 'renewal_due' : 'valid',
        required_documents: Array.isArray(body.required_documents) ? body.required_documents : ['Form A Application', 'NABL Lab Report'],
      };

      const { data, error } = await client.from('compliance_licenses').insert(newLicense).select().single();
      if (error) return errorResponse('DATABASE_ERROR', error.message, 400);

      return successResponse(data, null, 201);
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /licenses`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
