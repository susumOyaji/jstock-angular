import yfinance as yf
import sys
import os
from datetime import datetime, timedelta

def download_stock_data(ticker, days, output_path):
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        stock = yf.Ticker(ticker)
        df = stock.history(start=start_date, end=end_date)
        
        if df.empty:
            print(f"No data found for {ticker}")
            return False
            
        # Ensure directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Save to CSV
        df.to_csv(output_path)
        print(f"Downloaded {len(df)} records for {ticker}")
        return True
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python download_stock_data.py <ticker> <days> <output_path>")
        sys.exit(1)
        
    ticker = sys.argv[1]
    days = int(sys.argv[2])
    output = sys.argv[3]
    success = download_stock_data(ticker, days, output)
    sys.exit(0 if success else 1)
