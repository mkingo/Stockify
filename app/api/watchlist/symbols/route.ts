import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/better-auth/auth';
import { getWatchlistSymbolsByEmail } from '@/lib/actions/watchlist.actions';

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const email = session?.user?.email || '';
    if (!email) return NextResponse.json({ symbols: [] }, { status: 200 });

    const symbols = await getWatchlistSymbolsByEmail(email);
    return NextResponse.json({ symbols }, { status: 200 });
  } catch (err) {
    console.error('GET /api/watchlist/symbols error', err);
    return NextResponse.json({ symbols: [] }, { status: 500 });
  }
}
