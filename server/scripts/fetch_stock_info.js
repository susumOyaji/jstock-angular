const yahooFinance = require('yahoo-finance2').default;

async function fetchStockInfo(ticker) {
  try {
    const quote = await yahooFinance.quote(ticker);
    
    if (!quote) {
      throw new Error('No quote data found');
    }

    const name = quote.longName || quote.shortName || quote.symbol;
    
    const result = {
      code: ticker,
      name: name,
      market: quote.fullExchangeName || quote.exchange
    };
    
    console.log(JSON.stringify(result));
    return true;
  } catch (e) {
    console.error(JSON.stringify({ error: e.message }));
    return false;
  }
}

if (require.main === module) {
  if (process.argv.length < 3) {
    console.error(JSON.stringify({ error: "No ticker provided" }));
    process.exit(1);
  }

  const ticker = process.argv[2];
  fetchStockInfo(ticker).then(success => {
    process.exit(success ? 0 : 1);
  });
}
