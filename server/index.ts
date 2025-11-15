import express, { Request, Response, NextFunction } from "express";
import fetch from "node-fetch";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// ---------------------------------------------------
// Types
// ---------------------------------------------------
type USGSPoint = { dateTime: string; value: string };
type USGSResponse = {
  value?: {
    timeSeries?: Array<{
      sourceInfo?: {
        siteName?: string;
        geoLocation?: { geogLocation?: { latitude?: number; longitude?: number } };
      };
      variable?: { unit?: { unitCode?: string } };
      values?: Array<{ value?: USGSPoint[] }>;
    }>;
  };
};

type RiverData = {
  site: string;
  location: string;
  observed: number | null;
  unit: string;
  time: string | null;
  floodStage: number | null;
  coords?: { lat: number; lon: number };
  history: Array<{ t: string; v: number }>;
  prediction: Array<{ t: string; v: number }>;
};

type AQIResponse = {
  hourly?: {
    time?: string[];
    us_aqi?: (number | null)[];
  };
};

// Flood stage reference (expand manually as needed)
const FLOOD_STAGE_FT: Record<string, number> = {
  "03381700": 37,
  "03322420": 37,
  "03322000": 39,
};

// ---------------------------------------------------
// Middleware
// ---------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${ms} ms`);
    }
  });
  next();
});

// ---------------------------------------------------
// Helpers
// ---------------------------------------------------
function generatePrediction(history: Array<{ t: string; v: number }>) {
  if (!history.length) return [];
  const lastTen = history.slice(-10);
  const slope =
    lastTen.length > 1
      ? (lastTen[lastTen.length - 1].v - lastTen[0].v) / (lastTen.length - 1)
      : 0;

  const lastValue = lastTen[lastTen.length - 1].v;
  const now = new Date(lastTen[lastTen.length - 1].t).getTime();

  return Array.from({ length: 10 }, (_, i) => ({
    t: new Date(now + (i + 1) * 86400000).toISOString(),
    v: parseFloat((lastValue + slope * (i + 1)).toFixed(2)),
  }));
}

function degToCompass(num: number): string {
  const dirs = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW",
  ];
  return dirs[Math.round(num / 22.5) % 16];
}

// Softer AQI palette
function aqiToColorAndCategory(aqi: number | null): { color: string; category: string } {
  if (aqi == null || !Number.isFinite(aqi)) {
    return { color: "#4CAF50", category: "Unknown" };
  }
  if (aqi <= 50) return { color: "#4CAF50", category: "Good" };
  if (aqi <= 100) return { color: "#F4D06F", category: "Moderate" };
  if (aqi <= 150) return { color: "#F4A259", category: "USG" };
  if (aqi <= 200) return { color: "#D35D6E", category: "Unhealthy" };
  if (aqi <= 300) return { color: "#9D4EDD", category: "Very Unhealthy" };
  return { color: "#B0003A", category: "Hazardous" };
}

// ---------------------------------------------------
// /api/weather
// ---------------------------------------------------
app.get("/api/weather", async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: "Missing or invalid lat/lon" });
  }

  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    );
    if (!r.ok) throw new Error(`Weather HTTP ${r.status}`);

    const j = (await r.json()) as any;
    const cw = j.current_weather;
    if (!cw) throw new Error("Missing current_weather");

    const tempC = cw.temperature;
    const tempF = tempC * 9 / 5 + 32;

    const windDir = cw.winddirection ?? 0;

    res.json({
      tempF,
      windSpeed: cw.windspeed ?? 0,
      windDir,
      windCompass: degToCompass(windDir),
      summary: cw.weathercode ? `Code ${cw.weathercode}` : "Clear",
    });
  } catch (err) {
    console.error("Weather fetch error:", err);
    res.status(500).json({ error: "Weather fetch failed" });
  }
});

// ---------------------------------------------------
// /api/aqi
// ---------------------------------------------------
app.get("/api/aqi", async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: "Missing or invalid lat/lon" });
  }

  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${lat}&longitude=${lon}` +
    `&hourly=us_aqi&past_days=1&timezone=America/Chicago`;

  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`AQI HTTP ${r.status}`);

    const j = (await r.json()) as AQIResponse;

    const values = Array.isArray(j.hourly?.us_aqi) ? j.hourly!.us_aqi! : [];

    let aqi: number | null = null;
    for (let i = values.length - 1; i >= 0; i--) {
      const v = values[i];
      if (typeof v === "number" && Number.isFinite(v)) {
        aqi = v;
        break;
      }
    }

    const { color, category } = aqiToColorAndCategory(aqi);

    res.json({
      aqi,
      aqiColor: color,
      category,
    });
  } catch (err) {
    console.error("AQI fetch error:", err);
    const { color, category } = aqiToColorAndCategory(null);
    res.status(200).json({
      aqi: null,
      aqiColor: color,
      category,
    });
  }
});

// ---------------------------------------------------
// /api/river-data
// ---------------------------------------------------
app.get("/api/river-data", async (req: Request, res: Response) => {
  const site = (req.query.site as string) || "03322420";
  const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${site}&parameterCd=00065&period=P10D`;

  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`USGS ${r.status}`);

    const j = (await r.json()) as USGSResponse;

    const ts = j?.value?.timeSeries?.[0];
    const siteName = ts?.sourceInfo?.siteName ?? `USGS Site ${site}`;

    const unit = ts?.variable?.unit?.unitCode ?? "ft";
    const coords = ts?.sourceInfo?.geoLocation?.geogLocation;
    const raw = ts?.values?.[0]?.value ?? [];

    const history = raw
      .map((p) => ({ t: p.dateTime, v: parseFloat(p.value) }))
      .filter((p) => Number.isFinite(p.v));

    const latest = history.at(-1);
    const floodStage = FLOOD_STAGE_FT[site] ?? null;

    const payload: RiverData = {
      site,
      location: siteName,
      observed: latest?.v ?? null,
      unit,
      time: latest?.t ?? null,
      floodStage,
      coords:
        typeof coords?.latitude === "number" &&
        typeof coords?.longitude === "number"
          ? { lat: coords.latitude, lon: coords.longitude }
          : undefined,
      history,
      prediction: generatePrediction(history),
    };

    res.status(200).json(payload);
  } catch (err: any) {
    console.error("USGS fetch error:", err?.message ?? err);
    const fallback: RiverData = {
      site,
      location: `USGS Site ${site}`,
      observed: null,
      unit: "ft",
      time: null,
      floodStage: FLOOD_STAGE_FT[site] ?? null,
      history: [],
      prediction: [],
    };
    res.status(200).json(fallback);
  }
});

// ---------------------------------------------------
// Error Handling & Server Start
// ---------------------------------------------------
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({ message: err.message || "Internal error" });
});

(async () => {
  const server = await registerRoutes(app);

  if (app.get("env") === "development") await setupVite(app, server);
  else serveStatic(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () =>
    log(`✅ Server running on port ${port}`)
  );
})();
