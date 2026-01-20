import { Stock, DailyPrice, Signal } from './db';

const BUY_RSI_LOWER = 40;
const BUY_RSI_UPPER = 60;
const SELL_PROFIT_RATIO = 1.05; // TP: +5%
const SELL_LOSS_RATIO = 0.97;   // SL: -3%

export function calculateSMA(data: DailyPrice[], period: number): number | null {
    if (data.length < period) return null;
    const sum = data.slice(0, period).reduce((acc, curr) => acc + curr.close, 0);
    return sum / period;
}

export function calculateVolumeSMA(data: DailyPrice[], period: number): number | null {
    if (data.length < period) return null;
    const sum = data.slice(0, period).reduce((acc, curr) => acc + curr.volume, 0);
    return sum / period;
}

export function calculateRSI(data: DailyPrice[], period: number = 14): number | null {
    if (data.length < period + 1) return null;
    const changes: number[] = [];
    // data is sorted newest first
    for (let i = 0; i < period; i++) {
        changes.push(data[i].close - data[i + 1].close);
    }
    const avgGain = changes.filter(c => c > 0).reduce((s, c) => s + c, 0) / period;
    const avgLoss = Math.abs(changes.filter(c => c < 0).reduce((s, c) => s + c, 0)) / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

export function analyzeStockForBuy(stock: Stock, prices: DailyPrice[]): Signal | null {
    if (prices.length < 75) return null;

    const today = prices[0];
    const ma25 = calculateSMA(prices, 25);
    const ma75 = calculateSMA(prices, 75);
    const rsi = calculateRSI(prices, 14);
    const prevRsi = calculateRSI(prices.slice(1), 14);
    const volMa20 = calculateVolumeSMA(prices, 20);

    if (!ma25 || !ma75 || !rsi || !prevRsi || !volMa20) return null;

    // 判定条件 (Article 4-1)
    if (ma25 <= ma75) return null;          // 1. 上昇トレンド
    if (today.close <= ma25) return null;   // 2. 価格がMA25以上
    if (rsi < BUY_RSI_LOWER || rsi > BUY_RSI_UPPER) return null; // 3. RSI範囲
    if (rsi <= prevRsi) return null;        // 4. RSI上昇中
    if (today.volume <= volMa20) return null; // 5. 出来高確認

    const targetPrice = Math.floor(today.close * 0.995);
    return {
        code: stock.code,
        date: today.date,
        type: 'BUY',
        targetPrice,
        tp: Math.floor(targetPrice * SELL_PROFIT_RATIO),
        sl: Math.floor(targetPrice * SELL_LOSS_RATIO),
        reason: 'RSI(40-60) Rising + MA Trend + Vol Sync'
    };
}

export function analyzeStockForSell(stock: Stock, prices: DailyPrice[], purchasePrice?: number): Signal | null {
    if (prices.length < 25) return null;

    const today = prices[0];
    const rsi = calculateRSI(prices, 14);
    const ma25 = calculateSMA(prices, 25);

    if (!rsi || !ma25) return null;

    // 1. RSI Overbought
    if (rsi > 75) {
        return {
            code: stock.code,
            date: today.date,
            type: 'SELL',
            targetPrice: today.close,
            tp: 0,
            sl: 0,
            reason: `Overbought (RSI: ${Math.round(rsi)})`
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
