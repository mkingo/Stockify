import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/better-auth/auth';
import { addToWatchlistByEmail } from '@/lib/actions/watchlist.actions';

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const email = session?.user?.email || '';
    if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const symbol = String(body?.symbol || '').toUpperCase();
    const company = String(body?.company || symbol);

    const result = await addToWatchlistByEmail(email, symbol, company);
    const status = result.ok ? 200 : 400;
    return NextResponse.json(result, { status });
  } catch (err) {
    console.error('POST /api/watchlist/add error', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
