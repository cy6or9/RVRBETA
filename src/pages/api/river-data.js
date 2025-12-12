/**
 * River Data API (Ohio River)
 *
 * - Fetches observed level & history from USGS
 * - Tries flood stage from NOAA AHPS first, then USGS metadata
 * - Builds a simple 5-day prediction from recent trend
 * - Computes:
 *    • trend / trendDelta
 *    • floodPercent
 *    • hazardCode 0–3  (0 = Normal, 1 = Elevated, 2 = Near Flood, 3 = Flooding)
 *    • hazardLabel (human-readable)
 */

async function fetchNOAAFloodStage(site) {
  try {
    const url = `https://api.water.noaa.gov/nwps/ahps/station/${site}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const stage = Number(json?.floodStage);
    return Number.isFinite(stage) && stage > 0 ? stage : null;
  } catch {
    return null;
  }
}

function analyzeConditions(observed, floodStage, history, prediction) {
  /* ---------- TREND (rising / falling / steady) ---------- */
  let trend = "unknown";
  let trendDelta = null;

  if (Array.isArray(history) && history.length >= 3) {
    const last3 = history.slice(-3);
    const first = last3[0]?.v;
    const last = last3[last3.length - 1]?.v;

    if (typeof first === "number" && typeof last === "number") {
      trendDelta = +(last - first).toFixed(2);

      if (trendDelta > 0.25) trend = "rising";
      else if (trendDelta < -0.25) trend = "falling";
      else trend = "steady";
    }
  }

  /* ---------- FLOOD PERCENT ---------- */
  let floodPercent = null;
  if (
    typeof observed === "number" &&
    typeof floodStage === "number" &&
    floodStage > 0
  ) {
    floodPercent = +((observed / floodStage) * 100).toFixed(0);
  }

  /* ---------- HAZARD CODE (0–3) ---------- */
  // 0 = Normal (well below flood stage)
  // 1 = Elevated (>= 80% of flood stage)
  // 2 = Near Flood (>= 95% of flood stage but below)
  // 3 = Flooding (>= flood stage)
  let hazardCode = 0;
  let hazardLabel = "Normal";

  if (
    typeof observed !== "number" ||
    typeof floodStage !== "number" ||
    !(floodStage > 0)
  ) {
    hazardCode = 0;
    hazardLabel = "Normal (no flood stage set)";
  } else {
    const ratio = observed / floodStage;

    if (ratio >= 1) {
      hazardCode = 3;
      hazardLabel = "Flooding (at or above flood stage)";
    } else if (ratio >= 0.95) {
      hazardCode = 2;
      hazardLabel = "Near Flood (within 5% of flood stage)";
    } else if (ratio >= 0.8) {
      hazardCode = 1;
      hazardLabel = "Elevated (over 80% of flood stage)";
    } else {
      hazardCode = 0;
      hazardLabel = "Normal";
    }
  }

  return {
    trend,
    trendDelta,
    floodPercent,
    hazardCode,
    hazardLabel,
  };
}

export default async function handler(req, res) {
  const { site } = req.query;
  if (!site) return res.status(400).json({ error: "Missing site" });

  try {
    /* ---------------------------------------------
       1) OBSERVED LEVEL (latest)
    --------------------------------------------- */
    const ivURL = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${site}&parameterCd=00065`;
    const ivRes = await fetch(ivURL);
    const ivJson = await ivRes.json();

    let observed = null;
    let time = null;
    let location = "Unknown";

    try {
      const ts = ivJson.value?.timeSeries?.[0];
      const val = ts?.values?.[0]?.value?.[0];

      observed = val ? Number(val.value) : null;
      time = val?.dateTime || null;
      location = ts?.sourceInfo?.siteName || "Unnamed Station";
    } catch (err) {
      console.warn("USGS observed parse error", err);
    }

    /* ---------------------------------------------
       2) FLOOD STAGE: NOAA AHPS, then USGS notes
    --------------------------------------------- */
    let floodStage = await fetchNOAAFloodStage(site);

    if (floodStage == null) {
      try {
        const notes = ivJson.value?.timeSeries?.[0]?.variable?.note;
        const match =
          notes && JSON.stringify(notes).match(/flood.*?(\d+(\.\d+)?)/i);
        if (match) floodStage = Number(match[1]);
      } catch {
        // leave null
      }
    }

    /* ---------------------------------------------
       3) 7-DAY HISTORY
    --------------------------------------------- */
    const histURL = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${site}&parameterCd=00065&period=P7D`;
    const histRes = await fetch(histURL);
    const histJson = await histRes.json();

    let history = [];
    try {
      const pts =
        histJson.value?.timeSeries?.[0]?.values?.[0]?.value ?? [];
      history = pts.map((p) => ({
        t: p.dateTime,
        v: Number(p.value),
      }));
    } catch {
      history = [];
    }

    /* ---------------------------------------------
       4) SIMPLE 5-DAY PREDICTION
       (keeps *something* on the forecast chart)
    --------------------------------------------- */
    let prediction = [];
    if (history.length >= 3) {
      const last = history[history.length - 1].v;
      const prev = history[history.length - 3].v;
      const slope = (last - prev) / 3; // change per step

      prediction = Array.from({ length: 5 }).map((_, i) => ({
        t: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
        v: +(last + slope * i).toFixed(2),
      }));
    }

    /* ---------------------------------------------
       5) DERIVED METRICS (trend, hazardCode, etc.)
    --------------------------------------------- */
    const derived = analyzeConditions(
      observed,
      floodStage,
      history,
      prediction
    );

    /* ---------------------------------------------
       6) RESPONSE
    --------------------------------------------- */
    return res.status(200).json({
      location,
      observed,
      floodStage,
      unit: "ft",
      time,
      history,
      prediction,
      ...derived, // trend, trendDelta, floodPercent, hazardCode, hazardLabel
    });
  } catch (err) {
    console.error("River API failure:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
