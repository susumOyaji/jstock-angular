const Database = require('better-sqlite3');
import * as path from 'path';

const dbPath = path.join(process.cwd(), 'jstock.db');
export const db = new Database(dbPath);

// 銘柄マスタ
db.exec(`
CREATE TABLE IF NOT EXISTS stocks (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  market TEXT
)
`);

// 日次株価データ
db.exec(`
CREATE TABLE IF NOT EXISTS daily_prices (
  code TEXT,
  date TEXT,
  open REAL,
  high REAL,
  low REAL,
  close REAL,
  volume INTEGER,
  PRIMARY KEY (code, date)
)
`);

// 売買シグナル
db.exec(`
CREATE TABLE IF NOT EXISTS signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  date TEXT,
  type TEXT,
  targetPrice REAL,
  tp REAL,
  sl REAL,
  reason TEXT,
  status TEXT
)
`);

// 保有ポートフォリオ
db.exec(`
CREATE TABLE IF NOT EXISTS portfolio (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  shares INTEGER NOT NULL,
  purchasePrice REAL NOT NULL,
  purchaseDate TEXT,
  FOREIGN KEY (code) REFERENCES stocks (code)
)
`);

export interface Stock {
    code: string;
    name: string;
    market?: string;
}

export interface DailyPrice {
    code: string;
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface Signal {
    id?: number;
    code: string;
    date: string;
    type: 'BUY' | 'SELL';
    targetPrice: number;
    tp: number;
    sl: number;
    reason?: string;
    status?: string;
}

export interface PortfolioItem {
    id?: number;
    code: string;
    shares: number;
    purchasePrice: number;
    purchaseDate: string;
    // Joined fields
    name?: string;
    currentPrice?: number;
}

export const dbOps = {
    getAllStocks: (): Stock[] => {
        return db.prepare('SELECT * FROM stocks').all() as Stock[];
    },
    upsertDailyPrice: (price: DailyPrice) => {
        const stmt = db.prepare(`
      INSERT OR REPLACE INTO daily_prices (code, date, open, high, low, close, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(price.code, price.date, price.open, price.high, price.low, price.close, price.volume);
    },
    getDailyPrices: (code: string, limit: number = 100): DailyPrice[] => {
        return db.prepare('SELECT * FROM daily_prices WHERE code = ? ORDER BY date DESC LIMIT ?').all(code, limit) as DailyPrice[];
    },
    saveSignal: (signal: Signal) => {
        const stmt = db.prepare(`
      INSERT INTO signals (code, date, type, targetPrice, tp, sl, reason, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(signal.code, signal.date, signal.type, signal.targetPrice, signal.tp, signal.sl, signal.reason || null, 'NEW');
    },
    getSignals: (): Signal[] => {
        return db.prepare('SELECT * FROM signals ORDER BY date DESC').all() as Signal[];
    },
    addStock: (stock: Stock) => {
        const stmt = db.prepare('INSERT OR IGNORE INTO stocks (code, name, market) VALUES (?, ?, ?)');
        stmt.run(stock.code, stock.name, stock.market || '');
    },
    deleteStock: (code: string) => {
        const stmt = db.prepare('DELETE FROM stocks WHERE code = ?');
        stmt.run(code);
        // Optional: Also delete related prices and signals? 
        // For now, let's keep it simple and just remove from watchlist.
    },
    getLatestPrice: (code: string): DailyPrice | undefined => {
        return db.prepare('SELECT * FROM daily_prices WHERE code = ? ORDER BY date DESC LIMIT 1').get(code) as DailyPrice | undefined;
    },
    // Portfolio Ops
    getPortfolio: (): PortfolioItem[] => {
        return db.prepare(`
            SELECT p.*, s.name 
            FROM portfolio p 
            JOIN stocks s ON p.code = s.code
        `).all() as PortfolioItem[];
    },
    addToPortfolio: (item: PortfolioItem) => {
        const stmt = db.prepare('INSERT INTO portfolio (code, shares, purchasePrice, purchaseDate) VALUES (?, ?, ?, ?)');
        stmt.run(item.code, item.shares, item.purchasePrice, item.purchaseDate);
    },
    removeFromPortfolio: (id: number) => {
        db.prepare('DELETE FROM portfolio WHERE id = ?').run(id);
    }
};
