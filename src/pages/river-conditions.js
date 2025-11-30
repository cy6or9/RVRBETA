import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

/* ---------------------------------------------------
   Station List (Ohio River full chain)
--------------------------------------------------- */
const stations = [
  { id: "03085152", name: "Pittsburgh, PA", lat: 40.44, lon: -79.99 },
  { id: "03086000", name: "Dashields L&D, PA", lat: 40.52, lon: -80.20 },
  { id: "03108500", name: "Montgomery L&D, PA", lat: 40.64, lon: -80.40 },
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
  { id: "03238680", name: "Meldahl L&D, OH", lat: 38.78, lon: -84.10 },
  { id: "03255000", name: "Cincinnati, OH", lat: 39.10, lon: -84.51 },
  { id: "03277200", name: "Markland Lower, KY", lat: 38.78, lon: -84.94 },
  { id: "03293551", name: "McAlpine Upper, KY", lat: 38.27, lon: -85.79 },
  { id: "03294500", name: "McAlpine Lower, KY", lat: 38.26, lon: -85.80 },
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
  return (
    R *
    2 *
    Math.atan2(
      Math.sqrt(
        Math.sin(dLat / 2) ** 2 +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2
      ),
      Math.sqrt(
        1 -
          (Math.sin(dLat / 2) ** 2 +
            Math.cos((lat1 * Math.PI) / 180) *
              Math.cos((lat2 * Math.PI) / 180) *
              Math.sin(dLon / 2) ** 2)
      )
    )
  );
};

const windDir = (deg) => {
  const dirs = [
    "N","NNE","NE","ENE","E","ESE","SE","SSE",
    "S","SSW","SW","WSW","W","WNW","NW","NNW"
  ];
  return isNaN(deg) ? "" : dirs[Math.round(deg / 22.5) % 16];
};

/* ---------------------------------------------------
   AQI Palette
--------------------------------------------------- */
const AQI_COLORS = {
  Good: "#3A6F3A",
  Moderate: "#9A8B2E",
  USG: "#A66B2C",
  Unhealthy: "#8B3A46",
  VeryUnhealthy: "#613A8B",
  Hazardous: "#7A2A3A",
};

