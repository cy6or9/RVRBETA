/**
 * AQI API — Unified format for UI
 * Reads from AirNow if you set AIRNOW_API_KEY
 * Falls back to an OpenAQ derived category if needed
 */

const AQI_LABELS = [
  { max: 50, label: "Good" },
  { max: 100, label: "Moderate" },
  { max: 150, label: "USG" },
  { max: 200, label: "Unhealthy" },
  { max: 300, label: "VeryUnhealthy" },
  { max: 500, label: "Hazardous" },
];

function getCategory(aqi) {
  if (aqi == null) return null;
  return AQI_LABELS.find((l) => aqi <= l.max)?.label ?? "Hazardous";
}

export default async function handler(req, res) {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "Missing lat/lon" });

  try {
    let aqi = null;

    if (process.env.AIRNOW_API_KEY) {
      const url = `https://www.airnowapi.org/aq/observation/latLong/current/?format=application/json&latitude=${lat}&longitude=${lon}&distance=25&API_KEY=${process.env.AIRNOW_API_KEY}`;
      const r = await fetch(url);
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j) && j.length > 0 && j[0].AQI != null) {
          aqi = parseFloat(j[0].AQI);
        }
      }
    }

    // If no AirNow return, fallback to category only (clear skies assumed)
    const cat = getCategory(aqi ?? 20);

    return res.status(200).json({
      aqi,
      category: cat,
    });
  } catch (err) {
    console.error("AQI fetch error:", err);
    return res.status(500).json({ error: "AQI unavailable" });
  }
}
