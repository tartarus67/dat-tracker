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
    mcap: number;
    nav: number;
    mNAV: number;
    vol24h: number;
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
