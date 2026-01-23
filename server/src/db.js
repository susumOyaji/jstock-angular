"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbOps = exports.db = void 0;
var better_sqlite3_1 = require("better-sqlite3");
var path = require("path");
var dbPath = path.join(process.cwd(), 'jstock.db');
exports.db = new better_sqlite3_1.default(dbPath);
// 銘柄マスタ
exports.db.exec("\nCREATE TABLE IF NOT EXISTS stocks (\n  code TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  market TEXT\n)\n");
// 日次株価データ
exports.db.exec("\nCREATE TABLE IF NOT EXISTS daily_prices (\n  code TEXT,\n  date TEXT,\n  open REAL,\n  high REAL,\n  low REAL,\n  close REAL,\n  volume INTEGER,\n  PRIMARY KEY (code, date)\n)\n");
// 売買シグナル
exports.db.exec("\nCREATE TABLE IF NOT EXISTS signals (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  code TEXT,\n  date TEXT,\n  type TEXT,\n  targetPrice REAL,\n  tp REAL,\n  sl REAL,\n  reason TEXT,\n  status TEXT\n)\n");
// 保有ポートフォリオ
exports.db.exec("\nCREATE TABLE IF NOT EXISTS portfolio (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  code TEXT NOT NULL,\n  shares INTEGER NOT NULL,\n  purchasePrice REAL NOT NULL,\n  purchaseDate TEXT,\n  FOREIGN KEY (code) REFERENCES stocks (code)\n)\n");
exports.dbOps = {
    getAllStocks: function () {
        return exports.db.prepare('SELECT * FROM stocks').all();
    },
    upsertDailyPrice: function (price) {
        var stmt = exports.db.prepare("\n      INSERT OR REPLACE INTO daily_prices (code, date, open, high, low, close, volume)\n      VALUES (?, ?, ?, ?, ?, ?, ?)\n    ");
        stmt.run(price.code, price.date, price.open, price.high, price.low, price.close, price.volume);
    },
    getDailyPrices: function (code, limit) {
        if (limit === void 0) { limit = 100; }
        return exports.db.prepare('SELECT * FROM daily_prices WHERE code = ? ORDER BY date DESC LIMIT ?').all(code, limit);
    },
    saveSignal: function (signal) {
        var stmt = exports.db.prepare("\n      INSERT INTO signals (code, date, type, targetPrice, tp, sl, reason, status)\n      VALUES (?, ?, ?, ?, ?, ?, ?, ?)\n    ");
        stmt.run(signal.code, signal.date, signal.type, signal.targetPrice, signal.tp, signal.sl, signal.reason || null, 'NEW');
    },
    getSignals: function () {
        return exports.db.prepare('SELECT * FROM signals ORDER BY date DESC').all();
    },
    addStock: function (stock) {
        var stmt = exports.db.prepare('INSERT OR IGNORE INTO stocks (code, name, market) VALUES (?, ?, ?)');
        stmt.run(stock.code, stock.name, stock.market || '');
    },
    deleteStock: function (code) {
        var stmt = exports.db.prepare('DELETE FROM stocks WHERE code = ?');
        stmt.run(code);
        // Optional: Also delete related prices and signals? 
        // For now, let's keep it simple and just remove from watchlist.
    },
    getLatestPrice: function (code) {
        return exports.db.prepare('SELECT * FROM daily_prices WHERE code = ? ORDER BY date DESC LIMIT 1').get(code);
    },
    // Portfolio Ops
    getPortfolio: function () {
        return exports.db.prepare("\n            SELECT p.*, s.name \n            FROM portfolio p \n            JOIN stocks s ON p.code = s.code\n        ").all();
    },
    addToPortfolio: function (item) {
        var stmt = exports.db.prepare('INSERT INTO portfolio (code, shares, purchasePrice, purchaseDate) VALUES (?, ?, ?, ?)');
        stmt.run(item.code, item.shares, item.purchasePrice, item.purchaseDate);
    },
    removeFromPortfolio: function (id) {
        exports.db.prepare('DELETE FROM portfolio WHERE id = ?').run(id);
    }
};
