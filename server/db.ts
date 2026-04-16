import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  stockSnapshots, InsertStockSnapshot,
  cryptoSnapshots, InsertCryptoSnapshot,
  companyHoldings, InsertCompanyHolding, CompanyHolding,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Snapshots ───────────────────────────────────────────────

/**
 * Save a batch of stock snapshots for a given date.
 * Uses INSERT IGNORE to skip duplicates if already saved for that date.
 */
export async function saveStockSnapshots(rows: InsertStockSnapshot[]): Promise<number> {
  const db = await getDb();
  if (!db || rows.length === 0) return 0;

  // Delete existing rows for this date first (idempotent re-save)
  const dateStr = rows[0].snapshotDate;
  await db.delete(stockSnapshots).where(eq(stockSnapshots.snapshotDate, dateStr));
  await db.insert(stockSnapshots).values(rows);
  return rows.length;
}

/**
 * Save a batch of crypto snapshots for a given date.
 */
export async function saveCryptoSnapshots(rows: InsertCryptoSnapshot[]): Promise<number> {
  const db = await getDb();
  if (!db || rows.length === 0) return 0;

  const dateStr = rows[0].snapshotDate;
  await db.delete(cryptoSnapshots).where(eq(cryptoSnapshots.snapshotDate, dateStr));
  await db.insert(cryptoSnapshots).values(rows);
  return rows.length;
}

/**
 * Get stock snapshots for a specific date
 */
export async function getStockSnapshotsByDate(dateStr: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stockSnapshots).where(eq(stockSnapshots.snapshotDate, dateStr));
}

/**
 * Get crypto snapshots for a specific date
 */
export async function getCryptoSnapshotsByDate(dateStr: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cryptoSnapshots).where(eq(cryptoSnapshots.snapshotDate, dateStr));
}

/**
 * Get all distinct snapshot dates (most recent first)
 */
export async function getSnapshotDates(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ snapshotDate: stockSnapshots.snapshotDate })
    .from(stockSnapshots)
    .groupBy(stockSnapshots.snapshotDate)
    .orderBy(desc(stockSnapshots.snapshotDate))
    .limit(90);
  return rows.map(r => r.snapshotDate);
}

/**
 * Get ALL stock snapshots across all dates (for trend charts)
 * Returns rows ordered by date ASC, ticker ASC
 */
export async function getAllStockSnapshots() {
  const db = await getDb();
  if (!db) return [];
  const { asc } = await import("drizzle-orm");
  return db.select().from(stockSnapshots)
    .orderBy(asc(stockSnapshots.snapshotDate), asc(stockSnapshots.ticker));
}

/**
 * Check if a snapshot exists for a given date
 */
export async function hasSnapshotForDate(dateStr: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: stockSnapshots.id }).from(stockSnapshots)
    .where(eq(stockSnapshots.snapshotDate, dateStr)).limit(1);
  return rows.length > 0;
}

// ─── Holdings ────────────────────────────────────────────────

/**
 * Get all company holdings
 */
export async function getAllHoldings(): Promise<CompanyHolding[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(companyHoldings);
}

/**
 * Upsert a company holding (insert or update on duplicate ticker)
 */
export async function upsertHolding(data: InsertCompanyHolding): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(companyHoldings).values(data).onDuplicateKeyUpdate({
    set: {
      company: data.company,
      category: data.category,
      datAsset: data.datAsset,
      holdings: data.holdings,
      otherAssets: data.otherAssets,
      liabilities: data.liabilities,
      updatedBy: data.updatedBy,
    },
  });
}

/**
 * Seed holdings from the hardcoded config (only if table is empty)
 */
export async function seedHoldingsIfEmpty(companies: Array<{
  ticker: string;
  company: string;
  category: string;
  datAsset: string;
  holdings: number;
}>): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const existing = await db.select({ id: companyHoldings.id }).from(companyHoldings).limit(1);
  if (existing.length > 0) return 0; // already seeded

  const rows: InsertCompanyHolding[] = companies.map(c => ({
    ticker: c.ticker,
    company: c.company,
    category: c.category,
    datAsset: c.datAsset,
    holdings: c.holdings,
    otherAssets: 0,
    liabilities: 0,
    updatedBy: "system-seed",
  }));

  await db.insert(companyHoldings).values(rows);
  return rows.length;
}
