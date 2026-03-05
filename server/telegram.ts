import axios from "axios";
import { ENV } from "./_core/env";

const TELEGRAM_CHAT_ID = "1507917898"; // Victor @nvxin
const MAX_MSG_LENGTH = 4096; // Telegram message limit

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = ENV.telegramBotToken;
  if (!token) {
    console.warn("[Telegram] No bot token configured");
    return false;
  }

  try {
    // Split long messages
    const chunks = splitMessage(text, MAX_MSG_LENGTH);
    for (const chunk of chunks) {
      const res = await axios.post(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          chat_id: TELEGRAM_CHAT_ID,
          text: chunk,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        },
        { timeout: 15000 }
      );
      if (!res.data.ok) {
        console.error("[Telegram] API error:", res.data.description);
        return false;
      }
    }
    console.log(`[Telegram] Sent ${chunks.length} message(s) to @nvxin`);
    return true;
  } catch (err: any) {
    console.error("[Telegram] Failed to send:", err.message);
    return false;
  }
}

function splitMessage(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  const lines = text.split("\n");
  let current = "";
  for (const line of lines) {
    if (current.length + line.length + 1 > maxLen) {
      chunks.push(current);
      current = line;
    } else {
      current += (current ? "\n" : "") + line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Format the report data into a Telegram-friendly HTML message
 */
export function formatTelegramReport(reportData: {
  stocks: Array<{
    ticker: string;
    company: string;
    category: string;
    price: number;
    change1d: number;
    change7d: number;
    change30d: number;
    mcap: number;
    nav: number;
    mNAV: number;
    vol24h: number;
    vol1dPct: number;
    vol7dPct: number;
    vol30dPct: number;
  }>;
  crypto: Array<{
    symbol: string;
    name: string;
    price: number;
    change1d: number;
    change7d: number;
  }>;
}): string {
  const { stocks, crypto } = reportData;

  const gainers = stocks.filter(s => s.change1d > 0).length;
  const losers = stocks.filter(s => s.change1d < 0).length;
  const avgChange = stocks.length > 0
    ? stocks.reduce((sum, s) => sum + s.change1d, 0) / stocks.length
    : 0;
  const totalMcap = stocks.reduce((sum, s) => sum + s.mcap, 0);
  const totalNav = stocks.reduce((sum, s) => sum + s.nav, 0);

  const arrow = avgChange >= 0 ? "📈" : "📉";
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Singapore",
  });

  let msg = `<b>📊 DAT Daily Report</b>\n`;
  msg += `<i>${date} | 10:00 AM SGT</i>\n\n`;

  // ─── TLDR Section ───
  msg += buildTldr(stocks);

  msg += `${arrow} <b>Avg 1D Change:</b> ${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(2)}%\n`;
  msg += `📊 <b>Total MCAP:</b> $${fmtB(totalMcap)}\n`;
  msg += `💰 <b>Total NAV:</b> $${fmtB(totalNav)}\n`;
  msg += `🟢 ${gainers} gainers · 🔴 ${losers} losers\n\n`;

  // Top 5 gainers
  const sorted = [...stocks].sort((a, b) => b.change1d - a.change1d);
  const top5 = sorted.slice(0, 5);
  const bottom5 = sorted.slice(-5).reverse();

  msg += `<b>🔥 Top 5 Gainers</b>\n`;
  for (const s of top5) {
    msg += `  ${s.ticker} <b>+${s.change1d.toFixed(2)}%</b> ($${s.price.toFixed(2)})\n`;
  }

  msg += `\n<b>❄️ Top 5 Losers</b>\n`;
  for (const s of bottom5) {
    msg += `  ${s.ticker} <b>${s.change1d.toFixed(2)}%</b> ($${s.price.toFixed(2)})\n`;
  }

  // Majors summary
  msg += `\n<b>📋 Majors</b>\n`;
  const majors = stocks.filter(s => s.category === "Majors").sort((a, b) => b.mcap - a.mcap);
  for (const s of majors.slice(0, 10)) {
    const ch = s.change1d >= 0 ? `+${s.change1d.toFixed(2)}%` : `${s.change1d.toFixed(2)}%`;
    const mcapStr = s.mcap > 0 ? `$${fmtB(s.mcap)}` : "—";
    msg += `  ${s.ticker}: $${s.price.toFixed(2)} (${ch}) MCAP: ${mcapStr}\n`;
  }

  // Crypto summary
  msg += `\n<b>₿ Crypto Assets</b>\n`;
  const sortedCrypto = [...crypto].sort((a, b) => b.change1d - a.change1d);
  for (const c of sortedCrypto) {
    const ch = c.change1d >= 0 ? `+${c.change1d.toFixed(2)}%` : `${c.change1d.toFixed(2)}%`;
    msg += `  ${c.symbol}: $${fmtPrice(c.price)} (${ch})\n`;
  }

  msg += `\n<i>🔗 Full dashboard: datdash-htsxo2qg.manus.space</i>`;

  return msg;
}

/**
 * Build TLDR section: AGPU vs cohort, Majors avg, Alts avg
 * for price % change and volume % change across 1D/7D/30D
 */
function buildTldr(stocks: Array<{
  ticker: string; category: string;
  change1d: number; change7d: number; change30d: number;
  vol1dPct: number; vol7dPct: number; vol30dPct: number;
}>): string {
  const p = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

  const valid = stocks.filter(s => s.change1d !== 0 || s.change7d !== 0);
  const majors = valid.filter(s => s.category === "Majors");
  const alts = valid.filter(s => s.category === "Alts");
  const agpu = stocks.find(s => s.ticker === "AGPU");

  const avg = (arr: typeof stocks, fn: (s: typeof stocks[0]) => number) =>
    arr.length > 0 ? arr.reduce((s, x) => s + fn(x), 0) / arr.length : 0;

  // Cohort averages (all stocks)
  const cohortPrice1d = avg(valid, s => s.change1d);
  const cohortPrice7d = avg(valid, s => s.change7d);
  const cohortPrice30d = avg(valid, s => s.change30d);
  const cohortVol1d = avg(valid, s => s.vol1dPct);
  const cohortVol7d = avg(valid, s => s.vol7dPct);
  const cohortVol30d = avg(valid, s => s.vol30dPct);

  // Rank helper (1 = best)
  const rank = (arr: number[], val: number) => {
    const sorted = [...arr].sort((a, b) => b - a);
    return sorted.indexOf(val) + 1 || sorted.length;
  };

  let tldr = `<b>⚡ TLDR</b>\n\n`;

  // AGPU vs cohort
  if (agpu) {
    const priceRank1d = rank(valid.map(s => s.change1d), agpu.change1d);
    const priceRank7d = rank(valid.map(s => s.change7d), agpu.change7d);
    const priceRank30d = rank(valid.map(s => s.change30d), agpu.change30d);
    tldr += `<b>AGPU vs Cohort (Price)</b>\n`;
    tldr += `• 1D: ${p(agpu.change1d)} vs avg ${p(cohortPrice1d)} (#${priceRank1d}/${valid.length})\n`;
    tldr += `• 7D: ${p(agpu.change7d)} vs avg ${p(cohortPrice7d)} (#${priceRank7d}/${valid.length})\n`;
    tldr += `• 30D: ${p(agpu.change30d)} vs avg ${p(cohortPrice30d)} (#${priceRank30d}/${valid.length})\n\n`;

    const volRank1d = rank(valid.map(s => s.vol1dPct), agpu.vol1dPct);
    const volRank7d = rank(valid.map(s => s.vol7dPct), agpu.vol7dPct);
    const volRank30d = rank(valid.map(s => s.vol30dPct), agpu.vol30dPct);
    tldr += `<b>AGPU vs Cohort (Volume)</b>\n`;
    tldr += `• 1D: ${p(agpu.vol1dPct)} vs avg ${p(cohortVol1d)} (#${volRank1d}/${valid.length})\n`;
    tldr += `• 7D: ${p(agpu.vol7dPct)} vs avg ${p(cohortVol7d)} (#${volRank7d}/${valid.length})\n`;
    tldr += `• 30D: ${p(agpu.vol30dPct)} vs avg ${p(cohortVol30d)} (#${volRank30d}/${valid.length})\n\n`;
  }

  // Majors category
  const majPrice1d = avg(majors, s => s.change1d);
  const majPrice7d = avg(majors, s => s.change7d);
  const majPrice30d = avg(majors, s => s.change30d);
  const majVol1d = avg(majors, s => s.vol1dPct);
  const majVol7d = avg(majors, s => s.vol7dPct);
  const majVol30d = avg(majors, s => s.vol30dPct);
  tldr += `<b>Majors (${majors.length})</b>\n`;
  tldr += `• Price: 1D ${p(majPrice1d)} | 7D ${p(majPrice7d)} | 30D ${p(majPrice30d)}\n`;
  tldr += `• Volume: 1D ${p(majVol1d)} | 7D ${p(majVol7d)} | 30D ${p(majVol30d)}\n\n`;

  // Alts category
  const altPrice1d = avg(alts, s => s.change1d);
  const altPrice7d = avg(alts, s => s.change7d);
  const altPrice30d = avg(alts, s => s.change30d);
  const altVol1d = avg(alts, s => s.vol1dPct);
  const altVol7d = avg(alts, s => s.vol7dPct);
  const altVol30d = avg(alts, s => s.vol30dPct);
  tldr += `<b>Alts (${alts.length})</b>\n`;
  tldr += `• Price: 1D ${p(altPrice1d)} | 7D ${p(altPrice7d)} | 30D ${p(altPrice30d)}\n`;
  tldr += `• Volume: 1D ${p(altVol1d)} | 7D ${p(altVol7d)} | 30D ${p(altVol30d)}\n\n`;

  return tldr;
}

function fmtB(val: number): string {
  if (val >= 1e3) return `${(val / 1e3).toFixed(1)}T`;
  if (val >= 1) return `${val.toFixed(1)}B`;
  return `${(val * 1e3).toFixed(0)}M`;
}

function fmtPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(6);
}
