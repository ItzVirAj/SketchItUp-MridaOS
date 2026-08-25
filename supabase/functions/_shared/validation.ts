import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

/**
 * Standard HTTP 400 Validation Error Response with field-level mapping
 */
export function validationErrorResponse(fields: Record<string, string>, message = 'Invalid request data'): Response {
  return new Response(
    JSON.stringify({
      error: {
        code: 'VALIDATION_ERROR',
        message,
        fields,
      },
    }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Validate data against a Zod schema and format errors cleanly
 */
export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { data: T; error: null } | { data: null; error: Response } {
  const result = schema.safeParse(data);

  if (!result.success) {
    const fields: Record<string, string> = {};

    result.error.issues.forEach((issue) => {
      const fieldPath = issue.path.join('.') || 'root';
      fields[fieldPath] = issue.message;
    });

    return {
      data: null,
      error: validationErrorResponse(fields),
    };
  }

  return {
    data: result.data,
    error: null,
  };
}

// ==============================================================================
// 1. PRIMITIVE & FIELD VALIDATORS
// ==============================================================================

// RFC 5322 Email regex with lowercase transformation
export const zEmail = z
  .string({ required_error: 'Email is required' })
  .regex(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
    'Invalid email address format (RFC 5322 compliant email required)'
  )
  .transform((val) => val.toLowerCase().trim());

// Exact 36-char hyphenated UUID format
export const zUuid = z
  .string({ required_error: 'UUID is required' })
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'Must be a valid 36-character UUID with hyphens'
  );

// Positive bounded quantity (0 < qty <= 1,000,000)
export const zPositiveNumber = z
  .number({ required_error: 'Must be a number' })
  .positive('Must be a positive number greater than 0')
  .max(1000000, 'Exceeds maximum allowable value (1,000,000)');

// Non-negative price/amount (>= 0)
export const zNonNegativeNumber = z
  .number({ required_error: 'Must be a number' })
  .nonnegative('Cannot be negative')
  .max(100000000, 'Exceeds maximum allowable value (100,000,000)');

// Strict ISO 8601 Date
export const zIsoDate = z
  .string({ required_error: 'Date is required' })
  .regex(
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z?)?$/,
    'Must be a valid ISO 8601 date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)'
  );

// Sanitized search query (max 200 chars, special SQL injection chars stripped)
export const zSearchQuery = z
  .string()
  .max(200, 'Search query cannot exceed 200 characters')
  .transform((val) => val.replace(/['";\\%_]/g, ' ').trim());

// ==============================================================================
// 2. DOMAIN SCHEMAS
// ==============================================================================

// Sales / POS Checkout
export const CreateSaleSchema = z.object({
  customer_id: z.string().optional(),
  customer_name: z.string().min(1, 'Customer name is required').max(150),
  customer_phone: z.string().regex(/^\+?[0-9\s-]{7,15}$/, 'Invalid phone number').optional(),
  is_khata: z.boolean().default(false),
  items: z
    .array(
      z.object({
        item_id: z.string().min(1, 'Item ID required'),
        name: z.string().min(1),
        qty: zPositiveNumber,
        price: zNonNegativeNumber,
        batch: z.string().min(1, 'Batch/lot number required'),
      })
    )
    .min(1, 'At least one line item is required')
    .max(100, 'Maximum 100 items per invoice'),
  total: zNonNegativeNumber,
  cash_paid: zNonNegativeNumber.default(0),
  payment_mode: z.enum(['cash', 'upi', 'card', 'khata', 'split'], {
    errorMap: () => ({ message: 'Payment mode must be one of: cash, upi, card, khata, split' }),
  }),
});

// Purchase Orders
export const CreatePOSchema = z.object({
  supplier_name: z.string().min(1, 'Supplier name is required').max(150),
  expected_delivery: zIsoDate,
  payment_terms: z.string().max(100).default('Net 30'),
  notes: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        item_id: z.string().min(1),
        name: z.string().min(1),
        qty: zPositiveNumber,
        unit_price: zNonNegativeNumber,
        total: zNonNegativeNumber,
      })
    )
    .min(1, 'At least one line item is required')
    .max(100),
  total_amount: zNonNegativeNumber,
});

export const TransitionPOStatusSchema = z.object({
  status: z.enum(
    ['draft', 'pending_acknowledgement', 'dispatched', 'grn_pending', 'received'],
    { errorMap: () => ({ message: 'Invalid PO status' }) }
  ),
});

export const InwardGRNSchema = z.object({
  batches: z
    .array(
      z.object({
        item_id: z.string().min(1),
        batch_number: z.string().min(1, 'Batch lot number required').max(50),
        mfg_date: zIsoDate.optional(),
        expiry_date: zIsoDate.optional(),
        qty: zPositiveNumber,
        rack: z.string().max(50).default('Bay 01'),
      })
    )
    .min(1, 'At least one batch lot is required for inwarding'),
});

// Khata Payment
export const RecordPaymentSchema = z.object({
  customer_id: z.string().min(1, 'Customer ID is required'),
  amount: zPositiveNumber,
  payment_mode: z.enum(['cash', 'upi', 'card', 'bank_transfer', 'cheque']).default('cash'),
  notes: z.string().max(300).optional(),
});

// Inventory Item
export const CreateItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(150),
  sku: z.string().min(1, 'SKU is required').max(50),
  category: z.enum(
    ['Fertilizer', 'Bio-Fertilizer', 'Pesticide', 'Seeds', 'Plant/Sapling', 'Pot & Soil', 'Tools'],
    { errorMap: () => ({ message: 'Category must be one of: Fertilizer, Bio-Fertilizer, Pesticide, Seeds, Plant/Sapling, Pot & Soil, Tools' }) }
  ),
  stock_qty: zNonNegativeNumber.default(0),
  unit: z.string().min(1).max(30).default('bags'),
  reorder_level: zNonNegativeNumber.default(10),
  unit_price: zNonNegativeNumber,
  cost_price: zNonNegativeNumber,
  rack_location: z.string().max(50).default('Bay 01'),
  supplier_name: z.string().max(150).optional(),
});

