import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

/* ---------------------------------------------------
   Station List (Ohio River full chain)
--------------------------------------------------- */
const stations = [
  { id: "03085152", name: "Pittsburgh, PA", lat: 40.44, lon: -79.99 },
  { id: "03086000", name: "Dashields L&D, PA", lat: 40.52, lon: -80.2 },
  { id: "03108500", name: "Montgomery L&D, PA", lat: 40.64, lon: -80.4 },
  { id: "03110690", name: "New Cumberland L&D, WV", lat: 40.51, lon: -80.65 },
  { id: "03111520", name: "Pike Island L&D, WV", lat: 40.09, lon: -80.69 },
  { id: "03112500", name: "Wheeling, WV", lat: 40.06, lon: -80.72 },
  { id: "03114280", name: "Hannibal L&D, OH", lat: 39.67, lon: -80.87 },
  { id: "03150700", name: "Marietta, OH", lat: 39.42, lon: -81.46 },
  { id: "03151000", name: "Parkersburg, WV", lat: 39.27, lon: -81.56 },
  { id: "390707081443202", name: "Belleville L&D, WV", lat: 39.07, lon: -81.44 },
  { id: "03159870", name: "Racine L&D, WV", lat: 38.93, lon: -82.12 },
  { id: "03201500", name: "Point Pleasant, WV", lat: 38.84, lon: -82.13 },
  { id: "03206000", name: "Near Huntington, WV", lat: 38.41, lon: -82.39 },
  { id: "03216000", name: "Ashland, KY", lat: 38.47, lon: -82.63 },
  { id: "03216600", name: "Greenup L&D, KY", lat: 38.57, lon: -82.84 },
  { id: "03217200", name: "Portsmouth, OH", lat: 38.73, lon: -83.01 },
  { id: "03238000", name: "Maysville, KY", lat: 38.64, lon: -83.77 },
  { id: "03238680", name: "Meldahl L&D, OH", lat: 38.78, lon: -84.1 },
  { id: "03255000", name: "Cincinnati, OH", lat: 39.1, lon: -84.51 },
  { id: "03277200", name: "Markland Lower, KY", lat: 38.78, lon: -84.94 },
  { id: "03293551", name: "McAlpine Upper, KY", lat: 38.27, lon: -85.79 },
  { id: "03294500", name: "McAlpine Lower, KY", lat: 38.26, lon: -85.8 },
  { id: "03303280", name: "Cannelton L&D, IN", lat: 37.91, lon: -86.75 },
  { id: "03304300", name: "Newburgh L&D, IN", lat: 37.93, lon: -87.38 },
  { id: "03322000", name: "Evansville, IN", lat: 37.97, lon: -87.57 },
  { id: "03322190", name: "Henderson, KY", lat: 37.84, lon: -87.58 },
  { id: "03322420", name: "J.T. Myers L&D, KY", lat: 37.78, lon: -87.98 },
  { id: "03381700", name: "Shawneetown, IL", lat: 37.69, lon: -88.14 },
  { id: "03384500", name: "Golconda, IL", lat: 37.36, lon: -88.48 },
  { id: "03399800", name: "Smithland L&D, KY", lat: 37.15, lon: -88.44 },
  { id: "03612500", name: "Metropolis, IL", lat: 37.15, lon: -88.73 },
  { id: "07022000", name: "Cairo, IL (Mouth)", lat: 36.99, lon: -89.18 },
];

/* UTILITIES */
const formatLocal = (ts) =>
  ts
    ? new Date(ts).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Chicago",
      })
    : "";

const distKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const windDirLabel = (deg) => {
  if (deg == null || isNaN(deg)) return "";
  const d = ((deg % 360) + 360) % 360;
  if (d >= 345 || d < 15) return "N";
  if (d < 45) return "NNE";
  if (d < 75) return "ENE";
  if (d < 105) return "E";
  if (d < 135) return "ESE";
  if (d < 165) return "SSE";
  if (d < 195) return "S";
  if (d < 225) return "SSW";
  if (d < 255) return "WSW";
  if (d < 285) return "W";
  if (d < 315) return "WNW";
  return "NNW";
};

