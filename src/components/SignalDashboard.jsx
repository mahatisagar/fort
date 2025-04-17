import React, { useEffect, useState } from "react";
import { generateSignal } from "../utils/signalUtils";

const symbols = [
  { label: "EUR/USD", symbol: "EUR/USD" },
  { label: "USD/JPY", symbol: "USD/JPY" },
  { label: "GBP/USD", symbol: "GBP/USD" },
  { label: "AUD/USD", symbol: "AUD/USD" },
  { label: "USD/CAD", symbol: "USD/CAD" },
  { label: "USD/CHF", symbol: "USD/CHF" },
  { label: "NZD/USD", symbol: "NZD/USD" },
  { label: "BTC/USD", symbol: "bitcoin" },
  { label: "ETH/USD", symbol: "ethereum" },
  { label: "LTC/USD", symbol: "litecoin" },
  { label: "XRP/USD", symbol: "ripple" }
];

const isWeekend = () => {
  const day = new Date().getDay();
  return day === 6 || day === 0;
};

export default function SignalDashboard() {
  const [signals, setSignals] = useState({});

  useEffect(() => {
    if (isWeekend()) return;

    async function fetchSignal(symbolKey, symbolLabel) {
      try {
        const res = await fetch(`/api/marketdata?symbol=${symbolKey}`);
        const json = await res.json();
        console.log("Response for", symbolLabel, json);

        if (!json.prices || json.prices.length < 8) {
          console.warn("Not enough price data for", symbolLabel);
          return;
        }

        const ohlc = json.prices.map((p, i) => ({
          time: i,
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
        }));

        const signal = generateSignal(ohlc);
        console.log("Signal for", symbolLabel, signal);

        setSignals((prev) => ({
          ...prev,
          [symbolLabel]: signal,
        }));

        if (signal.signal) {
          await fetch("/api/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              asset: symbolLabel,
              signal: signal.signal,
              time: signal.time,
              sma4: signal.sma4,
              sma8: signal.sma8,
              fractal: signal.fractal,
            }),
          });
        }
      } catch (e) {
        console.error(`❌ Error fetching signal for ${symbolLabel}`, e);
      }
    }

    function fetchAllSignals() {
      symbols.forEach(({ symbol, label }) => fetchSignal(symbol, label));
    }

    fetchAllSignals();
    const interval = setInterval(fetchAllSignals, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Pocket Option Signals (Yahoo + Twelve Data Fallback)</h1>
      {isWeekend() ? (
        <p style={{ fontStyle: "italic", color: "#666" }}>
          💤 Markets are closed (weekend). Live signals will resume when markets reopen.
        </p>
      ) : (
        symbols.map(({ label }) => {
          const signal = signals[label];
          return (
            <div key={label} style={{ border: "1px solid #ccc", padding: "1em", marginBottom: "1em" }}>
              <h2>{label}</h2>
              {signal ? (
                <>
                  <p><strong>Signal:</strong> {signal.signal || "No signal"}</p>
                  <p>SMA 4: {signal.sma4?.toFixed(4)}</p>
                  <p>SMA 8: {signal.sma8?.toFixed(4)}</p>
                  <p>Fractal: {signal.fractal ? JSON.stringify(signal.fractal) : "N/A"}</p>
                </>
              ) : (
                <p>No valid data</p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
