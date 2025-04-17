const TELEGRAM_BOT_TOKEN = "8076734672:AAG_JcxR2wT35EZX6iHuLwp-kK6656DsGNg";
const CHAT_ID = "1266128223";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { asset, signal, time, rsi, ema3, ema7 } = JSON.parse(event.body);
    const msg = `📊 *${asset}* Signal\n🕒 ${new Date(time).toLocaleTimeString()}\nSignal: *${signal}*\n\nEMA3: ${ema3?.toFixed(5)}\nEMA7: ${ema7?.toFixed(5)}\nRSI: ${rsi?.toFixed(2)}`;

    const encodedMsg = encodeURIComponent(msg);
    const url = \`https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=\${CHAT_ID}&text=\${encodedMsg}&parse_mode=Markdown\`;

    const res = await fetch(url);
    const data = await res.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, result: data })
    };
  } catch (err) {
    console.error("Telegram error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to send message to Telegram" })
    };
  }
}
