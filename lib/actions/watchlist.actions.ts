'use server';

import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';

async function resolveUserIdByEmail(email: string): Promise<string | null> {
    if (!email) return null;
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection not found');
    const user = await db.collection('user').findOne<{ _id?: unknown; id?: string }>({ email }, { projection: { _id: 1, id: 1 } });
    if (!user) return null;
    const userId = (user.id as string) || String(user._id || '');
    return userId || null;
}

export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
    if (!email) return [];

    try {
        const userId = await resolveUserIdByEmail(email);
        if (!userId) return [];
        const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
        return items.map((i) => String(i.symbol));
    } catch (err) {
        console.error('getWatchlistSymbolsByEmail error:', err);
        return [];
    }
}

export async function addToWatchlistByEmail(email: string, symbol: string, company: string): Promise<{ ok: boolean; error?: string }>
{
    try {
        const userId = await resolveUserIdByEmail(email);
        if (!userId) return { ok: false, error: 'User not found' };
        const sym = (symbol || '').trim().toUpperCase();
        const comp = (company || '').trim() || sym;
        if (!sym) return { ok: false, error: 'Symbol is required' };
        await Watchlist.updateOne(
            { userId, symbol: sym },
            { $setOnInsert: { userId, symbol: sym, company: comp, addedAt: new Date() } },
            { upsert: true }
        );
        return { ok: true };
    } catch (err) {
        console.error('addToWatchlistByEmail error:', err);
        return { ok: false, error: 'Failed to add to watchlist' };
    }
}

export async function removeFromWatchlistByEmail(email: string, symbol: string): Promise<{ ok: boolean; error?: string }>
{
    try {
        const userId = await resolveUserIdByEmail(email);
        if (!userId) return { ok: false, error: 'User not found' };
        const sym = (symbol || '').trim().toUpperCase();
        if (!sym) return { ok: false, error: 'Symbol is required' };
        await Watchlist.deleteOne({ userId, symbol: sym });
        return { ok: true };
    } catch (err) {
        console.error('removeFromWatchlistByEmail error:', err);
        return { ok: false, error: 'Failed to remove from watchlist' };
    }
}

export async function getWatchlistByEmail(email: string): Promise<StockWithData[]> {
    try {
        const userId = await resolveUserIdByEmail(email);
        if (!userId) return [];
        const items = await Watchlist.find({ userId }, { _id: 0, userId: 1, symbol: 1, company: 1, addedAt: 1 })
            .sort({ addedAt: -1 })
            .lean();
        return items.map((it) => ({
            userId: String(it.userId),
            symbol: String(it.symbol),
            company: String(it.company),
            addedAt: new Date(it.addedAt),
        }));
    } catch (err) {
        console.error('getWatchlistByEmail error:', err);
        return [];
    }
}