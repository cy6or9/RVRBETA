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
  { id: "03322420", name: "J.T. Myers L&D, KY", lat: 37.78, lon: -87.98, ahps: "UNVK2" },
  { id: "03381700", name: "Shawneetown, IL", lat: 37.69, lon: -88.14 },
  { id: "03384500", name: "Golconda, IL", lat: 37.36, lon: -88.48 },
  { id: "03399800", name: "Smithland L&D, KY", lat: 37.15, lon: -88.44 },
  { id: "03612500", name: "Metropolis, IL", lat: 37.15, lon: -88.73 },
  { id: "07022000", name: "Cairo, IL (Mouth)", lat: 36.99, lon: -89.18 },
];

/* ---------------------------------------------------
   UTILITIES
--------------------------------------------------- */
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

const formatDayShort = (ts) =>
  ts
    ? new Date(ts).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "America/Chicago",
      })
    : "";

/* ---------------------------------------------------
   DATE HELPERS (Chicago day bucketing)
--------------------------------------------------- */
function chicagoDayKey(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return null;

  // en-CA gives YYYY-MM-DD
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

function toNoonChicagoISO(dayKey) {
  // 18:00Z ~ 12:00 CST / 13:00 CDT
  return `${dayKey}T18:00:00Z`;
}

/* ---------------------------------------------------
   DAILY HIGH HISTORY (PAST DATA) - always 7 days
--------------------------------------------------- */
function dailyHighHistory(history, days = 7) {
  if (!Array.isArray(history) || history.length === 0) return null;

  const byDay = new Map();

  history.forEach((p) => {
    const d = new Date(p.t);
    if (isNaN(d.getTime())) return;

    // Use local day boundary (Chicago time)
    const dayKey = new Date(
      d.toLocaleDateString("en-US", { timeZone: "America/Chicago" })
    )
      .toISOString()
      .slice(0, 10);

    const v = Number(p.v);
    if (!isFinite(v)) return;

    const prev = byDay.get(dayKey);
    if (prev == null || v > prev) byDay.set(dayKey, v);
  });

  return Array.from(byDay.entries())
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .slice(-days)
    .map(([day, v]) => ({
      // Noon local prevents date rollover issues
      t: `${day}T18:00:00Z`,
      v: +v.toFixed(2),
    }));
}

/* ---------------------------------------------------
   FORECAST NORMALIZER (NWPS-only, “bulletproof”)
   Accepts many shapes and returns 7 daily-high points.
--------------------------------------------------- */
function normalizeForecastSeries(payload, days = 7) {
  // Allow passing either the raw array or the full API payload
  const candidates = [];

  // If caller passed array directly
  if (Array.isArray(payload)) candidates.push(payload);

  // If caller passed the API JSON object
  if (payload && typeof payload === "object") {
    // Common field names you might return from /api/river-data
    candidates.push(payload.prediction);
    candidates.push(payload.forecast);
    candidates.push(payload.forecast7d);
    candidates.push(payload.forecastDaily);
    candidates.push(payload.nwpsForecast);
    candidates.push(payload.nwps);
    candidates.push(payload.series);
    candidates.push(payload.data?.forecast);
    candidates.push(payload.data?.prediction);

    // Some NOAA-ish nestings people use
    candidates.push(payload.nwps?.forecast);
    candidates.push(payload.nwps?.data);
    candidates.push(payload.nwps?.points);
    candidates.push(payload.nwps?.timeseries);
  }

  // Pick first usable array
  const raw =
    candidates.find((arr) => Array.isArray(arr) && arr.length > 0) || null;
  if (!raw) return null;

  // Normalize point formats into {t, v}
  const points = [];
  for (const p of raw) {
    if (!p) continue;

    // timestamps
    const t =
      p.t ??
      p.time ??
      p.dateTime ??
      p.datetime ??
      p.validTime ??
      p.validtime ??
      p.x ??
      null;

    // values
    const vRaw =
      p.v ??
      p.value ??
      p.stage ??
      p.y ??
      null;

    const v = Number(vRaw);
    if (!t || !Number.isFinite(v)) continue;

    const tt = new Date(t);
    if (isNaN(tt.getTime())) continue;

    points.push({ t: tt.toISOString(), v });
  }

  if (points.length === 0) return null;

  // Sort ascending
  points.sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());

  // Keep from “now-ish” forward, but allow a little backfill
  const now = Date.now();
  const filtered = points.filter((p) => {
    const tt = new Date(p.t).getTime();
    return Number.isFinite(tt) && tt >= now - 12 * 60 * 60 * 1000; // last 12h and forward
  });

  const usable = filtered.length ? filtered : points;

  // Bucket by Chicago day, take max per day (daily high)
  const byDay = new Map();
  for (const p of usable) {
    const day = chicagoDayKey(p.t);
    if (!day) continue;
    const prev = byDay.get(day);
    if (prev == null || p.v > prev) byDay.set(day, p.v);
  }

  const daily = Array.from(byDay.entries())
    .map(([day, v]) => ({ day, v }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // Take the next N days (starting at today Chicago)
  const todayKey = chicagoDayKey(new Date().toISOString());
  const future = todayKey
    ? daily.filter((d) => d.day >= todayKey)
    : daily;

  const sliced = (future.length ? future : daily).slice(0, days);

  const out = sliced.map((d) => ({
    t: toNoonChicagoISO(d.day),
    v: +Number(d.v).toFixed(2),
  }));

  return out.length ? out : null;
}

const distKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lat2 - lon1) * Math.PI) / 180;
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
   CHART COMPONENT (kept intact + adds optional day marks/labels)
