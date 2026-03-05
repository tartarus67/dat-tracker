/** DAT company and crypto asset configuration */

export type DATCompany = {
  company: string;
  ticker: string;
  category: "Majors" | "Alts";
  datAsset: string;
  cryptoYahooSymbol: string;
  /** Token holdings (units) from latest disclosures — used for NAV calculation */
  holdings: number;
};

export type CryptoAsset = {
  symbol: string;
  name: string;
  yahooSymbol: string;
};

/**
 * Holdings data sourced from the Crypto Treasury NAV sheet and public disclosures.
 * Holdings = 0 means data not yet available / not disclosed.
 */
export const DAT_COMPANIES: DATCompany[] = [
  { company: "Forward Industries", ticker: "FORD", category: "Majors", datAsset: "SOL", cryptoYahooSymbol: "SOL-USD", holdings: 0 },
  { company: "DeFi Development", ticker: "DFDV", category: "Majors", datAsset: "SOL", cryptoYahooSymbol: "SOL-USD", holdings: 317116 },
  { company: "Upexi", ticker: "UPXI", category: "Majors", datAsset: "SOL", cryptoYahooSymbol: "SOL-USD", holdings: 630000 },
  { company: "Bitcoin Standard Treasury Co.", ticker: "CEPO", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 30021 },
  { company: "Strategy (MicroStrategy)", ticker: "MSTR", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 641692 },
  { company: "Tron Inc", ticker: "TRON", category: "Alts", datAsset: "TRX", cryptoYahooSymbol: "TRX-USD", holdings: 0 },
  { company: "Metaplanet Inc.", ticker: "MTPLF", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 30823 },
  { company: "MARA Holdings", ticker: "MARA", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 53250 },
  { company: "Coinbase Global", ticker: "COIN", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 14548 },
  { company: "Bullish", ticker: "BLSH", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 24300 },
  { company: "Riot Platforms", ticker: "RIOT", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 19324 },
  { company: "CleanSpark", ticker: "CLSK", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 13011 },
  { company: "Hut 8 Mining", ticker: "HUT", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 13696 },
  { company: "Bitmine", ticker: "BMNR", category: "Majors", datAsset: "ETH", cryptoYahooSymbol: "ETH-USD", holdings: 0 },
  { company: "Bitdigital", ticker: "BTBT", category: "Majors", datAsset: "ETH", cryptoYahooSymbol: "ETH-USD", holdings: 0 },
  { company: "SharpLink Gaming", ticker: "SBET", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 401 },
  { company: "Helius Medical", ticker: "HSDT", category: "Majors", datAsset: "SOL", cryptoYahooSymbol: "SOL-USD", holdings: 0 },
  { company: "SOL Strategies", ticker: "STKE", category: "Majors", datAsset: "SOL", cryptoYahooSymbol: "SOL-USD", holdings: 189968 },
  { company: "Twenty-One Capital", ticker: "XXI", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 43514 },
  { company: "TAO Synergies", ticker: "TAOX", category: "Alts", datAsset: "TAO", cryptoYahooSymbol: "TAO22974-USD", holdings: 0 },
  { company: "ATIF Holdings", ticker: "ZBAI", category: "Alts", datAsset: "DOGE", cryptoYahooSymbol: "DOGE-USD", holdings: 0 },
  { company: "Hyperscale Data", ticker: "GPUS", category: "Alts", datAsset: "XRP", cryptoYahooSymbol: "XRP-USD", holdings: 0 },
  { company: "IP Strategy", ticker: "IPST", category: "Alts", datAsset: "IP", cryptoYahooSymbol: "IP-USD", holdings: 0 },
  { company: "CEA Industries", ticker: "BNC", category: "Alts", datAsset: "BNB", cryptoYahooSymbol: "BNB-USD", holdings: 0 },
  { company: "Sharps Technology", ticker: "STSS", category: "Majors", datAsset: "SOL", cryptoYahooSymbol: "SOL-USD", holdings: 0 },
  { company: "SUI Group Holdings", ticker: "SUIG", category: "Alts", datAsset: "SUI", cryptoYahooSymbol: "SUI20947-USD", holdings: 0 },
  { company: "GD Culture", ticker: "GDC", category: "Majors", datAsset: "BTC", cryptoYahooSymbol: "BTC-USD", holdings: 200 },
  { company: "Eightco Holdings", ticker: "ORBS", category: "Alts", datAsset: "WLD", cryptoYahooSymbol: "WLD-USD", holdings: 0 },
  { company: "Predictive Oncology", ticker: "AGPU", category: "Alts", datAsset: "ATH", cryptoYahooSymbol: "ATH-USD", holdings: 0 },
  { company: "AlphaTON Capital", ticker: "ATON", category: "Alts", datAsset: "TON", cryptoYahooSymbol: "TON11419-USD", holdings: 0 },
  { company: "Zero Stack", ticker: "ZSTK", category: "Alts", datAsset: "0G", cryptoYahooSymbol: "0G-USD", holdings: 0 },
];

export const CRYPTO_ASSETS: CryptoAsset[] = [
  { symbol: "BTC", name: "Bitcoin", yahooSymbol: "BTC-USD" },
  { symbol: "ETH", name: "Ethereum", yahooSymbol: "ETH-USD" },
  { symbol: "SOL", name: "Solana", yahooSymbol: "SOL-USD" },
  { symbol: "TAO", name: "Bittensor", yahooSymbol: "TAO22974-USD" },
  { symbol: "WLD", name: "Worldcoin", yahooSymbol: "WLD-USD" },
  { symbol: "IP", name: "Story Protocol", yahooSymbol: "IP-USD" },
  { symbol: "ATH", name: "Aethir", yahooSymbol: "ATH-USD" },
  { symbol: "BNB", name: "BNB", yahooSymbol: "BNB-USD" },
  { symbol: "SUI", name: "Sui", yahooSymbol: "SUI20947-USD" },
  { symbol: "XRP", name: "XRP", yahooSymbol: "XRP-USD" },
  { symbol: "TRX", name: "Tron", yahooSymbol: "TRX-USD" },
  { symbol: "DOGE", name: "Dogecoin", yahooSymbol: "DOGE-USD" },
  { symbol: "0G", name: "0G", yahooSymbol: "0G-USD" },
  { symbol: "TON", name: "Toncoin", yahooSymbol: "TON11419-USD" },
];

/** Unique set of stock tickers */
export const ALL_STOCK_TICKERS = DAT_COMPANIES.map(c => c.ticker);

/** Unique set of Yahoo crypto symbols */
export const ALL_CRYPTO_YAHOO_SYMBOLS = Array.from(new Set(CRYPTO_ASSETS.map(c => c.yahooSymbol)));
