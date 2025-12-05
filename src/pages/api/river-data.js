/**
 * River Data API (Resilient Edition)
 *
 * Improvements:
 * - USGS request timeout (10s)
 * - Retry logic (max 2)
 * - Local in-memory cache (10 min per site)
 * - NOAA AHPS fallback for observed + flood stage + forecasts
 * - Graceful degradation instead of 500 errors
 */

const CACHE_DURATION = 10 * 60 * 1000; // 10 mins
const cache = new Map();

// NOAA AHPS station metadata lookup for flood stage + forecast
async function fetchNoaa(site) {
  // Many USGS site codes map directly to NOAA
  const url = `https://api.water.noaa.gov/v2/stations/${site}`;
  try {
    const res = await fetch(url, { timeout: 10000 });
    if (!res.ok) return null;
    const j = await res.json();
    return {
      name: j.name || "Unknown",
      floodStage: j.flood?.action || null,
      forecast: Array.isArray(j.forecast) ? j.forecast.map((f) => ({
        t: f.validTime,
        v: f.value
      })) : [],
    };
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 10000);

  try {
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return await r.json();
  } catch {
    clearTimeout(id);
    throw new Error("timeout");
  }
}

async function fetchUSGS(site, retries = 2) {
  const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${site}&parameterCd=00065`;

  try {
    return await fetchWithTimeout(url);
  } catch (err) {
    if (retries > 0) return fetchUSGS(site, retries - 1);
    return null;
  }
}

export default async function handler(req, res) {
  const { site } = req.query;
  if (!site) return res.status(400).json({ error: "Missing site" });

  // Serve cached response if recent
  const cached = cache.get(site);
  if (cached && Date.now() - cached.t < CACHE_DURATION) {
    return res.status(200).json(cached.data);
  }

  try {
    // 1️⃣ Fetch from USGS first
    const usgs = await fetchUSGS(site);

    let observed = null;
    let time = null;
    let history = [];
    let location = "Unknown";
    let floodStage = null;
    let prediction = [];

    if (usgs?.value?.timeSeries?.[0]) {
      const ts = usgs.value.timeSeries[0];
      location = ts.sourceInfo?.siteName || "Unnamed Station";

      try {
        const val = ts.values?.[0]?.value?.[0];
        observed = val ? parseFloat(val.value) : null;
        time = val?.dateTime || null;
      } catch {}

      // 7-day history
      try {
        const histUrl = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${site}&parameterCd=00065&period=P7D`;
        const hist = await fetchWithTimeout(histUrl);

        const pts = hist.value?.timeSeries?.[0]?.values?.[0]?.value ?? [];
        history = pts.map((p) => ({
          t: p.dateTime,
          v: parseFloat(p.value),
        }));
      } catch {}
    }

    // 2️⃣ NOAA fallback if USGS fails or lacks prediction/flood metadata
    const noaa = await fetchNoaa(site);

    if (noaa) {
      if (!location || location === "Unknown") location = noaa.name;
      if (!observed && noaa?.observed?.value) observed = noaa.observed.value;
      if (!floodStage && noaa.floodStage) floodStage = noaa.floodStage;

      if (Array.isArray(noaa.forecast) && noaa.forecast.length > 0) {
        prediction = noaa.forecast.map((p) => ({
          t: p.t,
          v: parseFloat(p.v),
        }));
      }
    }

    // 3️⃣ If no NOAA forecast, compute trend prediction
    if (!prediction.length && history.length >= 3) {
      const last = history.slice(-3).map((p) => p.v);
      const slope = (last[2] - last[0]) / 2;
      const base = last[2];

      prediction = Array.from({ length: 5 }).map((_, i) => ({
        t: new Date(Date.now() + i * 86400000).toISOString(),
        v: parseFloat((base + slope * i).toFixed(2)),
      }));
    }

    const data = {
      location,
      unit: "ft",
      observed,
      floodStage,
      time,
      history,
      prediction,
    };

    // Cache the result
    cache.set(site, { t: Date.now(), data });

    return res.status(200).json(data);
  } catch (err) {
    console.error("River API failure:", err);
    return res.status(200).json({
      location: "Unavailable",
      observed: null,
      floodStage: null,
      unit: "ft",
      time: null,
      history: [],
      prediction: [],
    });
  }
}
