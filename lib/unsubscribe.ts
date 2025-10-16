import crypto from 'crypto';
import { connectToDatabase } from '@/database/mongoose';
import { EmailSuppression } from '@/database/models/emailSuppression.model';

const getSecret = () => process.env.UNSUBSCRIBE_SECRET || process.env.BETTER_AUTH_SECRET || 'dev-secret';

const base64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const fromBase64url = (input: string) =>
  Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (input.length % 4)) % 4), 'base64');

export function signUnsubscribeToken(email: string): string {
  const normalized = (email || '').trim().toLowerCase();
  const payload = JSON.stringify({ email: normalized });
  const secret = getSecret();
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest();
  return `${base64url(payload)}.${base64url(hmac)}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const [p, sig] = (token || '').split('.');
    if (!p || !sig) return null;
    const payloadBuf = fromBase64url(p);
    const payload = payloadBuf.toString('utf8');
    const parsed = JSON.parse(payload) as { email?: string };
    if (!parsed?.email) return null;
    const secret = getSecret();
    const expected = crypto.createHmac('sha256', secret).update(payload).digest();
    const provided = fromBase64url(sig);
    if (expected.length !== provided.length) return null;
    if (!crypto.timingSafeEqual(expected, provided)) return null;
    return parsed.email;
  } catch {
    return null;
  }
}

export function buildUnsubscribeUrl(email: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.BETTER_AUTH_URL || '';
  const token = signUnsubscribeToken(email);
  const url = `${base?.replace(/\/$/, '')}/unsubscribe?token=${encodeURIComponent(token)}`;
  return url;
}

export function buildOneClickUnsubscribeUrl(email: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.BETTER_AUTH_URL || '';
  const token = signUnsubscribeToken(email);
  const url = `${base?.replace(/\/$/, '')}/api/unsubscribe?token=${encodeURIComponent(token)}`;
  return url;
}

export async function isEmailSuppressed(email: string): Promise<boolean> {
  if (!email) return false;
  const mongoose = await connectToDatabase();
  const exists = await EmailSuppression.exists({ email: (email || '').toLowerCase() });
  return !!exists;
}

export async function suppressEmail(email: string, source: 'link' | 'list-unsubscribe' | 'manual' | 'api' = 'link', reason = '', scope: 'all' | 'newsletter' = 'all') {
  if (!email) return { ok: false, error: 'Email is required' };
  await connectToDatabase();
  await EmailSuppression.updateOne(
    { email: email.toLowerCase() },
    { $set: { email: email.toLowerCase(), unsubscribedAt: new Date(), source, reason, scope } },
    { upsert: true }
  );
  return { ok: true };
}
