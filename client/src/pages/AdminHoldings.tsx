import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Save, RefreshCw, Shield, Pencil, X, Check, Database } from "lucide-react";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

type Holding = {
  id: number;
  ticker: string;
  company: string;
  category: string;
  datAsset: string;
  holdings: number;
  otherAssets: number;
  liabilities: number;
  updatedBy: string | null;
  updatedAt: Date;
};

export default function AdminHoldings() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { data: holdings, isLoading, refetch } = trpc.dat.getHoldings.useQuery();
  const updateHolding = trpc.dat.updateHolding.useMutation({
    onSuccess: () => {
      toast.success("Holdings updated");
      refetch();
      setEditingTicker(null);
    },
    onError: (err) => {
      toast.error("Failed to update: " + err.message);
    },
  });
  const seedHoldings = trpc.dat.seedHoldings.useMutation({
    onSuccess: (data) => {
      toast.success(`Seeded ${data.seeded} holdings`);
      refetch();
    },
  });

  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    holdings: string;
    otherAssets: string;
    liabilities: string;
  }>({ holdings: "0", otherAssets: "0", liabilities: "0" });

  const startEdit = (h: Holding) => {
    setEditingTicker(h.ticker);
    setEditValues({
      holdings: h.holdings.toString(),
      otherAssets: h.otherAssets.toString(),
      liabilities: h.liabilities.toString(),
    });
  };

  const cancelEdit = () => {
    setEditingTicker(null);
  };

  const saveEdit = (h: Holding) => {
    updateHolding.mutate({
      ticker: h.ticker,
      company: h.company,
      category: h.category,
      datAsset: h.datAsset,
      holdings: parseFloat(editValues.holdings) || 0,
      otherAssets: parseFloat(editValues.otherAssets) || 0,
      liabilities: parseFloat(editValues.liabilities) || 0,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
          <p className="text-zinc-400 mb-4">Please log in to manage company holdings.</p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded font-medium hover:bg-amber-500/30 transition-colors"
          >
            Log In
          </a>
        </div>
      </div>
    );
  }

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
              <h1 className="text-lg font-bold tracking-tight font-[Space_Grotesk] flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                Admin — Company Holdings
              </h1>
              <p className="text-xs text-zinc-500">
                Edit holdings data used for NAV calculations. Logged in as {user?.name || user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/" className="text-zinc-400 hover:text-zinc-200 px-2 py-1">Dashboard</Link>
              <Link href="/nav" className="text-zinc-400 hover:text-zinc-200 px-2 py-1">NAV</Link>
              <Link href="/snapshots" className="text-zinc-400 hover:text-zinc-200 px-2 py-1">Snapshots</Link>
              <span className="text-amber-400 px-2 py-1 border-b border-amber-400">Admin</span>
            </nav>
            {holdings && holdings.length === 0 && (
              <button
                onClick={() => seedHoldings.mutate()}
                disabled={seedHoldings.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-50"
              >
                <Database className="w-3.5 h-3.5" />
                {seedHoldings.isPending ? "Seeding..." : "Seed from Config"}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-20 text-zinc-500">Loading holdings...</div>
        ) : holdings && holdings.length > 0 ? (
          <div className="overflow-x-auto border border-zinc-800 rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-900/80 text-zinc-400 uppercase tracking-wider">
                  <th className="px-3 py-2 text-left font-medium">Category</th>
                  <th className="px-3 py-2 text-left font-medium">Ticker</th>
                  <th className="px-3 py-2 text-left font-medium">Company</th>
                  <th className="px-3 py-2 text-left font-medium">DAT Asset</th>
                  <th className="px-3 py-2 text-right font-medium">Holdings (Units)</th>
                  <th className="px-3 py-2 text-right font-medium">Other Assets ($)</th>
                  <th className="px-3 py-2 text-right font-medium">Liabilities ($)</th>
                  <th className="px-3 py-2 text-left font-medium">Last Updated By</th>
                  <th className="px-3 py-2 text-left font-medium">Updated At</th>
                  <th className="px-3 py-2 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const isEditing = editingTicker === h.ticker;
                  return (
                    <tr key={h.ticker} className={`border-t border-zinc-800/50 ${isEditing ? "bg-zinc-800/50" : "hover:bg-zinc-800/30"}`}>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          h.category === "Majors"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-purple-500/20 text-purple-400"
                        }`}>
                          {h.category}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-zinc-200">{h.ticker}</td>
                      <td className="px-3 py-2 text-zinc-300">{h.company}</td>
                      <td className="px-3 py-2 text-amber-400 font-mono">{h.datAsset}</td>
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.holdings}
                            onChange={(e) => setEditValues(v => ({ ...v, holdings: e.target.value }))}
                            className="w-32 bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-right font-mono text-zinc-200 text-xs focus:outline-none focus:border-amber-500"
                          />
                        ) : (
                          <span className="font-mono text-zinc-200">
                            {h.holdings > 0 ? h.holdings.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.otherAssets}
                            onChange={(e) => setEditValues(v => ({ ...v, otherAssets: e.target.value }))}
                            className="w-32 bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-right font-mono text-zinc-200 text-xs focus:outline-none focus:border-amber-500"
                          />
                        ) : (
                          <span className="font-mono text-zinc-400">
                            {h.otherAssets > 0 ? `$${h.otherAssets.toLocaleString()}` : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.liabilities}
                            onChange={(e) => setEditValues(v => ({ ...v, liabilities: e.target.value }))}
                            className="w-32 bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-right font-mono text-zinc-200 text-xs focus:outline-none focus:border-amber-500"
                          />
                        ) : (
                          <span className="font-mono text-zinc-400">
                            {h.liabilities > 0 ? `$${h.liabilities.toLocaleString()}` : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-zinc-500 text-xs">{h.updatedBy || "—"}</td>
                      <td className="px-3 py-2 text-zinc-500 text-xs font-mono">
                        {new Date(h.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => saveEdit(h)}
                              disabled={updateHolding.isPending}
                              className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(h)}
                            className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20">
            <Database className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-zinc-300 mb-2">No Holdings Data</h2>
            <p className="text-zinc-500 mb-4">
              Holdings data hasn't been seeded yet. Click "Seed from Config" to populate from the hardcoded configuration.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
