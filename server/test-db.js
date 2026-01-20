const Database = require('better-sqlite3');
const db = new Database('./jstock.db');

console.log('=== STOCKS ===');
const stocks = db.prepare('SELECT * FROM stocks LIMIT 5').all();
console.log(stocks);

console.log('\n=== PORTFOLIO ===');
const portfolio = db.prepare('SELECT * FROM portfolio').all();
console.log(portfolio);

console.log('\n=== PORTFOLIO WITH NAMES ===');
const portfolioWithNames = db.prepare(`
    SELECT p.*, s.name 
    FROM portfolio p 
    LEFT JOIN stocks s ON p.code = s.code
`).all();
console.log(portfolioWithNames);

db.close();
