import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies before importing scheduler
vi.mock("node-cron", () => ({
  default: {
    schedule: vi.fn(),
  },
}));

vi.mock("./datData", () => ({
  fetchAllStockData: vi.fn().mockResolvedValue(new Map()),
  fetchAllCryptoData: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("./mcapData", () => ({
  getMcapData: vi.fn().mockResolvedValue({}),
  refreshMcapCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./cmcData", () => ({
  getCmcPrices: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("./reportGenerator", () => ({
  buildReportData: vi.fn().mockResolvedValue({
    generatedAt: new Date().toISOString(),
    stocks: [],
    crypto: [],
    summary: {
      totalCompanies: 0,
      majorsCount: 0,
      altsCount: 0,
      avgChange1d: 0,
      totalMcap: 0,
      totalNav: 0,
      topGainer: null,
      topLoser: null,
      gainersCount: 0,
      losersCount: 0,
      cryptoAvgChange1d: 0,
    },
  }),
  generateReportTitle: vi.fn().mockReturnValue("Test Report"),
  generateReportContent: vi.fn().mockReturnValue("Test Content"),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./telegram", () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue(true),
  formatTelegramReport: vi.fn().mockReturnValue("Test Telegram Report"),
}));

vi.mock("./db", () => ({
  saveStockSnapshots: vi.fn().mockResolvedValue(31),
  saveCryptoSnapshots: vi.fn().mockResolvedValue(14),
  seedHoldingsIfEmpty: vi.fn().mockResolvedValue(0),
  hasSnapshotForDate: vi.fn().mockResolvedValue(false),
}));

import cron from "node-cron";
import { initScheduler, getLastDataRefresh } from "./scheduler";

describe("scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("registers five cron schedules on init (Telegram disabled, catch-up added)", () => {
    initScheduler();
    // 5 cron.schedule calls: data refresh, mcap refresh, daily snapshot, manus report, catch-up
    expect(cron.schedule).toHaveBeenCalledTimes(5);
  });

  it("schedules data refresh every 30 minutes", () => {
    initScheduler();
    const calls = (cron.schedule as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toBe("0 0,30 * * * *");
  });

  it("schedules MCAP refresh every 2 hours", () => {
    initScheduler();
    const calls = (cron.schedule as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[1][0]).toBe("0 0 */2 * * *");
  });

  it("schedules daily snapshot at 00:00 UTC (08:00 SGT)", () => {
    initScheduler();
    const calls = (cron.schedule as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[2][0]).toBe("0 0 0 * * *");
  });

  it("schedules daily Manus report at 21:00 UTC (05:00 SGT)", () => {
    initScheduler();
    const calls = (cron.schedule as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[3][0]).toBe("0 0 21 * * *");
  });

  it("schedules catch-up snapshot check every 30 minutes", () => {
    initScheduler();
    const calls = (cron.schedule as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[4][0]).toBe("0 5,35 * * * *");
  });

  it("Telegram report is disabled", () => {
    initScheduler();
    const calls = (cron.schedule as ReturnType<typeof vi.fn>).mock.calls;
    const cronExpressions = calls.map((c: unknown[]) => c[0]);
    expect(cronExpressions).not.toContain("0 0 2 * * *");
  });

  it("getLastDataRefresh returns 0 before any refresh", () => {
    expect(getLastDataRefresh()).toBe(0);
  });
});
