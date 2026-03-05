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

  it("registers three cron schedules on init", () => {
    initScheduler();
    // 3 cron.schedule calls: data refresh, mcap refresh, daily report
    expect(cron.schedule).toHaveBeenCalledTimes(3);
  });

  it("schedules data refresh every 30 minutes", () => {
    initScheduler();
    const calls = (cron.schedule as ReturnType<typeof vi.fn>).mock.calls;
    // First call should be the 30-min data refresh
    expect(calls[0][0]).toBe("0 0,30 * * * *");
  });

  it("schedules MCAP refresh every 2 hours", () => {
    initScheduler();
    const calls = (cron.schedule as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[1][0]).toBe("0 0 */2 * * *");
  });

  it("schedules daily report at 21:00 UTC", () => {
    initScheduler();
    const calls = (cron.schedule as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[2][0]).toBe("0 0 21 * * *");
  });

  it("getLastDataRefresh returns 0 before any refresh", () => {
    expect(getLastDataRefresh()).toBe(0);
  });
});
