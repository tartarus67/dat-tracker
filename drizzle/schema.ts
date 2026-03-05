import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, double, bigint, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Daily stock snapshots — one row per ticker per date
 */
export const stockSnapshots = mysqlTable("stock_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  snapshotDate: varchar("snapshotDate", { length: 10 }).notNull(),
  ticker: varchar("ticker", { length: 16 }).notNull(),
  company: varchar("company", { length: 128 }).notNull(),
  category: varchar("category", { length: 16 }).notNull(),
  datAsset: varchar("datAsset", { length: 16 }).notNull(),
  price: double("price").notNull().default(0),
  change1d: double("change1d").notNull().default(0),
  change7d: double("change7d").notNull().default(0),
  change30d: double("change30d").notNull().default(0),
  tokenPrice: double("tokenPrice").notNull().default(0),
  tokenPrice7d: double("tokenPrice7d").notNull().default(0),
  tokenPrice30d: double("tokenPrice30d").notNull().default(0),
  mcap: double("mcap").notNull().default(0),
  nav: double("nav").notNull().default(0),
  mNAV: double("mNAV").notNull().default(0),
  vol24h: double("vol24h").notNull().default(0),
  vol1dPct: double("vol1dPct").notNull().default(0),
  vol7dAvg: double("vol7dAvg").notNull().default(0),
  vol7dPct: double("vol7dPct").notNull().default(0),
  vol30dAvg: double("vol30dAvg").notNull().default(0),
  vol30dPct: double("vol30dPct").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StockSnapshot = typeof stockSnapshots.$inferSelect;
export type InsertStockSnapshot = typeof stockSnapshots.$inferInsert;

/**
 * Daily crypto snapshots — one row per symbol per date
 */
export const cryptoSnapshots = mysqlTable("crypto_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  snapshotDate: varchar("snapshotDate", { length: 10 }).notNull(),
  symbol: varchar("symbol", { length: 16 }).notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  price: double("price").notNull().default(0),
  change1d: double("change1d").notNull().default(0),
  change7d: double("change7d").notNull().default(0),
  change30d: double("change30d").notNull().default(0),
  volume: double("volume").notNull().default(0),
  marketCap: double("marketCap").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CryptoSnapshot = typeof cryptoSnapshots.$inferSelect;
export type InsertCryptoSnapshot = typeof cryptoSnapshots.$inferInsert;

/**
 * Company holdings — admin-editable, used for NAV calculation
 */
export const companyHoldings = mysqlTable("company_holdings", {
  id: int("id").autoincrement().primaryKey(),
  ticker: varchar("ticker", { length: 16 }).notNull().unique(),
  company: varchar("company", { length: 128 }).notNull(),
  category: varchar("category", { length: 16 }).notNull(),
  datAsset: varchar("datAsset", { length: 16 }).notNull(),
  holdings: double("holdings").notNull().default(0),
  otherAssets: double("otherAssets").notNull().default(0),
  liabilities: double("liabilities").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: varchar("updatedBy", { length: 128 }),
});

export type CompanyHolding = typeof companyHoldings.$inferSelect;
export type InsertCompanyHolding = typeof companyHoldings.$inferInsert;
