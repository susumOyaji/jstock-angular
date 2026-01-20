import * as path from 'path';
import * as fs from 'fs';
import fetch from 'node-fetch';
import { DailyPrice } from './db';

// Helper to fetch data from Yahoo Finance CSV
async function fetchYahooFinanceCSV(ticker: string, startDate: Date, endDate: Date): Promise<any[]> {
    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);
    
    const url = `https://query1.finance.yahoo.com/v7/finance/download/${ticker}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d&events=history&includeAdjustedClose=true`;
    
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
    }) as any;
    
    if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.statusText}`);
    }
    
    const csv = await response.text();
    const lines = csv.split('\n').filter((l: string) => l.trim() !== '');
    const result = [];
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 6) continue;
        
        result.push({
            date: cols[0],
            open: parseFloat(cols[1]),
            high: parseFloat(cols[2]),
            low: parseFloat(cols[3]),
            close: parseFloat(cols[4]),
            volume: parseInt(cols[6], 10) // Adjusted Close is cols[5], Volume is cols[6]
        });
    }
    
    return result;
}

export async function fetchStockData(
    code: string,
    days: number,
    forceDownload: boolean = false
): Promise<DailyPrice[]> {
    const today = new Date().toISOString().split('T')[0];
    const dateFolder = path.join(process.cwd(), 'data', today);
    const csvPath = path.join(dateFolder, `${code}.csv`);

    // Check if we already have today's data and it's not a force download
    if (!forceDownload && fs.existsSync(csvPath)) {
        return parseCsv(csvPath, code);
    }

    // Otherwise, download via yahoo-finance2
    try {
        const prices = await downloadStockDataViaYahooFinance(code, days);
        if (prices.length > 0) {
            // Save to CSV
            await savePricesToCsv(prices, csvPath);
            return prices;
        }
    } catch (err) {
        console.error(`Error fetching data for ${code}:`, err);
    }
    return [];
}

async function downloadStockDataViaYahooFinance(
    code: string,
    days: number
): Promise<DailyPrice[]> {
    // Format ticker for Yahoo Finance
    const ticker = code.match(/^\d{4}$/) ? `${code}.T` : code;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    try {
        const csvData = await fetchYahooFinanceCSV(ticker, startDate, endDate);
        
        const prices: DailyPrice[] = csvData.map((item: any) => ({
            code,
            date: item.date,
            open: item.open || 0,
            high: item.high || 0,
            low: item.low || 0,
            close: item.close || 0,
            volume: item.volume || 0
        }));

        // Return sorted by date DESC (newest first) for analysis logic
        return prices.sort((a, b) => b.date.localeCompare(a.date));
    } catch (err) {
        console.error(`Yahoo Finance error for ${ticker}:`, err);
        throw err;
    }
}

async function savePricesToCsv(prices: DailyPrice[], csvPath: string): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(csvPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Create CSV content
    const header = 'Date,Open,High,Low,Close,Volume\n';
    const rows = prices
        .sort((a, b) => a.date.localeCompare(b.date)) // Sort ascending for CSV
        .map(p => `${p.date},${p.open},${p.high},${p.low},${p.close},${p.volume}`)
        .join('\n');

    fs.writeFileSync(csvPath, header + rows);
}

function parseCsv(filePath: string, code: string): DailyPrice[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim() !== '');
    const prices: DailyPrice[] = [];

    // Expected Header: Date,Open,High,Low,Close,Volume,...
    const header = lines[0].split(',');
    const dateIdx = header.indexOf('Date');
    const openIdx = header.indexOf('Open');
    const highIdx = header.indexOf('High');
    const lowIdx = header.indexOf('Low');
    const closeIdx = header.indexOf('Close');
    const volIdx = header.indexOf('Volume');

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 6) continue;

        // Handle date parsing (YYYY-MM-DD)
        let dateRaw = cols[dateIdx];
        let dateStr = dateRaw;
        const iso8601Match = dateRaw.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso8601Match) {
            dateStr = `${iso8601Match[1]}-${iso8601Match[2]}-${iso8601Match[3]}`;
        }

        prices.push({
            code,
            date: dateStr,
            open: parseFloat(cols[openIdx]),
            high: parseFloat(cols[highIdx]),
            low: parseFloat(cols[lowIdx]),
            close: parseFloat(cols[closeIdx]),
            volume: parseInt(cols[volIdx], 10)
        });
    }

    // Return sorted by date DESC (newest first) for analysis logic
    return prices.sort((a, b) => b.date.localeCompare(a.date));
}

export async function fetchStockInfo(code: string): Promise<{ code: string, name: string, market: string }> {
    const ticker = code.match(/^\d{4}$/) ? `${code}.T` : code;

    try {
        const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=price`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        }) as any;

        if (!response.ok) {
            throw new Error(`Yahoo Finance API error: ${response.statusText}`);
        }

        const data: any = await response.json();
        const price = data.quoteSummary?.result?.[0]?.price;
        
        return {
            code,
            name: price?.longName || price?.shortName || ticker,
            market: price?.exchange || ''
        };
    } catch (err) {
        console.error(`Error fetching stock info for ${ticker}:`, err);
        // Fallback response
        return {
            code,
            name: ticker,
            market: ''
        };
    }
}
