import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { API_BASE } from "@/lib/queryClient";

/* ---------------------------------------------------
   Types
--------------------------------------------------- */
type RiverData = {
  site: string;
  location: string;
  observed: number | null;
  unit: string;
  time: string | null;
  floodStage: number | null;
  history: Array<{ t: string; v: number }>;
  prediction?: Array<{ t: string; v: number }>;
};

type Weather = {
  tempF: number;
  windSpeed: number;
  windDir: number;
  windCompass: string;
  summary: string;
};

type AQIData = {
  aqi: number | null;
  category: string;
};

type Station = { id: string; name: string; lat: number; lon: number };

type LatLon = { lat: number; lon: number };

/* ---------------------------------------------------
   River Station List
--------------------------------------------------- */
const stations: Station[] = [
  { id: "03085152", name: "Pittsburgh, PA", lat: 40.44, lon: -79.99 },
  { id: "03086000", name: "Dashields Lock & Dam, PA", lat: 40.52, lon: -80.2 },
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

/* ---------------------------------------------------
   Utilities
--------------------------------------------------- */
function formatLocal(ts?: string | null) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    month: "short",
    day: "numeric",
  });
}

function distKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function windDirectionToCompass(deg: number): string {
  if (isNaN(deg)) return "";
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const idx = Math.round(deg / 22.5) % 16;
  return dirs[idx];
}

/* ---------------------------------------------------
   AQI Palette A — Dark Muted
--------------------------------------------------- */
const AQI_COLORS: Record<string, string> = {
  Good: "#3A6F3A",
  Moderate: "#9A8B2E",
  USG: "#A66B2C",
  Unhealthy: "#8B3A46",
  VeryUnhealthy: "#613A8B",
  Hazardous: "#7A2A3A",
};

