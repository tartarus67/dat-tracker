/** DAT company and crypto asset configuration */

export type DATCompany = {
  company: string;
  ticker: string;
  category: "Majors" | "Alts";
  datAsset: string;
  cryptoYahooSymbol: string;
  /** Token holdings (units) from latest disclosures — used for NAV calculation */
  holdings: number;
  /** Secondary asset symbol (for companies holding multiple crypto assets) */
  secondaryAsset?: string;
  /** Secondary asset holdings (units) */
  secondaryHoldings?: number;
  /** Previous ticker symbol before rebrand (for historical snapshot continuity) */
  previousTicker?: string;
  /** Previous DAT asset before change (for historical snapshot continuity) */
  previousAsset?: string;
  /** Previous company name before rebrand */
  previousCompany?: string;
};

export type CryptoAsset = {
  symbol: string;
  name: string;
  yahooSymbol: string;
  cmcSlug: string;
};

/**
 * Holdings data sourced from the Crypto Treasury NAV sheet and public disclosures.
 * Holdings = 0 means data not yet available / not disclosed.
 */
export const DAT_COMPANIES: DATCompany[] = [
  { company: "Forward Industries", ticker: "FWDI", category: "Majors", datAsset: "SOL", cryptoYahooSymbol: "SOL-USD", holdings: 7044079, previousTicker: "FORD" },
  { company: "DeFi Development", ticker: "DFDV", category: "Majors", datAsset: "SOL", cryptoYahooSymbol: "SOL-USD", holdings: 2223074 },
  { company: "Upexi", ticker: "UPXI", category: "Majors", datAsset: "SOL", cryptoYahooSymbol: "SOL-USD", holdings: 2173204 },
  { company: "Bitcoin Standard Treasury Co.", ticker: "CEPO", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 30021 },
  { company: "Microstrategy", ticker: "MSTR", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 843775, previousCompany: "Strategy (MicroStrategy)" },
  { company: "Tron Inc", ticker: "TRON", category: "Alts", datAsset: "TRX", cryptoYahooSymbol: "TRX-USD", holdings: 677596945 },
  { company: "Metaplanet Inc.", ticker: "MTPLF", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 43000 },
  { company: "MARA Holdings, Inc.", ticker: "MARA", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 36303, previousCompany: "MARA Holdings" },
  { company: "Coinbase Global, Inc.", ticker: "COIN", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 14548, previousCompany: "Coinbase Global" },
  { company: "Bullish", ticker: "BLSH", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 24300 },
  { company: "Riot Platforms, Inc.", ticker: "RIOT", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 19324, previousCompany: "Riot Platforms" },
  { company: "Tesla", ticker: "TSLA", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 11509 },
  { company: "Hut 8 Mining Corp", ticker: "HUT", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 13696, previousCompany: "Hut 8 Mining" },
  { company: "Bitmine", ticker: "BMNR", category: "Majors", datAsset: "ETH", cryptoYahooSymbol: "ETH-USD", holdings: 5740000 },
  { company: "Bitdigital", ticker: "BTBT", category: "Majors", datAsset: "ETH", cryptoYahooSymbol: "ETH-USD", holdings: 154399 },
  { company: "SharpLink Gaming", ticker: "SBET", category: "Majors", datAsset: "ETH", cryptoYahooSymbol: "ETH-USD", holdings: 886725 },
  { company: "Helius Medical", ticker: "HSDT", category: "Majors", datAsset: "SOL", cryptoYahooSymbol: "SOL-USD", holdings: 2300000 },
  { company: "SOL Strategies", ticker: "STKE", category: "Majors", datAsset: "SOL", cryptoYahooSymbol: "SOL-USD", holdings: 395000 },
  { company: "Twenty-One Capital (XXI)", ticker: "XXI", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 43514, previousCompany: "Twenty-One Capital" },
  { company: "TAO Synergies", ticker: "TAOX", category: "Alts", datAsset: "TAO", cryptoYahooSymbol: "TAO22974-USD", holdings: 54000 },
  { company: "ATIF Holdings", ticker: "AUC", category: "Alts", datAsset: "DOGE", cryptoYahooSymbol: "DOGE-USD", holdings: 0, previousTicker: "ZBAI" },
  { company: "Hyperscale Data Inc", ticker: "GPUS", category: "Alts", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 900, previousAsset: "XRP" },
  { company: "IP Strategy", ticker: "IPST", category: "Alts", datAsset: "DATA", cryptoYahooSymbol: "DATA-USD", holdings: 329000000, previousAsset: "IP" },
  { company: "CEA Industries", ticker: "BNC", category: "Alts", datAsset: "BNB", cryptoYahooSymbol: "BNB-USD", holdings: 515054 },
  { company: "Sky AI Inc", ticker: "SKYA", category: "Majors", datAsset: "SOL", cryptoYahooSymbol: "SOL-USD", holdings: 2000000, previousTicker: "STSS", previousCompany: "Sharps Technology" },
  { company: "SUI Group Holdings", ticker: "SUIG", category: "Alts", datAsset: "SUI", cryptoYahooSymbol: "SUI20947-USD", holdings: 105393693 },
  { company: "GD Culture", ticker: "GDC", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 7500 },
  { company: "Eightco Holdings", ticker: "ORBS", category: "Alts", datAsset: "WLD", cryptoYahooSymbol: "WLD-USD", holdings: 283452700, secondaryAsset: "ETH", secondaryHoldings: 16278 },
  { company: "Predictive Oncology", ticker: "AGPU", category: "Alts", datAsset: "ATH", cryptoYahooSymbol: "ATH-USD", holdings: 6166000000 },
  { company: "Alpha Compute Corp", ticker: "ALP", category: "Alts", datAsset: "TON", cryptoYahooSymbol: "TON11419-USD", holdings: 12878195, previousTicker: "ATON", previousCompany: "AlphaTON Capital Corp" },
  { company: "Zero Stack", ticker: "ZSTK", category: "Alts", datAsset: "0G", cryptoYahooSymbol: "0G-USD", holdings: 122538335 },
  { company: "CleanSpark Inc.", ticker: "CLSK", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 13011 },
];

