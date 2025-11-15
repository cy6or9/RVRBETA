import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Weather() {
  const [coords, setCoords] = useState({ lat: 37.77, lon: -87.57 });
  const [weather, setWeather] = useState<{
    temperature?: number;
    windspeed?: number;
    winddirection?: number;
    summary?: string;
    sunrise?: string;
    sunset?: string;
    code?: number;
  }>({});
  const [forecast, setForecast] = useState<{
    highTemp?: number;
    lowTemp?: number;
    highWind?: number;
    lowWind?: number;
    avgDir?: number;
    rainChance?: number;
  }>({});
  const [aqi, setAqi] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Get user location ---
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCoords({ lat: latitude, lon: longitude });
        },
        (err) => console.warn("Geolocation error:", err)
      );
    }
  }, []);

  // --- Fetch data ---
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,windspeed_10m_min,winddirection_10m_dominant&timezone=auto`
        );
        const data = await res.json();

        const current = data?.current_weather;
        const summary = weatherDescription(current?.weathercode);
        setWeather({
          temperature: current?.temperature,
          windspeed: current?.windspeed,
          winddirection: current?.winddirection,
          summary,
          sunrise: data?.daily?.sunrise?.[0],
          sunset: data?.daily?.sunset?.[0],
          code: current?.weathercode,
        });

        setForecast({
          highTemp: data?.daily?.temperature_2m_max?.[0],
          lowTemp: data?.daily?.temperature_2m_min?.[0],
          highWind: data?.daily?.windspeed_10m_max?.[0],
          lowWind: data?.daily?.windspeed_10m_min?.[0],
          avgDir: data?.daily?.winddirection_10m_dominant?.[0],
          rainChance: data?.daily?.precipitation_probability_max?.[0],
        });

        const aqiRes = await fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.lat}&longitude=${coords.lon}&hourly=us_aqi`
        );
        const aqiData = await aqiRes.json();
        const latestAqi =
          aqiData?.hourly?.us_aqi?.[aqiData.hourly.us_aqi.length - 1];
        setAqi(latestAqi ?? null);
      } catch (err) {
        console.error("Weather/AQI fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [coords]);

  // --- Helpers ---
  function weatherDescription(code: number): string {
    const codes: Record<number, string> = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Rime fog",
      51: "Light drizzle",
      53: "Drizzle",
      55: "Dense drizzle",
      61: "Light rain",
      63: "Rain",
      65: "Heavy rain",
      71: "Light snow",
      73: "Snow",
      75: "Heavy snow",
      80: "Rain showers",
      81: "Moderate showers",
      82: "Violent showers",
      95: "Thunderstorm",
      99: "Severe thunderstorm",
    };
    return codes[code] || "Unknown";
  }

  function degToCompass(deg?: number): string {
    if (deg === undefined) return "";
    const dirs = [
      "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
      "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
    ];
    return dirs[Math.round(deg / 22.5) % 16];
  }

  function aqiGradient() {
    return "linear-gradient(to right, #00E400, #FFFF00, #FF7E00, #FF0000, #8F3F97, #7E0023)";
  }

  function aqiColor(aqi: number): string {
    if (aqi <= 50) return "#00E400";
    if (aqi <= 100) return "#FFFF00";
    if (aqi <= 150) return "#FF7E00";
    if (aqi <= 200) return "#FF0000";
    if (aqi <= 300) return "#8F3F97";
    return "#7E0023";
  }

  function aqiLabel(aqi: number): string {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Unhealthy (Sensitive)";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very Unhealthy";
    return "Hazardous";
  }

  // --- Dynamic scenic background with fallback gradient ---
  function backgroundScene(code?: number): string {
    if (!code) return "linear-gradient(180deg, #0099ff, #004488)";
    if ([0, 1].includes(code))
      return "linear-gradient(180deg, rgba(0,150,255,0.9), rgba(0,80,255,0.8)), url('/images/weather/clear.jpg')";
    if ([2, 3].includes(code))
      return "linear-gradient(180deg, rgba(120,140,160,0.9), rgba(80,90,120,0.8)), url('/images/weather/cloudy.jpg')";
    if ([45, 48].includes(code))
      return "linear-gradient(180deg, rgba(190,190,190,0.8), rgba(150,150,150,0.8)), url('/images/weather/foggy.jpg')";
    if ([61, 63, 65, 80, 81, 82].includes(code))
      return "linear-gradient(180deg, rgba(60,80,120,0.8), rgba(30,40,60,0.8)), url('/images/weather/rainy.jpg')";
    if ([71, 73, 75].includes(code))
      return "linear-gradient(180deg, rgba(220,230,240,0.9), rgba(180,200,220,0.8)), url('/images/weather/snowy.jpg')";
    if ([95, 99].includes(code))
      return "linear-gradient(180deg, rgba(60,60,80,0.9), rgba(10,10,20,0.8)), url('/images/weather/stormy.jpg')";
    return "linear-gradient(180deg, #0070c0, #003366)";
  }

  const windyURL = `https://embed.windy.com/embed2.html?lat=${coords.lat}&lon=${coords.lon}&zoom=7&layer=wind&menu=&message=false&marker=&calendar=12&pressure=true&type=map&location=coordinates&detail=&forecast=24&embed=true`;

  const aqiValue = aqi ?? 0;
  const barColor = aqiColor(aqiValue);
  const label = aqiLabel(aqiValue);

  // --- Formatters ---
  function formatWeather() {
    if (!weather.temperature || !weather.windspeed) return null;
    const tempF = (weather.temperature * 9) / 5 + 32;
    const windMph = weather.windspeed / 1.609;
    const windKnots = windMph / 1.151;
    const direction = degToCompass(weather.winddirection);

    return (
      <>
        🌡️ {tempF.toFixed(1)}°F ({weather.temperature.toFixed(1)}°C) | 💨 {direction}{" "}
        {windMph.toFixed(1)} mph ({windKnots.toFixed(1)} kts) | ☁️ {weather.summary} | 🌅{" "}
        {new Date(weather.sunrise ?? "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} | 🌇{" "}
        {new Date(weather.sunset ?? "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </>
    );
  }

  function formatForecast() {
    if (!forecast.highTemp || !forecast.lowTemp) return null;
    const highF = (forecast.highTemp * 9) / 5 + 32;
    const lowF = (forecast.lowTemp * 9) / 5 + 32;
    const highWindMph = forecast.highWind ? forecast.highWind / 1.609 : 0;
    const lowWindMph = forecast.lowWind ? forecast.lowWind / 1.609 : 0;
    const avgDir = degToCompass(forecast.avgDir);
    const rain = forecast.rainChance ?? 0;

    return (
      <>
        🔺 High {highF.toFixed(1)}°F ({forecast.highTemp.toFixed(1)}°C) | 🔻 Low {lowF.toFixed(1)}°F ({forecast.lowTemp.toFixed(1)}°C)
        | 💨 {avgDir} {lowWindMph.toFixed(1)}–{highWindMph.toFixed(1)} mph | 🌧️ {rain.toFixed(0)}% chance
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Unified scenic info header */}
      <section
        className="w-full flex flex-col items-center justify-center text-white text-center bg-cover bg-center bg-no-repeat shadow-lg"
        style={{
          backgroundImage: backgroundScene(weather.code),
          backgroundSize: "cover",
          backgroundPosition: "center",
          padding: "1rem 0",
        }}
      >
        <div className="backdrop-blur-md bg-black/50 rounded-3xl px-6 py-4 w-full max-w-[90%] space-y-3">
          <div className="text-base sm:text-lg font-medium">
            {loading ? "Loading current weather..." : formatWeather()}
          </div>
          {forecast.highTemp && (
            <div className="text-base sm:text-lg font-medium">{formatForecast()}</div>
          )}
          {aqi && (
            <div className="pt-2">
              <div className="font-medium text-sm">Air Quality Index (AQI)</div>
              <div
                style={{
                  position: "relative",
                  height: "10px",
                  borderRadius: "5px",
                  background: aqiGradient(),
                  margin: "6px auto",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: `${Math.min((aqiValue / 500) * 100, 100)}%`,
                    top: "-3px",
                    width: "8px",
                    height: "16px",
                    borderRadius: "2px",
                    background: barColor,
                    boxShadow: "0 0 4px rgba(0,0,0,0.3)",
                    transform: "translateX(-50%)",
                  }}
                ></div>
              </div>
              <div
                className="text-xs sm:text-sm font-semibold"
                style={{ color: barColor }}
              >
                {label} ({aqiValue})
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Maps (no padding) */}
      <main className="flex-1 w-full mt-0">
        <section className="w-full">
          <iframe
            src={windyURL}
            width="100%"
            height="700"
            frameBorder="0"
            style={{ border: 0, display: "block" }}
            title="Live Wind Map"
            loading="lazy"
          ></iframe>
        </section>

        <section className="w-full mt-0">
          <iframe
            src="https://radar.weather.gov/region/ohx"
            width="100%"
            height="700"
            frameBorder="0"
            style={{ border: 0, display: "block" }}
            title="NOAA Live Radar"
            loading="lazy"
          ></iframe>
        </section>

        <section className="w-full mt-0 mb-0">
          <iframe
            src={`https://forecast.weather.gov/MapClick.php?lat=${coords.lat}&lon=${coords.lon}&FcstType=graphical`}
            width="100%"
            height="850"
            frameBorder="0"
            style={{ border: 0, display: "block" }}
            title="7-Day Weather Forecast"
            loading="lazy"
          ></iframe>
        </section>
      </main>

      <Footer />
    </div>
  );
}
