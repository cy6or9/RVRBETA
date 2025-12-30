// src/pages/compass.js
import Head from "next/head";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { DeviceCompass } from "@/components/DeviceCompass";

export default function CompassPage() {
  const [windData, setWindData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Get user location and fetch wind data
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lon: longitude });
          
          // Fetch wind data for location
          try {
            setLoading(true);
            const response = await fetch(
              `/api/weather?lat=${latitude}&lon=${longitude}`
            );
            if (response.ok) {
              const data = await response.json();
              setWindData({
                windSpeed: data.windSpeed,
                windDir: data.windDir,
              });
            }
          } catch (error) {
            console.error("Error fetching wind data:", error);
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  return (
    <>
      <Head>
        <title>Device Compass - River Valley Report</title>
        <meta
          name="description"
          content="Interactive device compass with wind direction overlay"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Page header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                Device Compass
              </h1>
              <p className="text-white/70 text-sm">
                Uses your device's orientation sensors to show heading and wind direction
              </p>
            </div>

            {/* Device Compass - Full Screen */}
            <div className="bg-slate-900/50 rounded-lg border border-white/10 p-8 mb-8">
              <h2 className="text-2xl font-semibold text-white mb-6 text-center">
                Device Compass with Wind
              </h2>
              <div className="flex justify-center py-8">
                <DeviceCompass
                  windDirectionDeg={windData?.windDir}
                  windSpeedMph={windData?.windSpeed}
                  size={300}
                />
              </div>
              <div className="text-center text-sm text-white/60">
                <p>Red triangle = your heading | Cyan arrow = wind direction</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-slate-900/50 rounded-lg border border-white/10 p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-3">
                How to Use
              </h3>
              <div className="space-y-2 text-sm text-white/80">
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">1.</span>
                  <span>
                    Tap "Enable Motion & Orientation" to grant sensor access (works on all browsers that support it)
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">2.</span>
                  <span>
                    If sensors aren't available, the compass automatically falls back to GPS + map bearing
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">3.</span>
                  <span>
                    If prompted to calibrate, move your device in a figure-8 pattern
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">4.</span>
                  <span>
                    The red triangle shows your current heading direction
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">5.</span>
                  <span>
                    The cyan arrow shows where the wind is blowing TO (not from)
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">6.</span>
                  <span>
                    Tap the speed display to cycle between mph, knots, and km/h
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">7.</span>
                  <span>
                    The compass face rotates as you turn, keeping North at the top of the world
                  </span>
                </div>
              </div>
            </div>

            {/* Wind data info */}
            {loading && (
              <div className="text-center text-white/60 text-sm">
                Loading wind data...
              </div>
            )}
            {userLocation && (
              <div className="text-center text-white/50 text-xs">
                Location: {userLocation.lat.toFixed(4)}°, {userLocation.lon.toFixed(4)}°
              </div>
            )}

            {/* Features */}
            <div className="mt-8 bg-slate-900/50 rounded-lg border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Features
              </h3>
              <ul className="space-y-2 text-sm text-white/80">
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">✓</span>
                  Real-time device orientation tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">✓</span>
                  GPS + map bearing fallback when sensors unavailable
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">✓</span>
                  Speed calculation from GPS (mph, knots, km/h)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">✓</span>
                  Smooth rotation with motion damping
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">✓</span>
                  Wind direction overlay (when location available)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">✓</span>
                  High-contrast text for outdoor visibility
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">✓</span>
                  Cardinal direction labels (N, S, E, W, etc.)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">✓</span>
                  Degree markers for precise navigation
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">✓</span>
                  Works on iOS and Android devices
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">✓</span>
                  Automatic sensor detection and fallback
                </li>
              </ul>
            </div>

            {/* Browser compatibility */}
            <div className="mt-6 bg-yellow-900/20 rounded-lg border border-yellow-600/30 p-4">
              <h4 className="text-sm font-semibold text-yellow-400 mb-2">
                Browser Compatibility
              </h4>
              <p className="text-xs text-yellow-200/80">
                <strong>iOS:</strong> Requires iOS 13+ and Safari. Will prompt for motion & orientation permission.
                <br />
                <strong>Android:</strong> Works in Chrome, Firefox, and Samsung Internet. Permission auto-granted.
                <br />
                <strong>Desktop:</strong> Limited sensor support. Automatically falls back to GPS when available.
                <br />
                <strong>GPS Fallback:</strong> When sensors unavailable, uses GPS location tracking to calculate heading and speed from movement.
              </p>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
