import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LockDamMap from "@/components/LockDamMap";
import OhioRiverActivityMap from "@/components/OhioRiverActivityMap";
import { ohioRiverLocks } from "@/lib/locks";
import { useUserProfile } from "@/context/UserProfileContext";

/* ---------------------------------------------------
   Station List (Ohio River full chain)
--------------------------------------------------- */
const stations = [
  { id: "03085152", name: "Pittsburgh, PA", lat: 40.44, lon: -79.99, riverMile: 0 },
  { id: "03086000", name: "Dashields L&D, PA", lat: 40.52, lon: -80.2, riverMile: 6 },
  { id: "03108500", name: "Montgomery L&D, PA", lat: 40.64, lon: -80.4, riverMile: 32 },
  { id: "03110690", name: "New Cumberland L&D, WV", lat: 40.51, lon: -80.65, riverMile: 54 },
  { id: "03111520", name: "Pike Island L&D, WV", lat: 40.09, lon: -80.69, riverMile: 84 },
  { id: "03112500", name: "Wheeling, WV", lat: 40.06, lon: -80.72, riverMile: 88 },
  { id: "03114280", name: "Hannibal L&D, OH", lat: 39.67, lon: -80.87, riverMile: 126 },
  { id: "03150700", name: "Marietta, OH", lat: 39.42, lon: -81.46, riverMile: 175 },
  { id: "03151000", name: "Parkersburg, WV", lat: 39.27, lon: -81.56, riverMile: 192 },
  { id: "390707081443202", name: "Belleville L&D, WV", lat: 39.07, lon: -81.44, riverMile: 204 },
  { id: "03159870", name: "Racine L&D, WV", lat: 38.93, lon: -82.12, riverMile: 237 },
  { id: "03201500", name: "Point Pleasant, WV", lat: 38.84, lon: -82.13, riverMile: 252 },
  { id: "03206000", name: "Near Huntington, WV", lat: 38.41, lon: -82.39, riverMile: 302 },
  { id: "03216000", name: "Ashland, KY", lat: 38.47, lon: -82.63, riverMile: 314 },
  { id: "03216600", name: "Greenup L&D, KY", lat: 38.57, lon: -82.84, riverMile: 341 },
  { id: "03217200", name: "Portsmouth, OH", lat: 38.73, lon: -83.01, riverMile: 358 },
  { id: "03238000", name: "Maysville, KY", lat: 38.64, lon: -83.77, riverMile: 404 },
  { id: "03238680", name: "Meldahl L&D, OH", lat: 38.78, lon: -84.1, riverMile: 436 },
  { id: "03255000", name: "Cincinnati, OH", lat: 39.1, lon: -84.51, riverMile: 471 },
  { id: "03277200", name: "Markland Lower, KY", lat: 38.78, lon: -84.94, riverMile: 531 },
  { id: "03293551", name: "McAlpine Upper, KY", lat: 38.27, lon: -85.79, riverMile: 584 },
  { id: "03294500", name: "McAlpine Lower, KY", lat: 38.26, lon: -85.8, riverMile: 606 },
  { id: "03303280", name: "Cannelton L&D, IN", lat: 37.91, lon: -86.75, riverMile: 720 },
  { id: "03304300", name: "Newburgh L&D, IN", lat: 37.93, lon: -87.38, riverMile: 776 },
  { id: "03322000", name: "Evansville, IN", lat: 37.97, lon: -87.57, riverMile: 792 },
  { id: "03322190", name: "Henderson, KY", lat: 37.84, lon: -87.58, riverMile: 813 },
  { id: "03380000", name: "Mt. Vernon, IN", lat: 37.82, lon: -87.88, riverMile: 823 },
  { id: "03322420", name: "J.T. Myers L&D, KY", lat: 37.78, lon: -87.98, riverMile: 846, ahps: "UNVK2" },
  { id: "03381700", name: "Shawneetown, IL", lat: 37.69, lon: -88.14, riverMile: 865 },
  { id: "03384500", name: "Golconda, IL", lat: 37.36, lon: -88.48, riverMile: 918 },
  { id: "03399800", name: "Smithland L&D, KY", lat: 37.15, lon: -88.44, riverMile: 919 },
  { id: "03612500", name: "Metropolis, IL", lat: 37.15, lon: -88.73, riverMile: 935 },
  { id: "07022000", name: "Cairo, IL (Mouth)", lat: 36.99, lon: -89.18, riverMile: 981 },
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
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const kmToMiles = (km) => km * 0.621371;

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

  const { profile, saveMapPreferences, updateCachedRiverData, updateCachedForecast, toggleFavorite } = useUserProfile();

  const [selected, setSelected] = useState(defaultStation);
  const [selectedDam, setSelectedDam] = useState(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [data, setData] = useState(null);
  const [weather, setWeather] = useState(null);
  const [aqi, setAqi] = useState(null);
  const [findMeInfo, setFindMeInfo] = useState(null);
  const [userLocation, setUserLocation] = useState(null); // Track user location for map
  const [userCityState, setUserCityState] = useState(null); // User's city and state
  const [mapType, setMapType] = useState("lock"); // "marine", "lock", or "topo"
  const [showLockActivityDropdown, setShowLockActivityDropdown] = useState(false);

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

  // Track if we've loaded saved preferences to avoid redundant effects
  const preferencesLoadedRef = useRef(false);

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
        // Auto-cache river data to profile
        if (updateCachedRiverData) {
          updateCachedRiverData(json);
        }
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
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=precipitation_probability,windgusts_10m&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=America/Chicago`
      );
      if (!res.ok) throw new Error("Weather error");
      const json = await res.json();
      const cw = json.current_weather;

      // Calculate today's high wind gust from hourly data
      const todayWindGusts = json.hourly?.windgusts_10m || [];
      const maxWindGustKmh = todayWindGusts.length > 0 ? Math.max(...todayWindGusts.filter(g => g != null)) : cw.windspeed;
      const maxWindGustMph = maxWindGustKmh * 0.621371;

      const tempHighC = json.daily?.temperature_2m_max?.[0];
      const tempLowC = json.daily?.temperature_2m_min?.[0];

      const w = {
        tempF: cw.temperature * 1.8 + 32,
        tempHighF: tempHighC ? (tempHighC * 1.8 + 32) : null,
        tempLowF: tempLowC ? (tempLowC * 1.8 + 32) : null,
        windMph: cw.windspeed * 0.621371,
        windGustMph: (cw.windgusts || cw.windspeed) * 0.621371,
        windGustHighMph: maxWindGustMph, // Today's high wind gust
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

  // Load saved map preferences on mount (location, zoom, dark mode)
  useEffect(() => {
    if (!profile || preferencesLoadedRef.current) return;

    preferencesLoadedRef.current = true;

    const savedPrefs = profile.mapPreferences;
    if (savedPrefs) {
      // Restore dark mode preference
      if (savedPrefs.darkMode === true) {
        document.documentElement.classList.add('dark');
      }

      // Restore default location
      if (savedPrefs.defaultLocation) {
        setMapCenter({
          lat: savedPrefs.defaultLocation.lat,
          lon: savedPrefs.defaultLocation.lon,
        });
        // Find station at or nearest to saved location
        const nearestStation = stations.reduce((prev, curr) => {
          const prevDist = Math.hypot(
            prev.lat - savedPrefs.defaultLocation.lat,
            prev.lon - savedPrefs.defaultLocation.lon
          );
          const currDist = Math.hypot(
            curr.lat - savedPrefs.defaultLocation.lat,
            curr.lon - savedPrefs.defaultLocation.lon
          );
          return currDist < prevDist ? curr : prev;
        });
        if (nearestStation) {
          setSelected(nearestStation);
          setWxLoc({ lat: nearestStation.lat, lon: nearestStation.lon });
        }
      }

    }

    // Restore last cached data if available
    if (profile.cachedData?.lastSeenRiverData) {
      setData(profile.cachedData.lastSeenRiverData);

    }
  }, [profile]);

  useEffect(() => {
    if (selected) {
      loadRiver(selected);
    }
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const t = setInterval(() => {
      loadRiver(selected, { silent: true });
    }, 60_000);
    return () => clearInterval(t);
  }, [selected]);

  useEffect(() => {
    loadWeather(wxLoc.lat, wxLoc.lon);
    loadAQI(wxLoc.lat, wxLoc.lon);
  }, [wxLoc]);

  // Auto-save map state changes to user profile (location, zoom, dark mode)
  useEffect(() => {
    if (!saveMapPreferences || !selected) return;

    const timer = setTimeout(() => {
      saveMapPreferences({
        defaultLocation: {
          lat: selected.lat,
          lon: selected.lon,
        },
        zoom: 8, // Default zoom level
      });

    }, 1000); // Debounce saves to avoid too many updates

    return () => clearTimeout(timer);
  }, [selected, saveMapPreferences]);

  // Cache user location on page unload, disconnect, or offline
  useEffect(() => {
    const cacheLocation = () => {
      if (userLocation && userCityState) {
        const locationCache = {
          lat: userLocation.lat,
          lon: userLocation.lon,
          cityState: userCityState,
          timestamp: Date.now()
        };
        localStorage.setItem('cachedUserLocation', JSON.stringify(locationCache));
      }
    };

    // Cache on beforeunload (page close/refresh)
    window.addEventListener('beforeunload', cacheLocation);
    
    // Cache on offline
    window.addEventListener('offline', cacheLocation);
    
    // Cache on visibility change (tab switch, minimize)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cacheLocation();
      }
    });

    return () => {
      window.removeEventListener('beforeunload', cacheLocation);
      window.removeEventListener('offline', cacheLocation);
      document.removeEventListener('visibilitychange', cacheLocation);
    };
  }, [userLocation, userCityState]);

  const findDownstreamStation = (userLat, userLon, stations) => {
    if (!Array.isArray(stations) || stations.length === 0) return null;

    // Step 1: Find all stations within 3 miles (close proximity check)
    const closeStations = [];
    for (const s of stations) {
      if (typeof s?.lat !== "number" || typeof s?.lon !== "number") continue;
      const d = distKm(userLat, userLon, s.lat, s.lon);
      if (d <= 4.83) { // ~3 miles in km
        closeStations.push({ station: s, distance: d });
      }
    }

    // If user is very close to a station (< 3 miles), return the closest one
    if (closeStations.length > 0) {
      closeStations.sort((a, b) => a.distance - b.distance);

      return closeStations[0].station;
    }

    // Step 2: Find nearest station if not close to any
    let nearest = null;
    let bestDist = Infinity;

    for (const s of stations) {
      if (typeof s?.lat !== "number" || typeof s?.lon !== "number") continue;
      const d = distKm(userLat, userLon, s.lat, s.lon);
      if (d < bestDist) {
        bestDist = d;
        nearest = s;
      }
    }

    if (!nearest) return null;

    // Step 3: Find downstream station using river mile
    if (typeof nearest.riverMile === "number") {
      // Find the next station downstream (higher river mile)
      const downstreamCandidates = stations
        .filter((s) => typeof s?.riverMile === "number" && s.riverMile > nearest.riverMile)
        .sort((a, b) => a.riverMile - b.riverMile);
      
      if (downstreamCandidates.length > 0) {

        return downstreamCandidates[0];
      }
    }

    // Step 4: Fallback — Ohio River flows south/southwest (use latitude)
    const fallback = stations
      .filter((s) => typeof s?.lat === "number" && s.lat < nearest.lat)
      .sort((a, b) => b.lat - a.lat)[0];

    return fallback || nearest;
  };

  const buildFindMeInfo = (userLat, userLon, station) => {
    if (!station) return null;

    // Calculate straight-line distance to downstream station
    const km = distKm(userLat, userLon, station.lat, station.lon);
    const miles = kmToMiles(km);
    const distanceText = `${miles.toFixed(1)} miles downstream`;

    return {
      label: `You are upstream of ${station.name}`,
      distance: distanceText,
    };
  };

  /* -------------------- LOCATE ME ----------------------- */

  const locateMe = () => {
    // If Find Me is already active, toggle it off
    if (userLocation) {
      // Clear Find Me state
      setUserLocation(null);
      setUserCityState(null);
      setFindMeInfo(null);
      
      // Find nearest station to the river center and snap to it
      const nearestStation = findDownstreamStation(37.77, -87.5747, stations);
      if (nearestStation) {
        setSelected(nearestStation);
        setSelectedDam(null); // Clear dam selection
        setMapCenter({ lat: nearestStation.lat, lon: nearestStation.lon });
        setWxLoc({ lat: nearestStation.lat, lon: nearestStation.lon });
      }
      
      return;
    }
    
    // Otherwise, activate Find Me
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const userLat = coords.latitude;
        const userLon = coords.longitude;

        // Center map on user
        setMapCenter({ lat: userLat, lon: userLon });
        
        // Store user location for map component
        setUserLocation({ lat: userLat, lon: userLon });

        // Weather follows user
        setWxLoc({ lat: userLat, lon: userLon });

        // Try to load cached location first
        try {
          const cached = localStorage.getItem('cachedUserLocation');
          if (cached) {
            const locationCache = JSON.parse(cached);
            // If cached location is within 0.1 degrees (~7 miles) of current location and less than 7 days old
            const cacheDist = Math.sqrt(
              Math.pow(locationCache.lat - userLat, 2) + 
              Math.pow(locationCache.lon - userLon, 2)
            );
            const cacheAge = Date.now() - (locationCache.timestamp || 0);
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            
            if (cacheDist < 0.1 && cacheAge < sevenDays) {

              if (locationCache.cityState) {
                setUserCityState(locationCache.cityState);
              }
              // Load cached findMeInfo for instant display
              if (locationCache.findMeInfo) {
                setFindMeInfo(locationCache.findMeInfo);

              }
            }
          }
        } catch (err) {

        }

        // Reverse geocode to get city and state using server-side API

        let geocodeSuccess = false;
        
        try {
          const geocodeUrl = `/api/geocode?lat=${userLat}&lon=${userLon}&t=${Date.now()}`;

          const response = await fetch(geocodeUrl, {
            method: 'GET',
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          // Only treat 2xx as success
          if (response.ok) {
            const data = await response.json();

            if (data && data.success && data.location) {
              setUserCityState(data.location);

              geocodeSuccess = true;
            } else {

            }
          } else {

          }
        } catch (error) {

        }
        
        // If geocoding failed, the server-side API already tried all fallbacks
        // Just log if we still don't have a location
        if (!geocodeSuccess && !userCityState) {

        }

        // 🔥 THIS IS THE IMPORTANT PART
        const downstreamStation = findDownstreamStation(
          userLat,
          userLon,
          stations
        );

        if (downstreamStation) {
          setSelected(downstreamStation);
          setSelectedDam(null); // Clear dam selection when selecting station

          const info = buildFindMeInfo(
            userLat,
            userLon,
            downstreamStation
          );

          setFindMeInfo(info);
          
          // Cache the location if geocoding was successful
          // Use setTimeout to ensure React state has updated
          if (geocodeSuccess) {
            setTimeout(() => {
              // Re-fetch from geocoding API to get fresh data for cache
              const cacheGeocodeUrl = `/api/geocode?lat=${userLat}&lon=${userLon}`;
              fetch(cacheGeocodeUrl)
                .then(r => {
                  if (!r.ok) {

                    return null;
                  }
                  return r.json();
                })
                .then(data => {
                  if (data && data.success && data.location) {
                    const locationCache = {
                      lat: userLat,
                      lon: userLon,
                      cityState: data.location,
                      findMeInfo: info,
                      timestamp: Date.now()
                    };
                    localStorage.setItem('cachedUserLocation', JSON.stringify(locationCache));

                  }
                })
                .catch(err => console.error('Cache update failed:', err));
            }, 500);
          }
        }
      },
      (err) => {

        let errorMsg = "Unable to get location.";
        
        switch(err.code) {
          case err.PERMISSION_DENIED:
            errorMsg = "Location access denied. Please enable location permissions in your browser settings.";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMsg = "Location information is unavailable. Please check your device's location settings.";
            break;
          case err.TIMEOUT:
            errorMsg = "Location request timed out. Please try again.";
            break;
          default:
            errorMsg = `Unable to get location: ${err.message || 'Unknown error'}`;
        }
        
        alert(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60_000,
      }
    );
  };

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

  const wasCorrected = !!(data?.forecastMeta?.corrected);
  const projectionMethod = data?.forecastMeta?.projectionMethod;

  /* -------------------- RENDER ---------------------- */

  return (
    <div className="min-h-screen flex flex-col bg-background text-white">
      <Header />

      {/* TOP BAR */}
      <section className="shadow-md bg-slate-900/95 backdrop-blur">
        <RiverHazardBar hazardCode={hazardCode} />

        <div className="max-w-6xl mx-auto px-4 py-1.5">
          <div className="flex flex-col lg:flex-row items-stretch justify-between gap-4">
            {/* LEFT: Station selector */}
            <div className="flex-1 min-w-[220px]">
              <div className="flex items-center gap-2 mt-1">
                <label className="text-sm">Station:</label>
                <select
                  value={selected?.id || ""}
                  onChange={(e) => {
                    if (e.target.value === "") return;
                    const st = stations.find((s) => s.id === e.target.value);
                    if (!st) return;
                    setSelected(st);
                    setSelectedDam(null); // Clear dam selection when selecting station
                    setWxLoc({ lat: st.lat, lon: st.lon });
                    setMapCenter({ lat: st.lat, lon: st.lon });
                  }}
                  className="px-3 py-1 text-black rounded bg-white"
                >
                  {!selected && <option value="">-- Select Station --</option>}
                  {(favoritesOnly && profile?.favorites?.gauges?.length > 0
                    ? stations.filter((s) => profile.favorites.gauges.includes(s.id))
                    : stations
                  ).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {/* Favorite button */}
                <button
                  onClick={() => {
                    if (toggleFavorite && selected?.id) {
                      toggleFavorite('gauges', selected.id);
                    }
                  }}
                  disabled={!selected}
                  className="p-1 rounded hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!selected ? "Select a station first" : (profile?.favorites?.gauges?.includes(selected.id) ? "Remove from favorites" : "Add to favorites")}
                >
                  <span className="text-lg">
                    {selected && profile?.favorites?.gauges?.includes(selected.id) ? "★" : "☆"}
                  </span>
                </button>
                {/* Favorites Only filter */}
                <label className="flex items-center gap-1 text-xs text-white/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={favoritesOnly}
                    onChange={(e) => setFavoritesOnly(e.target.checked)}
                    className="cursor-pointer"
                  />
                  Favorites Only
                </label>
              </div>

              <div className="mt-2">
                <p className="text-sm font-semibold uppercase">
                  {selectedDam ? selectedDam.name : (data?.location ?? selected?.name ?? "Select a station")}
                </p>

                <p className="text-sm">
                  {selectedDam 
                    ? `Lock & Dam at River Mile ${selectedDam.riverMile}`
                    : (typeof data?.observed === "number" ? `${data.observed.toFixed(2)} ft` : "Loading…")}
                  {!selectedDam && data?.time ? ` at ${formatLocal(data.time)}` : ""}
                </p>
              </div>
            </div>

            {/* CENTER: Flood stage, river danger, find me info */}
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <p className="text-xs text-white/80">
                Flood Stage: {hasFloodStage ? `${Number(data.floodStage).toFixed(1)} ft` : "N/A"}
              </p>
              <RiverLevelIndicator history={data?.history} hazardCode={hazardCode} />
              {findMeInfo && (
                <div className="mt-2 text-xs text-white/70">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-cyan-400"></span>
                    <span>{findMeInfo.label}</span>
                  </div>
                  {findMeInfo.distance && (
                    <div className="opacity-80 ml-4">{findMeInfo.distance}</div>
                  )}
                </div>
              )}
              {isNWPS && (
                <div className="mt-2 flex flex-col items-center gap-1">
                  <span
                    className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-[10px] font-semibold bg-cyan-600/20 border border-cyan-400/30 text-cyan-200"
                    title={wasCorrected ? "NOAA National Water Prediction Service (NWPS) forecast, bias-corrected to latest observed stage." : "NOAA National Water Prediction Service (NWPS) official hydrograph forecast."}
                  >
                    ✅ {wasCorrected ? "NWPS Forecast (bias-corrected)" : "NWPS Forecast"}
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
                    title={forecastType === "Projected" 
                      ? (projectionMethod === 'regression72h'
                          ? "Regression-based projection using last 72h of river levels with slope damping. NOAA forecasts will be used when available."
                          : "Trend-based projection using recent daily highs. NOAA forecasts will be used when available.")
                      : "Observed data availability varies by gauge. Some NOAA/USGS stations only publish recent data. Charts show the most recent verified observations available."}
                  >
                    {forecastType === "Projected" 
                      ? (projectionMethod === 'regression72h' ? "ℹ Regression projection (NOAA unavailable)" : "ℹ Trend projection (NOAA unavailable)")
                      : "ℹ Observed data availability varies by gauge"}
                  </p>
                </div>
</div>
            </div>
          </div>
        </div>
      </section>

      {/* MAP - Marine Traffic, River Activity, Topography, or Dark Theme based on mapType */}
      {mapType === "marine" ? (
        <iframe src={mapSrc} width="100%" height="500" frameBorder="0" className="border-none" title="Marine Traffic Map" />
      ) : mapType === "topo" ? (
        <OhioRiverActivityMap 
          locks={ohioRiverLocks}
          stations={stations}
          selectedLockId={selectedDam?.id || selected?.id}
          userLocation={userLocation}
          onLockSelect={(id) => {
            // Determine if clicked item is a station or dam
            const station = stations.find(s => s.id === id);
            const dam = ohioRiverLocks.find(l => l.id === id);
            
            if (station) {
              setSelected(station);
              setSelectedDam(null);
              setWxLoc({ lat: station.lat, lon: station.lon });
              setMapCenter({ lat: station.lat, lon: station.lon });
            } else if (dam) {
              // Find nearest station to the dam for river data
              const nearestStation = stations.reduce((prev, curr) => {
                const prevDist = Math.hypot(prev.lat - dam.lat, prev.lon - dam.lon);
                const currDist = Math.hypot(curr.lat - dam.lat, curr.lon - dam.lon);
                return currDist < prevDist ? curr : prev;
              });
              setSelectedDam(dam);
              setSelected(nearestStation); // Keep station selected for river data
              setWxLoc({ lat: dam.lat, lon: dam.lon });
              setMapCenter({ lat: dam.lat, lon: dam.lon });
            }
          }}
          mapStyle="topo"
        />
      ) : mapType === "dark" ? (
        <OhioRiverActivityMap 
          locks={ohioRiverLocks}
          stations={stations}
          selectedLockId={selectedDam?.id || selected?.id}
          userLocation={userLocation}
          onLockSelect={(id) => {
            // Determine if clicked item is a station or dam
            const station = stations.find(s => s.id === id);
            const dam = ohioRiverLocks.find(l => l.id === id);
            
            if (station) {
              setSelected(station);
              setSelectedDam(null);
              setWxLoc({ lat: station.lat, lon: station.lon });
              setMapCenter({ lat: station.lat, lon: station.lon });
            } else if (dam) {
              // Find nearest station to the dam for river data
              const nearestStation = stations.reduce((prev, curr) => {
                const prevDist = Math.hypot(prev.lat - dam.lat, prev.lon - dam.lon);
                const currDist = Math.hypot(curr.lat - dam.lat, curr.lon - dam.lon);
                return currDist < prevDist ? curr : prev;
              });
              setSelectedDam(dam);
              setSelected(nearestStation); // Keep station selected for river data
              setWxLoc({ lat: dam.lat, lon: dam.lon });
              setMapCenter({ lat: dam.lat, lon: dam.lon });
            }
          }}
          mapStyle="dark"
        />
      ) : (
        <OhioRiverActivityMap 
          locks={ohioRiverLocks}
          stations={stations}
          selectedLockId={selectedDam?.id || selected?.id}
          userLocation={userLocation}
          onLockSelect={(id) => {
            // Determine if clicked item is a station or dam
            const station = stations.find(s => s.id === id);
            const dam = ohioRiverLocks.find(l => l.id === id);
            
            if (station) {
              setSelected(station);
              setSelectedDam(null);
              setWxLoc({ lat: station.lat, lon: station.lon });
              setMapCenter({ lat: station.lat, lon: station.lon });
            } else if (dam) {
              // Find nearest station to the dam for river data
              const nearestStation = stations.reduce((prev, curr) => {
                const prevDist = Math.hypot(prev.lat - dam.lat, prev.lon - dam.lon);
                const currDist = Math.hypot(curr.lat - dam.lat, curr.lon - dam.lon);
                return currDist < prevDist ? curr : prev;
              });
              setSelectedDam(dam);
              setSelected(nearestStation); // Keep station selected for river data
              setWxLoc({ lat: dam.lat, lon: dam.lon });
              setMapCenter({ lat: dam.lat, lon: dam.lon });
            }
          }}
        />
      )}

      {/* BOTTOM INFO BAR */}
      <section className="w-full border-t border-white/20 bg-slate-900/95">
        <div className="max-w-6xl mx-auto px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 relative">
            <div className="flex flex-col gap-1 relative">
              {/* Map Type Selector Dropdown */}
              <select
                value={mapType}
                onChange={(e) => setMapType(e.target.value)}
                className="text-xs px-2 py-1 bg-slate-700/50 border border-cyan-500/40 rounded text-cyan-200 hover:border-cyan-500 appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%2306b6d4' strokeWidth='2' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 4px center',
                  backgroundSize: '14px',
                  paddingRight: '20px',
                }}
                title="Switch between map types"
              >
                <option value="lock">🚤 River Activity</option>
                <option value="topo">⛰️ Topography</option>
                <option value="dark">🌙 Dark</option>
                <option value="marine">🗺️ Marine Traffic</option>
              </select>

              {/* Lock Activity Dropdown Toggle */}
              <button
                onClick={() => setShowLockActivityDropdown(!showLockActivityDropdown)}
                className="text-xs px-2 py-1 bg-slate-700/50 border border-cyan-500/40 rounded text-cyan-200 hover:border-cyan-500 transition-colors flex items-center justify-between gap-2 text-left"
                title="Toggle Lock Activity data"
              >
                Lock Activity
                <span className={`transition-transform ${showLockActivityDropdown ? 'rotate-180' : ''}`} style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%2306b6d4' strokeWidth='2' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundSize: 'contain',
                }}>
                </span>
              </button>

            </div>

            <div className="text-sm">
              {weather && (
                <>
                  <p className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                    {userCityState || selectedDam?.name || selected?.name || "Select location"}
                  </p>
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col">
                      <p>🌡 {weather.tempF.toFixed(1)}°F</p>
                      {weather.tempHighF && weather.tempLowF && (
                        <p className="text-xs opacity-75" style={{ marginLeft: '1.25rem' }}>
                          H: {weather.tempHighF.toFixed(0)}° L: {weather.tempLowF.toFixed(0)}°
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <p>💨 {weather.windMph.toFixed(1)} mph</p>
                      <p className="text-xs opacity-75" style={{ marginLeft: '1.25rem' }}>
                        {weather.windGustHighMph.toFixed(1)} mph
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {weather && <WindCompass direction={weather.windDir} degrees={weather.windDeg} />}

          <button
            onClick={locateMe}
            className={`px-4 py-2 rounded-lg font-semibold shadow flex items-center gap-2 text-sm ${
              userLocation 
                ? 'bg-orange-600 hover:bg-orange-700' 
                : 'bg-cyan-600 hover:bg-cyan-700'
            }`}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M4 12h4M16 12h4" />
            </svg>
            {userLocation ? 'Clear Location' : 'Find Me'}
          </button>

          <div className="text-xs text-right">
            <p className="font-semibold mb-1">Precipitation</p>
            <p>
              <span style={{ fontSize: '3em', lineHeight: 0.8, verticalAlign: 'middle' }}>{precipIcon}</span> {precip.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Lock Activity Dropdown Panel */}
        {showLockActivityDropdown && (
          <div className="max-w-6xl mx-auto px-4 py-3 border-t border-white/10">
            <LockDamMap />
          </div>
        )}

        {/* Air Quality Scale */}
        <div className="max-w-6xl mx-auto px-4 pb-2">
          <AirQualityScale aqi={aqi} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
