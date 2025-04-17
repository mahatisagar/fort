import fetch from 'node-fetch';

export async function handler(event) {
  const { symbol, interval = '1m', range = '15m' } = event.queryStringParameters;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
    const res = await fetch(url);
    const json = await res.json();

    const result = json.chart.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    const timestamps = result?.timestamp;

    if (!timestamps || !quote || !quote.close) {
      return {
        statusCode: 200,
        body: JSON.stringify({ prices: [] }),
      };
    }

    const prices = timestamps.map((time, i) => ({
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

    return {
      statusCode: 200,
      body: JSON.stringify({ prices }),
    };
  } catch (err) {
    console.error("Yahoo API Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch Yahoo data" }),
    };
  }
}