export const CRYPTO_ASSETS: CryptoAsset[] = [
  { symbol: "BTC", name: "Bitcoin", yahooSymbol: "BTC-USD", cmcSlug: "bitcoin" },
  { symbol: "ETH", name: "Ethereum", yahooSymbol: "ETH-USD", cmcSlug: "ethereum" },
  { symbol: "SOL", name: "Solana", yahooSymbol: "SOL-USD", cmcSlug: "solana" },
  { symbol: "TAO", name: "Bittensor", yahooSymbol: "TAO22974-USD", cmcSlug: "bittensor" },
  { symbol: "WLD", name: "Worldcoin", yahooSymbol: "WLD-USD", cmcSlug: "worldcoin-org" },
  { symbol: "DATA", name: "Data Foundation", yahooSymbol: "DATA-USD", cmcSlug: "data-foundation" },
  { symbol: "ATH", name: "Aethir", yahooSymbol: "ATH-USD", cmcSlug: "aethir" },
  { symbol: "BNB", name: "BNB", yahooSymbol: "BNB-USD", cmcSlug: "bnb" },
  { symbol: "SUI", name: "Sui", yahooSymbol: "SUI20947-USD", cmcSlug: "sui" },
  { symbol: "XRP", name: "XRP", yahooSymbol: "XRP-USD", cmcSlug: "xrp" },
  { symbol: "TRX", name: "Tron", yahooSymbol: "TRX-USD", cmcSlug: "tron" },
  { symbol: "DOGE", name: "Dogecoin", yahooSymbol: "DOGE-USD", cmcSlug: "dogecoin" },
  { symbol: "0G", name: "0G", yahooSymbol: "0G-USD", cmcSlug: "0g" },
  { symbol: "TON", name: "Toncoin", yahooSymbol: "TON11419-USD", cmcSlug: "toncoin" },
  { symbol: "IP", name: "Story Protocol", yahooSymbol: "IP-USD", cmcSlug: "story" },
];

/** Unique set of stock tickers */
export const ALL_STOCK_TICKERS = DAT_COMPANIES.map(c => c.ticker);

/** Unique set of Yahoo crypto symbols */
export const ALL_CRYPTO_YAHOO_SYMBOLS = Array.from(new Set(CRYPTO_ASSETS.map(c => c.yahooSymbol)));

/** Unique set of crypto symbols (for CMC API) */
export const ALL_CRYPTO_SYMBOLS = CRYPTO_ASSETS.map(c => c.symbol);

/**
 * Map of current ticker → previous ticker(s) for historical data continuity.
 * Used by trend charts and snapshot queries to merge old data with new tickers.
 */
export const TICKER_HISTORY: Record<string, string[]> = Object.fromEntries(
  DAT_COMPANIES
    .filter(c => c.previousTicker)
    .map(c => [c.ticker, [c.previousTicker!]])
);
