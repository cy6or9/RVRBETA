import { useState, useEffect } from "react";
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

/* ---------------------------------------------------
   Utils
--------------------------------------------------- */
const formatLocal = (ts) =>
  ts
    ? new Date(ts).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        month: "short",
        day: "numeric",
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

// 12-point compass using your requested labels
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

/* ---------------------------------------------------
   Color Palettes
--------------------------------------------------- */
const AQI_GRADIENT =
  "linear-gradient(to right, #3A6F3A, #9A8B2E, #A66B2C, #8B3A46, #613A8B, #7A2A3A)";

const HAZARD_COLORS = {
  Normal: "#00a86b",
  Caution: "#d5a000",
  Flooding: "#c63d0f",
};

/* ---------------------------------------------------
   Charts (history & prediction)
--------------------------------------------------- */
function Chart({ data, floodStage, unit, width = 240, height = 110, color = "#ffffff" }) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs italic opacity-80"
        style={{ width, height }}
      >
        No data
      </div>
    );
  }

  const pad = 24;
  const pts = data.map((d) => ({
    t: new Date(d.t).getTime(),
    v: d.v,
  }));

  const minT = Math.min(...pts.map((p) => p.t));
  const maxT = Math.max(...pts.map((p) => p.t));
  const spanT = maxT - minT || 1;

  const minV = Math.min(...pts.map((p) => p.v));
  const maxV = Math.max(...pts.map((p) => p.v));
  const spanV = maxV - minV || 1;

  const scaleX = (t) => pad + ((t - minT) / spanT) * (width - pad * 2);
  const scaleY = (v) => height - pad - ((v - minV) / spanV) * (height - pad * 2);

  const pathD = pts
    .map((p, i) => {
      const x = scaleX(p.t);
      const y = scaleY(p.v);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const floodY = floodStage != null ? scaleY(floodStage) : null;

  const numTicks = 5;
  const xTicks = Array.from({ length: numTicks }).map((_, i) => {
    const t = minT + (spanT * i) / (numTicks - 1);
    const x = scaleX(t);
    const label = new Date(t).toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
    });
    return { x, label };
  });

  const midV = (minV + maxV) / 2;

  return (
    <svg
      width={width}
      height={height}
      className="bg-black/20 rounded border border-white/10"
      style={{ minWidth: width }}
    >
      {/* Flood stage line */}
      {floodY != null && (
        <line
          x1={pad}
          y1={floodY}
          x2={width - pad}
          y2={floodY}
          stroke="#ff6666"
          strokeDasharray="4 4"
          strokeWidth="1"
        />
      )}

      {/* Vertical ruler-style ticks */}
      {xTicks.map((t, idx) => (
        <g key={idx}>
          <line
            x1={t.x}
            y1={height - pad}
            x2={t.x}
            y2={height - pad + 6}
            stroke="#aaa"
            strokeWidth="0.5"
          />
          <text
            x={t.x}
            y={height - 2}
            fill="#aaa"
            fontSize="8"
            textAnchor="middle"
          >
            {t.label}
          </text>
        </g>
      ))}

      {/* Trend line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" />

      {/* Y labels like a ruler */}
      <text
        x={pad}
        y={height - pad - 2}
        fill="#aaa"
        fontSize="8"
        textAnchor="start"
      >{`${minV.toFixed(1)}${unit || ""}`}</text>
      <text
        x={pad}
        y={pad + 6}
        fill="#aaa"
        fontSize="8"
        textAnchor="start"
      >{`${maxV.toFixed(1)}${unit || ""}`}</text>
      <text
        x={pad}
        y={(height + pad) / 2}
        fill="#aaa"
        fontSize="8"
        textAnchor="start"
      >{`${midV.toFixed(1)}${unit || ""}`}</text>
    </svg>
  );
}

