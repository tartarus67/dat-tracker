import { trpc } from "@/lib/trpc";
import { useState, useMemo, useRef, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  BarChart3,
  ChevronDown,
  ArrowUpAZ,
  ArrowDownAZ,
  ArrowUp01,
  ArrowDown01,
  ExternalLink,
} from "lucide-react";
import { Link } from "wouter";
import { CRYPTO_ASSETS } from "@shared/datConfig";

// Build lookup map for CMC slugs
const CRYPTO_CMC_SLUG_MAP: Record<string, string> = {};
CRYPTO_ASSETS.forEach(a => { CRYPTO_CMC_SLUG_MAP[a.symbol] = a.cmcSlug; });

type SortField = "company" | "ticker" | "primaryAsset" | "assetSymbol" | "holdings" | "assetPrice" | "holdingsValue" | "otherAssets" | "totalAssets" | "liabilities" | "nav";
type SortDir = "asc" | "desc";

function formatUsd(val: number): string {
  if (val === 0) return "\u2014";
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toFixed(2)}`;
}

function formatPrice(price: number): string {
  if (price === 0) return "\u2014";
  if (price >= 1000) return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function formatHoldings(val: number): string {
  if (val === 0) return "\u2014";
  if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
  return val.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** Column filter dropdown */
function ColumnFilter({
  field,
  label,
  currentSort,
  onSort,
  isText,
  align = "left",
}: {
  field: SortField;
  label: string;
  currentSort: { field: SortField; dir: SortDir };
  onSort: (field: SortField, dir: SortDir) => void;
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

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 lg:p-6 space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[600px] rounded-lg" />
    </div>
  );
}

export default function NavPage() {
  const { data, isLoading, isRefetching, refetch } = trpc.dat.getNavData.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: "holdingsValue", dir: "desc" });

  const handleSort = (field: SortField, dir: SortDir) => {
    setSort({ field, dir });
  };

  const sortedRows = useMemo(() => {
    if (!data?.rows) return [];
    const items = [...data.rows];
    items.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      const field = sort.field;
      if (field === "company" || field === "ticker" || field === "primaryAsset" || field === "assetSymbol") {
        return dir * ((a as Record<string, unknown>)[field] as string).localeCompare((b as Record<string, unknown>)[field] as string);
      }
      const aVal = (a as Record<string, unknown>)[field] as number;
      const bVal = (b as Record<string, unknown>)[field] as number;
      return dir * (aVal - bVal);
    });
    return items;
  }, [data?.rows, sort]);

  if (isLoading) return <LoadingSkeleton />;

  const rows = data?.rows || [];
  const totalHoldingsValue = rows.reduce((sum, r) => sum + r.holdingsValue, 0);
  const totalNav = rows.reduce((sum, r) => sum + r.nav, 0);
  const totalOtherAssets = rows.reduce((sum, r) => sum + r.otherAssets, 0);

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
              <h1 className="text-lg font-semibold tracking-tight">Crypto Treasury NAV</h1>
              <p className="text-xs text-muted-foreground">Net Asset Value Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="h-8 px-3 rounded-md border border-border flex items-center gap-1.5 text-xs hover:bg-accent transition-colors">
              DAT Dashboard
            </Link>
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

      <div className="max-w-[1800px] mx-auto px-4 py-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Holdings Value</div>
            <div className="text-xl font-semibold font-mono tabular-nums">{formatUsd(totalHoldingsValue)}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total NAV</div>
            <div className="text-xl font-semibold font-mono tabular-nums">{formatUsd(totalNav)}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Companies</div>
            <div className="text-xl font-semibold font-mono tabular-nums">{new Set(rows.map(r => r.ticker)).size}</div>
            <div className="text-xs text-muted-foreground">{rows.length} asset rows</div>
          </div>
        </div>

        {/* NAV Table */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2.5 text-left">
                    <ColumnFilter field="company" label="Company" currentSort={sort} onSort={handleSort} isText />
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <ColumnFilter field="ticker" label="Ticker" currentSort={sort} onSort={handleSort} isText />
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <ColumnFilter field="primaryAsset" label="Primary Asset" currentSort={sort} onSort={handleSort} isText />
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <ColumnFilter field="assetSymbol" label="Asset Symbol" currentSort={sort} onSort={handleSort} isText />
                  </th>
                  <th className="px-3 py-2.5 text-right">
                    <ColumnFilter field="holdings" label="Holdings (Units)" currentSort={sort} onSort={handleSort} align="right" />
                  </th>
                  <th className="px-3 py-2.5 text-right">
                    <ColumnFilter field="assetPrice" label="Asset Price (USD)" currentSort={sort} onSort={handleSort} align="right" />
                  </th>
                  <th className="px-3 py-2.5 text-right">
                    <ColumnFilter field="holdingsValue" label="Holdings Value (USD)" currentSort={sort} onSort={handleSort} align="right" />
                  </th>
                  <th className="px-3 py-2.5 text-right">
                    <ColumnFilter field="otherAssets" label="Other Assets (USD)" currentSort={sort} onSort={handleSort} align="right" />
                  </th>
                  <th className="px-3 py-2.5 text-right">
                    <ColumnFilter field="totalAssets" label="Total Assets (USD)" currentSort={sort} onSort={handleSort} align="right" />
                  </th>
                  <th className="px-3 py-2.5 text-right">
                    <ColumnFilter field="liabilities" label="Liabilities (USD)" currentSort={sort} onSort={handleSort} align="right" />
                  </th>
                  <th className="px-3 py-2.5 text-right">
                    <ColumnFilter field="nav" label="NAV (USD)" currentSort={sort} onSort={handleSort} align="right" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, idx) => {
                  const cmcSlug = CRYPTO_CMC_SLUG_MAP[row.assetSymbol];
                  return (
                    <tr
                      key={`${row.ticker}-${row.assetSymbol}-${idx}`}
                      className={`border-b border-border/50 hover:bg-accent/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                    >
                      <td className="px-3 py-2.5">
                        <span className="text-foreground text-xs">{row.company}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <a
                          href={`https://finance.yahoo.com/quote/${row.ticker}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono font-semibold text-primary text-xs hover:underline inline-flex items-center gap-0.5"
                        >
                          {row.ticker}
                          <ExternalLink className="h-2.5 w-2.5 opacity-40" />
                        </a>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-muted-foreground text-xs">{row.primaryAsset}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        {cmcSlug ? (
                          <a
                            href={`https://coinmarketcap.com/currencies/${cmcSlug}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-warning hover:underline inline-flex items-center gap-0.5"
                          >
                            {row.assetSymbol}
                            <ExternalLink className="h-2.5 w-2.5 opacity-40" />
                          </a>
                        ) : (
                          <span className="font-mono text-xs text-warning">{row.assetSymbol}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-mono tabular-nums text-xs">{formatHoldings(row.holdings)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-mono tabular-nums text-xs">{formatPrice(row.assetPrice)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-mono tabular-nums text-xs font-semibold">{formatUsd(row.holdingsValue)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-mono tabular-nums text-xs text-muted-foreground">{row.otherAssets > 0 ? formatUsd(row.otherAssets) : "\u2014"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-mono tabular-nums text-xs">{formatUsd(row.totalAssets)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-mono tabular-nums text-xs text-muted-foreground">{row.liabilities > 0 ? formatUsd(row.liabilities) : "\u2014"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-mono tabular-nums text-xs font-semibold text-positive">{formatUsd(row.nav)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/20">
                  <td colSpan={6} className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider">Total</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-mono tabular-nums text-xs font-bold">{formatUsd(totalHoldingsValue)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-mono tabular-nums text-xs font-bold">{totalOtherAssets > 0 ? formatUsd(totalOtherAssets) : "\u2014"}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-mono tabular-nums text-xs font-bold">{formatUsd(totalHoldingsValue + totalOtherAssets)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-mono tabular-nums text-xs font-bold">{"\u2014"}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-mono tabular-nums text-xs font-bold text-positive">{formatUsd(totalNav)}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
