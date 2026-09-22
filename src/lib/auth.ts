import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { UserSession } from '@/types';

const COOKIE_NAME = 'hrms_session';
const JWT_SECRET_STRING = process.env.JWT_SECRET || 'fallback-secret-key-for-development-only-32bytes';

function getJwtSecretKey() {
  return new TextEncoder().encode(JWT_SECRET_STRING);
}

/**
 * Signs a JWT session token containing minimal user session claims.
 */
export async function createSessionToken(payload: UserSession): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getJwtSecretKey());
}

/**
 * Verifies and decodes an hrms_session JWT token.
 * Returns UserSession if valid, null if invalid or expired.
 */
export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), {
      algorithms: ['HS256'],
    });

    return {
      id: payload.id as string,
      email: payload.email as string,
      role: payload.role as any,
      employeeId: payload.employeeId as string,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Sets the HttpOnly hrms_session cookie in response headers.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

/**
 * Clears the hrms_session cookie.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Retrieves the current authenticated user session from request cookies.
 */
export async function getSessionUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

/**
 * Server Helper: Asserts authentication. Returns user session or throws 401.
 */
export async function requireAuth(): Promise<UserSession> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

/**
 * Hashes a plaintext password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

/**
 * Compares a plaintext password against a bcrypt hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
