import { errorResponse } from './response.ts';

export const parsePaginationParams = (url: URL): { page: number; limit: number; offset: number } => {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const rawLimit = parseInt(url.searchParams.get('limit') || '20', 10);
  const limit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

export const validateRequiredFields = (
  body: Record<string, any>,
  requiredFields: string[]
): { valid: boolean; missingField?: string } => {
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return { valid: false, missingField: field };
    }
  }
  return { valid: true };
};
