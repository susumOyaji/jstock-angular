const yahooFinance = require('yahoo-finance2').default;
const fs = require('fs').promises;
const path = require('path');

async function downloadStockData(ticker, days, outputPath) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const queryOptions = {
      period1: startDate.toISOString().split('T')[0],
      period2: endDate.toISOString().split('T')[0],
    };

    const result = await yahooFinance.historical(ticker, queryOptions);

    if (!result || result.length === 0) {
      console.log(`No data found for ${ticker}`);
      return false;
    }

    // Convert to CSV
    const headers = Object.keys(result[0]).join(',');
    const rows = result.map(row => Object.values(row).join(','));
    const csvContent = `${headers}\n${rows.join('\n')}`;

    // Ensure directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Save to CSV
    await fs.writeFile(outputPath, csvContent);
    console.log(`Downloaded ${result.length} records for ${ticker}`);
    return true;
  } catch (e) {
    console.error(`Error: ${e.message}`, e);
    return false;
  }
}

if (require.main === module) {
  if (process.argv.length < 5) {
    console.log("Usage: node download_stock_data.js <ticker> <days> <output_path>");
    process.exit(1);
  }

  const [, , ticker, days, outputPath] = process.argv;
  const daysInt = parseInt(days, 10);

  if (isNaN(daysInt)) {
    console.error("Error: <days> must be an integer.");
    process.exit(1);
  }

  downloadStockData(ticker, daysInt, outputPath).then(success => {
    process.exit(success ? 0 : 1);
  });
}
