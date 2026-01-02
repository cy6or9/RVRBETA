// src/pages/compass.js
import Head from "next/head";
import { useState, useEffect } from "react";
import { DeviceCompass } from "@/components/DeviceCompass";
import Header from "@/components/Header";
import { Maximize2, Minimize2 } from "lucide-react";

export default function CompassPage() {
  const [windData, setWindData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Fullscreen toggle functionality
  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        // Enter fullscreen
        const element = document.documentElement;
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
          await element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
          await element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
          await element.msRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          await document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Error toggling fullscreen:", error);
    }
  };

  // Listen for fullscreen changes (e.g., ESC key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  return (
    <>
      <Head>
        <title>Device Compass - River Valley Report</title>
        <meta
          name="description"
          content="Interactive device compass with wind direction overlay"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        {/* Header - Hidden in fullscreen mode */}
        {!isFullscreen && <Header />}

        {/* Fullscreen Toggle Button - Positioned absolutely */}
        <button
          onClick={toggleFullscreen}
          className={`fixed z-[1000] p-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 rounded-lg backdrop-blur-sm text-emerald-400 transition-all ${
            isFullscreen ? 'top-4 right-4' : 'top-20 right-4'
          }`}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>

        {/* Fullscreen Compass */}
        <main className="flex-1 flex items-center justify-center p-4">
          <DeviceCompass
            windDirectionDeg={windData?.windDir}
            windSpeedMph={windData?.windSpeed}
            size={Math.min(typeof window !== 'undefined' ? window.innerWidth * 0.9 : 400, typeof window !== 'undefined' ? window.innerHeight * 0.75 : 400, 500)}
          />
        </main>

        {/* Discreet Info Tooltip at Bottom */}
        <div className="fixed bottom-0 left-0 right-0 z-50">
          {/* Tooltip Toggle Button */}
          <button
            onClick={() => setShowTooltip(!showTooltip)}
            className="w-full py-2 bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-emerald-500/20 border-t border-emerald-400/30 backdrop-blur-sm text-emerald-400 text-xs font-semibold hover:bg-emerald-500/30 transition-all"
          >
            {showTooltip ? '▼ Hide Info' : '▲ Show Info'}
          </button>

          {/* Expandable Tooltip Content */}
          {showTooltip && (
            <div className="max-h-[60vh] overflow-y-auto bg-black/95 backdrop-blur-md border-t border-emerald-400/30 shadow-lg shadow-emerald-500/20">
              <div className="p-4 space-y-4 text-xs text-white/90">
                {/* How to Use */}
                <div>
                  <h3 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                    <span className="text-emerald-400">●</span> How to Use
                  </h3>
                  <div className="space-y-1.5 pl-4">
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">1.</span>
                      <span>Tap "Enable Motion & Orientation" to grant sensor access (works on all browsers that support it)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">2.</span>
                      <span>If sensors aren't available, the compass automatically falls back to GPS + map bearing</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">3.</span>
                      <span>If prompted to calibrate, move your device in a figure-8 pattern</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">4.</span>
                      <span>The red triangle shows your current heading direction</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">5.</span>
                      <span>The cyan arrow shows where the wind is blowing TO (not from)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">6.</span>
                      <span>Tap the speed display to cycle between mph, knots, and km/h</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">7.</span>
                      <span>The compass face rotates as you turn, keeping North at the top of the world</span>
                    </div>
                  </div>
                </div>

                {/* Location Info */}
                {userLocation && (
                  <div className="text-center text-emerald-400/80 text-[11px] border-t border-emerald-400/20 pt-2">
                    Location: {userLocation.lat.toFixed(4)}°, {userLocation.lon.toFixed(4)}°
                  </div>
                )}

                {/* Features */}
                <div className="border-t border-emerald-400/20 pt-3">
                  <h3 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                    <span className="text-emerald-400">●</span> Features
                  </h3>
                  <ul className="space-y-1 pl-4">
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      Real-time device orientation tracking
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      GPS + map bearing fallback when sensors unavailable
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      Speed calculation from GPS (mph, knots, km/h)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      Smooth rotation with motion damping
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      Wind direction overlay (when location available)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      High-contrast text for outdoor visibility
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      Cardinal direction labels (N, S, E, W, etc.)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      Degree markers for precise navigation
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      Works on iOS and Android devices
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      Automatic sensor detection and fallback
                    </li>
                  </ul>
                </div>

                {/* Browser Compatibility */}
                <div className="bg-emerald-900/20 rounded-lg border border-emerald-400/30 p-3">
                  <h4 className="text-sm font-semibold text-emerald-400 mb-2">
                    Browser Compatibility
                  </h4>
                  <div className="space-y-1.5 text-[11px] text-white/80">
                    <p>
                      <strong className="text-emerald-400">iOS:</strong> Requires iOS 13+ and Safari. Will prompt for motion & orientation permission.
                    </p>
                    <p>
                      <strong className="text-emerald-400">Android:</strong> Works in Chrome, Firefox, and Samsung Internet. Permission auto-granted.
                    </p>
                    <p>
                      <strong className="text-emerald-400">Desktop:</strong> Limited sensor support. Automatically falls back to GPS when available.
                    </p>
                    <p>
                      <strong className="text-emerald-400">GPS Fallback:</strong> When sensors unavailable, uses GPS location tracking to calculate heading and speed from movement.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
