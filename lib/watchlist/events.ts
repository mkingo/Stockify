// Lightweight client-side event bus for watchlist updates
// Provides cross-component communication without server roundtrips.

export type WatchlistEventDetail = {
  action: 'add' | 'remove'
  symbol: string
  company?: string
  addedAt?: Date | string | number
}

export const WATCHLIST_EVENT = 'watchlist:event'

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.dispatchEvent === 'function'
}

export function emitWatchlistAdded(symbol: string, company?: string, addedAt?: Date | string | number) {
  if (!isBrowser()) return
  const detail: WatchlistEventDetail = { action: 'add', symbol: symbol.toUpperCase(), company, addedAt: addedAt ?? new Date() }
  window.dispatchEvent(new CustomEvent(WATCHLIST_EVENT, { detail }))
}

export function emitWatchlistRemoved(symbol: string) {
  if (!isBrowser()) return
  const detail: WatchlistEventDetail = { action: 'remove', symbol: symbol.toUpperCase() }
  window.dispatchEvent(new CustomEvent(WATCHLIST_EVENT, { detail }))
}

export function onWatchlistEvent(handler: (detail: WatchlistEventDetail) => void): () => void {
  if (!isBrowser()) return () => {}
  const listener = (e: Event) => {
    const ce = e as CustomEvent<WatchlistEventDetail>
    if (!ce?.detail) return
    handler(ce.detail)
  }
  window.addEventListener(WATCHLIST_EVENT, listener as EventListener)
  return () => window.removeEventListener(WATCHLIST_EVENT, listener as EventListener)
}
