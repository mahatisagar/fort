export async function handler(event) {
  const { symbol } = event.queryStringParameters;
  const interval = '1min';

  const TWELVE_API_KEY = 'd1045b0a123b4a0d8e17b95897e94f2c';
  const yahooSymbol = symbol.includes("/") ? symbol.replace("/", "") + "=X" : symbol;

  try {
    const yahooURL = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`;
    const yahooRes = await fetch(yahooURL);
    const yahooJson = await yahooRes.json();

    const result = yahooJson.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    const timestamps = result?.timestamp;

    if (timestamps && quote?.close?.length) {
      let prices = timestamps.map((time, i) => ({
        time: time * 1000,
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i],
      })).filter(p =>
        p.close !== null &&
        !isNaN(p.close) &&
        p.open !== null &&
        p.high !== null &&
        p.low !== null
      );

      if (prices.length >= 20) {
        return {
          statusCode: 200,
          body: JSON.stringify({ source: "yahoo", prices })
        };
      }
    }

    const twelveURL = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1min&outputsize=100&apikey=${TWELVE_API_KEY}`;
    const twelveRes = await fetch(twelveURL);
    const twelveJson = await twelveRes.json();

    if (twelveJson?.values?.length >= 20) {
      let prices = twelveJson.values.reverse().map(p => ({
        time: new Date(p.datetime).getTime(),
        open: parseFloat(p.open),
        high: parseFloat(p.high),
        low: parseFloat(p.low),
        close: parseFloat(p.close)
      }));

      return {
        statusCode: 200,
        body: JSON.stringify({ source: "twelvedata", prices })
      };
    }

    // Fallback mock data for dev
    const fallback = Array.from({ length: 20 }).map((_, i) => ({
      time: Date.now() - (20 - i) * 60000,
      open: 1.1 + Math.random() * 0.01,
      high: 1.12 + Math.random() * 0.01,
      low: 1.09 + Math.random() * 0.01,
      close: 1.11 + Math.random() * 0.01,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ source: "mock", prices: fallback })
    };
  } catch (err) {
    console.error("Market data fetch error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Market data server error." })
    };
  }
}
