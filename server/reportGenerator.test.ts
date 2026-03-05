import { describe, expect, it } from "vitest";
import { generateReportTitle, generateReportContent, type ReportData } from "./reportGenerator";

function createMockReportData(): ReportData {
  return {
    generatedAt: "2026-03-05T12:00:00.000Z",
    stocks: [
      {
        ticker: "MSTR",
        company: "Strategy (MicroStrategy)",
        category: "Majors",
        datAsset: "BTC",
        holdings: 641692,
        price: 300.0,
        change1d: 5.25,
        change7d: 12.3,
        change30d: 25.0,
        tokenPrice: 72000,
        tokenPrice7d: 6.5,
        tokenPrice30d: 15.0,
        mcap: 48900,
        nav: 46201.8,
        mNAV: 1.06,
        vol24h: 15000000,
        vol1dPct: 20.5,
        vol7dAvg: 12000000,
        vol7dPct: 25.0,
        vol30dAvg: 10000000,
        vol30dPct: 50.0,
        error: false,
      },
      {
        ticker: "COIN",
        company: "Coinbase Global",
        category: "Majors",
        datAsset: "BTC",
        holdings: 14548,
        price: 200.0,
        change1d: -2.5,
        change7d: -5.0,
        change30d: 10.0,
        tokenPrice: 72000,
        tokenPrice7d: 6.5,
        tokenPrice30d: 15.0,
        mcap: 56300,
        nav: 1047.5,
        mNAV: 53.7,
        vol24h: 25000000,
        vol1dPct: -10.0,
        vol7dAvg: 20000000,
        vol7dPct: 25.0,
        vol30dAvg: 18000000,
        vol30dPct: 38.9,
        error: false,
      },
      {
        ticker: "FORD",
        company: "Forward Industries",
        category: "Majors",
        datAsset: "SOL",
        holdings: 0,
        price: 0,
        change1d: 0,
        change7d: 0,
        change30d: 0,
        tokenPrice: 90,
        tokenPrice7d: 2.0,
        tokenPrice30d: 14.0,
        mcap: 0,
        nav: 0,
        mNAV: 0,
        vol24h: 0,
        vol1dPct: 0,
        vol7dAvg: 0,
        vol7dPct: 0,
        vol30dAvg: 0,
        vol30dPct: 0,
        error: true,
      },
      {
        ticker: "ZBAI",
        company: "ATIF Holdings",
        category: "Alts",
        datAsset: "DOGE",
        holdings: 0,
        price: 6.53,
        change1d: -1.06,
        change7d: -3.97,
        change30d: -4.53,
        tokenPrice: 0.15,
        tokenPrice7d: 1.0,
        tokenPrice30d: -5.0,
        mcap: 50,
        nav: 0,
        mNAV: 0,
        vol24h: 230,
        vol1dPct: -50.0,
        vol7dAvg: 500,
        vol7dPct: -54.0,
        vol30dAvg: 800,
        vol30dPct: -71.3,
        error: false,
      },
    ],
    crypto: [
      {
        symbol: "BTC",
        name: "Bitcoin",
        price: 72000,
        change1d: 3.5,
        change7d: 6.5,
        change30d: 15.0,
        volume: 30000000000,
        error: false,
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        price: 2100,
        change1d: -1.2,
        change7d: 2.0,
        change30d: 8.0,
        volume: 15000000000,
        error: false,
      },
    ],
    summary: {
      totalCompanies: 4,
      majorsCount: 3,
      altsCount: 1,
      avgChange1d: 0.56,
      totalMcap: 105250,
      totalNav: 47249.3,
      topGainer: { ticker: "MSTR", change1d: 5.25 },
      topLoser: { ticker: "COIN", change1d: -2.5 },
      gainersCount: 1,
      losersCount: 2,
      cryptoAvgChange1d: 1.15,
    },
  };
}

describe("generateReportTitle", () => {
  it("generates a title with date and avg change", () => {
    const data = createMockReportData();
    const title = generateReportTitle(data);

    expect(title).toContain("DAT Daily Report");
    expect(title).toContain("Mar");
    expect(title).toContain("2026");
    expect(title).toContain("0.56%");
  });

  it("uses up arrow for positive avg change", () => {
    const data = createMockReportData();
    data.summary.avgChange1d = 2.5;
    const title = generateReportTitle(data);
    expect(title).toContain("\u2191");
  });

  it("uses down arrow for negative avg change", () => {
    const data = createMockReportData();
    data.summary.avgChange1d = -1.5;
    const title = generateReportTitle(data);
    expect(title).toContain("\u2193");
  });
});

describe("generateReportContent", () => {
  it("includes market overview with MCAP and NAV", () => {
    const data = createMockReportData();
    const content = generateReportContent(data);

    expect(content).toContain("MARKET OVERVIEW");
    expect(content).toContain("Companies: 4");
    expect(content).toContain("3 Majors");
    expect(content).toContain("1 Alts");
    expect(content).toContain("Total MCAP:");
    expect(content).toContain("Total NAV:");
  });

  it("includes top gainers and losers with mNAV", () => {
    const data = createMockReportData();
    const content = generateReportContent(data);

    expect(content).toContain("TOP 5 GAINERS");
    expect(content).toContain("TOP 5 LOSERS");
    expect(content).toContain("MSTR");
    expect(content).toContain("mNAV");
    expect(content).toContain("1.06x");
  });

  it("includes majors and alts sections", () => {
    const data = createMockReportData();
    const content = generateReportContent(data);

    expect(content).toContain("MAJORS");
    expect(content).toContain("ALTS");
    expect(content).toContain("MSTR");
    expect(content).toContain("ZBAI");
  });

  it("includes crypto section", () => {
    const data = createMockReportData();
    const content = generateReportContent(data);

    expect(content).toContain("CRYPTO ASSETS");
    expect(content).toContain("BTC");
    expect(content).toContain("ETH");
    expect(content).toContain("Bitcoin");
  });

  it("shows N/A for errored stocks", () => {
    const data = createMockReportData();
    const content = generateReportContent(data);

    const lines = content.split("\n");
    const fordLine = lines.find(l => l.includes("FORD"));
    expect(fordLine).toBeDefined();
    expect(fordLine).toContain("N/A");
  });

  it("includes generation footer", () => {
    const data = createMockReportData();
    const content = generateReportContent(data);

    expect(content).toContain("Generated by DAT Tracker");
  });

  it("includes MCAP column in majors table", () => {
    const data = createMockReportData();
    const content = generateReportContent(data);

    // MCAP header in majors table
    expect(content).toContain("MCAP");
    // MSTR has mcap 48900 = $48.9B
    expect(content).toContain("$48.9B");
  });

  it("includes NAV and mNAV in majors table", () => {
    const data = createMockReportData();
    const content = generateReportContent(data);

    expect(content).toContain("NAV");
    expect(content).toContain("mNAV");
  });
});
