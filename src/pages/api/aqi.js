/**
 * AQI API — Unified format for UI
 * Priority: AirNow → OpenAQ → fallback
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
  if (aqi == null) return "Unknown";
  return AQI_LABELS.find((l) => aqi <= l.max)?.label ?? "Hazardous";
}

async function fetchAirNow(lat, lon) {
  const key = process.env.AIRNOW_API_KEY;
  if (!key) return null;

  try {
    const url = `https://www.airnowapi.org/aq/observation/latLong/current/?format=application/json&latitude=${lat}&longitude=${lon}&distance=25&API_KEY=${key}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    if (Array.isArray(j) && j[0]?.AQI != null) {
      return parseFloat(j[0].AQI);
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchOpenAQ(lat, lon) {
  // Query nearest PM2.5 station and compute AQI
  const url = `https://api.openaq.org/v2/latest?coordinates=${lat},${lon}&radius=30000&parameter=pm25&limit=1`;

  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();

    const pm = j?.results?.[0]?.measurements?.find((m) => m.parameter === "pm25")?.value;
    if (pm == null) return null;

    // Basic PM2.5 → AQI conversion (EPA formula)
    // AQI breakpoints for PM2.5 µg/m³
    if (pm <= 12.0) return Math.round((50 / 12) * pm);
    if (pm <= 35.4) return Math.round(((100 - 51) / (35.4 - 12.1)) * (pm - 12.1) + 51);
    if (pm <= 55.4) return Math.round(((150 - 101) / (55.4 - 35.5)) * (pm - 35.5) + 101);
    if (pm <= 150.4) return Math.round(((200 - 151) / (150.4 - 55.5)) * (pm - 55.5) + 151);
    if (pm <= 250.4) return Math.round(((300 - 201) / (250.4 - 150.5)) * (pm - 150.5) + 201);
    if (pm <= 350.4) return Math.round(((400 - 301) / (350.4 - 250.5)) * (pm - 250.5) + 301);
    return 500; // hazy hellscape
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "Missing lat/lon" });

  try {
    let aqi = await fetchAirNow(lat, lon);

    if (!aqi) {
      // Secondary source
      aqi = await fetchOpenAQ(lat, lon);
    }

    // If still nothing, assume clear day baseline
    if (!aqi) aqi = 20;

    return res.status(200).json({
      aqi,
      category: getCategory(aqi),
    });
  } catch (err) {
    console.error("AQI fetch error:", err);
    return res.status(200).json({
      aqi: null,
      category: "Unknown",
    });
  }
}