/* ---------------------------------------------------
   Wind Compass Widget
--------------------------------------------------- */
function WindCompass({ direction, degrees }) {
  if (degrees == null || isNaN(degrees)) return null;
  const arrowRotation = degrees; // point where wind is blowing toward

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16 rounded-full border border-white/30 flex items-center justify-center text-[9px] text-white/70">
        {/* Cardinal labels */}
        <span className="absolute top-0 left-1/2 -translate-x-1/2">N</span>
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2">S</span>
        <span className="absolute left-0 top-1/2 -translate-y-1/2">W</span>
        <span className="absolute right-0 top-1/2 -translate-y-1/2">E</span>

        {/* Arrow */}
        <div
          className="w-[2px] h-7 bg-cyan-400 rounded-full origin-bottom"
          style={{ transform: `rotate(${arrowRotation}deg)` }}
        />
      </div>
      <div className="text-xs">
        <div className="font-semibold">Wind</div>
        <div>
          {direction} ({degrees.toFixed(0)}°)
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------
   River Level Arrow
--------------------------------------------------- */
function RiverLevelIndicator({ trend, color }) {
  if (!trend) return null;

  let rotation = 0;
  let label = "Steady";
  let animate = "";

  if (trend === "rising") {
    rotation = -45;
    label = "Rising";
    animate = "animate-bounce";
  } else if (trend === "falling") {
    rotation = 45;
    label = "Falling";
    animate = "animate-bounce";
  } else {
    rotation = 0;
    label = "Steady";
    animate = ""; // no animation for steady
  }

  return (
    <div className="flex items-center justify-center gap-2 text-xs mt-1">
      <span className="opacity-70">River Level:</span>
      <span className="inline-flex items-center gap-1">
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full border border-white/40 bg-black/40 ${animate}`}
          style={{ transform: `rotate(${rotation}deg)`, color: color || "#22d3ee" }}
        >
          ↑
        </span>
        <span className="font-semibold capitalize">{label}</span>
      </span>
    </div>
  );
}

/* ---------------------------------------------------
   AQI Gradient Scale with Ticks
--------------------------------------------------- */
function AirQualityScale({ aqi }) {
  const value = aqi?.aqi != null ? Math.max(0, Math.min(500, aqi.aqi)) : null;
  const pct = value != null ? (value / 500) * 100 : null;

  const ticks = [0, 50, 100, 150, 200, 300, 500];

  return (
    <div className="w-full">
      <div className="relative h-3 w-full" style={{ background: AQI_GRADIENT }}>
        {/* Tick lines */}
        {ticks.map((v) => {
          const x = (v / 500) * 100;
          return (
            <div
              key={v}
              className="absolute top-0 h-3 border-l border-white/50"
              style={{ left: `${x}%` }}
            />
          );
        })}

        {/* AQI marker */}
        {pct != null && (
          <div
            className="absolute -top-1 h-5 flex flex-col items-center"
            style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
          >
            <div className="w-[2px] h-3 bg-white" />
            <div className="text-[9px] bg-black/70 px-1 rounded mt-0.5 whitespace-nowrap">
              AQI {value.toFixed(0)} — {aqi.category}
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-between text-[9px] text-white mt-0.5">
        {ticks.map((v) => (
          <span key={v}>{v}</span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------
   Main Component
--------------------------------------------------- */
export default function RiverConditions() {
  const defaultStation = stations.find((s) => s.id === "03322420") ?? stations[0];

  const [selected, setSelected] = useState(defaultStation);
  const [data, setData] = useState(null);

  const [wxLoc, setWxLoc] = useState({
    lat: defaultStation.lat,
    lon: defaultStation.lon,
  });

  const [weather, setWeather] = useState(null);
  const [aqi, setAqi] = useState(null);
  const [statusText, setStatusText] = useState("Normal");
  const [trend, setTrend] = useState("steady");

  const [mapCenter, setMapCenter] = useState({
    lat: 37.77,
    lon: -87.5747,
  });

  /* ---------------- River Data ---------------- */
  async function loadRiver(id) {
    try {
      const res = await fetch(`/api/river-data?site=${id}&_=${Date.now()}`);
      const json = await res.json();
      setData(json);

      // Hazard status
      if (json.observed != null && json.floodStage != null) {
        if (json.observed >= json.floodStage) setStatusText("Flooding");
        else if (json.observed >= json.floodStage * 0.8) setStatusText("Caution");
        else setStatusText("Normal");
      } else {
        setStatusText("Normal");
      }

      // Trend detection from history
      const hist = Array.isArray(json.history) ? json.history : [];
      if (hist.length >= 3) {
        const last3 = hist.slice(-3);
        const diff = last3[2].v - last3[0].v;
        if (diff > 0.3) setTrend("rising");
        else if (diff < -0.3) setTrend("falling");
        else setTrend("steady");
      } else {
        setTrend("steady");
      }
    } catch (err) {
      console.error("River load error:", err);
      setData(null);
      setStatusText("Normal");
      setTrend("steady");
    }
  }

  useEffect(() => {
    if (selected?.id) {
      loadRiver(selected.id);
    }
  }, [selected]);

  /* ---------------- Weather / AQI ---------------- */
  async function loadWeather(lat, lon) {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current_weather=true&hourly=precipitation_probability&forecast_days=1&timezone=auto`;
      const res = await fetch(url);
      const json = await res.json();

      const cw = json.current_weather;
      const tempF = (cw.temperature * 9) / 5 + 32;
      const windMph = cw.windspeed * 0.621371;
      const windDeg = cw.winddirection;
      const precip =
        json.hourly && Array.isArray(json.hourly.precipitation_probability)
          ? json.hourly.precipitation_probability[0]
          : null;

      setWeather({
        tempF,
        windMph,
        windDir: windDirLabel(windDeg),
        windDeg,
        precip,
        summary:
          typeof cw.weathercode === "number" ? `Code ${cw.weathercode}` : "Clear",
      });
    } catch (err) {
      console.error("Weather error:", err);
      setWeather(null);
    }
  }

  async function loadAQI(lat, lon) {
    try {
      const res = await fetch(`/api/aqi?lat=${lat}&lon=${lon}`);
      const json = await res.json();
      setAqi(json);
    } catch (err) {
      console.error("AQI error:", err);
      setAqi(null);
    }
  }

  useEffect(() => {
    if (!wxLoc) return;
    loadWeather(wxLoc.lat, wxLoc.lon);
    loadAQI(wxLoc.lat, wxLoc.lon);
  }, [wxLoc]);

  /* ---------------- Locate Me (downstream-biased) ---------------- */
  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        setMapCenter({ lat, lon });

        // Prefer nearest downstream station (further west / smaller longitude)
        let best = null;
        let bestScore = Infinity;

        stations.forEach((s) => {
          const d = distKm(lat, lon, s.lat, s.lon);
          const isDownstream = s.lon <= lon;
          const score = d + (isDownstream ? 0 : 50); // penalize upstream by 50km
          if (score < bestScore) {
            bestScore = score;
            best = s;
          }
        });

        const finalStation = best || stations[0];

        setSelected(finalStation);
        setWxLoc({ lat: finalStation.lat, lon: finalStation.lon });
      },
      () => alert("Unable to get location.")
    );
  };

  /* ---------------- Colors & map ---------------- */
  const hazardColor = HAZARD_COLORS[statusText] || HAZARD_COLORS.Normal;

  const mapSrc = `https://www.marinetraffic.com/en/ais/embed/map?zoom=9&centerx=${mapCenter.lon}&centery=${mapCenter.lat}&layer_all=1`;

  /* Precip display */
  let precipLabel = "—";
  let precipIcon = "☁️";
  if (weather?.precip != null) {
    const p = weather.precip;
    precipLabel = `${p.toFixed(0)}%`;
    if (p >= 80) precipIcon = "⚡️";
    else if (p >= 50) precipIcon = "🌧";
    else if (p >= 20) precipIcon = "☁️";
    else precipIcon = "🌤";
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-white">
      <Header />

      {/* TOP: RIVER HAZARD BAR (HYBRID) */}
      <section className="sticky top-0 shadow-md z-50 bg-slate-900/95 backdrop-blur">
        <div className="max-w-6xl mx-auto flex">
          {/* Left hazard accent strip */}
          <div
            className="w-1.5 sm:w-2 rounded-r"
            style={{ backgroundColor: hazardColor }}
          />

          <div className="flex-1 py-3 px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Station selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="station" className="text-sm font-medium text-white">
                Station:
              </label>
              <select
                id="station"
                value={selected.id}
                onChange={(e) => {
                  const st = stations.find((s) => s.id === e.target.value);
                  if (!st) return;
                  setSelected(st);
                  setMapCenter({ lat: st.lat, lon: st.lon });
                  setWxLoc({ lat: st.lat, lon: st.lon });
                }}
                className="px-3 py-1 rounded border bg-white text-black min-w-[220px]"
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Center summary */}
            <div className="flex-1 text-center">
              <p className="text-sm font-semibold uppercase">
                {data?.location ?? selected.name}
              </p>
              <p className="text-sm">
                {data?.observed != null ? (
                  <>
                    <span className="font-semibold">
                      {data.observed.toFixed(2)} {data.unit || "ft"}
                    </span>
                    {data?.time ? <> at {formatLocal(data.time)}</> : null}
                  </>
                ) : (
                  "Loading level…"
                )}
              </p>
              <p className="text-xs mt-1">
                Flood Stage: {data?.floodStage ?? "—"} ft • {statusText}
              </p>
              <p className="text-[10px] text-white/70 mt-0.5">
                River conditions update automatically as you move along the Ohio.
              </p>
              {/* River Level indicator */}
              <RiverLevelIndicator trend={trend} color={hazardColor} />
            </div>

            {/* Charts */}
            <div className="flex flex-col items-center w-full sm:w-auto">
              <div className="flex gap-4">
                <Chart
                  data={data?.history}
                  floodStage={data?.floodStage}
                  unit={data?.unit}
                />
                <Chart
                  data={data?.prediction}
                  floodStage={data?.floodStage}
                  unit={data?.unit}
                  color="#00ffff"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAP */}
      <main className="flex-1 w-full mt-0">
        <section className="w-full">
          <div className="relative w-full">
            <iframe
              src={mapSrc}
              width="100%"
              height="630"
              frameBorder="0"
              className="border-none"
              title="Live Vessel Traffic"
              loading="lazy"
            />
          </div>
          {/* Find Me button centered below map */}
          <div className="flex justify-center py-3">
            <button
              onClick={handleLocate}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-md flex items-center gap-2"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4M12 18v4M4 12h4M16 12h4" />
              </svg>
              Find Me
            </button>
          </div>
        </section>
      </main>

      {/* BOTTOM: AIR INFO + AQI SCALE */}
      <section className="w-full mt-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          {/* Air info bar (TEMP • WIND SPEED • COMPASS • PRECIP) */}
          <div className="px-4 py-3 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Temp & summary */}
            <div className="text-sm">
              {weather ? (
                <>
                  <p className="font-semibold">{selected.name}</p>
                  <p>
                    🌡 {weather.tempF.toFixed(1)}°F • 💨{" "}
                    {weather.windMph.toFixed(1)} mph
                  </p>
                </>
              ) : (
                <p className="italic text-xs">Loading weather…</p>
              )}
            </div>

            {/* Compass */}
            <div className="flex-1 flex justify-center">
              {weather ? (
                <WindCompass
                  direction={weather.windDir}
                  degrees={weather.windDeg}
                />
              ) : null}
            </div>

            {/* Precip info */}
            <div className="text-right text-xs">
              <p className="font-semibold mb-1">Precipitation</p>
              <p>
                {precipIcon} {precipLabel}
              </p>
            </div>
          </div>

          {/* Air Quality gradient ruler directly under air info bar (touching) */}
          <AirQualityScale aqi={aqi} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
