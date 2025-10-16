import { NextRequest, NextResponse } from 'next/server';
import { verifyUnsubscribeToken, suppressEmail } from '@/lib/unsubscribe';

async function unsubscribeByToken(token: string | null, source: 'link' | 'list-unsubscribe' | 'api' = 'api') {
  if (!token) return { ok: false, status: 400, message: 'Missing token' };
  const email = verifyUnsubscribeToken(token);
  if (!email) return { ok: false, status: 400, message: 'Invalid token' };
  await suppressEmail(email, source);
  return { ok: true, status: 200, message: 'Unsubscribed' };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');

  if (token) {
    const res = await unsubscribeByToken(token, 'api');
    return NextResponse.json({ success: res.ok, message: res.message }, { status: res.status });
  }

  if (emailParam) {
    await suppressEmail(emailParam, 'api');
    return NextResponse.json({ success: true, message: 'Unsubscribed' });
  }

  return NextResponse.json({ success: false, message: 'Token or email is required' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  // Support RFC 8058 one-click, providers usually POST with no body; token is in URL
  const { searchParams } = new URL(req.url);
  let token = searchParams.get('token');
  let emailParam = searchParams.get('email');

  if (!token || !emailParam) {
    try {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await req.json().catch(() => ({}));
        token = token || String(body.token || '');
        emailParam = emailParam || String(body.email || '');
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const text = await req.text();
        const params = new URLSearchParams(text);
        token = token || params.get('token') || '';
        emailParam = emailParam || params.get('email') || '';
      }
    } catch (_) {
      // ignore
    }
  }

  if (token) {
    const res = await unsubscribeByToken(token, 'list-unsubscribe');
    // For one-click, respond with 200 text/plain
    return new NextResponse(res.ok ? 'OK' : 'Invalid token', {
      status: res.status,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  if (emailParam) {
    await suppressEmail(emailParam, 'api');
    return new NextResponse('OK', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }

  return new NextResponse('Bad Request', { status: 400, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
