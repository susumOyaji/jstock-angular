import express from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import { dbOps } from './db';
import { fetchStockData, fetchStockInfo } from './fetcher';
import { analyzeStockForBuy, analyzeStockForSell } from './analysis';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 銘柄一覧取得
app.get('/api/stocks', (req, res) => {
    const stocks = dbOps.getAllStocks();
    const today = new Date().toISOString().split('T')[0];

    const stocksWithStatus = stocks.map(stock => {
        const csvPath = path.join(process.cwd(), 'data', today, `${stock.code}.csv`);
        const hasDataToday = fs.existsSync(csvPath);

        // Get latest price info
        const prices = dbOps.getDailyPrices(stock.code, 2);
        const latestPrice = prices[0];
        const prevPrice = prices[1];

        return {
            ...stock,
            hasDataToday,
            currentPrice: latestPrice?.close || null,
            prevClose: prevPrice?.close || null,
            lastUpdate: latestPrice?.date || null
        };
    });

    res.json(stocksWithStatus);
});

// シグナル一覧取得
app.get('/api/signals', (req, res) => {
    const signals = dbOps.getSignals();
    res.json(signals);
});

// 銘柄情報取得 (名前の自動取得用)
app.get('/api/stocks/info/:code', async (req, res) => {
    const { code } = req.params;
    try {
        const info = await fetchStockInfo(code);
        res.json(info);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// 銘柄追加
app.post('/api/stocks', (req, res) => {
    const { code, name, market } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'Code and Name required' });
    dbOps.addStock({ code, name, market });
    res.json({ success: true });
});

// 銘柄削除
app.delete('/api/stocks/:code', (req, res) => {
    const { code } = req.params;
    dbOps.deleteStock(code);
    res.json({ success: true });
});

// ポートフォリオ取得
app.get('/api/portfolio', (req, res) => {
    const portfolio = dbOps.getPortfolio();
    const portfolioWithPrices = portfolio.map(item => {
        const latest = dbOps.getLatestPrice(item.code);
        return { ...item, currentPrice: latest?.close || null };
    });
    res.json(portfolioWithPrices);
});

// ポートフォリオ追加 (株を買う)
app.post('/api/portfolio', (req, res) => {
    try {
        const { code, shares, purchasePrice, purchaseDate } = req.body;
        console.log('Portfolio POST request:', { code, shares, purchasePrice, purchaseDate });

        const item = {
            code,
            shares: parseInt(shares, 10),
            purchasePrice: parseFloat(purchasePrice),
            purchaseDate: purchaseDate || new Date().toISOString().split('T')[0]
        };

        console.log('Adding to portfolio:', item);
        dbOps.addToPortfolio(item);
        res.json({ success: true });
    } catch (err: any) {
        console.error('Error adding to portfolio:', err);
        res.status(500).json({ error: err.message });
    }
});

// ポートフォリオから削除 (株を売る)
app.delete('/api/portfolio/:id', (req, res) => {
    const { id } = req.params;
    dbOps.removeFromPortfolio(parseInt(id, 10));
    res.json({ success: true });
});

// データ更新 + シグナル分析
app.post('/api/update', async (req, res) => {
    const logs: string[] = [];
    const stocks = dbOps.getAllStocks();
    const portfolio = dbOps.getPortfolio();
    const today = new Date().toISOString().split('T')[0];

    logs.push(`Starting update for ${stocks.length} stocks...`);

    let newSignalsCount = 0;

    // 分析対象: ウォッチリスト銘柄 (Buy分析) と ポートフォリオ銘柄 (Sell分析)
    // 重複を避けるために一意なリストを作成 (ただしロジック上分ける)

    for (const stock of stocks) {
        try {
            const prices = await fetchStockData(stock.code, 150);

            if (prices.length > 0) {
                prices.forEach(p => dbOps.upsertDailyPrice(p));
                logs.push(`[${stock.code}] Data updated (${prices.length} records).`);

                // 1. Buy Analysis (for watchlist)
                const buySignal = analyzeStockForBuy(stock, prices);
                if (buySignal) {
                    dbOps.saveSignal(buySignal);
                    newSignalsCount++;
                    logs.push(`[${stock.code}] BUY SIGNAL DETECTED!`);
                }

                // 2. Sell Analysis (if in portfolio)
                const holdings = portfolio.filter(p => p.code === stock.code);
                for (const h of holdings) {
                    const sellSignal = analyzeStockForSell(stock, prices, h.purchasePrice);
                    if (sellSignal) {
                        dbOps.saveSignal(sellSignal);
                        newSignalsCount++;
                        logs.push(`[${stock.code}] SELL SIGNAL DETECTED! (${sellSignal.reason})`);
                    }
                }
            } else {
                logs.push(`[${stock.code}] No data retrieved.`);
            }
        } catch (err: any) {
            logs.push(`[${stock.code}] Error: ${err.message}`);
        }
    }

    logs.push(`Update Complete. New signals: ${newSignalsCount}`);
    res.json({ success: true, logs });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
