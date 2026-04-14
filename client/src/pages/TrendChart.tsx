import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ArrowLeft, TrendingUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

/** All metrics the user can pick from */
const METRICS = [
  { key: "price", label: "Stock Price ($)" },
  { key: "tokenPrice", label: "Token Price ($)" },
  { key: "nav", label: "NAV ($M)" },
  { key: "mcap", label: "MCAP ($M)" },
  { key: "mNAV", label: "mNAV (x)" },
  { key: "vol24h", label: "Volume (24h)" },
  { key: "change1d", label: "Price 1D %" },
  { key: "change7d", label: "Price 7D %" },
  { key: "change30d", label: "Price 30D %" },
  { key: "vol1dPct", label: "Volume 1D %" },
  { key: "vol7dPct", label: "Volume 7D %" },
  { key: "vol30dPct", label: "Volume 30D %" },
  { key: "tokenPrice7d", label: "Token Price 7D %" },
  { key: "tokenPrice30d", label: "Token Price 30D %" },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

const AGPU_COLOR = "#39FF14"; // neon green — Aethir brand

/** Palette for non-AGPU lines — no greens */
const PALETTE = [
  "#60a5fa", // blue-400
  "#f472b6", // pink-400
  "#fb923c", // orange-400
  "#a78bfa", // violet-400
  "#facc15", // yellow-400
  "#38bdf8", // sky-400
  "#f87171", // red-400
  "#c084fc", // purple-400
  "#2dd4bf", // teal-400 (blue-ish, ok)
  "#e879f9", // fuchsia-400
  "#fbbf24", // amber-400
  "#818cf8", // indigo-400
  "#fb7185", // rose-400
  "#94a3b8", // slate-400
  "#d946ef", // fuchsia-500
  "#22d3ee", // cyan-400
  "#fdba74", // orange-300
  "#c4b5fd", // violet-300
  "#fca5a5", // red-300
  "#93c5fd", // blue-300
  "#fde68a", // amber-200
  "#d8b4fe", // purple-300
  "#67e8f9", // cyan-300
  "#fda4af", // rose-300
  "#a5b4fc", // indigo-300
  "#86efac", // emerald-300 (slightly green-ish but distinct from neon)
  "#bef264", // lime-300
  "#fcd34d", // amber-300
  "#7dd3fc", // sky-300
  "#f0abfc", // fuchsia-300
];

function getColor(ticker: string, idx: number): string {
  if (ticker === "AGPU") return AGPU_COLOR;
  return PALETTE[idx % PALETTE.length];
}

export default function TrendChart() {
  const { data: rawSnapshots, isLoading } = trpc.dat.getTrendData.useQuery();
  const [metric, setMetric] = useState<MetricKey>("price");
  const [hiddenTickers, setHiddenTickers] = useState<Set<string>>(new Set());

  // Derive unique tickers and chart data
  const { tickers, chartData, tickerCategories } = useMemo(() => {
    if (!rawSnapshots || rawSnapshots.length === 0)
      return { tickers: [] as string[], chartData: [] as Record<string, unknown>[], tickerCategories: {} as Record<string, string> };

    const tickerSet = new Set<string>();
    const catMap: Record<string, string> = {};
    const dateMap = new Map<string, Record<string, number>>();

    for (const row of rawSnapshots) {
      tickerSet.add(row.ticker);
      catMap[row.ticker] = row.category;
      if (!dateMap.has(row.snapshotDate)) dateMap.set(row.snapshotDate, {});
      const entry = dateMap.get(row.snapshotDate)!;
      entry[row.ticker] = (row as Record<string, unknown>)[metric] as number ?? 0;
    }

    // Sort tickers: AGPU first, then alphabetical
    const allTickers = Array.from(tickerSet).sort((a, b) => {
      if (a === "AGPU") return -1;
      if (b === "AGPU") return 1;
      return a.localeCompare(b);
    });

    // Build chart data array sorted by date
    const dates = Array.from(dateMap.keys()).sort();
    const data = dates.map(date => {
      const entry: Record<string, unknown> = { date: date.slice(5) }; // MM-DD for shorter labels
      const vals = dateMap.get(date)!;
      for (const t of allTickers) {
        entry[t] = vals[t] ?? null;
      }
      return entry;
    });

    return { tickers: allTickers, chartData: data, tickerCategories: catMap };
  }, [rawSnapshots, metric]);

  // Non-AGPU index for color assignment (skip AGPU in palette)
  let colorIdx = 0;
  const colorMap: Record<string, string> = {};
  for (const t of tickers) {
    if (t === "AGPU") {
      colorMap[t] = AGPU_COLOR;
    } else {
      colorMap[t] = PALETTE[colorIdx % PALETTE.length];
      colorIdx++;
    }
  }

  const toggleTicker = (ticker: string) => {
    setHiddenTickers(prev => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  };

  const showAll = () => setHiddenTickers(new Set());
  const showOnlyAGPU = () => {
    setHiddenTickers(new Set(tickers.filter(t => t !== "AGPU")));
  };

  const visibleTickers = tickers.filter(t => !hiddenTickers.has(t));

  const metricLabel = METRICS.find(m => m.key === metric)?.label ?? metric;
  const isPct = metric.includes("Pct") || metric.startsWith("change") || metric.includes("Price7d") || metric.includes("Price30d");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/snapshots" className="text-zinc-400 hover:text-zinc-200 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold tracking-tight font-[Space_Grotesk] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                Trend Analysis
              </h1>
              <p className="text-xs text-zinc-500">Historical trends from daily snapshots</p>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-zinc-400 hover:text-zinc-200 px-2 py-1">Dashboard</Link>
            <Link href="/nav" className="text-zinc-400 hover:text-zinc-200 px-2 py-1">NAV</Link>
            <Link href="/snapshots" className="text-zinc-400 hover:text-zinc-200 px-2 py-1">Snapshots</Link>
            <Link href="/admin/holdings" className="text-zinc-400 hover:text-zinc-200 px-2 py-1">Admin</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-20 text-zinc-500">Loading trend data...</div>
        ) : chartData.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            No snapshot data yet. Take snapshots on the{" "}
            <Link href="/snapshots" className="text-amber-400 underline">Snapshots page</Link>{" "}
            to build trend history.
          </div>
        ) : (
          <>
            {/* Controls row */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              {/* Metric selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Metric:</span>
                <select
                  value={metric}
                  onChange={e => setMetric(e.target.value as MetricKey)}
                  className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-amber-500"
                >
                  {METRICS.map(m => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Quick filters */}
              <div className="flex items-center gap-2">
                <button
                  onClick={showAll}
                  className="px-2 py-1 text-xs rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
                >
                  Show All
                </button>
                <button
                  onClick={showOnlyAGPU}
                  className="px-2 py-1 text-xs rounded border border-zinc-700 hover:border-[#39FF14]/50 transition-colors"
                  style={{ color: AGPU_COLOR }}
                >
                  AGPU Only
                </button>
                <button
                  onClick={() => {
                    const alts = tickers.filter(t => tickerCategories[t] === "Alts");
                    setHiddenTickers(new Set(alts));
                  }}
                  className="px-2 py-1 text-xs rounded border border-zinc-700 text-blue-400 hover:border-blue-500/50 transition-colors"
                >
                  Majors Only
                </button>
                <button
                  onClick={() => {
                    const majors = tickers.filter(t => tickerCategories[t] === "Majors");
                    setHiddenTickers(new Set(majors));
                  }}
                  className="px-2 py-1 text-xs rounded border border-zinc-700 text-purple-400 hover:border-purple-500/50 transition-colors"
                >
                  Alts Only
                </button>
              </div>

              <span className="text-xs text-zinc-600">
                {visibleTickers.length}/{tickers.length} tickers shown
              </span>
            </div>

            {/* Chart */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 mb-6">
              <h2 className="text-sm font-medium text-zinc-400 mb-4">{metricLabel} — Over Time</h2>
              <ResponsiveContainer width="100%" height={500}>
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    axisLine={{ stroke: "#3f3f46" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    axisLine={{ stroke: "#3f3f46" }}
                    tickLine={false}
                    tickFormatter={v => isPct ? `${v.toFixed(1)}%` : v >= 1000 ? `${(v/1000).toFixed(1)}K` : v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : String(Number(v.toFixed(2)))}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#a1a1aa" }}
                    formatter={(value: number, name: string) => {
                      if (value === null || value === undefined) return ["—", name];
                      const formatted = isPct ? `${value.toFixed(2)}%` : value >= 1e6 ? `${(value/1e6).toFixed(2)}M` : value >= 1000 ? `${(value/1000).toFixed(2)}K` : value < 0.01 && value > 0 ? value.toFixed(6) : value.toFixed(2);
                      return [formatted, name];
                    }}
                    itemSorter={(item) => item.name === "AGPU" ? -Infinity : 0}
                  />
                  {tickers.map(ticker => (
                    <Line
                      key={ticker}
                      type="monotone"
                      dataKey={ticker}
                      stroke={colorMap[ticker]}
                      strokeWidth={ticker === "AGPU" ? 3 : 1.5}
                      strokeOpacity={ticker === "AGPU" ? 1 : 0.5}
                      dot={false}
                      hide={hiddenTickers.has(ticker)}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Ticker legend / toggle grid */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Toggle Tickers (click to show/hide)</h3>
              <div className="flex flex-wrap gap-1.5">
                {tickers.map(ticker => {
                  const hidden = hiddenTickers.has(ticker);
                  const color = colorMap[ticker];
                  return (
                    <button
                      key={ticker}
                      onClick={() => toggleTicker(ticker)}
                      className={`px-2 py-1 text-xs font-mono rounded border transition-all ${
                        hidden
                          ? "border-zinc-800 text-zinc-600 bg-transparent"
                          : "border-zinc-700 bg-zinc-800/50"
                      }`}
                      style={{
                        color: hidden ? undefined : color,
                        borderColor: hidden ? undefined : `${color}40`,
                      }}
                    >
                      {ticker}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
