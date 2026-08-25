import { corsHeaders } from './cors.ts';

export interface ApiResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: any;
}

export const successResponse = (
  data: any,
  meta: ApiResponseMeta | null = null,
  status = 200
): Response => {
  return new Response(
    JSON.stringify({
      data,
      error: null,
      meta,
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
};

export const errorResponse = (
  code: string,
  message: string,
  status = 400,
  details: any = null
): Response => {
  return new Response(
    JSON.stringify({
      data: null,
      error: {
        code,
        message,
        details,
      },
      meta: null,
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
};
