export function calculateEMA(data, period) {
  const ema = [];
  const k = 2 / (period + 1);
  let prev = data[0].close;
  data.forEach((point, i) => {
    if (i === 0) {
      ema.push(prev);
    } else {
      const current = point.close * k + prev * (1 - k);
      ema.push(current);
      prev = current;
    }
  });
  return ema;
}

export function calculateRSI(data, period = 14) {
  let gains = 0, losses = 0;
  const rsi = new Array(data.length).fill(null);

  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff > 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }

    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return rsi;
}

export function calculateBollingerBands(data, period = 20, mult = 2) {
  const sma = data.map((_, i, arr) => {
    if (i < period - 1) return null;
    const slice = arr.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, val) => acc + val.close, 0);
    return sum / period;
  });

  const bands = data.map((_, i) => {
    if (i < period - 1 || sma[i] == null) return null;
    const slice = data.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const variance = slice.reduce((acc, val) => acc + Math.pow(val.close - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    return {
      upper: mean + mult * stdDev,
      lower: mean - mult * stdDev,
      middle: mean
    };
  });
  return bands;
}

export function generateSignal(data, strategy = "hybrid") {
  const ema3 = calculateEMA(data, 3);
  const ema7 = calculateEMA(data, 7);
  const rsi = calculateRSI(data, 14);
  const bb = calculateBollingerBands(data, 20);

  const latest = data.length - 1;
  const price = data[latest]?.close;
  const bbNow = bb[latest];
  const rsiNow = rsi[latest];
  const emaCrossUp = ema3[latest - 1] < ema7[latest - 1] && ema3[latest] > ema7[latest];
  const emaCrossDown = ema3[latest - 1] > ema7[latest - 1] && ema3[latest] < ema7[latest];

  let score = 0;
  if (strategy === "bb-rsi" || strategy === "hybrid") {
    if (bbNow && price < bbNow.lower && rsiNow < 30) score += 2;
    if (bbNow && price > bbNow.upper && rsiNow > 70) score -= 2;
  }

  if (strategy === "ema" || strategy === "hybrid") {
    if (emaCrossUp) score += 1;
    if (emaCrossDown) score -= 1;
  }

  let signal = null;
  if (score >= 2) signal = "Strong Buy";
  else if (score === 1) signal = "Buy";
  else if (score <= -2) signal = "Strong Sell";
  else if (score === -1) signal = "Sell";

  return {
    signal,
    score,
    strategy,
    ema3: ema3[latest],
    ema7: ema7[latest],
    rsi: rsiNow,
    bollinger: bbNow,
    price,
    time: data[latest]?.time || Date.now()
  };
}
