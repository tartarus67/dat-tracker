import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ArrowLeft, Calendar, Download, Camera, ChevronDown } from "lucide-react";

function fmt(n: number, decimals = 2): string {
  if (n === 0) return "—";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(decimals)}`;
}

function fmtPct(n: number): string {
  if (n === 0) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function fmtVol(n: number): string {
  if (n === 0) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
}

function pctColor(v: number): string {
  if (v > 0) return "text-emerald-400";
  if (v < 0) return "text-red-400";
  return "text-zinc-500";
}

export default function SnapshotsPage() {
  const { data: dates, isLoading: datesLoading } = trpc.dat.getSnapshotDates.useQuery();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tab, setTab] = useState<"stocks" | "crypto">("stocks");
  const saveSnapshot = trpc.dat.saveSnapshot.useMutation();

  const dateToQuery = selectedDate || (dates && dates.length > 0 ? dates[0] : null);

  const { data: snapshot, isLoading: snapshotLoading } = trpc.dat.getSnapshot.useQuery(
    { date: dateToQuery! },
    { enabled: !!dateToQuery }
  );

  const handleSaveSnapshot = async () => {
    try {
      const result = await saveSnapshot.mutateAsync();
      alert(`Snapshot saved for ${result.date}: ${result.stockCount} stocks, ${result.cryptoCount} crypto`);
      window.location.reload();
    } catch (err) {
      alert("Failed to save snapshot: " + (err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-zinc-400 hover:text-zinc-200 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold tracking-tight font-[Space_Grotesk]">
                Historical Snapshots
              </h1>
              <p className="text-xs text-zinc-500">Daily data snapshots stored in database</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/" className="text-zinc-400 hover:text-zinc-200 px-2 py-1">Dashboard</Link>
              <Link href="/nav" className="text-zinc-400 hover:text-zinc-200 px-2 py-1">NAV</Link>
              <span className="text-amber-400 px-2 py-1 border-b border-amber-400">Snapshots</span>
              <Link href="/admin/holdings" className="text-zinc-400 hover:text-zinc-200 px-2 py-1">Admin</Link>
            </nav>
            <button
              onClick={handleSaveSnapshot}
              disabled={saveSnapshot.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-xs font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              {saveSnapshot.isPending ? "Saving..." : "Take Snapshot Now"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 py-6">
        {/* Date selector */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-400">Select Date:</span>
          </div>
          {datesLoading ? (
            <div className="text-sm text-zinc-500">Loading dates...</div>
          ) : dates && dates.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {dates.map(date => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                    (dateToQuery === date)
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:border-zinc-600"
                  }`}
                >
                  {date}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-zinc-500">
              No snapshots yet. Click "Take Snapshot Now" to save today's data.
            </div>
          )}
        </div>

        {/* Tab selector */}
        {dateToQuery && (
          <div className="flex items-center gap-1 mb-4">
            <button
              onClick={() => setTab("stocks")}
              className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
                tab === "stocks"
                  ? "bg-zinc-800 text-zinc-100 border-t border-x border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Stocks ({snapshot?.stocks?.length || 0})
            </button>
            <button
              onClick={() => setTab("crypto")}
              className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
                tab === "crypto"
                  ? "bg-zinc-800 text-zinc-100 border-t border-x border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Crypto ({snapshot?.crypto?.length || 0})
            </button>
          </div>
        )}

        {/* Snapshot data */}
        {snapshotLoading ? (
          <div className="text-center py-20 text-zinc-500">Loading snapshot data...</div>
        ) : snapshot && tab === "stocks" && snapshot.stocks.length > 0 ? (
          <div className="overflow-x-auto border border-zinc-800 rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-900/80 text-zinc-400 uppercase tracking-wider">
                  <th className="px-3 py-2 text-left font-medium">Category</th>
                  <th className="px-3 py-2 text-left font-medium">Ticker</th>
                  <th className="px-3 py-2 text-left font-medium">Company</th>
                  <th className="px-3 py-2 text-left font-medium">Asset</th>
                  <th className="px-3 py-2 text-right font-medium">Price</th>
                  <th className="px-3 py-2 text-right font-medium">1D%</th>
                  <th className="px-3 py-2 text-right font-medium">7D%</th>
                  <th className="px-3 py-2 text-right font-medium">30D%</th>
                  <th className="px-3 py-2 text-right font-medium">Token Price</th>
                  <th className="px-3 py-2 text-right font-medium">Token 7D%</th>
                  <th className="px-3 py-2 text-right font-medium">Token 30D%</th>
                  <th className="px-3 py-2 text-right font-medium">MCAP ($M)</th>
                  <th className="px-3 py-2 text-right font-medium">NAV ($M)</th>
                  <th className="px-3 py-2 text-right font-medium">mNAV</th>
                  <th className="px-3 py-2 text-right font-medium">Vol 24h</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.stocks.map((row, i) => (
                  <tr key={i} className="border-t border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        row.category === "Majors"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-purple-500/20 text-purple-400"
                      }`}>
                        {row.category}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono font-bold text-zinc-200">{row.ticker}</td>
                    <td className="px-3 py-2 text-zinc-300">{row.company}</td>
                    <td className="px-3 py-2 text-amber-400 font-mono">{row.datAsset}</td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-200">${row.price.toFixed(2)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${pctColor(row.change1d)}`}>{fmtPct(row.change1d)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${pctColor(row.change7d)}`}>{fmtPct(row.change7d)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${pctColor(row.change30d)}`}>{fmtPct(row.change30d)}</td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-300">
                      {row.tokenPrice > 0 ? (row.tokenPrice < 0.01 ? `$${row.tokenPrice.toFixed(6)}` : `$${row.tokenPrice.toFixed(2)}`) : "—"}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${pctColor(row.tokenPrice7d)}`}>{fmtPct(row.tokenPrice7d)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${pctColor(row.tokenPrice30d)}`}>{fmtPct(row.tokenPrice30d)}</td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-300">{row.mcap > 0 ? `$${row.mcap.toFixed(1)}M` : "—"}</td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-300">{row.nav > 0 ? `$${row.nav.toFixed(1)}M` : "—"}</td>
                    <td className="px-3 py-2 text-right font-mono text-amber-400">{row.mNAV > 0 ? `${row.mNAV.toFixed(2)}x` : "—"}</td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-400">{fmtVol(row.vol24h)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : snapshot && tab === "crypto" && snapshot.crypto.length > 0 ? (
          <div className="overflow-x-auto border border-zinc-800 rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-900/80 text-zinc-400 uppercase tracking-wider">
                  <th className="px-3 py-2 text-left font-medium">Symbol</th>
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-right font-medium">Price</th>
                  <th className="px-3 py-2 text-right font-medium">1D%</th>
                  <th className="px-3 py-2 text-right font-medium">7D%</th>
                  <th className="px-3 py-2 text-right font-medium">30D%</th>
                  <th className="px-3 py-2 text-right font-medium">Volume 24h</th>
                  <th className="px-3 py-2 text-right font-medium">Market Cap</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.crypto.map((row, i) => (
                  <tr key={i} className="border-t border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-3 py-2 font-mono font-bold text-amber-400">{row.symbol}</td>
                    <td className="px-3 py-2 text-zinc-300">{row.name}</td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-200">
                      {row.price < 0.01 ? `$${row.price.toFixed(6)}` : `$${row.price.toFixed(2)}`}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${pctColor(row.change1d)}`}>{fmtPct(row.change1d)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${pctColor(row.change7d)}`}>{fmtPct(row.change7d)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${pctColor(row.change30d)}`}>{fmtPct(row.change30d)}</td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-400">{fmtVol(row.volume)}</td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-300">{fmt(row.marketCap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : dateToQuery ? (
          <div className="text-center py-20 text-zinc-500">No data for this date.</div>
        ) : null}
      </main>
    </div>
  );
}
