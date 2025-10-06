"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { emitWatchlistRemoved, onWatchlistEvent } from "@/lib/watchlist/events";

export default function WatchlistTable({ watchlist }: WatchlistTableProps) {
  const [items, setItems] = useState<StockWithData[]>(watchlist || []);
  const router = useRouter();

  useEffect(() => {
    // Listen for global add/remove events to keep the table in sync
    const unsubscribe = onWatchlistEvent(({ action, symbol, company, addedAt }) => {
      if (action === 'add') {
        setItems((prev) => {
          if (prev.some((it) => it.symbol === symbol)) return prev;
          const userId = prev[0]?.userId || "";
          const nextItem: StockWithData = {
            userId,
            symbol,
            company: company || symbol,
            addedAt: addedAt ? new Date(addedAt) : new Date(),
          };
          return [nextItem, ...prev];
        });
      } else if (action === 'remove') {
        setItems((prev) => prev.filter((it) => it.symbol !== symbol));
      }
    });
    return unsubscribe;
  }, []);

  const hasItems = items && items.length > 0;

  const handleRemove = async (symbol: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch("/api/watchlist/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      const data = await res.json();
      if (data?.ok) {
        setItems((prev) => prev.filter((it) => it.symbol !== symbol));
        emitWatchlistRemoved(symbol);
      } else {
        alert(data?.error || "Failed to remove");
      }
    } catch (err) {
      console.error("remove error", err);
      alert("Failed to remove");
    }
  };

  const rows = useMemo(() => items, [items]);

  if (!hasItems) {
    return (
      <div className="border rounded-lg bg-background/40 p-8 text-center space-y-2">
        <h3 className="text-lg font-semibold">Your watchlist is empty</h3>
        <p className="text-sm text-muted-foreground">Use the Search in the header to add stocks using the star icon.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-background/40 shadow-sm">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow className="text-left">
            <TableHead className="px-4 py-3 font-medium">Symbol</TableHead>
            <TableHead className="px-4 py-3 font-medium">Company</TableHead>
            <TableHead className="px-4 py-3 font-medium whitespace-nowrap">Added On</TableHead>
            <TableHead className="px-4 py-3 font-medium text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((it) => (
            <TableRow
              key={it.symbol}
              className="cursor-pointer"
              onClick={() => router.push(`/stocks/${it.symbol}`)}
            >
              <TableCell className="px-4 py-3 font-semibold">
                <Link href={`/stocks/${it.symbol}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                  {it.symbol}
                </Link>
              </TableCell>
              <TableCell className="px-4 py-3">{it.company}</TableCell>
              <TableCell className="px-4 py-3">{new Date(it.addedAt).toLocaleString()}</TableCell>
              <TableCell className="px-4 py-3">
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleRemove(it.symbol, e)}
                    title={`Remove ${it.symbol} from watchlist`}
                  >
                    <Trash2 className="text-destructive" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
