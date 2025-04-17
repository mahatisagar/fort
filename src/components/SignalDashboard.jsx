import React, { useEffect, useState } from "react";
import { generateSignal } from "../utils/signalUtils";

const assets = ["EUR/USD", "USD/JPY", "GBP/USD", "BTC/USD", "ETH/USD"];
const strategies = ["hybrid", "bb-rsi", "ema"];

export default function SignalDashboard() {
  const [selectedAsset, setSelectedAsset] = useState("EUR/USD");
  const [selectedStrategy, setSelectedStrategy] = useState("hybrid");
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(false);

  async function fetchSignal() {
    try {
      setLoading(true);
      const res = await fetch(`/api/marketdata?symbol=${selectedAsset}`);
      const json = await res.json();

      if (!json.prices || json.prices.length < 20) {
        setSignal(null);
        setLoading(false);
        return;
      }

      const ohlc = json.prices.map((p, i) => ({
        time: i,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
      }));

      const result = generateSignal(ohlc, selectedStrategy);
      setSignal(result);
      setLoading(false);

      if (result.signal) {
        await fetch("/api/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            asset: selectedAsset,
            signal: result.signal,
            time: result.time,
            ema3: result.ema3,
            ema7: result.ema7,
            rsi: result.rsi,
          }),
        });
      }
    } catch (e) {
      console.error("Signal fetch error", e);
      setSignal(null);
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSignal();
    const interval = setInterval(fetchSignal, 60000);
    return () => clearInterval(interval);
  }, [selectedAsset, selectedStrategy]);

  return (
    <div style={{ padding: "1em", fontFamily: "Arial, sans-serif" }}>
      <h2>📊 Trading Signal Dashboard</h2>

      <div style={{ display: "flex", gap: "1em", marginBottom: "1em" }}>
        <div>
          <label>Asset:</label><br />
          <select value={selectedAsset} onChange={e => setSelectedAsset(e.target.value)}>
            {assets.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>

        <div>
          <label>Strategy:</label><br />
          <select value={selectedStrategy} onChange={e => setSelectedStrategy(e.target.value)}>
            {strategies.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div style={{ border: "1px solid #ccc", padding: "1em", borderRadius: "1em" }}>
        <h3>{selectedAsset}</h3>
        {loading ? (
          <p>⏳ Loading signal...</p>
        ) : signal ? (
          <>
            <p><strong>Signal:</strong> {signal.signal}</p>
            <p><strong>Strategy:</strong> {signal.strategy}</p>
            <p><strong>RSI:</strong> {signal.rsi?.toFixed(2)}</p>
            <p><strong>EMA 3:</strong> {signal.ema3?.toFixed(5)}</p>
            <p><strong>EMA 7:</strong> {signal.ema7?.toFixed(5)}</p>
            <p><strong>Score:</strong> {signal.score}</p>
            <p><strong>Time:</strong> {new Date(signal.time).toLocaleTimeString()}</p>
          </>
        ) : (
          <p>⚠️ No valid signal.</p>
        )}
      </div>
    </div>
  );
}
