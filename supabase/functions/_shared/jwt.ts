/**
 * Cryptographic JWT signing and verification library using standard Web Crypto API (HMAC-SHA256)
 */

const DEFAULT_JWT_SECRET = 'mridaos-enterprise-secure-jwt-secret-key-2026-sha256-super-secure!';

function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export interface CustomJwtPayload {
  sub: string;
  sessionId: string;
  email: string;
  fullName: string;
  role: string;
  branchId: string;
  iat: number;
  exp: number; // Exactly 15 minutes: iat + 900
}

/**
 * Sign a 15-minute custom JWT
 */
export async function signJwt(
  payload: Omit<CustomJwtPayload, 'iat' | 'exp'>,
  secret = DEFAULT_JWT_SECRET,
  expiresInSeconds = 900 // 15 minutes
): Promise<{ token: string; exp: number; iat: number }> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInSeconds;

  const fullPayload: CustomJwtPayload = {
    ...payload,
    iat: now,
    exp,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await getCryptoKey(secret);
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(dataToSign)
  );

  let binary = '';
  const bytes = new Uint8Array(signatureBytes);
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const encodedSignature = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return {
    token: `${dataToSign}.${encodedSignature}`,
    exp,
    iat: now,
  };
}

/**
 * Verify a custom JWT signature and check 15-minute expiration
 */
export async function verifyJwt(
  token: string,
  secret = DEFAULT_JWT_SECRET
): Promise<{ isValid: boolean; payload?: CustomJwtPayload; error?: string }> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { isValid: false, error: 'Invalid JWT format' };
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const dataToVerify = `${encodedHeader}.${encodedPayload}`;

    // Decode signature
    let base64Sig = encodedSignature.replace(/-/g, '+').replace(/_/g, '/');
    while (base64Sig.length % 4) {
      base64Sig += '=';
    }
    const sigBinary = atob(base64Sig);
    const sigBytes = new Uint8Array(sigBinary.length);
    for (let i = 0; i < sigBinary.length; i++) {
      sigBytes[i] = sigBinary.charCodeAt(i);
    }

    const key = await getCryptoKey(secret);
    const isSigValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(dataToVerify)
    );

    if (!isSigValid) {
      return { isValid: false, error: 'Invalid JWT cryptographic signature' };
    }

    const payload: CustomJwtPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    // 15-Minute Expiration Check
    if (payload.exp < now) {
      return { isValid: false, error: 'JWT token has expired (15-minute login window exceeded)' };
    }

    return { isValid: true, payload };
  } catch (err: any) {
    return { isValid: false, error: err.message || 'JWT verification failed' };
  }
}
