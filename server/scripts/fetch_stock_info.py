import yfinance as yf
import sys
import json

def fetch_stock_info(ticker):
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        # Get name, preferring longName
        name = info.get('longName') or info.get('shortName') or info.get('symbol')
        
        result = {
            "code": ticker,
            "name": name,
            "market": info.get('exchange')
        }
        print(json.dumps(result))
        return True
    except Exception as e:
        # Fallback for some cases where .info might fail or be restricted
        # Sometimes shortName is available even if full info is not
        try:
           stock = yf.Ticker(ticker)
           name = stock.info.get('shortName') or ticker
           print(json.dumps({"code": ticker, "name": name, "market": ""}))
           return True
        except:
           print(json.dumps({"error": str(e)}), file=sys.stderr)
           return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No ticker provided"}))
        sys.exit(1)
        
    ticker = sys.argv[1]
    success = fetch_stock_info(ticker)
    sys.exit(0 if success else 1)
