import { trpc } from "@/lib/trpc";
import { useState, useMemo, useCallback, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft, TrendingUp, Calendar, X } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
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

const AGPU_COLOR = "#39FF14";

const PALETTE = [
  "#60a5fa", "#f472b6", "#fb923c", "#a78bfa", "#facc15",
  "#38bdf8", "#f87171", "#c084fc", "#2dd4bf", "#e879f9",
  "#fbbf24", "#818cf8", "#fb7185", "#94a3b8", "#d946ef",
  "#22d3ee", "#fdba74", "#c4b5fd", "#fca5a5", "#93c5fd",
  "#fde68a", "#d8b4fe", "#67e8f9", "#fda4af", "#a5b4fc",
  "#86efac", "#bef264", "#fcd34d", "#7dd3fc", "#f0abfc",
];

function fmtVal(v: number | null | undefined, isPct: boolean): string {
  if (v === null || v === undefined) return "—";
  if (isPct) return `${v.toFixed(2)}%`;
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(2)}K`;
  if (Math.abs(v) < 0.01 && v !== 0) return v.toFixed(6);
  return v.toFixed(2);
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Custom tooltip that shows rank info for selected ticker */
function CustomTooltip({
  active, payload, label, selectedTicker, isPct, visibleTickers,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
  selectedTicker: string | null;
  isPct: boolean;
  visibleTickers: string[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  // Build ranked list of visible tickers for this data point
  const entries = payload
    .filter(p => visibleTickers.includes(p.dataKey) && p.value !== null && p.value !== undefined)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const totalVisible = entries.length;

  if (selectedTicker) {
    const selected = entries.find(e => e.dataKey === selectedTicker);
    if (!selected) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-xl">
          <div className="text-zinc-500 mb-1">{label}</div>
          <div className="text-zinc-400">{selectedTicker}: no data</div>
        </div>
      );
    }
    const rank = entries.indexOf(selected) + 1;

    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-xs shadow-xl min-w-[200px]">
        <div className="text-zinc-500 mb-2 text-[10px] uppercase tracking-wider">{label}</div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selected.color }} />
          <span className="font-bold text-sm" style={{ color: selected.color }}>{selectedTicker}</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-zinc-500">Value:</span>
            <span className="text-zinc-200 font-mono">{fmtVal(selected.value, isPct)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Rank:</span>
            <span className="text-zinc-200 font-mono">{ordinal(rank)} / {totalVisible}</span>
          </div>
          {rank > 1 && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Gap to #1:</span>
              <span className="text-zinc-400 font-mono">
                {isPct
                  ? `${(entries[0].value - selected.value).toFixed(2)}pp`
                  : fmtVal(entries[0].value - selected.value, false)}
              </span>
            </div>
          )}
          {rank <= 3 && (
            <div className="text-amber-400 mt-1">
              {rank === 1 ? "🥇 Leading" : rank === 2 ? "🥈 2nd place" : "🥉 3rd place"}
            </div>
          )}
        </div>
      </div>
    );
  }

  // No selection — show compact top 5 + AGPU
  const top5 = entries.slice(0, 5);
  const agpuEntry = entries.find(e => e.dataKey === "AGPU");
  const agpuRank = agpuEntry ? entries.indexOf(agpuEntry) + 1 : null;
  const showAgpuSeparately = agpuEntry && !top5.some(e => e.dataKey === "AGPU");

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-xl min-w-[180px]">
      <div className="text-zinc-500 mb-1.5 text-[10px] uppercase tracking-wider">{label}</div>
      {top5.map((e, i) => (
        <div key={e.dataKey} className="flex justify-between gap-4 py-0.5">
          <span style={{ color: e.color }} className="font-mono">
            #{i + 1} {e.dataKey}
          </span>
          <span className="text-zinc-300 font-mono">{fmtVal(e.value, isPct)}</span>
        </div>
      ))}
      {showAgpuSeparately && agpuEntry && (
        <>
          <div className="border-t border-zinc-800 my-1" />
          <div className="flex justify-between gap-4 py-0.5">
            <span style={{ color: AGPU_COLOR }} className="font-mono font-bold">
              #{agpuRank} AGPU
            </span>
            <span className="text-zinc-300 font-mono">{fmtVal(agpuEntry.value, isPct)}</span>
          </div>
        </>
      )}
      <div className="text-zinc-600 mt-1 text-[10px]">Click a line to focus</div>
    </div>
  );
}

export default function TrendChart() {
  const { data: rawSnapshots, isLoading } = trpc.dat.getTrendData.useQuery();
  const [metric, setMetric] = useState<MetricKey>("price");
  const [hiddenTickers, setHiddenTickers] = useState<Set<string>>(new Set());
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [dateStart, setDateStart] = useState<string>("");
  const [dateEnd, setDateEnd] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Derive unique tickers, chart data, full date list
  const { tickers, chartData, tickerCategories, allDates, latestValues } = useMemo(() => {
    if (!rawSnapshots || rawSnapshots.length === 0)
      return {
        tickers: [] as string[],
        chartData: [] as Record<string, unknown>[],
        tickerCategories: {} as Record<string, string>,
        allDates: [] as string[],
        latestValues: {} as Record<string, number>,
      };

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

    const allTickers = Array.from(tickerSet).sort((a, b) => {
      if (a === "AGPU") return -1;
      if (b === "AGPU") return 1;
      return a.localeCompare(b);
    });

    const sortedDates = Array.from(dateMap.keys()).sort();

    // Apply date filter
    const filteredDates = sortedDates.filter(d => {
      if (dateStart && d < dateStart) return false;
      if (dateEnd && d > dateEnd) return false;
      return true;
    });

    const data = filteredDates.map(date => {
      const entry: Record<string, unknown> = { date: date.slice(5), fullDate: date };
      const vals = dateMap.get(date)!;
      for (const t of allTickers) {
        entry[t] = vals[t] ?? null;
      }
      return entry;
    });

    // Latest values for top/bottom ranking
    const lastDate = filteredDates[filteredDates.length - 1];
    const lastVals = lastDate ? dateMap.get(lastDate) || {} : {};

    return {
      tickers: allTickers,
      chartData: data,
      tickerCategories: catMap,
      allDates: sortedDates,
      latestValues: lastVals,
    };
  }, [rawSnapshots, metric, dateStart, dateEnd]);

  // Color map
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    let idx = 0;
    for (const t of tickers) {
      if (t === "AGPU") {
        map[t] = AGPU_COLOR;
      } else {
        map[t] = PALETTE[idx % PALETTE.length];
        idx++;
      }
    }
    return map;
  }, [tickers]);

  const toggleTicker = (ticker: string) => {
    setHiddenTickers(prev => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  };

  const showAll = () => setHiddenTickers(new Set());
  const showOnlyAGPU = () => setHiddenTickers(new Set(tickers.filter(t => t !== "AGPU")));

  // Top/Bottom N filters based on latest metric value
  const showTopN = useCallback((n: number) => {
    const ranked = tickers
      .filter(t => latestValues[t] !== undefined && latestValues[t] !== null)
      .sort((a, b) => (latestValues[b] ?? 0) - (latestValues[a] ?? 0));
    const topN = new Set(ranked.slice(0, n));
    // Always include AGPU
    topN.add("AGPU");
    setHiddenTickers(new Set(tickers.filter(t => !topN.has(t))));
  }, [tickers, latestValues]);

  const showBottomN = useCallback((n: number) => {
    const ranked = tickers
      .filter(t => latestValues[t] !== undefined && latestValues[t] !== null)
      .sort((a, b) => (latestValues[a] ?? 0) - (latestValues[b] ?? 0));
    const bottomN = new Set(ranked.slice(0, n));
    bottomN.add("AGPU");
    setHiddenTickers(new Set(tickers.filter(t => !bottomN.has(t))));
  }, [tickers, latestValues]);

  const visibleTickers = tickers.filter(t => !hiddenTickers.has(t));
  const metricLabel = METRICS.find(m => m.key === metric)?.label ?? metric;
  const isPct = metric.includes("Pct") || metric.startsWith("change") || metric.includes("Price7d") || metric.includes("Price30d");

  // Handle click on chart area — deselect if clicking empty space
  const handleChartClick = useCallback((data: unknown) => {
    // If recharts passes activePayload, user clicked on a data point area
    // We handle line clicks via activeDot onClick, so chart background click = deselect
    if (!(data as { activePayload?: unknown[] })?.activePayload) {
      setSelectedTicker(null);
    }
  }, []);

  const handleLineClick = useCallback((ticker: string) => {
    setSelectedTicker(prev => prev === ticker ? null : ticker);
  }, []);

  // Date range helpers
  const minDate = allDates[0] || "";
  const maxDate = allDates[allDates.length - 1] || "";
  const hasDateFilter = dateStart || dateEnd;

  const clearDateFilter = () => {
    setDateStart("");
    setDateEnd("");
    setShowDatePicker(false);
  };

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
        ) : chartData.length === 0 && !hasDateFilter ? (
          <div className="text-center py-20 text-zinc-500">
            No snapshot data yet. Take snapshots on the{" "}
            <Link href="/snapshots" className="text-amber-400 underline">Snapshots page</Link>{" "}
            to build trend history.
          </div>
        ) : (
          <>
            {/* Controls row 1: metric + date range */}
            <div className="flex flex-wrap items-center gap-4 mb-3">
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

              {/* Date range */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded border transition-colors ${
                    hasDateFilter
                      ? "border-amber-500/50 text-amber-400 bg-amber-500/10"
                      : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {hasDateFilter
                    ? `${dateStart || minDate} → ${dateEnd || maxDate}`
                    : "Date Range"
                  }
                </button>
                {hasDateFilter && (
                  <button
                    onClick={clearDateFilter}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {showDatePicker && (
                <div className="flex items-center gap-2 bg-zinc-800/80 border border-zinc-700 rounded px-3 py-1.5">
                  <label className="text-xs text-zinc-500">From:</label>
                  <input
                    type="date"
                    value={dateStart}
                    min={minDate}
                    max={dateEnd || maxDate}
                    onChange={e => setDateStart(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-amber-500"
                  />
                  <label className="text-xs text-zinc-500">To:</label>
                  <input
                    type="date"
                    value={dateEnd}
                    min={dateStart || minDate}
                    max={maxDate}
                    onChange={e => setDateEnd(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>

            {/* Controls row 2: quick filters */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-xs text-zinc-500 uppercase tracking-wider mr-1">Filter:</span>
              <button onClick={showAll} className="px-2 py-1 text-xs rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors">
                Show All
              </button>
              <button onClick={showOnlyAGPU} className="px-2 py-1 text-xs rounded border border-zinc-700 hover:border-[#39FF14]/50 transition-colors" style={{ color: AGPU_COLOR }}>
                AGPU Only
              </button>
              <button onClick={() => { const alts = tickers.filter(t => tickerCategories[t] === "Alts"); setHiddenTickers(new Set(alts)); }}
                className="px-2 py-1 text-xs rounded border border-zinc-700 text-blue-400 hover:border-blue-500/50 transition-colors">
                Majors Only
              </button>
              <button onClick={() => { const majors = tickers.filter(t => tickerCategories[t] === "Majors"); setHiddenTickers(new Set(majors)); }}
                className="px-2 py-1 text-xs rounded border border-zinc-700 text-purple-400 hover:border-purple-500/50 transition-colors">
                Alts Only
              </button>
              <span className="text-zinc-700 mx-1">|</span>
              <button onClick={() => showTopN(5)} className="px-2 py-1 text-xs rounded border border-zinc-700 text-emerald-400 hover:border-emerald-500/50 transition-colors">
                Top 5
              </button>
              <button onClick={() => showTopN(10)} className="px-2 py-1 text-xs rounded border border-zinc-700 text-emerald-400 hover:border-emerald-500/50 transition-colors">
                Top 10
              </button>
              <button onClick={() => showBottomN(5)} className="px-2 py-1 text-xs rounded border border-zinc-700 text-red-400 hover:border-red-500/50 transition-colors">
                Bottom 5
              </button>
              <button onClick={() => showBottomN(10)} className="px-2 py-1 text-xs rounded border border-zinc-700 text-red-400 hover:border-red-500/50 transition-colors">
                Bottom 10
              </button>
              <span className="text-xs text-zinc-600 ml-2">
                {visibleTickers.length}/{tickers.length} shown
                {selectedTicker && (
                  <span className="ml-2">
                    · Selected: <span style={{ color: colorMap[selectedTicker] }} className="font-bold">{selectedTicker}</span>
                    <button onClick={() => setSelectedTicker(null)} className="ml-1 text-zinc-500 hover:text-zinc-300">(clear)</button>
                  </span>
                )}
              </span>
            </div>

            {chartData.length === 0 ? (
              <div className="text-center py-20 text-zinc-500">
                No data in selected date range. <button onClick={clearDateFilter} className="text-amber-400 underline">Clear filter</button>
              </div>
            ) : (
              <>
                {/* Chart */}
                <div
                  ref={chartRef}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 mb-6"
                  onClick={(e) => {
                    // Deselect when clicking the chart background (not a line)
                    if ((e.target as HTMLElement).tagName === "svg" || (e.target as HTMLElement).closest(".recharts-surface")) {
                      // Let recharts handle it via activeDot
                    }
                  }}
                >
                  <h2 className="text-sm font-medium text-zinc-400 mb-4">{metricLabel} — Over Time</h2>
                  <ResponsiveContainer width="100%" height={500}>
                    <LineChart
                      data={chartData}
                      onClick={(state) => {
                        // If no active line was clicked, deselect
                        if (!state || !state.activePayload) {
                          setSelectedTicker(null);
                        }
                      }}
                    >
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
                        tickFormatter={v => isPct ? `${v.toFixed(1)}%` : v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(1)}K` : String(Number(v.toFixed(2)))}
                        width={70}
                      />
                      <Tooltip
                        content={
                          <CustomTooltip
                            selectedTicker={selectedTicker}
                            isPct={isPct}
                            visibleTickers={visibleTickers}
                          />
                        }
                        isAnimationActive={false}
                      />
                      {tickers.map(ticker => {
                        const isSelected = selectedTicker === ticker;
                        const hasSelection = selectedTicker !== null;
                        const isHidden = hiddenTickers.has(ticker);

                        return (
                          <Line
                            key={ticker}
                            type="monotone"
                            dataKey={ticker}
                            stroke={colorMap[ticker]}
                            strokeWidth={
                              isSelected ? 4 :
                              ticker === "AGPU" ? 3 :
                              hasSelection ? 1 : 1.5
                            }
                            strokeOpacity={
                              isSelected ? 1 :
                              hasSelection ? 0.15 :
                              ticker === "AGPU" ? 1 : 0.5
                            }
                            dot={false}
                            activeDot={{
                              r: isSelected ? 6 : 4,
                              strokeWidth: 2,
                              stroke: colorMap[ticker],
                              fill: "#18181b",
                              cursor: "pointer",
                              onClick: () => handleLineClick(ticker),
                            }}
                            hide={isHidden}
                            connectNulls
                            style={{ cursor: "pointer" }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Ticker legend / toggle grid */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                  <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Toggle Tickers (click to show/hide)</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {tickers.map(ticker => {
                      const hidden = hiddenTickers.has(ticker);
                      const isSelected = selectedTicker === ticker;
                      const color = colorMap[ticker];
                      return (
                        <button
                          key={ticker}
                          onClick={() => toggleTicker(ticker)}
                          className={`px-2 py-1 text-xs font-mono rounded border transition-all ${
                            hidden
                              ? "border-zinc-800 text-zinc-600 bg-transparent"
                              : isSelected
                              ? "bg-zinc-700/50 ring-1 ring-offset-1 ring-offset-zinc-950"
                              : "border-zinc-700 bg-zinc-800/50"
                          }`}
                          style={{
                            color: hidden ? undefined : color,
                            borderColor: hidden ? undefined : isSelected ? color : `${color}40`,
                            boxShadow: isSelected ? `0 0 0 2px ${color}40` : undefined,
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
          </>
        )}
      </main>
    </div>
  );
}