--------------------------------------------------- */
function Chart({
  data,
  floodStage,
  unit,
  width = 240,
  height = 110,
  color = "#ffffff",
  showDayMarks = false,
  showPointLabels = false,
  labelColor = "#00ffff",
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
      rawT: d.t,
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

  // Avoid clutter: only label when series is small (forecast usually is)
  const canLabel = pts.length <= 10;

  return (
    <svg
      width={width}
      height={height}
      className="bg-black/20 rounded border border-white/10"
      style={{ minWidth: width }}
    >
      {/* day marks (vertical ticks) */}
      {showDayMarks &&
        canLabel &&
        pts.map((p, idx) => {
          const x = scaleX(p.t);
          return (
            <line
              key={`tick-${idx}`}
              x1={x}
              y1={pad - 2}
              x2={x}
              y2={height - pad + 6}
              stroke={labelColor}
              strokeOpacity="0.35"
              strokeDasharray="2 4"
            />
          );
        })}

      {/* flood stage line */}
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

      {/* main path */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" />

      {/* point dots + labels */}
      {showPointLabels &&
        canLabel &&
        pts.map((p, idx) => {
          const x = scaleX(p.t);
          const y = scaleY(p.v);
          const day = formatDayShort(p.rawT);
          const val = `${p.v.toFixed(2)}${unit ? ` ${unit}` : ""}`;
          
          // Skip day labels for every other point when crowded (>5 points)
          const showDayLabel = pts.length <= 5 || idx % 2 === 0;

          return (
            <g key={`pt-${idx}`}>
              <circle cx={x} cy={y} r="2.6" fill={labelColor} />
              {/* value label */}
              <text
                x={x}
                y={Math.max(10, y - 6)}
                fontSize="7"
                textAnchor="middle"
                fill={labelColor}
              >
                {val}
              </text>
              {/* day label (skip every other when crowded) */}
              {showDayLabel && (
                <text
                  x={x}
                  y={height - 6}
                  fontSize="7"
                  textAnchor="middle"
                  fill={labelColor}
                  opacity="0.9"
                >
                  {day}
                </text>
              )}
            </g>
          );
        })}

      {/* axis labels */}
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
            <div
              key={s.code}
              className="h-full flex-1"
              style={{ background: s.color }}
            />
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
          <span key={s.code}>{s.label}</span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------
   RIVER DANGER + TREND INDICATOR
   - Fixes "↑ steady" by using a right-arrow base and rotating it.
   - Colors the "Code X" text to match hazard level color.
--------------------------------------------------- */
function RiverLevelIndicator({ history, hazardCode }) {
  let trend = "steady";
  let rotation = 0;

  if (Array.isArray(history) && history.length >= 6) {
    const clean = history
      .map((p) => ({ t: new Date(p.t).getTime(), v: Number(p.v) }))
      .filter((p) => isFinite(p.t) && isFinite(p.v))
      .sort((a, b) => a.t - b.t);

    if (clean.length >= 6) {
      const last = clean[clean.length - 1]?.v;
      const prev = clean[clean.length - 6]?.v;
      const diff = last - prev;

      if (diff > 0.25) {
        trend = "rising";
        rotation = -45; // up-right
      } else if (diff < -0.25) {
        trend = "falling";
        rotation = 45; // down-right
      } else {
        trend = "steady";
        rotation = 0; // right
      }
    }
  }

  const safeCode =
    typeof hazardCode === "number" && hazardCode >= 0 && hazardCode <= 3
      ? hazardCode
      : 0;

  const label = HAZARD_LEVELS[safeCode]?.label || "Normal";
  const codeColor = HAZARD_LEVELS[safeCode]?.color || "#ffffff";

  return (
    <div className="flex flex-col gap-1 text-xs mt-2">
      <span className="opacity-70">River Danger Level</span>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">
          <span style={{ color: codeColor }}>Code {safeCode}</span> — {label}
        </span>

        <span className="inline-flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-white/40 bg-black/40"
            style={{ transform: `rotate(${rotation}deg)` }}
            aria-label={`Trend: ${trend}`}
            title={`Trend: ${trend}`}
          >
            →
          </span>
          <span className="capitalize">{trend}</span>
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------
   WIND COMPASS
   - Rotated 180° so arrow indicates where wind is GOING (flow),
     not where it is coming FROM.
--------------------------------------------------- */
function WindCompass({ direction, degrees }) {
  if (degrees == null || isNaN(degrees)) return null;

  const flowDeg = ((Number(degrees) + 180) % 360 + 360) % 360;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-16 h-16 rounded-full border border-white/40 flex items-center justify-center text-[9px] text-white/70">
        <span className="absolute top-0 left-1/2 -translate-x-1/2">N</span>
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2">S</span>
        <span className="absolute left-0 top-1/2 -translate-y-1/2">W</span>
        <span className="absolute right-0 top-1/2 -translate-y-1/2">E</span>
        <div
          className="absolute left-1/2 bottom-1/2 w-[2px] h-7 bg-cyan-400 rounded-full origin-bottom -translate-x-1/2"
          style={{ transform: `rotate(${flowDeg}deg)` }}
        />
      </div>
      <p className="text-xs mt-1">
        {direction} ({degrees.toFixed(0)}°)
      </p>
      <p className="text-[10px] opacity-70 -mt-1">Flow: {flowDeg.toFixed(0)}°</p>
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
  const defaultStation = stations.find((s) => s.id === "03322420") ?? stations[0];

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

  async function loadRiver(stationOrId, { silent = false } = {}) {
    const reqId = ++riverReqIdRef.current;

    const st =
      typeof stationOrId === "object" && stationOrId
        ? stationOrId
        : stations.find((s) => s.id === stationOrId) || null;

    const site = typeof stationOrId === "string" ? stationOrId : stationOrId?.id;

    const ahps =
      typeof stationOrId === "object" && stationOrId ? stationOrId.ahps : st?.ahps ?? null;

    const lat = st?.lat;
    const lon = st?.lon;

    if (!site) return;

    try {
      // IMPORTANT:
      // Pass lat/lon so the API can auto-discover nearest AHPS/NWPS gauge
      // for stations that don't have explicit .ahps mapping.
      const qs = new URLSearchParams({ site, _: String(Date.now()) });
      if (ahps) qs.set("ahps", ahps);
      if (lat != null) qs.set("lat", String(lat));
      if (lon != null) qs.set("lon", String(lon));

      const res = await fetch(`/api/river-data?${qs.toString()}`);
      if (!res.ok) throw new Error("River API error");
      const json = await res.json();

      if (reqId !== riverReqIdRef.current) return;

      const okObserved = typeof json?.observed === "number" && isFinite(json.observed);
      const okHistory = Array.isArray(json?.history) && json.history.length > 0;

      if (okObserved || okHistory) {
        lastGoodRiverRef.current = json;
        setData(json);
      } else if (!silent && lastGoodRiverRef.current) {
        setData(lastGoodRiverRef.current);
      } else if (!silent) {
        setData(json);
      }
    } catch {
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

  useEffect(() => {
    loadRiver(selected);
  }, [selected]);

  useEffect(() => {
    const t = setInterval(() => {
      loadRiver(selected, { silent: true });
    }, 60_000);
    return () => clearInterval(t);
  }, [selected]);

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
  const precipIcon = precip >= 80 ? "⚡️" : precip >= 50 ? "🌧" : precip >= 20 ? "☁️" : "🌤";

  const mapSrc = `https://www.marinetraffic.com/en/ais/embed/map?zoom=9&centerx=${mapCenter.lon}&centery=${mapCenter.lat}&layer_all=1`;

  // ✅ Past 7 days (daily highs)
  const past7Series = dailyHighHistory(data?.history, 7);

  // ✅ Forecast 7 days (daily highs), tolerate many API formats
  const predictionSeries = normalizeForecastSeries(data, 7);

  // “Official NOAA Forecast” badge when NWPS is used
  const forecastSource = String(data?.forecastSource ?? data?.forecast_source ?? "").toLowerCase();
  const forecastType = String(data?.forecastType ?? data?.forecast_type ?? "").toLowerCase();
  const isNWPS = forecastSource.includes("nwps") || forecastType.includes("official");

  // Issuance time (if your API provides it)
  const issuedAt =
    data?.forecastIssuedAt ??
    data?.forecastIssued ??
    data?.issuedAt ??
    data?.issuanceTime ??
    data?.forecastMeta?.issuedAt ??
    null;

  // Confidence flags (if your API provides it)
  const confidence =
    data?.forecastConfidence ??
    data?.confidence ??
    data?.forecastMeta?.confidence ??
    null;

  /* -------------------- RENDER ---------------------- */

  return (
    <div className="min-h-screen flex flex-col bg-background text-white">
      <Header />

      {/* TOP BAR */}
      <section className="sticky top-0 z-50 shadow-md bg-slate-900/95 backdrop-blur">
        <RiverHazardBar hazardCode={hazardCode} />

        <div className="max-w-6xl mx-auto px-4 pb-3">
          <div className="flex flex-col lg:flex-row items-stretch justify-between gap-6">
            {/* LEFT */}
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
                <p className="text-sm font-semibold uppercase">{data?.location ?? selected.name}</p>

                <p className="text-sm">
                  {typeof data?.observed === "number" ? `${data.observed.toFixed(2)} ft` : "Loading…"}
                  {data?.time ? ` at ${formatLocal(data.time)}` : ""}
                </p>

                <div className="mt-2 flex flex-col items-center text-center">
                <p className="text-xs mt-1 text-white/80">
                  Flood Stage: {hasFloodStage ? `${Number(data.floodStage).toFixed(1)} ft` : "N/A"}
                </p>

                <RiverLevelIndicator history={data?.history} hazardCode={hazardCode} />
              </div>
                {/* ✅ NWPS badge + issuance + confidence (only if present) */}
                {isNWPS && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-[10px] font-semibold bg-cyan-600/20 border border-cyan-400/30 text-cyan-200">
                      ✅ Official NOAA Forecast
                    </span>

                    {issuedAt && (
                      <span className="text-[10px] text-white/70">
                        Issued: <span className="text-white/90">{formatLocal(issuedAt)}</span>
                      </span>
                    )}

                    {confidence && (
                      <span
                        className="text-[10px] text-white/70 cursor-help"
                        title="Confidence is provided by NOAA/NWPS metadata when available. If missing, NOAA did not publish a confidence flag for this gauge/issuance."
                      >
                        Confidence: <span className="text-white/90">{String(confidence)}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: charts */}
            <div className="flex-shrink-0">
              <div className="flex flex-col sm:flex-row gap-3 items-center lg:items-start">
                <Chart
                  data={past7Series}
                  floodStage={data?.floodStage}
                  unit={data?.unit}
                  color="#00ffff"
                  showDayMarks={true}
                  showPointLabels={true}
                  labelColor="#00ffff"
                />
                <div className="flex flex-col items-center">
                  {predictionSeries ? (
                    <Chart
                      data={predictionSeries}
                      floodStage={data?.floodStage}
                      unit={data?.unit}
                      color="#00ffff"
                      showDayMarks={true}
                      showPointLabels={true}
                      labelColor="#00ffff"
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center text-xs italic opacity-80 bg-black/20 rounded border border-white/10"
                      style={{ width: 240, height: 110, minWidth: 240 }}
                    >
                      Forecast unavailable for the next 7 days.
                    </div>
                  )}

                  <p
                    className="text-[10px] mt-1 text-white/60 cursor-help text-center"
                    title="Observed river history varies by gauge. Some NOAA/USGS stations only publish recent data. Charts show the most recent verified observations available."
                  >
                    ℹ Observed data availability varies by gauge
                  </p>
                </div>
</div>
            </div>
          </div>
        </div>
      </section>

      {/* MAP */}
      <iframe src={mapSrc} width="100%" height="500" frameBorder="0" className="border-none" />

      {/* BOTTOM INFO BAR */}
      <section className="w-full border-t border-white/20 bg-slate-900/95">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-sm">
            {weather && (
              <>
                <p className="font-semibold">{selected.name}</p>
                <p>
                  🌡 {weather.tempF.toFixed(1)}°F • 💨 {weather.windMph.toFixed(1)} mph
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
