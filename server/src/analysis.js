"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSMA = calculateSMA;
exports.calculateVolumeSMA = calculateVolumeSMA;
exports.calculateRSI = calculateRSI;
exports.analyzeStockForBuy = analyzeStockForBuy;
exports.analyzeStockForSell = analyzeStockForSell;
var BUY_RSI_LOWER = 40;
var BUY_RSI_UPPER = 60;
var SELL_PROFIT_RATIO = 1.05; // TP: +5%
var SELL_LOSS_RATIO = 0.97; // SL: -3%
function calculateSMA(data, period) {
    if (data.length < period)
        return null;
    var sum = data.slice(0, period).reduce(function (acc, curr) { return acc + curr.close; }, 0);
    return sum / period;
}
function calculateVolumeSMA(data, period) {
    if (data.length < period)
        return null;
    var sum = data.slice(0, period).reduce(function (acc, curr) { return acc + curr.volume; }, 0);
    return sum / period;
}
function calculateRSI(data, period) {
    if (period === void 0) { period = 14; }
    if (data.length < period + 1)
        return null;
    var changes = [];
    // data is sorted newest first
    for (var i = 0; i < period; i++) {
        changes.push(data[i].close - data[i + 1].close);
    }
    var avgGain = changes.filter(function (c) { return c > 0; }).reduce(function (s, c) { return s + c; }, 0) / period;
    var avgLoss = Math.abs(changes.filter(function (c) { return c < 0; }).reduce(function (s, c) { return s + c; }, 0)) / period;
    if (avgLoss === 0)
        return 100;
    var rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}
function analyzeStockForBuy(stock, prices) {
    if (prices.length < 75)
        return null;
    var today = prices[0];
    var ma25 = calculateSMA(prices, 25);
    var ma75 = calculateSMA(prices, 75);
    var rsi = calculateRSI(prices, 14);
    var prevRsi = calculateRSI(prices.slice(1), 14);
    var volMa20 = calculateVolumeSMA(prices, 20);
    if (!ma25 || !ma75 || !rsi || !prevRsi || !volMa20)
        return null;
    // 判定条件 (Article 4-1)
    if (ma25 <= ma75)
        return null; // 1. 上昇トレンド
    if (today.close <= ma25)
        return null; // 2. 価格がMA25以上
    if (rsi < BUY_RSI_LOWER || rsi > BUY_RSI_UPPER)
        return null; // 3. RSI範囲
    if (rsi <= prevRsi)
        return null; // 4. RSI上昇中
    if (today.volume <= volMa20)
        return null; // 5. 出来高確認
    var targetPrice = Math.floor(today.close * 0.995);
    return {
        code: stock.code,
        date: today.date,
        type: 'BUY',
        targetPrice: targetPrice,
        tp: Math.floor(targetPrice * SELL_PROFIT_RATIO),
        sl: Math.floor(targetPrice * SELL_LOSS_RATIO),
        reason: 'RSI(40-60) Rising + MA Trend + Vol Sync'
    };
}
function analyzeStockForSell(stock, prices, purchasePrice) {
    if (prices.length < 25)
        return null;
    var today = prices[0];
    var rsi = calculateRSI(prices, 14);
    var ma25 = calculateSMA(prices, 25);
    if (!rsi || !ma25)
        return null;
    // 1. RSI Overbought
    if (rsi > 75) {
        return {
            code: stock.code,
            date: today.date,
            type: 'SELL',
            targetPrice: today.close,
            tp: 0,
            sl: 0,
            reason: "Overbought (RSI: ".concat(Math.round(rsi), ")")
        };
    }
    // 2. Trend Break (Close below MA25)
    if (today.close < ma25) {
        return {
            code: stock.code,
            date: today.date,
            type: 'SELL',
            targetPrice: today.close,
            tp: 0,
            sl: 0,
            reason: 'Trend Break (Below MA25)'
        };
    }
    // 3. Simple Profit/Loss Target (if purchase price provided)
    if (purchasePrice) {
        if (today.close >= purchasePrice * SELL_PROFIT_RATIO) {
            return {
                code: stock.code,
                date: today.date,
                type: 'SELL',
                targetPrice: today.close,
                tp: 0,
                sl: 0,
                reason: 'Target Profit Reached (+5%)'
            };
        }
        if (today.close <= purchasePrice * SELL_LOSS_RATIO) {
            return {
                code: stock.code,
                date: today.date,
                type: 'SELL',
                targetPrice: today.close,
                tp: 0,
                sl: 0,
                reason: 'Stop Loss Hit (-3%)'
            };
        }
    }
    return null;
}
