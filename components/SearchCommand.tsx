"use client"

import {useEffect, useMemo, useState} from "react"
import type React from "react";
import {CommandDialog, CommandEmpty, CommandInput, CommandList} from "@/components/ui/command"
import {Button} from "@/components/ui/button";
import {Loader2, Star, TrendingUp} from "lucide-react";
import Link from "next/link";
import {searchStocks} from "@/lib/actions/finnhub.actions";
import {useDebounce} from "@/hooks/useDebounce";
import {emitWatchlistAdded, onWatchlistEvent} from "@/lib/watchlist/events";

/**
 * Render a searchable stock picker trigger and modal dialog.
 *
 * Displays a trigger (button or text) that opens a command-style dialog for searching and selecting stocks.
 * The dialog:
 * - toggles via the trigger or the keyboard shortcut Cmd/Ctrl+K,
 * - debounces user input and queries `searchStocks` for search results,
 * - shows a loading state, "No results found" when a search returns nothing, or a list of popular stocks when not searching,
 * - closes and resets its search state when a stock is selected.
 *
 * @param renderAs - "button" to render a Button trigger, "text" to render a plain clickable span (default: "button")
 * @param label - Trigger label text (default: "Add stock")
 * @param initialStocks - Initial list of stocks shown when not searching
 * @returns The SearchCommand React element
 */