// Mapping for numeric hazardCode (0–3) coming from API
const HAZARD_LEVELS = {
  0: { label: "Normal", color: "#00a86b" },
  1: { label: "Elevated", color: "#d5a000" },
  2: { label: "Near Flood", color: "#ff8c00" },
  3: { label: "Flooding", color: "#c63d0f" },
};

const AQI_GRADIENT =
  "linear-gradient(to right, #3A6F3A, #9A8B2E, #A66B2C, #8B3A46, #613A8B, #7A2A3A)";

/* ---------------------------------------------------
   CHART COMPONENT (unchanged)
--------------------------------------------------- */
function Chart({
  data,
  floodStage,
  unit,
  width = 240,
  height = 110,
  color = "#ffffff",
}) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs italic opacity-80 bg-black/20 rounded border border-white/10"
        style={{ width, height, minWidth: width }}
      >
        No data
      </div>
    );
  }

  const pad = 24;
  const pts = data
    .map((d) => ({
      t: new Date(d.t).getTime(),
      v: typeof d.v === "number" ? d.v : Number(d.v),
    }))
    .filter((p) => isFinite(p.t) && isFinite(p.v));

  if (pts.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs italic opacity-80 bg-black/20 rounded border border-white/10"
        style={{ width, height, minWidth: width }}
      >
        No data
      </div>
    );
  }

  const minT = Math.min(...pts.map((p) => p.t));
  const maxT = Math.max(...pts.map((p) => p.t));
  const spanT = maxT - minT || 1;

  const minV = Math.min(...pts.map((p) => p.v));
  const maxV = Math.max(...pts.map((p) => p.v));
  const spanV = maxV - minV || 1;

  const scaleX = (t) => pad + ((t - minT) / spanT) * (width - pad * 2);
  const scaleY = (v) =>
    height - pad - ((v - minV) / spanV) * (height - pad * 2);

  const pathD = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.t)} ${scaleY(p.v)}`)
    .join(" ");

  const floodY = floodStage != null ? scaleY(floodStage) : null;
  const midV = (minV + maxV) / 2;

  return (
    <svg
      width={width}
      height={height}
      className="bg-black/20 rounded border border-white/10"
      style={{ minWidth: width }}
    >
      {floodY != null && (
        <line
          x1={pad}
          y1={floodY}
          x2={width - pad}
          y2={floodY}
          stroke="#ff6666"
          strokeDasharray="4 4"
        />
      )}

      <path d={pathD} fill="none" stroke={color} strokeWidth="2" />

      <text x={pad} y={pad + 6} fontSize="8" fill="#aaa">
        {maxV.toFixed(1)}
      </text>
      <text x={pad} y={(height + pad) / 2} fontSize="8" fill="#aaa">
        {midV.toFixed(1)}
      </text>
      <text x={pad} y={height - pad - 2} fontSize="8" fill="#aaa">
        {minV.toFixed(1)}
      </text>
    </svg>
  );
}

/* ---------------------------------------------------
   HAZARD BAR (0–3 like your AQI bar, with marker)
--------------------------------------------------- */
function RiverHazardBar({ hazardCode }) {
  const code =
    typeof hazardCode === "number" && hazardCode >= 0 && hazardCode <= 3
      ? hazardCode
      : 0;

  const stops = [
    { code: 0, label: "Normal", color: HAZARD_LEVELS[0].color },
    { code: 1, label: "Elevated", color: HAZARD_LEVELS[1].color },
    { code: 2, label: "Near Flood", color: HAZARD_LEVELS[2].color },
    { code: 3, label: "Flooding", color: HAZARD_LEVELS[3].color },
  ];

  // Map code 0..3 => 0..100%
  const pct = (code / 3) * 100;

  return (
    <div className="w-full px-4 pt-3">
      <div className="flex items-center justify-between text-[10px] text-white/70 mb-1">
       <span className="font-semibold text-white/80">River Danger Level</span> 
        <span>{HAZARD_LEVELS[code]?.label ?? "Normal"}</span>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full border border-white/20">
        <div className="flex h-full w-full">
          {stops.map((s) => (
            <div key={s.code} className="h-full flex-1" style={{ background: s.color }} />
          ))}
        </div>

        <div
          className="absolute -top-1 flex flex-col items-center"
          style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
        >
          <div className="w-[2px] h-4 bg-white" />
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between text-[10px] text-white/60">
        {stops.map((s) => (
          <span key={s.code}>
            {s.code} {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------
   RIVER DANGER + TREND INDICATOR
   (hazardCode 0–3 from API, trend from history)
--------------------------------------------------- */
function RiverLevelIndicator({ history, hazardCode }) {
  // More stable trend: compare last vs ~6 hours ago (or last 6 points),
  // instead of a fixed “-3” index that can be noisy/flat.
  let trend = "steady";
  let rotation = 0;

  if (Array.isArray(history) && history.length >= 6) {
    const clean = history
      .map((p) => ({ t: new Date(p.t).getTime(), v: Number(p.v) }))
      .filter((p) => isFinite(p.t) && isFinite(p.v))
      .sort((a, b) => a.t - b.t);

    if (clean.length >= 6) {
      const last = clean[clean.length - 1]?.v;
      const prev = clean[clean.length - 6]?.v; // “older” point
      const diff = last - prev;

      if (diff > 0.25) {
        trend = "rising";
        rotation = -45;
      } else if (diff < -0.25) {
        trend = "falling";
        rotation = 45;
      }
    }
  }

  const safeCode =
    typeof hazardCode === "number" && hazardCode >= 0 && hazardCode <= 3
      ? hazardCode
      : 0;

  const label = HAZARD_LEVELS[safeCode]?.label || "Normal";

  return (
    <div className="flex flex-col gap-1 text-xs mt-2">
      <span className="opacity-70">River Danger Level</span>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">
          Code {safeCode} — {label}
        </span>

        <span className="inline-flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-white/40 bg-black/40"
            style={{ transform: `rotate(${rotation}deg)` }}
            aria-label={`Trend: ${trend}`}
            title={`Trend: ${trend}`}
          >
            ↑
          </span>
          <span className="capitalize">{trend}</span>
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------
   WIND COMPASS
--------------------------------------------------- */
function WindCompass({ direction, degrees }) {
  if (degrees == null || isNaN(degrees)) return null;
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-16 h-16 rounded-full border border-white/40 flex items-center justify-center text-[9px] text-white/70">
        <span className="absolute top-0 left-1/2 -translate-x-1/2">N</span>
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2">S</span>
        <span className="absolute left-0 top-1/2 -translate-y-1/2">W</span>
        <span className="absolute right-0 top-1/2 -translate-y-1/2">E</span>
        <div
          className="absolute left-1/2 bottom-1/2 w-[2px] h-7 bg-cyan-400 rounded-full origin-bottom -translate-x-1/2"
          style={{ transform: `rotate(${degrees}deg)` }}
        />
      </div>
      <p className="text-xs mt-1">
        {direction} ({degrees.toFixed(0)}°)
      </p>
    </div>
  );
}

/* ---------------------------------------------------
   AIR QUALITY SCALE
--------------------------------------------------- */
function AirQualityScale({ aqi }) {
  const value = aqi?.aqi != null ? Math.max(0, Math.min(500, aqi.aqi)) : null;
  const pct = value != null ? (value / 500) * 100 : null;
  const ticks = [0, 50, 100, 150, 200, 300, 500];

  return (
    <div className="w-full">
      <div className="relative h-3 w-full" style={{ background: AQI_GRADIENT }}>
        {ticks.map((v) => (
          <div
            key={v}
            className="absolute top-0 h-3 border-l border-white/40"
            style={{ left: `${(v / 500) * 100}%` }}
          />
        ))}
        {pct != null && (
          <div
            className="absolute -top-1 flex flex-col items-center"
            style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
          >
            <div className="w-[2px] h-3 bg-white" />
            <div className="text-[9px] bg-black/70 px-1 rounded whitespace-nowrap">
              AQI {value} — {aqi.category}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------
   MAIN COMPONENT
--------------------------------------------------- */
export default function RiverConditions() {
  const defaultStation =
    stations.find((s) => s.id === "03322420") ?? stations[0];

  const [selected, setSelected] = useState(defaultStation);

  const [data, setData] = useState(null);
  const [weather, setWeather] = useState(null);
  const [aqi, setAqi] = useState(null);

  const [wxLoc, setWxLoc] = useState({
    lat: defaultStation.lat,
    lon: defaultStation.lon,
  });

  const [mapCenter, setMapCenter] = useState({ lat: 37.77, lon: -87.5747 });

  // Prevent “data disappears”: keep last good payloads
  const lastGoodRiverRef = useRef(null);
  const lastGoodWeatherRef = useRef(null);
  const lastGoodAqiRef = useRef(null);

  // Avoid race conditions between station changes / refresh
  const riverReqIdRef = useRef(0);

  /* -------------------- DATA LOADERS -------------------- */

  async function loadRiver(id, { silent = false } = {}) {
    const reqId = ++riverReqIdRef.current;

    try {
      // NOTE: keep cache-busting but don’t punish the UI if a refresh fails
      const res = await fetch(`/api/river-data?site=${id}&_=${Date.now()}`);
      if (!res.ok) throw new Error("River API error");
      const json = await res.json();

      // If user switched stations mid-request, ignore old response
      if (reqId !== riverReqIdRef.current) return;

      // Basic sanity checks
      const okObserved = typeof json?.observed === "number" && isFinite(json.observed);
      const okHistory =
        Array.isArray(json?.history) && json.history.length > 0;
      if (okObserved || okHistory) {
        lastGoodRiverRef.current = json;
        setData(json);
      } else if (!silent && lastGoodRiverRef.current) {
        // keep old
        setData(lastGoodRiverRef.current);
      } else if (!silent) {
        setData(json); // show whatever came back
      }
    } catch {
      // Do NOT clear data on refresh failure; keep the last good view
      if (lastGoodRiverRef.current) setData(lastGoodRiverRef.current);
    }
  }

  async function loadWeather(lat, lon) {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=precipitation_probability&forecast_days=1&timezone=auto`
      );
      if (!res.ok) throw new Error("Weather error");
      const json = await res.json();
      const cw = json.current_weather;

      const w = {
        tempF: cw.temperature * 1.8 + 32,
        windMph: cw.windspeed * 0.621371,
        windDir: windDirLabel(cw.winddirection),
        windDeg: cw.winddirection,
        precip: json.hourly?.precipitation_probability?.[0] ?? 0,
        code: cw.weathercode,
      };

      lastGoodWeatherRef.current = w;
      setWeather(w);
    } catch {
      if (lastGoodWeatherRef.current) setWeather(lastGoodWeatherRef.current);
    }
  }

  async function loadAQI(lat, lon) {
    try {
      const res = await fetch(`/api/aqi?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error("AQI error");
      const j = await res.json();
      lastGoodAqiRef.current = j;
      setAqi(j);
    } catch {
      if (lastGoodAqiRef.current) setAqi(lastGoodAqiRef.current);
    }
  }

  /* -------------------- EFFECTS -------------------- */

  // Load river when station changes
  useEffect(() => {
    loadRiver(selected.id);
  }, [selected]);

  // Soft refresh river data every 60s (prevents “stale then blank” behavior)
  useEffect(() => {
    const t = setInterval(() => {
      loadRiver(selected.id, { silent: true });
    }, 60_000);
    return () => clearInterval(t);
  }, [selected]);

  // Weather / AQI for station coords
  useEffect(() => {
    loadWeather(wxLoc.lat, wxLoc.lon);
    loadAQI(wxLoc.lat, wxLoc.lon);
  }, [wxLoc]);

  /* -------------------- LOCATE ME ----------------------- */

  const locateMe = () =>
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        setMapCenter({ lat: coords.latitude, lon: coords.longitude });

        let near = stations[0],
          score = 9999;

        stations.forEach((s) => {
          const d = distKm(coords.latitude, coords.longitude, s.lat, s.lon);
          if (d < score) {
            score = d;
            near = s;
          }
        });

        setSelected(near);
        setWxLoc({ lat: near.lat, lon: near.lon });
      },
      () => alert("Unable to get location.")
    );

  /* -------------------- DERIVED UI VALUES -------------------- */

  const hasFloodStage =
    typeof data?.floodStage === "number" && isFinite(data.floodStage) && data.floodStage > 0;

  const hazardCode =
    typeof data?.hazardCode === "number" && data.hazardCode >= 0 && data.hazardCode <= 3
      ? data.hazardCode
      : 0;

  const hazardLabel =
    typeof data?.hazardLabel === "string" && data.hazardLabel.trim()
      ? data.hazardLabel.trim()
      : HAZARD_LEVELS[hazardCode]?.label ?? "Normal";

  const precip = weather?.precip ?? 0;
  const precipIcon =
    precip >= 80 ? "⚡️" : precip >= 50 ? "🌧" : precip >= 20 ? "☁️" : "🌤";

  const mapSrc = `https://www.marinetraffic.com/en/ais/embed/map?zoom=9&centerx=${mapCenter.lon}&centery=${mapCenter.lat}&layer_all=1`;

  // Prediction should be a 5-day series; if the API gives something else, we still render if non-empty.
  const predictionSeries =
    Array.isArray(data?.prediction) && data.prediction.length > 0
      ? data.prediction
      : null;

  /* -------------------- RENDER ---------------------- */

  return (
    <div className="min-h-screen flex flex-col bg-background text-white">
      <Header />

      {/* TOP BAR */}
      <section className="sticky top-0 z-50 shadow-md bg-slate-900/95 backdrop-blur">
        {/* Horizontal hazard bar inside the top info bar */}
        <RiverHazardBar hazardCode={hazardCode} />

        <div className="max-w-6xl mx-auto px-4 pb-3">
          <div className="flex flex-col lg:flex-row items-stretch justify-between gap-6">
            {/* LEFT: selector + text */}
            <div className="flex-1 min-w-[280px]">
              <div className="flex items-center gap-2 mt-2">
                <label className="text-sm">Station:</label>
                <select
                  value={selected.id}
                  onChange={(e) => {
                    const st = stations.find((s) => s.id === e.target.value);
                    if (!st) return;
                    setSelected(st);
                    setWxLoc({ lat: st.lat, lon: st.lon });
                    setMapCenter({ lat: st.lat, lon: st.lon });
                  }}
                  className="px-3 py-1 text-black rounded bg-white"
                >
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3">
                <p className="text-sm font-semibold uppercase">
                  {data?.location ?? selected.name}
                </p>

                <p className="text-sm">
                  {typeof data?.observed === "number"
                    ? `${data.observed.toFixed(2)} ft`
                    : "Loading…"}
                  {data?.time ? ` at ${formatLocal(data.time)}` : ""}
                </p>

                {/* Single clean status line (no repetition) */}
                <p className="text-xs mt-1 text-white/80">
                  Flood Stage:{" "}
                  {hasFloodStage ? `${Number(data.floodStage).toFixed(1)} ft` : "N/A"}
                </p>

                <RiverLevelIndicator history={data?.history} hazardCode={hazardCode} />
              </div>
            </div>

            {/* RIGHT: graphs */}
            <div className="flex-shrink-0">
              <div className="flex flex-col sm:flex-row gap-3 items-center lg:items-start">
                <Chart
                  data={data?.history}
                  floodStage={data?.floodStage}
                  unit={data?.unit}
                />

                {predictionSeries ? (
                  <Chart
                    data={predictionSeries}
                    floodStage={data?.floodStage}
                    unit={data?.unit}
                    color="#00ffff"
                  />
                ) : (
                  <div
                    className="flex items-center justify-center text-xs italic opacity-80 bg-black/20 rounded border border-white/10"
                    style={{ width: 240, height: 110, minWidth: 240 }}
                  >
                    Forecast unavailable for the next 5 days.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAP */}
      <iframe
        src={mapSrc}
        width="100%"
        height="630"
        frameBorder="0"
        className="border-none"
      />

      {/* BOTTOM INFO BAR */}
      <section className="w-full border-t border-white/20 bg-slate-900/95">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-sm">
            {weather && (
              <>
                <p className="font-semibold">{selected.name}</p>
                <p>
                  🌡 {weather.tempF.toFixed(1)}°F • 💨{" "}
                  {weather.windMph.toFixed(1)} mph
                </p>
              </>
            )}
          </div>

          {weather && <WindCompass direction={weather.windDir} degrees={weather.windDeg} />}

          <button
            onClick={locateMe}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-semibold shadow flex items-center gap-2 text-sm"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M4 12h4M16 12h4" />
            </svg>
            Find Me
          </button>

          <div className="text-xs text-right">
            <p className="font-semibold mb-1">Precipitation</p>
            <p>
              {precipIcon} {precip.toFixed(0)}%
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pb-3 px-4">
          <AirQualityScale aqi={aqi} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
