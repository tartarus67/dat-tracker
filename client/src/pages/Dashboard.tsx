import { trpc } from "@/lib/trpc";
import { useState, useMemo, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Bitcoin,
  Activity,
  Send,
  ChevronDown,
  ArrowUpAZ,
  ArrowDownAZ,
  ArrowUp01,
  ArrowDown01,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { CRYPTO_ASSETS } from "@shared/datConfig";

// Build lookup maps for links
const CRYPTO_CMC_SLUG_MAP: Record<string, string> = {};
CRYPTO_ASSETS.forEach(a => { CRYPTO_CMC_SLUG_MAP[a.symbol] = a.cmcSlug; });

type SortField = "category" | "company" | "ticker" | "price" | "change1d" | "change7d" | "change30d" | "vol24h" | "datAsset" | "mcap" | "nav" | "mNAV" | "tokenPrice" | "tokenPrice7d" | "tokenPrice30d" | "vol1dPct" | "vol7dAvg" | "vol7dPct" | "vol30dAvg" | "vol30dPct";
type SortDir = "asc" | "desc";
type CategoryFilter = "all" | "Majors" | "Alts";

function formatPrice(price: number): string {
  if (price === 0) return "\u2014";
  if (price >= 1000) return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function formatVol(vol: number): string {
  if (vol === 0) return "\u2014";
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return vol.toLocaleString();
}

function formatMcap(val: number): string {
  if (val === 0) return "\u2014";
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}B`;
  return `$${val.toFixed(0)}M`;
}

function formatPct(pct: number): string {
  if (pct === 0) return "0.00%";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function PctCell({ value }: { value: number }) {
  if (value === 0) return <span className="text-muted-foreground font-mono tabular-nums text-xs">0.00%</span>;
  const isPositive = value > 0;
  return (
    <span className={`font-mono tabular-nums text-xs flex items-center gap-0.5 justify-end ${isPositive ? "text-positive" : "text-negative"}`}>
      {isPositive ? <ArrowUpRight className="h-2.5 w-2.5 shrink-0" /> : <ArrowDownRight className="h-2.5 w-2.5 shrink-0" />}
      {formatPct(value)}
    </span>
  );
}

/** Google Sheets-style column filter dropdown */
function ColumnFilter({
  field,
  label,
  currentSort,
  onSort,
  isText,
  align = "right",
}: {
  field: string;
  label: string;
  currentSort: { field: string; dir: SortDir };
  onSort: (field: string, dir: SortDir) => void;
  isText?: boolean;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = currentSort.field === field;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className={`relative inline-flex ${align === "right" ? "justify-end" : ""}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-0.5 text-[10px] font-medium uppercase tracking-wider whitespace-nowrap transition-colors ${
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {label}
        <ChevronDown className={`h-2.5 w-2.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className={`absolute top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[140px] ${align === "right" ? "right-0" : "left-0"}`}>
          <button
            onClick={() => { onSort(field, "asc"); setOpen(false); }}
            className={`w-full px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-accent transition-colors ${
              isActive && currentSort.dir === "asc" ? "text-primary" : "text-foreground"
            }`}
          >
            {isText ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <ArrowUp01 className="h-3.5 w-3.5" />}
            Sort {isText ? "A\u2013Z" : "Low \u2192 High"}
          </button>
          <button
            onClick={() => { onSort(field, "desc"); setOpen(false); }}
            className={`w-full px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-accent transition-colors ${
              isActive && currentSort.dir === "desc" ? "text-primary" : "text-foreground"
            }`}
          >
            {isText ? <ArrowDownAZ className="h-3.5 w-3.5" /> : <ArrowDown01 className="h-3.5 w-3.5" />}
            Sort {isText ? "Z\u2013A" : "High \u2192 Low"}
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, subtext }: { label: string; value: string; icon: React.ElementType; subtext?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-xl font-semibold font-mono tabular-nums text-foreground">{value}</div>
      {subtext && <div className="text-xs text-muted-foreground">{subtext}</div>}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[600px] rounded-lg" />
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, isRefetching, refetch } = trpc.dat.getDashboardData.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  // Fetch latest snapshot date for health indicator
  const { data: snapshotDates } = trpc.dat.getSnapshotDates.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });

  const sendReport = trpc.dat.sendReport.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Report sent successfully");
      } else {
        toast.error("Failed to send report");
      }
    },
    onError: () => {
      toast.error("Failed to generate report");
    },
  });

  const [stockSort, setStockSort] = useState<{ field: string; dir: SortDir }>({ field: "ticker", dir: "asc" });
  const [cryptoSort, setCryptoSort] = useState<{ field: string; dir: SortDir }>({ field: "symbol", dir: "asc" });
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const handleStockSort = (field: string, dir: SortDir) => {
    setStockSort({ field, dir });
  };

  const handleCryptoSort = (field: string, dir: SortDir) => {
    setCryptoSort({ field, dir });
  };

  const filteredStocks = useMemo(() => {
    if (!data?.stocks) return [];
    let items = [...data.stocks];
    if (categoryFilter !== "all") {
      items = items.filter(s => s.category === categoryFilter);
    }
    items.sort((a, b) => {
      const dir = stockSort.dir === "asc" ? 1 : -1;
      const field = stockSort.field;
      if (field === "company" || field === "ticker" || field === "datAsset" || field === "category") {
        return dir * ((a as Record<string, unknown>)[field] as string).localeCompare((b as Record<string, unknown>)[field] as string);
      }
      const aVal = (a as Record<string, unknown>)[field] as number;
      const bVal = (b as Record<string, unknown>)[field] as number;
      return dir * (aVal - bVal);
    });
    return items;
  }, [data?.stocks, stockSort, categoryFilter]);

  const sortedCrypto = useMemo(() => {
    if (!data?.crypto) return [];
    const items = [...data.crypto];
    items.sort((a, b) => {
      const dir = cryptoSort.dir === "asc" ? 1 : -1;
      const field = cryptoSort.field;
      if (field === "symbol" || field === "name") return dir * ((a as Record<string, unknown>)[field] as string).localeCompare((b as Record<string, unknown>)[field] as string);
      const aVal = (a as Record<string, unknown>)[field] as number;
      const bVal = (b as Record<string, unknown>)[field] as number;
      return dir * (aVal - bVal);
    });
    return items;
  }, [data?.crypto, cryptoSort]);

  if (isLoading) return <LoadingSkeleton />;

  const stocks = data?.stocks || [];
  const totalMcap = stocks.reduce((sum, s) => sum + (s.mcap || 0), 0);
  const totalNav = stocks.reduce((sum, s) => sum + (s.nav || 0), 0);
  const avgChange1d = stocks.length > 0 ? stocks.reduce((sum, s) => sum + s.change1d, 0) / stocks.length : 0;
  const gainers = stocks.filter(s => s.change1d > 0).length;
  const losers = stocks.filter(s => s.change1d < 0).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">DAT Tracker</h1>
              <p className="text-xs text-muted-foreground">Digital Asset Treasury Companies</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/nav" className="h-8 px-3 rounded-md border border-border flex items-center gap-1.5 text-xs hover:bg-accent transition-colors">
              Crypto Treasury NAV
            </Link>
            <Link href="/snapshots" className="h-8 px-3 rounded-md border border-border flex items-center gap-1.5 text-xs hover:bg-accent transition-colors">
              Snapshots
            </Link>
            <Link href="/admin/holdings" className="h-8 px-3 rounded-md border border-border flex items-center gap-1.5 text-xs hover:bg-accent transition-colors">
              Admin
            </Link>
            {data?.lastUpdated && (
              <span className="text-xs text-muted-foreground font-mono">
                Updated {new Date(data.lastUpdated).toLocaleTimeString()}
              </span>
            )}
            {snapshotDates && snapshotDates.length > 0 && (() => {
              const lastDate = snapshotDates[0];
              const lastSnapshotTime = new Date(lastDate + "T00:00:00Z").getTime();
              const hoursAgo = Math.floor((Date.now() - lastSnapshotTime) / (1000 * 60 * 60));
              const isStale = hoursAgo > 36; // more than 36h means missed a day
              return (
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${isStale ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                  Snapshot: {lastDate} ({hoursAgo < 24 ? "today" : `${Math.floor(hoursAgo / 24)}d ago`})
                </span>
              );
            })()}
            <button
              onClick={() => sendReport.mutate()}
              disabled={sendReport.isPending}
              className="h-8 px-3 rounded-md border border-border flex items-center gap-1.5 text-xs hover:bg-accent transition-colors disabled:opacity-50"
            >
              <Send className="h-3 w-3" />
              {sendReport.isPending ? "Sending..." : "Send Report"}
            </button>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-8 w-8 rounded-md border border-border flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1800px] mx-auto px-4 py-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            label="Companies Tracked"
            value={stocks.length.toString()}
            icon={Activity}
            subtext={`${stocks.filter(s => s.category === "Majors").length} Majors \u00B7 ${stocks.filter(s => s.category === "Alts").length} Alts`}
          />
          <StatCard
            label="Avg 1D Change"
            value={formatPct(avgChange1d)}
            icon={avgChange1d >= 0 ? TrendingUp : TrendingDown}
            subtext={`${gainers} gainers \u00B7 ${losers} losers`}
          />
          <StatCard
            label="Total MCAP"
            value={formatMcap(totalMcap)}
            icon={BarChart3}
          />
          <StatCard
            label="Total NAV"
            value={totalNav > 0 ? formatMcap(totalNav) : "\u2014"}
            icon={TrendingUp}
            subtext="Holdings × Token Price"
          />
          <StatCard
            label="Crypto Assets"
            value={(data?.crypto || []).length.toString()}
            icon={Bitcoin}
            subtext="Underlying assets tracked"
          />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="stocks" className="space-y-4">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="stocks" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              DAT Companies
            </TabsTrigger>
            <TabsTrigger value="crypto" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Crypto Assets
            </TabsTrigger>
          </TabsList>

          {/* Stocks Tab */}
          <TabsContent value="stocks" className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Filter:</span>
              {(["all", "Majors", "Alts"] as CategoryFilter[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    categoryFilter === cat
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat === "all" ? "All" : cat}
                </button>
              ))}
              <span className="text-xs text-muted-foreground ml-2">
                {filteredStocks.length} companies
              </span>
            </div>

            {/* Stock Table */}
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    {/* Group headers */}
                    <tr className="border-b border-border bg-muted/20">
                      <th colSpan={3} className="px-2 py-1.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/50">Company Info</th>
                      <th colSpan={4} className="px-2 py-1.5 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/50">Stock Price</th>
                      <th colSpan={3} className="px-2 py-1.5 text-center text-[10px] font-semibold text-warning/70 uppercase tracking-wider border-r border-border/50">Token Price</th>
                      <th colSpan={3} className="px-2 py-1.5 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/50">Valuation</th>
                      <th colSpan={6} className="px-2 py-1.5 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Volume</th>
                    </tr>
                    {/* Column headers with filter dropdowns */}
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-2 py-2 text-left">
                        <ColumnFilter field="category" label="Cat" currentSort={stockSort} onSort={handleStockSort} isText align="left" />
                      </th>
                      <th className="px-2 py-2 text-left">
                        <ColumnFilter field="ticker" label="Ticker" currentSort={stockSort} onSort={handleStockSort} isText align="left" />
                      </th>
                      <th className="px-2 py-2 text-left">
                        <ColumnFilter field="datAsset" label="Asset" currentSort={stockSort} onSort={handleStockSort} isText align="left" />
                      </th>
                      <th className="px-2 py-2 text-right">
                        <ColumnFilter field="price" label="Price ($)" currentSort={stockSort} onSort={handleStockSort} />
                      </th>
                      <th className="px-2 py-2 text-right">
                        <ColumnFilter field="change1d" label="1D %" currentSort={stockSort} onSort={handleStockSort} />
                      </th>
                      <th className="px-2 py-2 text-right">
                        <ColumnFilter field="change7d" label="7D %" currentSort={stockSort} onSort={handleStockSort} />
                      </th>
                      <th className="px-2 py-2 text-right">
                        <ColumnFilter field="change30d" label="30D %" currentSort={stockSort} onSort={handleStockSort} />
                      </th>
                      <th className="px-2 py-2 text-right">
                        <ColumnFilter field="tokenPrice" label="Token $" currentSort={stockSort} onSort={handleStockSort} />
                      </th>
                      <th className="px-2 py-2 text-right">
                        <ColumnFilter field="tokenPrice7d" label="7D %" currentSort={stockSort} onSort={handleStockSort} />
                      </th>
                      <th className="px-2 py-2 text-right">
                        <ColumnFilter field="tokenPrice30d" label="30D %" currentSort={stockSort} onSort={handleStockSort} />
                      </th>
                      <th className="px-2 py-2 text-right">
                        <ColumnFilter field="mcap" label="MCAP ($M)" currentSort={stockSort} onSort={handleStockSort} />
                      </th>
                      <th className="px-2 py-2 text-right">
                        <ColumnFilter field="nav" label="NAV ($M)" currentSort={stockSort} onSort={handleStockSort} />
                      </th>
                      <th className="px-2 py-2 text-right">
                        <ColumnFilter field="mNAV" label="mNAV" currentSort={stockSort} onSort={handleStockSort} />
                      </th>
                      <th className="px-2 py-2 text-right">
                        <ColumnFilter field="vol24h" label="Vol (24h)" currentSort={stockSort} onSort={handleStockSort} />
                      </th>
                      <th className="px-2 py-2 text-right">
                        <ColumnFilter field="vol1dPct" label="1D %" currentSort={stockSort} onSort={handleStockSort} />
                      </th>
                      <th className="px-2 py-2 text-right">
                        <ColumnFilter field="vol7dAvg" label="7D Avg" currentSort={stockSort} onSort={handleStockSort} />
                      </th>
                      <th className="px-2 py-2 text-right">
                        <ColumnFilter field="vol7dPct" label="7D %" currentSort={stockSort} onSort={handleStockSort} />
                      </th>
                      <th className="px-2 py-2 text-right">
                        <ColumnFilter field="vol30dAvg" label="30D Avg" currentSort={stockSort} onSort={handleStockSort} />
                      </th>
                      <th className="px-2 py-2 text-right">
                        <ColumnFilter field="vol30dPct" label="30D %" currentSort={stockSort} onSort={handleStockSort} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStocks.map((stock, idx) => {
                      const cmcSlug = CRYPTO_CMC_SLUG_MAP[stock.datAsset];
                      return (
                        <tr
                          key={stock.ticker}
                          className={`border-b border-border/50 hover:bg-accent/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                        >
                          <td className="px-2 py-2">
                            <Badge variant={stock.category === "Majors" ? "default" : "secondary"} className="text-[9px] px-1 py-0">
                              {stock.category}
                            </Badge>
                          </td>
                          <td className="px-2 py-2">
                            <a
                              href={`https://finance.yahoo.com/quote/${stock.ticker}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono font-semibold text-primary text-xs hover:underline inline-flex items-center gap-0.5"
                            >
                              {stock.ticker}
                              <ExternalLink className="h-2.5 w-2.5 opacity-40" />
                            </a>
                          </td>
                          <td className="px-2 py-2">
                            {cmcSlug ? (
                              <a
                                href={`https://coinmarketcap.com/currencies/${cmcSlug}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[10px] text-warning hover:underline inline-flex items-center gap-0.5"
                              >
                                {stock.datAsset}
                                <ExternalLink className="h-2.5 w-2.5 opacity-40" />
                              </a>
                            ) : (
                              <span className="font-mono text-[10px] text-warning">{stock.datAsset}</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <span className="font-mono tabular-nums text-xs">{formatPrice(stock.price)}</span>
                          </td>
                          <td className="px-2 py-2 text-right"><PctCell value={stock.change1d} /></td>
                          <td className="px-2 py-2 text-right"><PctCell value={stock.change7d} /></td>
                          <td className="px-2 py-2 text-right"><PctCell value={stock.change30d} /></td>
                          <td className="px-2 py-2 text-right">
                            <span className="font-mono tabular-nums text-xs text-warning">{formatPrice(stock.tokenPrice)}</span>
                          </td>
                          <td className="px-2 py-2 text-right"><PctCell value={stock.tokenPrice7d} /></td>
                          <td className="px-2 py-2 text-right"><PctCell value={stock.tokenPrice30d} /></td>
                          <td className="px-2 py-2 text-right">
                            <span className="font-mono tabular-nums text-xs">{stock.mcap > 0 ? formatMcap(stock.mcap) : "\u2014"}</span>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <span className="font-mono tabular-nums text-xs">{stock.nav > 0 ? formatMcap(stock.nav) : "\u2014"}</span>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <span className={`font-mono tabular-nums text-xs ${stock.mNAV > 1 ? "text-positive" : stock.mNAV > 0 ? "text-negative" : "text-muted-foreground"}`}>
                              {stock.mNAV > 0 ? `${stock.mNAV.toFixed(2)}x` : "\u2014"}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <span className="font-mono tabular-nums text-xs text-muted-foreground">{formatVol(stock.vol24h)}</span>
                          </td>
                          <td className="px-2 py-2 text-right"><PctCell value={stock.vol1dPct} /></td>
                          <td className="px-2 py-2 text-right">
                            <span className="font-mono tabular-nums text-xs text-muted-foreground">{formatVol(stock.vol7dAvg)}</span>
                          </td>
                          <td className="px-2 py-2 text-right"><PctCell value={stock.vol7dPct} /></td>
                          <td className="px-2 py-2 text-right">
                            <span className="font-mono tabular-nums text-xs text-muted-foreground">{formatVol(stock.vol30dAvg)}</span>
                          </td>
                          <td className="px-2 py-2 text-right"><PctCell value={stock.vol30dPct} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Crypto Tab */}
          <TabsContent value="crypto" className="space-y-3">
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-2.5 text-left">
                        <ColumnFilter field="symbol" label="Symbol" currentSort={cryptoSort} onSort={handleCryptoSort} isText align="left" />
                      </th>
                      <th className="px-3 py-2.5 text-left">
                        <ColumnFilter field="name" label="Name" currentSort={cryptoSort} onSort={handleCryptoSort} isText align="left" />
                      </th>
                      <th className="px-3 py-2.5 text-right">
                        <ColumnFilter field="price" label="Price ($)" currentSort={cryptoSort} onSort={handleCryptoSort} />
                      </th>
                      <th className="px-3 py-2.5 text-right">
                        <ColumnFilter field="change1d" label="1D %" currentSort={cryptoSort} onSort={handleCryptoSort} />
                      </th>
                      <th className="px-3 py-2.5 text-right">
                        <ColumnFilter field="change7d" label="7D %" currentSort={cryptoSort} onSort={handleCryptoSort} />
                      </th>
                      <th className="px-3 py-2.5 text-right">
                        <ColumnFilter field="change30d" label="30D %" currentSort={cryptoSort} onSort={handleCryptoSort} />
                      </th>
                      <th className="px-3 py-2.5 text-right">
                        <ColumnFilter field="volume" label="Volume (24h)" currentSort={cryptoSort} onSort={handleCryptoSort} />
                      </th>
                      <th className="px-3 py-2.5 text-right">
                        <ColumnFilter field="marketCap" label="Market Cap" currentSort={cryptoSort} onSort={handleCryptoSort} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCrypto.map((crypto, idx) => {
                      const cmcSlug = CRYPTO_CMC_SLUG_MAP[crypto.symbol];
                      return (
                        <tr
                          key={crypto.symbol}
                          className={`border-b border-border/50 hover:bg-accent/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                        >
                          <td className="px-3 py-2.5">
                            {cmcSlug ? (
                              <a
                                href={`https://coinmarketcap.com/currencies/${cmcSlug}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono font-semibold text-warning text-xs hover:underline inline-flex items-center gap-0.5"
                              >
                                {crypto.symbol}
                                <ExternalLink className="h-2.5 w-2.5 opacity-40" />
                              </a>
                            ) : (
                              <span className="font-mono font-semibold text-warning text-xs">{crypto.symbol}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-foreground text-xs">{crypto.name}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="font-mono tabular-nums text-xs">{formatPrice(crypto.price)}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right"><PctCell value={crypto.change1d} /></td>
                          <td className="px-3 py-2.5 text-right"><PctCell value={crypto.change7d} /></td>
                          <td className="px-3 py-2.5 text-right"><PctCell value={crypto.change30d} /></td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="font-mono tabular-nums text-xs text-muted-foreground">{formatVol(crypto.volume)}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="font-mono tabular-nums text-xs text-muted-foreground">{formatVol(crypto.marketCap)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Data freshness footer for external viewers */}
      <footer className="mt-8 pb-6 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Data sources: CoinMarketCap (crypto) · Yahoo Finance (stocks)</span>
            <span>Refresh: every 30 min</span>
          </div>
          <div className="flex items-center gap-4">
            {data?.lastUpdated && (
              <span className="font-mono">
                Last refresh: {new Date(data.lastUpdated).toLocaleString()}
              </span>
            )}
            {snapshotDates && snapshotDates.length > 0 && (
              <span className="font-mono">
                Latest snapshot: {snapshotDates[0]}
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
