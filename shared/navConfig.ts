/**
 * Crypto Treasury NAV data configuration.
 * Source: Crypto Treasury NAV Google Sheet
 * Holdings data is static (from latest disclosures); asset prices are fetched live from CMC.
 */

export type NavCompany = {
  company: string;
  ticker: string;
  primaryAsset: string;
  assetSymbol: string;
  holdings: number;
  otherAssets: number;  // USD
  liabilities: number;  // USD
};

/**
 * NAV company data from the Crypto Treasury NAV sheet.
 * Some companies have multiple rows (different asset holdings).
 * Asset prices are fetched live from CoinMarketCap.
 */
export const NAV_COMPANIES: NavCompany[] = [
  { company: "Strategy Inc.", ticker: "MSTR", primaryAsset: "Bitcoin Treasury", assetSymbol: "BTC", holdings: 641692, otherAssets: 0, liabilities: 0 },
  { company: "MARA Holdings, Inc.", ticker: "MARA", primaryAsset: "Bitcoin Miner", assetSymbol: "BTC", holdings: 53250, otherAssets: 0, liabilities: 0 },
  { company: "Twenty-One Capital (XXI)", ticker: "XXI", primaryAsset: "Bitcoin Treasury", assetSymbol: "BTC", holdings: 43514, otherAssets: 0, liabilities: 0 },
  { company: "Metaplanet Inc.", ticker: "MTPLF", primaryAsset: "Bitcoin Treasury", assetSymbol: "BTC", holdings: 30823, otherAssets: 0, liabilities: 0 },
  { company: "Bitcoin Standard Treasury Co.", ticker: "CEPO", primaryAsset: "Bitcoin Treasury", assetSymbol: "BTC", holdings: 30021, otherAssets: 0, liabilities: 0 },
  { company: "Bullish", ticker: "BLSH", primaryAsset: "Exchange / Treasury", assetSymbol: "BTC", holdings: 24300, otherAssets: 0, liabilities: 0 },
  { company: "Riot Platforms, Inc.", ticker: "RIOT", primaryAsset: "Bitcoin Miner", assetSymbol: "BTC", holdings: 19324, otherAssets: 0, liabilities: 0 },
  { company: "Coinbase Global, Inc.", ticker: "COIN", primaryAsset: "Exchange / Treasury", assetSymbol: "BTC", holdings: 14548, otherAssets: 0, liabilities: 0 },
  { company: "Hut 8 Mining Corp", ticker: "HUT", primaryAsset: "Bitcoin Miner", assetSymbol: "BTC", holdings: 13696, otherAssets: 0, liabilities: 0 },
  { company: "CleanSpark Inc.", ticker: "CLSK", primaryAsset: "Bitcoin Miner", assetSymbol: "BTC", holdings: 13011, otherAssets: 0, liabilities: 0 },
  { company: "Tesla, Inc.", ticker: "TSLA", primaryAsset: "Corporate Treasury", assetSymbol: "BTC", holdings: 11509, otherAssets: 0, liabilities: 0 },
  { company: "Block, Inc.", ticker: "SQ", primaryAsset: "Fintech / Treasury", assetSymbol: "BTC", holdings: 8584, otherAssets: 0, liabilities: 0 },
  { company: "GD Culture", ticker: "GDC", primaryAsset: "Treasury", assetSymbol: "BTC", holdings: 7500, otherAssets: 0, liabilities: 0 },
  { company: "SharpLink Gaming", ticker: "SBET", primaryAsset: "Treasury", assetSymbol: "ETH", holdings: 859853, otherAssets: 0, liabilities: 0 },
  { company: "TRON Inc", ticker: "TRON", primaryAsset: "Treasury", assetSymbol: "TRX", holdings: 677596945, otherAssets: 0, liabilities: 0 },
  { company: "CEA Industries", ticker: "BNC", primaryAsset: "Treasury", assetSymbol: "BNB", holdings: 515054, otherAssets: 0, liabilities: 0 },
  { company: "Eightco Holdings", ticker: "ORBS", primaryAsset: "Fintech / Treasury", assetSymbol: "WLD", holdings: 272253898, otherAssets: 0, liabilities: 0 },
  { company: "Eightco Holdings", ticker: "ORBS", primaryAsset: "Fintech / Treasury", assetSymbol: "ETH", holdings: 11068, otherAssets: 0, liabilities: 0 },
  { company: "Bitdigital", ticker: "BTBT", primaryAsset: "Treasury", assetSymbol: "ETH", holdings: 154399, otherAssets: 0, liabilities: 0 },
  { company: "Zero Stacks", ticker: "ZSTK", primaryAsset: "Treasury", assetSymbol: "0G", holdings: 122538335, otherAssets: 0, liabilities: 0 },
  { company: "SUI Group Holdings", ticker: "SUIG", primaryAsset: "Treasury", assetSymbol: "SUI", holdings: 105393693, otherAssets: 0, liabilities: 0 },
  { company: "AXE Compute", ticker: "AGPU", primaryAsset: "Treasury", assetSymbol: "ATH", holdings: 4961016949, otherAssets: 0, liabilities: 0 },
  { company: "Sharps Technology", ticker: "STSS", primaryAsset: "Treasury", assetSymbol: "SOL", holdings: 2000000, otherAssets: 0, liabilities: 0 },
  { company: "TAO Synergies", ticker: "TAOX", primaryAsset: "Treasury", assetSymbol: "TAO", holdings: 54000, otherAssets: 0, liabilities: 0 },
  { company: "ATIF Holdings", ticker: "ZBAI", primaryAsset: "Treasury", assetSymbol: "DOGE", holdings: 0, otherAssets: 0, liabilities: 0 },
  { company: "Hyperscale Data Inc", ticker: "GPUS", primaryAsset: "Treasury", assetSymbol: "XRP", holdings: 0, otherAssets: 0, liabilities: 0 },
];

/** All unique asset symbols needed for NAV price lookups */
export const NAV_ASSET_SYMBOLS = Array.from(new Set(NAV_COMPANIES.map(c => c.assetSymbol)));