// Stock Adjustments
export const StockAdjustSchema = z.object({
  item_id: z.string().min(1, 'Item ID required'),
  batch_id: z.string().min(1, 'Batch lot required'),
  variance_qty: z.number().refine((n) => n !== 0, 'Variance cannot be zero'),
  reason: z.string().min(1, 'Adjustment reason required').max(300),
});

// Plant Care Task
export const CreatePlantCareSchema = z.object({
  title: z.string().min(1, 'Task title required').max(150),
  category: z.enum(['Watering', 'Fertilizing', 'Pest Inspection', 'Pruning', 'Repotting'], {
    errorMap: () => ({ message: 'Invalid plant care category' }),
  }),
  section: z.string().min(1).max(100),
  time_slot: z.string().max(50).default('Morning (08:00 AM)'),
  plant_type: z.string().min(1).max(100),
  quantity: z.string().max(50).default('50 units'),
  notes: z.string().max(500).optional(),
});

// Plant Mortality
export const CreateMortalitySchema = z.object({
  plant_name: z.string().min(1).max(150),
  quantity_lost: zPositiveNumber,
  estimated_value: zNonNegativeNumber,
  reason: z.enum(
    ['Pest Infestation', 'Over-watering', 'Extreme Heat', 'Fungal Blight', 'Root Rot', 'Transit Damage'],
    { errorMap: () => ({ message: 'Invalid mortality reason' }) }
  ),
  section: z.string().min(1).max(100),
});

// Admin User Creation
export const CreateUserSchema = z.object({
  email: zEmail,
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  fullName: z.string().min(1, 'Full name is required').max(150),
  role: z.enum(
    ['owner', 'admin', 'inventory_manager', 'procurement_user', 'counter_staff', 'nursery_care_staff', 'accounts_user'],
    { errorMap: () => ({ message: 'Invalid user role' }) }
  ),
  branchId: z.string().max(50).default('nashik-central'),
});

// Password Reset Request
export const RequestPasswordResetSchema = z.object({
  email: zEmail,
});

// Password Reset Execution (Single-use token)
export const ResetPasswordSchema = z.object({
  token: z.string().min(16, 'Invalid token format'),
  new_password: z.string().min(6, 'New password must be at least 6 characters long'),
});

// Self-Service Change Password
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long'),
});
