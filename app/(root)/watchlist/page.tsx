import WatchlistTable from "@/components/WatchlistTable";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { getWatchlistByEmail } from "@/lib/actions/watchlist.actions";

export default async function WatchlistPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email || "";
  const watchlist = email ? await getWatchlistByEmail(email) : [];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold">Watchlist</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Keep track of the stocks you're watching.
        </p>
      </div>
      <WatchlistTable watchlist={watchlist} />
    </div>
  );
}
