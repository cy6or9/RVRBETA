/**
 * River Data API
 * Normalizes USGS JSON into the structure our UI expects
 * Supports: observed, flood stage, 7-day history, 7-day prediction
 */

export default async function handler(req, res) {
  const { site } = req.query;
  if (!site) return res.status(400).json({ error: "Missing site" });

  try {
    /* ---------------------------------------------
       1) FETCH OBSERVED STAGE
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

      observed = val ? parseFloat(val.value) : null;
      time = val?.dateTime || null;
      location = ts?.sourceInfo?.siteName || "Unnamed Station";
    } catch (err) {
      console.warn("USGS observed parse error", err);
    }

    /* ---------------------------------------------
       2) FETCH FLOOD STAGE
       (Same USGS API, different parameter — 00065 = stage)
       If unavailable, default to null
    --------------------------------------------- */
    let floodStage = null;
    try {
      const flood = ivJson.value?.timeSeries?.[0]?.variable?.note;
      const match = flood && JSON.stringify(flood).match(/flood.*?(\d+(\.\d+)?)/i);
      if (match) floodStage = parseFloat(match[1]);
    } catch {}

    /* ---------------------------------------------
       3) FETCH 7-DAY HISTORY
       USGS daily data: parameter 00065 = stage (ft)
    --------------------------------------------- */
    const histURL = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${site}&parameterCd=00065&period=P7D`;
    const histRes = await fetch(histURL);
    const histJson = await histRes.json();

    let history = [];
    try {
      const pts = histJson.value?.timeSeries?.[0]?.values?.[0]?.value ?? [];
      history = pts.map((p) => ({
        t: p.dateTime,
        v: parseFloat(p.value),
      }));
    } catch {
      history = [];
    }

    /* ---------------------------------------------
       4) SIMPLE PREDICTION (EXTRAPOLATE LAST 3 POINTS)
       This is a placeholder — replace later with NOAA WPC feed
    --------------------------------------------- */
    let prediction = [];
    if (history.length >= 3) {
      const last = history.slice(-3).map((p) => p.v);
      const slope = (last[2] - last[0]) / 2;
      const base = last[2];

      prediction = Array.from({ length: 5 }).map((_, i) => ({
        t: new Date(Date.now() + i * 86400000).toISOString(),
        v: parseFloat((base + slope * i).toFixed(2)),
      }));
    }

    /* ---------------------------------------------
       5) RETURN EXPECTED SCHEMA
    --------------------------------------------- */
    return res.status(200).json({
      location,
      unit: "ft",
      observed,
      floodStage,
      time,
      history,
      prediction,
    });
  } catch (err) {
    console.error("River API failure:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