/* ---------------------------------------------------
   Chart Component — With calendar-day ticks
--------------------------------------------------- */
function Chart({
  data,
  floodStage,
  unit,
  width = 220,
  height = 100,
  color = "#ffffff",
}: {
  data?: Array<{ t: string; v: number }>;
  floodStage?: number | null;
  unit?: string;
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!data || data.length === 0)
    return (
      <div
        className="flex items-center justify-center text-xs italic opacity-80"
        style={{ width, height }}
      >
        No data
      </div>
    );

  const pad = 28;
  const pts = data.map((d) => ({
    t: new Date(d.t).getTime(),
    date: new Date(d.t),
    v: d.v,
  }));

  const minT = Math.min(...pts.map((p) => p.t));
  const maxT = Math.max(...pts.map((p) => p.t));
  const spanT = maxT - minT || 1;

  const minV = Math.min(...pts.map((p) => p.v));
  const maxV = Math.max(...pts.map((p) => p.v));
  const spanV = maxV - minV || 1;

  const scaleX = (t: number) =>
    pad + ((t - minT) / spanT) * (width - pad * 2);
  const scaleY = (v: number) =>
    height - pad - ((v - minV) / spanV) * (height - pad * 2);

  const path = pts
    .map((p, i) =>
      i === 0
        ? `M ${scaleX(p.t)} ${scaleY(p.v)}`
        : `L ${scaleX(p.t)} ${scaleY(p.v)}`
    )
    .join(" ");

  // Unique calendar days for ticks
  const dayKeys = Array.from(
    new Set(pts.map((p) => p.date.toISOString().substring(0, 10)))
  );

  const dayTicks = dayKeys
    .map((d) => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime())
    .map((d) => ({
      x: scaleX(d.getTime()),
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
    }));

  const [hover, setHover] = useState<{
    x: number;
    y: number;
    label: string;
  } | null>(null);

  return (
    <div
      className="relative rounded-lg"
      style={{
        background: "#000",
        width,
        height,
        padding: "4px",
      }}
    >
      <svg width={width} height={height} onMouseLeave={() => setHover(null)}>
        {/* Flood Stage */}
        {floodStage != null && (
          <line
            x1={pad}
            y1={scaleY(floodStage)}
            x2={width - pad}
            y2={scaleY(floodStage)}
            stroke="#ff4d4d"
            strokeDasharray="4,2"
            strokeWidth={1.3}
          />
        )}

        {/* Axes */}
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#444" />
        <line
          x1={pad}
          y1={height - pad}
          x2={width - pad}
          y2={height - pad}
          stroke="#444"
        />

        {/* Y-axis labels */}
        <text x={pad - 12} y={pad + 5} fill="#aaa" fontSize="9">
          {maxV.toFixed(1)}
        </text>
        <text x={pad - 12} y={height - pad} fill="#aaa" fontSize="9">
          {minV.toFixed(1)}
        </text>

        {/* Day ticks */}
        {dayTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={t.x}
              y1={height - pad}
              x2={t.x}
              y2={height - pad + 6}
              stroke="#888"
              strokeWidth={1}
            />
            <text
              x={t.x - 10}
              y={height - pad + 17}
              fill="#ccc"
              fontSize="8"
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* Data line */}
        <path d={path} fill="none" stroke={color} strokeWidth={2} />

        {/* Hover zones */}
        {pts.map((p, i) => (
          <rect
            key={i}
            x={scaleX(p.t) - 5}
            y={0}
            width={10}
            height={height}
            fill="transparent"
            onMouseMove={(e) =>
              setHover({
                x: e.nativeEvent.offsetX,
                y: e.nativeEvent.offsetY,
                label: `${p.date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}: ${p.v.toFixed(2)}${unit}`,
              })
            }
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hover && (
        <div
          className="absolute text-xs bg-black text-white px-2 py-1 rounded border border-white/20 pointer-events-none"
          style={{
            left: hover.x - 40,
            top: hover.y - 38,
            whiteSpace: "nowrap",
          }}
        >
          {hover.label}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------
   Main Component
--------------------------------------------------- */
export default function RiverConditions() {
  const defaultStation =
    stations.find((s) => s.id === "03322420") ?? stations[0]; // J.T. Myers

  // Station used for river data
  const [selected, setSelected] = useState<Station>(defaultStation);

  // River data for selected station
  const [data, setData] = useState<RiverData | null>(null);

  // Where weather/AQI are fetched for (station OR user location)
  const [wxLoc, setWxLoc] = useState<LatLon>({
    lat: defaultStation.lat,
    lon: defaultStation.lon,
  });

  // Weather, AQI, status
  const [weather, setWeather] = useState<Weather | null>(null);
  const [aqi, setAqi] = useState<AQIData | null>(null);
  const [statusText, setStatusText] = useState("Normal");

  // Map center (starts at HOME VIEW so it's never undefined)
  const [mapCenter, setMapCenter] = useState<LatLon>({
    lat: 37.77,
    lon: -87.5747,
  });

  const textGray = "#E5E5E5";

  /* ---------------- River Data (selected station) ---------------- */
  async function loadRiver(site: string) {
    const r = await fetch(`${API_BASE}/api/river-data?site=${site}&_=${Date.now()}`);
    const j = (await r.json()) as RiverData;
    setData(j);

    if (j.observed != null && j.floodStage != null) {
      if (j.observed >= j.floodStage) setStatusText("Flooding");
      else if (j.observed >= j.floodStage * 0.8) setStatusText("Caution");
      else setStatusText("Normal");
    }
  }

  useEffect(() => {
    loadRiver(selected.id);
  }, [selected]);

  /* ---------------- Weather (Open-Meteo, based on wxLoc) ---------------- */
  async function loadWeather(lat: number, lon: number) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Weather HTTP ${r.status}`);

      const j = await r.json();
      const cw = j.current_weather;

      const tempC = cw?.temperature ?? 0;
      const tempF = (tempC * 9) / 5 + 32;

      const windKmh = cw?.windspeed ?? 0;
      const windMph = windKmh * 0.621371;

      const windDir = cw?.winddirection ?? 0;
      const summary =
        typeof cw?.weathercode === "number"
          ? `Code ${cw.weathercode}`
          : "Clear";

      setWeather({
        tempF,
        windSpeed: windMph,
        windDir,
        windCompass: windDirectionToCompass(windDir),
        summary,
      });
    } catch (err) {
      console.error("Weather fetch error:", err);
      setWeather(null);
    }
  }

  /* ---------------- AQI (from your server, based on wxLoc) ---------------- */
  async function loadAQI(lat: number, lon: number) {
    try {
      const r = await fetch(`${API_BASE}/api/aqi?lat=${lat}&lon=${lon}`);
      if (!r.ok) throw new Error(`AQI HTTP ${r.status}`);
      const j = (await r.json()) as AQIData;
      setAqi(j);
    } catch (err) {
      console.error("AQI fetch error:", err);
      setAqi(null);
    }
  }

  // Whenever wxLoc changes → refresh weather & AQI
  useEffect(() => {
    loadWeather(wxLoc.lat, wxLoc.lon);
    loadAQI(wxLoc.lat, wxLoc.lon);
  }, [wxLoc]);

  /* ---------------- AQI Bar Color ---------------- */
  const barBgColor =
    aqi?.category && AQI_COLORS[aqi.category]
      ? AQI_COLORS[aqi.category]
      : AQI_COLORS["Good"];

  /* ---------------- Locate Me: Map to user + downstream station ---------------- */
  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported on this device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLon = pos.coords.longitude;

        // Map moves to user location
        setMapCenter({ lat: userLat, lon: userLon });

        // Downstream = more negative longitude (Ohio NE -> SW)
        const downstreamStations = stations.filter((s) => s.lon < userLon);

        const pickNearest = (candidates: Station[]): Station => {
          let nearest = candidates[0];
          let minDist = Infinity;
          candidates.forEach((s) => {
            const d = distKm(userLat, userLon, s.lat, s.lon);
            if (d < minDist) {
              minDist = d;
              nearest = s;
            }
          });
          return nearest;
        };

        let chosen: Station;
        if (downstreamStations.length > 0) {
          chosen = pickNearest(downstreamStations);
        } else {
          chosen = pickNearest(stations);
        }

        // Dropdown jumps to downstream station (river data)
        setSelected(chosen);

        // Weather/AQI follow user location
        setWxLoc({ lat: userLat, lon: userLon });
      },
      (err) => {
        console.error("Geolocation error:", err);
        alert("Unable to access location.");
      }
    );
  };

  /* ---------------- Map src (follows mapCenter) ---------------- */
  const mapSrc = `https://www.marinetraffic.com/en/ais/embed/map?zoom=10&centerx=${mapCenter.lon}&centery=${mapCenter.lat}&layer_all=1`;

  /* ---------------- Navigation Icon (4D Rounded) ---------------- */
  const NavArrow = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M12 2C12 2 4 20 4 21C4 21.6 4.4 22 5 22C5.4 22 12 18 12 18C12 18 18.6 22 19 22C19.6 22 20 21.6 20 21C20 20 12 2 12 2Z" />
    </svg>
  );

  /* ---------------------------------------------------
     Render
  --------------------------------------------------- */
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* AQI + Info Bar */}
      <section
        className="text-white shadow-md sticky top-0 z-50"
        style={{ backgroundColor: barBgColor }}
      >
        {/* AQI Ribbon */}
        <div
          className="w-full flex items-center justify-center text-[8px] text-white tracking-wide"
          style={{
            height: "10px",
            background:
              "linear-gradient(to right, #3A6F3A, #9A8B2E, #A66B2C, #8B3A46, #613A8B, #7A2A3A)",
          }}
        >
          Air Quality
        </div>

        {/* Main Row */}
        <div className="py-3 max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Station Selector */}
          <div className="w-full sm:w-auto flex items-center gap-2">
            <label
              htmlFor="station"
              className="font-medium text-[13px]"
              style={{ color: textGray }}
            >
              Station:
            </label>
            <select
              id="station"
              value={selected.id}
              onChange={(e) => {
                const s = stations.find((st) => st.id === e.target.value);
                if (!s) return;
                setSelected(s);

                // When user manually picks station:
                // - Map follows station
                // - Weather/AQI follow station
                setMapCenter({ lat: s.lat, lon: s.lon });
                setWxLoc({ lat: s.lat, lon: s.lon });
              }}
              className="px-3 py-1 rounded border bg-white text-black min-w-[200px]"
            >
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Weather */}
          <div>
            {weather ? (
              <>
                <p className="text-sm font-semibold" style={{ color: textGray }}>
                  {selected.name}
                </p>
                <p className="text-sm" style={{ color: textGray }}>
                  🌡 {weather.tempF.toFixed(1)}°F • 💨{" "}
                  {weather.windSpeed.toFixed(1)} mph {weather.windCompass} •{" "}
                  {weather.summary}
                </p>
                <p className="text-xs" style={{ color: textGray }}>
                  AQI:{" "}
                  {aqi?.aqi != null
                    ? `${aqi.aqi.toFixed(0)} (${aqi.category})`
                    : "—"}
                </p>
              </>
            ) : (
              <p className="text-sm italic" style={{ color: textGray }}>
                Loading weather…
              </p>
            )}
          </div>

          {/* River Data */}
          <div className="text-left">
            <h2
              className="text-base sm:text-lg font-semibold uppercase"
              style={{ color: textGray }}
            >
              {data?.location ?? "Loading…"}
            </h2>
            <p className="text-sm" style={{ color: textGray }}>
              Latest observed:{" "}
              <span className="font-semibold" style={{ color: "#FFF" }}>
                {data?.observed != null
                  ? `${data.observed.toFixed(2)} ${data.unit}`
                  : "—"}
              </span>{" "}
              {data?.time ? `at ${formatLocal(data.time)}` : ""}
            </p>
            <p className="text-xs" style={{ color: textGray }}>
              Flood Stage: {data?.floodStage ?? "—"} ft • {statusText}
            </p>
          </div>

          {/* Charts + Navigation Button */}
          <div className="flex flex-col items-center w-full sm:w-auto">
            <div className="flex gap-4">
              <Chart
                data={data?.history}
                floodStage={data?.floodStage ?? null}
                unit={data?.unit}
              />
              <Chart
                data={data?.prediction}
                floodStage={data?.floodStage ?? null}
                unit={data?.unit}
                color="#00ffff"
              />
            </div>

            {/* Locate Me Button – centered under charts */}
            <button
              onClick={handleLocate}
              className="mt-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-full shadow-md flex items-center justify-center"
              style={{
                width: "32px",
                height: "32px",
              }}
              aria-label="Locate Me"
            >
              {NavArrow}
            </button>
          </div>
        </div>
      </section>

      {/* MarineTraffic Map */}
      <main className="flex-1 w-full mt-0">
        <section className="w-full">
          <div className="relative w-full">
            <iframe
              src={mapSrc}
              width="100%"
              height="630"
              frameBorder="0"
              style={{ border: 0 }}
              title="Live Vessel Traffic"
              loading="lazy"
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
