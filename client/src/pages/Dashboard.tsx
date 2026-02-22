import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
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
} from "lucide-react";

type SortField = "company" | "ticker" | "price" | "change1d" | "change7d" | "change30d" | "volume" | "datAsset";
type SortDir = "asc" | "desc";
type CategoryFilter = "all" | "Majors" | "Alts";

function formatPrice(price: number): string {
  if (price === 0) return "—";
  if (price >= 1000) return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function formatVolume(vol: number): string {
  if (vol === 0) return "—";
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return vol.toLocaleString();
}

function formatPct(pct: number): string {
  if (pct === 0) return "0.00%";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function PctCell({ value }: { value: number }) {
  if (value === 0) return <span className="text-muted-foreground font-mono tabular-nums text-sm">0.00%</span>;
  const isPositive = value > 0;
  return (
    <span className={`font-mono tabular-nums text-sm flex items-center gap-1 ${isPositive ? "text-positive" : "text-negative"}`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {formatPct(value)}
    </span>
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

  const [stockSort, setStockSort] = useState<{ field: SortField; dir: SortDir }>({ field: "ticker", dir: "asc" });
  const [cryptoSort, setCryptoSort] = useState<{ field: string; dir: SortDir }>({ field: "symbol", dir: "asc" });
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const filteredStocks = useMemo(() => {
    if (!data?.stocks) return [];
    let items = [...data.stocks];
    if (categoryFilter !== "all") {
      items = items.filter(s => s.category === categoryFilter);
    }
    items.sort((a, b) => {
      const dir = stockSort.dir === "asc" ? 1 : -1;
      const field = stockSort.field;
      if (field === "company") return dir * a.company.localeCompare(b.company);
      if (field === "ticker") return dir * a.ticker.localeCompare(b.ticker);
      if (field === "datAsset") return dir * a.datAsset.localeCompare(b.datAsset);
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

  const toggleStockSort = (field: SortField) => {
    setStockSort(prev => ({
      field,
      dir: prev.field === field && prev.dir === "asc" ? "desc" : "asc",
    }));
  };

  const toggleCryptoSort = (field: string) => {
    setCryptoSort(prev => ({
      field,
      dir: prev.field === field && prev.dir === "asc" ? "desc" : "asc",
    }));
  };

  if (isLoading) return <LoadingSkeleton />;

  const stocks = data?.stocks || [];
  const totalMarketCap = stocks.reduce((sum, s) => sum + (s.marketCap || 0), 0);
  const avgChange1d = stocks.length > 0 ? stocks.reduce((sum, s) => sum + s.change1d, 0) / stocks.length : 0;
  const gainers = stocks.filter(s => s.change1d > 0).length;
  const losers = stocks.filter(s => s.change1d < 0).length;

  const SortIcon = ({ field, currentSort }: { field: string; currentSort: { field: string; dir: SortDir } }) => {
    if (currentSort.field !== field) return <span className="text-muted-foreground/30 ml-0.5">&#x25B4;</span>;
    return <span className="text-primary ml-0.5">{currentSort.dir === "asc" ? "▴" : "▾"}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-3 flex items-center justify-between">
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
            {data?.lastUpdated && (
              <span className="text-xs text-muted-foreground font-mono">
                Updated {new Date(data.lastUpdated).toLocaleTimeString()}
              </span>
            )}
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

      <div className="container py-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Companies Tracked"
            value={stocks.length.toString()}
            icon={Activity}
            subtext={`${stocks.filter(s => s.category === "Majors").length} Majors · ${stocks.filter(s => s.category === "Alts").length} Alts`}
          />
          <StatCard
            label="Avg 1D Change"
            value={formatPct(avgChange1d)}
            icon={avgChange1d >= 0 ? TrendingUp : TrendingDown}
            subtext={`${gainers} gainers · ${losers} losers`}
          />
          <StatCard
            label="Total Market Cap"
            value={formatVolume(totalMarketCap)}
            icon={BarChart3}
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
            {/* Category Filter */}
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleStockSort("ticker")}>
                        Ticker <SortIcon field="ticker" currentSort={stockSort} />
                      </th>
                      <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleStockSort("company")}>
                        Company <SortIcon field="company" currentSort={stockSort} />
                      </th>
                      <th className="text-center px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Cat
                      </th>
                      <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleStockSort("datAsset")}>
                        Asset <SortIcon field="datAsset" currentSort={stockSort} />
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleStockSort("price")}>
                        Price <SortIcon field="price" currentSort={stockSort} />
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleStockSort("change1d")}>
                        1D % <SortIcon field="change1d" currentSort={stockSort} />
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleStockSort("change7d")}>
                        7D % <SortIcon field="change7d" currentSort={stockSort} />
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleStockSort("change30d")}>
                        30D % <SortIcon field="change30d" currentSort={stockSort} />
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleStockSort("volume")}>
                        Volume <SortIcon field="volume" currentSort={stockSort} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStocks.map((stock, idx) => (
                      <tr
                        key={stock.ticker}
                        className={`border-b border-border/50 hover:bg-accent/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                      >
                        <td className="px-3 py-2.5">
                          <span className="font-mono font-semibold text-primary text-sm">{stock.ticker}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-foreground text-sm truncate max-w-[200px] block">{stock.company}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Badge variant={stock.category === "Majors" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                            {stock.category}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-xs text-warning">{stock.datAsset}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="font-mono tabular-nums text-sm text-foreground">{formatPrice(stock.price)}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <PctCell value={stock.change1d} />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <PctCell value={stock.change7d} />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <PctCell value={stock.change30d} />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="font-mono tabular-nums text-sm text-muted-foreground">{formatVolume(stock.volume)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Crypto Tab */}
          <TabsContent value="crypto" className="space-y-3">
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleCryptoSort("symbol")}>
                        Symbol <SortIcon field="symbol" currentSort={cryptoSort} />
                      </th>
                      <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleCryptoSort("name")}>
                        Name <SortIcon field="name" currentSort={cryptoSort} />
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleCryptoSort("price")}>
                        Price <SortIcon field="price" currentSort={cryptoSort} />
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleCryptoSort("change1d")}>
                        1D % <SortIcon field="change1d" currentSort={cryptoSort} />
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleCryptoSort("change7d")}>
                        7D % <SortIcon field="change7d" currentSort={cryptoSort} />
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleCryptoSort("change30d")}>
                        30D % <SortIcon field="change30d" currentSort={cryptoSort} />
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleCryptoSort("volume")}>
                        Volume <SortIcon field="volume" currentSort={cryptoSort} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCrypto.map((crypto, idx) => (
                      <tr
                        key={crypto.yahooSymbol}
                        className={`border-b border-border/50 hover:bg-accent/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                      >
                        <td className="px-3 py-2.5">
                          <span className="font-mono font-semibold text-warning text-sm">{crypto.symbol}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-foreground text-sm">{crypto.name}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="font-mono tabular-nums text-sm text-foreground">{formatPrice(crypto.price)}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <PctCell value={crypto.change1d} />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <PctCell value={crypto.change7d} />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <PctCell value={crypto.change30d} />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="font-mono tabular-nums text-sm text-muted-foreground">{formatVolume(crypto.volume)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
