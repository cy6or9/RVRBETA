/**
 * WEATHER API — Unified format for UI
 * Uses Open-Meteo (free, no key required)
 * Returns: tempF, windSpeed, windDir, windCompass, summary
 */

function windDirToCompass(deg) {
  if (isNaN(deg)) return "";
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

export default async function handler(req, res) {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat/lon" });
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Open-Meteo HTTP ${r.status}`);

    const j = await r.json();
    const cw = j.current_weather ?? {};

    const tempC = cw.temperature ?? null;
    const tempF = tempC !== null ? (tempC * 9) / 5 + 32 : null;

    const windKmh = cw.windspeed ?? null;
    const windMph = windKmh !== null ? windKmh * 0.621371 : null;

    const windDir = cw.winddirection ?? null;

    const summary = typeof cw.weathercode === "number"
      ? `Code ${cw.weathercode}`
      : "Clear";

    return res.status(200).json({
      tempF,
      windSpeed: windMph,
      windDir,
      windCompass: windDirToCompass(windDir),
      summary,
    });
  } catch (err) {
    console.error("Weather fetch error:", err);
    return res.status(500).json({ error: "Weather unavailable" });
  }
}