/* ---------------------------------------------------
   Chart Component (identical logic)
--------------------------------------------------- */
function Chart({ data, floodStage, unit, width = 220, height = 100, color = "#ffffff" }) {
  const [hover, setHover] = useState(null);

  if (!data || !Array.isArray(data) || data.length === 0)
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

  const scaleX = (t) => pad + ((t - minT) / spanT) * (width - pad * 2);
  const scaleY = (v) => height - pad - ((v - minV) / spanV) * (height - pad * 2);

  const path = pts
    .map((p, i) =>
      i === 0 ? `M ${scaleX(p.t)} ${scaleY(p.v)}` : `L ${scaleX(p.t)} ${scaleY(p.v)}`
    )
    .join(" ");

  const days = Array.from(new Set(pts.map((p) => p.date.toISOString().slice(0, 10))))
    .map((d) => new Date(d))
    .sort((a, b) => a - b)
    .map((d) => ({
      x: scaleX(d.getTime()),
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
    }));

  return (
    <div className="relative rounded-lg" style={{ background: "#000", width, height, padding: 4 }}>
      <svg width={width} height={height} onMouseLeave={() => setHover(null)}>
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

        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#444" />
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#444" />

        <text x={pad - 12} y={pad + 5} fill="#aaa" fontSize="9">
          {maxV.toFixed(1)}
        </text>
        <text x={pad - 12} y={height - pad} fill="#aaa" fontSize="9">
          {minV.toFixed(1)}
        </text>

        {days.map((t, i) => (
          <g key={i}>
            <line x1={t.x} y1={height - pad} x2={t.x} y2={height - pad + 6} stroke="#888" />
            <text x={t.x - 10} y={height - pad + 17} fill="#ccc" fontSize="8">
              {t.label}
            </text>
          </g>
        ))}

        <path d={path} fill="none" stroke={color} strokeWidth={2} />

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

      {hover && (
        <div
          className="absolute text-xs bg-black text-white px-2 py-1 rounded border border-white/20 pointer-events-none"
          style={{ left: hover.x - 40, top: hover.y - 38, whiteSpace: "nowrap" }}
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

      if (json.observed != null && json.floodStage != null) {
        if (json.observed >= json.floodStage) setStatusText("Flooding");
        else if (json.observed >= json.floodStage * 0.8) setStatusText("Caution");
        else setStatusText("Normal");
      }
    } catch (err) {
      console.error("River load error:", err);
      setData(null);
    }
  }

  useEffect(() => {
    loadRiver(selected.id);
  }, [selected]);

  /* ---------------- Weather ---------------- */
  async function loadWeather(lat, lon) {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
      const res = await fetch(url);
      const json = await res.json();

      const cw = json.current_weather;
      const tempF = (cw.temperature * 9) / 5 + 32;
      const windMph = cw.windspeed * 0.621371;

      setWeather({
        tempF,
        windMph,
        windDir: windDir(cw.winddirection),
        summary: typeof cw.weathercode === "number" ? `Code ${cw.weathercode}` : "Clear",
      });
    } catch (err) {
      console.error("Weather error:", err);
      setWeather(null);
    }
  }

  /* ---------------- AQI ---------------- */
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
    loadWeather(wxLoc.lat, wxLoc.lon);
    loadAQI(wxLoc.lat, wxLoc.lon);
  }, [wxLoc]);

  const barColor =
    aqi?.category && AQI_COLORS[aqi.category]
      ? AQI_COLORS[aqi.category]
      : AQI_COLORS.Good;

  /* ---------------- Locate Me ---------------- */
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

        const downstream = stations.filter((s) => s.lon < lon);

        const choose = (candidates) => {
          let best = candidates[0],
            min = Infinity;
          candidates.forEach((s) => {
            const d = distKm(lat, lon, s.lat, s.lon);
            if (d < min) (min = d), (best = s);
          });
          return best;
        };

        const chosen =
          downstream.length > 0 ? choose(downstream) : choose(stations);

        setSelected(chosen);
        setWxLoc({ lat, lon });
      },
      (err) => alert("Unable to get location.")
    );
  };

  const mapSrc = `https://www.marinetraffic.com/en/ais/embed/map?zoom=10&centerx=${mapCenter.lon}&centery=${mapCenter.lat}&layer_all=1`;

  /* ---------------------------------------------------
     UI
  --------------------------------------------------- */
  return (
    <div className="min-h-screen flex flex-col bg-background text-white">
      <Header />

      <section className="sticky top-0 shadow-md z-50" style={{ backgroundColor: barColor }}>
        <div
          className="w-full flex justify-center text-[8px] tracking-wide text-white"
          style={{
            height: "10px",
            background:
              "linear-gradient(to right, #3A6F3A, #9A8B2E, #A66B2C, #8B3A46, #613A8B, #7A2A3A)",
          }}
        >
          Air Quality
        </div>

        <div className="py-3 max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Station Selector */}
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
          <div className="text-center">
            {weather ? (
              <>
                <p className="text-sm font-semibold">{selected.name}</p>
                <p className="text-sm">
                  🌡 {weather.tempF.toFixed(1)}°F • 💨 {weather.windMph.toFixed(1)} mph{" "}
                  {weather.windDir} • {weather.summary}
                </p>
                <p className="text-xs">
                  AQI:{" "}
                  {aqi?.aqi != null
                    ? `${aqi.aqi.toFixed(0)} (${aqi.category})`
                    : "—"}
                </p>
              </>
            ) : (
              <p className="text-sm italic">Loading weather…</p>
            )}
          </div>

          {/* River Data */}
          <div className="text-left">
            <h2 className="text-base font-semibold uppercase">
              {data?.location ?? "Loading…"}
            </h2>
            <p className="text-sm">
              Latest observed:{" "}
              <span className="font-semibold text-white">
                {data?.observed != null ? `${data.observed.toFixed(2)} ${data.unit}` : "—"}
              </span>{" "}
              {data?.time ? `at ${formatLocal(data.time)}` : ""}
            </p>
            <p className="text-xs">
              Flood Stage: {data?.floodStage ?? "—"} ft • {statusText}
            </p>
          </div>

          <div className="flex flex-col items-center w-full sm:w-auto">
            <div className="flex gap-4">
              <Chart data={data?.history} floodStage={data?.floodStage} unit={data?.unit} />
              <Chart
                data={data?.prediction}
                floodStage={data?.floodStage}
                unit={data?.unit}
                color="#00ffff"
              />
            </div>

            <button
              onClick={handleLocate}
              className="mt-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-full shadow-md"
              style={{ width: 32, height: 32 }}
              aria-label="Locate Me"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C12 2 4 20 4 21C4 21.6 4.4 22 5 22C5.4 22 12 18 12 18C12 18 18.6 22 19 22C19.6 22 20 21.6 20 21C20 20 12 2 12 2Z" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Live MarineTraffic Map */}
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
        </section>
      </main>

      <Footer />
    </div>
  );
}
