import { dbOps } from './src/db';

const initialStocks = [
    { code: '7203', name: 'トヨタ自動車', market: '東証プライム' },
    { code: '9984', name: 'ソフトバンクグループ', market: '東証プライム' },
    { code: '6758', name: 'ソニーグループ', market: '東証プライム' },
    { code: '8035', name: '東京エレクトロン', market: '東証プライム' },
    { code: '6857', name: 'アドバンテスト', market: '東証プライム' },
    { code: '9983', name: 'ファーストリテイリング', market: '東証プライム' }
];

console.log('Initializing database with sample stocks...');
initialStocks.forEach(stock => {
    dbOps.addStock(stock);
    console.log(`Added: ${stock.name} (${stock.code})`);
});
console.log('Initialization complete.');
