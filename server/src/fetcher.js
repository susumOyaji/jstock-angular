"use strict";
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
exports.fetchStockData = fetchStockData;
exports.fetchStockInfo = fetchStockInfo;
var child_process_1 = require("child_process");
var path = require("path");
var fs = require("fs");
function fetchStockData(code_1, days_1) {
    return __awaiter(this, arguments, void 0, function (code, days, forceDownload) {
        var today, dateFolder, csvPath, success;
        if (forceDownload === void 0) { forceDownload = false; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    today = new Date().toISOString().split('T')[0];
                    dateFolder = path.join(process.cwd(), 'data', today);
                    csvPath = path.join(dateFolder, "".concat(code, ".csv"));
                    // Check if we already have today's data and it's not a force download
                    if (!forceDownload && fs.existsSync(csvPath)) {
                        return [2 /*return*/, parseCsv(csvPath, code)];
                    }
                    return [4 /*yield*/, downloadStockDataViaPython(code, days, csvPath)];
                case 1:
                    success = _a.sent();
                    if (success) {
                        return [2 /*return*/, parseCsv(csvPath, code)];
                    }
                    return [2 /*return*/, []];
            }
        });
    });
}
function downloadStockDataViaPython(code, days, outputPath) {
    return new Promise(function (resolve) {
        var scriptPath = path.join(process.cwd(), 'scripts', 'download_stock_data.py');
        var pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        // yfinance assumes .T for Tokyo for numeric codes usually
        var ticker = code.match(/^\d{4}$/) ? "".concat(code, ".T") : code;
        var downloadProcess = (0, child_process_1.spawn)(pythonCmd, [scriptPath, ticker, String(days), outputPath]);
        downloadProcess.on('close', function (code) {
            resolve(code === 0);
        });
        downloadProcess.stderr.on('data', function (data) {
            console.error("Python Error [".concat(ticker, "]: ").concat(data));
        });
    });
}
function parseCsv(filePath, code) {
    var content = fs.readFileSync(filePath, 'utf-8');
    var lines = content.split('\n').filter(function (l) { return l.trim() !== ''; });
    var prices = [];
    // Expected Header: Date,Open,High,Low,Close,Volume,...
    // yfinance CSV usually starts with Date
    var header = lines[0].split(',');
    var dateIdx = header.indexOf('Date');
    var openIdx = header.indexOf('Open');
    var highIdx = header.indexOf('High');
    var lowIdx = header.indexOf('Low');
    var closeIdx = header.indexOf('Close');
    var volIdx = header.indexOf('Volume');
    for (var i = 1; i < lines.length; i++) {
        var cols = lines[i].split(',');
        if (cols.length < 6)
            continue;
        // Handle date parsing trap mentioned in article (YYYY-MM-DD HH:MM:SS+TZ or YYYY-MM-DD)
        var dateRaw = cols[dateIdx];
        var dateStr = dateRaw;
        var iso8601Match = dateRaw.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso8601Match) {
            dateStr = "".concat(iso8601Match[1], "-").concat(iso8601Match[2], "-").concat(iso8601Match[3]);
        }
        prices.push({
            code: code,
            date: dateStr,
            open: parseFloat(cols[openIdx]),
            high: parseFloat(cols[highIdx]),
            low: parseFloat(cols[lowIdx]),
            close: parseFloat(cols[closeIdx]),
            volume: parseInt(cols[volIdx], 10)
        });
    }
    // Return sorted by date DESC (newest first) for analysis logic
    return prices.sort(function (a, b) { return b.date.localeCompare(a.date); });
}
function fetchStockInfo(code) {
    return new Promise(function (resolve, reject) {
        var scriptPath = path.join(process.cwd(), 'scripts', 'fetch_stock_info.py');
        var pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        var ticker = code.match(/^\d{4}$/) ? "".concat(code, ".T") : code;
        var process_cp = (0, child_process_1.spawn)(pythonCmd, [scriptPath, ticker]);
        var output = '';
        var errorOutput = '';
        process_cp.stdout.on('data', function (data) {
            output += data.toString();
        });
        process_cp.stderr.on('data', function (data) {
            errorOutput += data.toString();
        });
        process_cp.on('close', function (exitCode) {
            if (exitCode === 0) {
                try {
                    var result = JSON.parse(output);
                    resolve(result);
                }
                catch (e) {
                    reject(new Error('Failed to parse output: ' + output));
                }
            }
            else {
                reject(new Error(errorOutput || 'Process exited with code ' + exitCode));
            }
        });
    });
}