export default function SearchCommand({renderAs = 'button', label = 'Add stock', initialStocks}: SearchCommandProps) {
    const [open, setOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [loading, setLoading] = useState(false)
    const [stocks, setStocks] = useState<StockWithWatchlistStatus[]>(initialStocks);
    const [watchlistSymbols, setWatchlistSymbols] = useState<Set<string>>(new Set());
    const [addingSymbol, setAddingSymbol] = useState<string | null>(null);

    const isSearchMode = !!searchTerm.trim();

    // Load user's watchlist symbols when dialog opens
    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                const res = await fetch("/api/watchlist/symbols", {cache: 'no-store'});
                if (!res.ok) throw new Error(String(res.status));
                const data = await res.json().catch(() => ({symbols: [] as string[]}));
                const syms = Array.isArray(data?.symbols)
                    ? data.symbols.map((s: string) => String(s).toUpperCase())
                    : [];
                setWatchlistSymbols(new Set(syms));
                // Update current list with watchlist status
                setStocks((prev) => (prev || []).map((s) => ({...s, isInWatchlist: syms.includes(s.symbol)})));
            } catch (err) {
                // ignore, keep empty set
                setWatchlistSymbols(new Set());
            }
        })();
    }, [open]);

    // Sync with global watchlist events (e.g., removals from WatchlistTable or adds from Stock page)
    useEffect(() => {
        const unsubscribe = onWatchlistEvent(({action, symbol}) => {
            setWatchlistSymbols((prev) => {
                const next = new Set(prev);
                if (action === 'add') next.add(symbol);
                if (action === 'remove') next.delete(symbol);
                return next;
            });
            setStocks((prev) => (prev || []).map((s) => (s.symbol === symbol ? {
                ...s,
                isInWatchlist: action === 'add'
            } : s)));
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault()
                setOpen(v => !v)
            }
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [])

    const handleSearch = async () => {
        if (!isSearchMode) {
            setStocks((initialStocks || []).map((s) => ({...s, isInWatchlist: watchlistSymbols.has(s.symbol)})));
            return;
        }

        setLoading(true)
        try {
            const results = await searchStocks(searchTerm.trim());
            const mapped = (results || []).map((r) => ({...r, isInWatchlist: watchlistSymbols.has(r.symbol)}));
            setStocks(mapped);
        } catch {
            setStocks([])
        } finally {
            setLoading(false)
        }
    }

    const debouncedSearch = useDebounce(handleSearch, 300);

    useEffect(() => {
        debouncedSearch();
    }, [searchTerm]);

    const handleSelectStock = () => {
        setOpen(false);
        setSearchTerm("");
        setStocks((initialStocks || []).map((s) => ({...s, isInWatchlist: watchlistSymbols.has(s.symbol)})));
    }

    const displayStocks = useMemo(() => {
        const base = isSearchMode ? stocks : stocks?.slice(0, 10);
        return (base || []).map((s) => ({...s, isInWatchlist: s.isInWatchlist || watchlistSymbols.has(s.symbol)}));
    }, [isSearchMode, stocks, watchlistSymbols]);

    const handleAddToWatchlist = async (e: React.MouseEvent, stock: StockWithWatchlistStatus) => {
        e.preventDefault();
        e.stopPropagation();
        const symbol = stock.symbol;
        if (addingSymbol === symbol || watchlistSymbols.has(symbol)) return;
        setAddingSymbol(symbol);
        try {
            const res = await fetch('/api/watchlist/add', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({symbol, company: stock.name || symbol}),
            });
            if (res.status === 401) {
                alert('Please sign in to add to your watchlist.');
                return;
            }
            const data = await res.json().catch(() => ({}));
            if (data?.ok) {
                setWatchlistSymbols((prev) => {
                    const next = new Set(prev);
                    next.add(symbol);
                    return next;
                });
                setStocks((prev) => (prev || []).map((s) => (s.symbol === symbol ? {...s, isInWatchlist: true} : s)));
                // broadcast event so WatchlistTable or other listeners can update immediately
                emitWatchlistAdded(symbol, stock.name || symbol, new Date());
            } else {
                alert(data?.error || 'Failed to add to watchlist');
            }
        } catch (err) {
            console.error('add to watchlist error', err);
            alert('Failed to add to watchlist');
        } finally {
            setAddingSymbol(null);
        }
    }

    return (
        <>
            {renderAs === 'text' ? (
                <span onClick={() => setOpen(true)} className="search-text">
            {label}
          </span>
            ) : (
                <Button onClick={() => setOpen(true)} className="search-btn">
                    {label}
                </Button>
            )}
            <CommandDialog open={open} onOpenChange={setOpen} className="search-dialog">
                <div className="search-field">
                    <CommandInput value={searchTerm} onValueChange={setSearchTerm} placeholder="Search stocks..."
                                  className="search-input"/>
                    {loading && <Loader2 className="search-loader"/>}
                </div>
                <CommandList className="search-list">
                    {loading ? (
                        <CommandEmpty className="search-list-empty">Loading stocks...</CommandEmpty>
                    ) : displayStocks?.length === 0 ? (
                        <div className="search-list-indicator">
                            {isSearchMode ? 'No results found' : 'No stocks available'}
                        </div>
                    ) : (
                        <ul>
                            <div className="search-count">
                                {isSearchMode ? 'Search results' : 'Popular stocks'}
                                {` `}({displayStocks?.length || 0})
                            </div>
                            {displayStocks?.map((stock) => (
                                <li key={stock.symbol} className="search-item flex items-center justify-between">
                                    <Link
                                        href={`/stocks/${stock.symbol}`}
                                        onClick={handleSelectStock}
                                        className="search-item-link flex items-center gap-2 flex-1"
                                    >
                                        <TrendingUp className="h-4 w-4 text-gray-500"/>
                                        <div className="flex-1">
                                            <div className="search-item-name">
                                                {stock.name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {stock.symbol} | {stock.exchange} | {stock.type}
                                            </div>
                                        </div>
                                    </Link>
                                    <button
                                        aria-label={stock.isInWatchlist ? `Added to watchlist` : `Add ${stock.symbol} to watchlist`}
                                        title={stock.isInWatchlist ? `Already in watchlist` : `Add ${stock.symbol} to watchlist`}
                                        className="ml-2 p-1 rounded hover:bg-accent disabled:opacity-50"
                                        disabled={addingSymbol === stock.symbol}
                                        onClick={(e) => handleAddToWatchlist(e, stock)}
                                    >
                                        {addingSymbol === stock.symbol ? (
                                            <Loader2 className="h-4 w-4 animate-spin"/>
                                        ) : (
                                            <Star
                                                className={stock.isInWatchlist ? 'text-yellow-400' : 'text-gray-400'}
                                                fill={stock.isInWatchlist ? '#FACC15' : 'none'}
                                            />
                                        )}
                                    </button>
                                </li>
                            ))}

                        </ul>
                    )
                    }
                </CommandList>
            </CommandDialog>
        </>
    )
}