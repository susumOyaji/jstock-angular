import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { DailyPrice } from './db';

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

    // Otherwise, download via Python
    const success = await downloadStockDataViaPython(code, days, csvPath);
    if (success) {
        return parseCsv(csvPath, code);
    }
    return [];
}

function downloadStockDataViaPython(
    code: string,
    days: number,
    outputPath: string
): Promise<boolean> {
    return new Promise((resolve) => {
        const scriptPath = path.join(process.cwd(), 'scripts', 'download_stock_data.py');
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

        // yfinance assumes .T for Tokyo for numeric codes usually
        const ticker = code.match(/^\d{4}$/) ? `${code}.T` : code;

        const downloadProcess = spawn(pythonCmd, [scriptPath, ticker, String(days), outputPath]);

        downloadProcess.on('close', (code) => {
            resolve(code === 0);
        });

        downloadProcess.stderr.on('data', (data) => {
            console.error(`Python Error [${ticker}]: ${data}`);
        });
    });
}

function parseCsv(filePath: string, code: string): DailyPrice[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim() !== '');
    const prices: DailyPrice[] = [];

    // Expected Header: Date,Open,High,Low,Close,Volume,...
    // yfinance CSV usually starts with Date
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

        // Handle date parsing trap mentioned in article (YYYY-MM-DD HH:MM:SS+TZ or YYYY-MM-DD)
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

export function fetchStockInfo(code: string): Promise<{ code: string, name: string, market: string }> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), 'scripts', 'fetch_stock_info.py');
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const ticker = code.match(/^\d{4}$/) ? `${code}.T` : code;

        const process_cp = spawn(pythonCmd, [scriptPath, ticker]);
        let output = '';
        let errorOutput = '';

        process_cp.stdout.on('data', (data) => {
            output += data.toString();
        });

        process_cp.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        process_cp.on('close', (exitCode) => {
            if (exitCode === 0) {
                try {
                    const result = JSON.parse(output);
                    resolve(result);
                } catch (e) {
                    reject(new Error('Failed to parse output: ' + output));
                }
            } else {
                reject(new Error(errorOutput || 'Process exited with code ' + exitCode));
            }
        });
    });
}
