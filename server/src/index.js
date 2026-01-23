"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var cors_1 = require("cors");
var path = require("path");
var fs = require("fs");
var db_1 = require("./db");
var fetcher_1 = require("./fetcher");
var analysis_1 = require("./analysis");
var app = (0, express_1.default)();
var PORT = 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// 銘柄一覧取得
app.get('/api/stocks', function (req, res) {
    var stocks = db_1.dbOps.getAllStocks();
    var today = new Date().toISOString().split('T')[0];
    var stocksWithStatus = stocks.map(function (stock) {
        var csvPath = path.join(process.cwd(), 'data', today, "".concat(stock.code, ".csv"));
        var hasDataToday = fs.existsSync(csvPath);
        // Get latest price info
        var prices = db_1.dbOps.getDailyPrices(stock.code, 2);
        var latestPrice = prices[0];
        var prevPrice = prices[1];
        return __assign(__assign({}, stock), { hasDataToday: hasDataToday, currentPrice: (latestPrice === null || latestPrice === void 0 ? void 0 : latestPrice.close) || null, prevClose: (prevPrice === null || prevPrice === void 0 ? void 0 : prevPrice.close) || null, lastUpdate: (latestPrice === null || latestPrice === void 0 ? void 0 : latestPrice.date) || null });
    });
    res.json(stocksWithStatus);
});
// シグナル一覧取得
app.get('/api/signals', function (req, res) {
    var signals = db_1.dbOps.getSignals();
    res.json(signals);
});
// 銘柄情報取得 (名前の自動取得用)
app.get('/api/stocks/info/:code', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var code, info, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                code = req.params.code;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, (0, fetcher_1.fetchStockInfo)(code)];
            case 2:
                info = _a.sent();
                res.json(info);
                return [3 /*break*/, 4];
            case 3:
                err_1 = _a.sent();
                res.status(500).json({ error: err_1.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 銘柄追加
app.post('/api/stocks', function (req, res) {
    var _a = req.body, code = _a.code, name = _a.name, market = _a.market;
    if (!code || !name)
        return res.status(400).json({ error: 'Code and Name required' });
    db_1.dbOps.addStock({ code: code, name: name, market: market });
    res.json({ success: true });
});
// 銘柄削除
app.delete('/api/stocks/:code', function (req, res) {
    var code = req.params.code;
    db_1.dbOps.deleteStock(code);
    res.json({ success: true });
});
// ポートフォリオ取得
app.get('/api/portfolio', function (req, res) {
    var portfolio = db_1.dbOps.getPortfolio();
    var portfolioWithPrices = portfolio.map(function (item) {
        var latest = db_1.dbOps.getLatestPrice(item.code);
        return __assign(__assign({}, item), { currentPrice: (latest === null || latest === void 0 ? void 0 : latest.close) || null });
    });
    res.json(portfolioWithPrices);
});
// ポートフォリオ追加 (株を買う)
app.post('/api/portfolio', function (req, res) {
    try {
        var _a = req.body, code = _a.code, shares = _a.shares, purchasePrice = _a.purchasePrice, purchaseDate = _a.purchaseDate;
        console.log('Portfolio POST request:', { code: code, shares: shares, purchasePrice: purchasePrice, purchaseDate: purchaseDate });
        var item = {
            code: code,
            shares: parseInt(shares, 10),
            purchasePrice: parseFloat(purchasePrice),
            purchaseDate: purchaseDate || new Date().toISOString().split('T')[0]
        };
        console.log('Adding to portfolio:', item);
        db_1.dbOps.addToPortfolio(item);
        res.json({ success: true });
    }
    catch (err) {
        console.error('Error adding to portfolio:', err);
        res.status(500).json({ error: err.message });
    }
});
// ポートフォリオから削除 (株を売る)
app.delete('/api/portfolio/:id', function (req, res) {
    var id = req.params.id;
    db_1.dbOps.removeFromPortfolio(parseInt(id, 10));
    res.json({ success: true });
});
// データ更新 + シグナル分析
app.post('/api/update', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var logs, stocks, portfolio, today, newSignalsCount, _loop_1, _i, stocks_1, stock;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logs = [];
                stocks = db_1.dbOps.getAllStocks();
                portfolio = db_1.dbOps.getPortfolio();
                today = new Date().toISOString().split('T')[0];
                logs.push("Starting update for ".concat(stocks.length, " stocks..."));
                newSignalsCount = 0;
                _loop_1 = function (stock) {
                    var prices, buySignal, holdings, _b, holdings_1, h, sellSignal, err_2;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                _c.trys.push([0, 2, , 3]);
                                return [4 /*yield*/, (0, fetcher_1.fetchStockData)(stock.code, 150)];
                            case 1:
                                prices = _c.sent();
                                if (prices.length > 0) {
                                    prices.forEach(function (p) { return db_1.dbOps.upsertDailyPrice(p); });
                                    logs.push("[".concat(stock.code, "] Data updated (").concat(prices.length, " records)."));
                                    buySignal = (0, analysis_1.analyzeStockForBuy)(stock, prices);
                                    if (buySignal) {
                                        db_1.dbOps.saveSignal(buySignal);
                                        newSignalsCount++;
                                        logs.push("[".concat(stock.code, "] BUY SIGNAL DETECTED!"));
                                    }
                                    holdings = portfolio.filter(function (p) { return p.code === stock.code; });
                                    for (_b = 0, holdings_1 = holdings; _b < holdings_1.length; _b++) {
                                        h = holdings_1[_b];
                                        sellSignal = (0, analysis_1.analyzeStockForSell)(stock, prices, h.purchasePrice);
                                        if (sellSignal) {
                                            db_1.dbOps.saveSignal(sellSignal);
                                            newSignalsCount++;
                                            logs.push("[".concat(stock.code, "] SELL SIGNAL DETECTED! (").concat(sellSignal.reason, ")"));
                                        }
                                    }
                                }
                                else {
                                    logs.push("[".concat(stock.code, "] No data retrieved."));
                                }
                                return [3 /*break*/, 3];
                            case 2:
                                err_2 = _c.sent();
                                logs.push("[".concat(stock.code, "] Error: ").concat(err_2.message));
                                return [3 /*break*/, 3];
                            case 3: return [2 /*return*/];
                        }
                    });
                };
                _i = 0, stocks_1 = stocks;
                _a.label = 1;
            case 1:
                if (!(_i < stocks_1.length)) return [3 /*break*/, 4];
                stock = stocks_1[_i];
                return [5 /*yield**/, _loop_1(stock)];
            case 2:
                _a.sent();
                _a.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4:
                logs.push("Update Complete. New signals: ".concat(newSignalsCount));
                res.json({ success: true, logs: logs });
                return [2 /*return*/];
        }
    });
}); });
app.listen(PORT, function () {
    console.log("Server running on http://localhost:".concat(PORT));
});
