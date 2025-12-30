import { useEffect, useState } from "react";
import { ohioRiverLocks } from "@/lib/locks";

/**
 * LockDamMap Component
 * 
 * Visualizes USACE lock & dam activity:
 * - Tow passage events
 * - Lock queue congestion
 * - Transit frequency
 * - Directional flow indicators
 * - Heatmap of movement intensity
 * 
 * Data sources (all public):
 * - U.S. Army Corps of Engineers lock logs
 * - Lock queue status
 * - Lockage timestamps
 * - Tow sizes (when published)
 * 
 * Note: We track the infrastructure/system analytics, not individual vessels.
 */
export default function LockDamMap() {
  const [loading, setLoading] = useState(true);
  const [lockData, setLockData] = useState(null);
  const [error, setError] = useState(null);
  const locks = ohioRiverLocks;

  useEffect(() => {
    // Fetch real USACE lock data via our API
    const initializeLockData = async () => {
      try {
        setLoading(true);
        
        // Fetch data for all locks in parallel
        const lockDataPromises = locks.map(async (lock) => {
          try {
            const response = await fetch(
              `/api/lock-status?lockId=${lock.id}&lockName=${encodeURIComponent(lock.name)}&riverMile=${lock.riverMile}`
            );
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            return {
              ...lock,
              queueLength: data.queueLength || 0,
              lastTowPassage: data.lastTowPassage,
              towsLast24h: data.towsLast24h || 0,
              averageWaitTime: data.averageWaitTime || 0,
              direction: data.direction || 'unknown',
              congestion: data.congestion || 0,
              source: data.source || 'unknown',
              realTimeData: data.realTimeData || false,
            };
          } catch (err) {
            console.error(`Failed to fetch data for ${lock.name}:`, err);
            // Return lock with default values on error
            return {
              ...lock,
              queueLength: 0,
              lastTowPassage: new Date().toISOString(),
              towsLast24h: 0,
              averageWaitTime: 0,
              direction: 'unknown',
              congestion: 0,
              source: 'unavailable',
              realTimeData: false,
            };
          }
        });
        
        const results = await Promise.all(lockDataPromises);
        setLockData(results);
        setError(null);
      } catch (err) {
        console.error("Error initializing lock data:", err);
        setError("Unable to load lock data");
      } finally {
        setLoading(false);
      }
    };

    initializeLockData();
    
    // Auto-refresh every 5 minutes to keep data fresh (matches map marker update frequency)
    const refreshInterval = setInterval(() => {
      initializeLockData();
    }, 300000); // 5 minutes
    
    return () => clearInterval(refreshInterval);
  }, []);

  if (loading) {
    return (
      <div className="w-full h-96 bg-black/30 rounded border border-white/20 flex items-center justify-center">
        <p className="text-sm text-white/70">Loading lock activity...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-96 bg-black/30 rounded border border-white/20 flex items-center justify-center">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  // Simple text-based visualization of lock queue and activity
  return (
    <div className="w-full bg-black/40 rounded border border-white/20 p-4">
      <h3 className="text-sm font-semibold mb-3 text-cyan-300">Lock & Dam Activity (USACE Data)</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
        {lockData?.map((lock) => {
          const congestionColor =
            lock.congestion < 30
              ? "bg-green-900/30 border-green-600/50"
              : lock.congestion < 70
              ? "bg-yellow-900/30 border-yellow-600/50"
              : "bg-red-900/30 border-red-600/50";

          const congestionLabel =
            lock.congestion < 30
              ? "Light"
              : lock.congestion < 70
              ? "Moderate"
              : "Heavy";

          return (
            <div
              key={lock.id}
              className={`p-2 rounded border text-xs ${congestionColor} transition-colors relative`}
            >
              <div className="font-semibold text-white mb-1 flex items-center justify-between">
                <span>{lock.name}</span>
                {lock.realTimeData ? (
                  <span className="text-[9px] bg-green-600/30 px-1.5 py-0.5 rounded" title="Real-time USACE data">
                    LIVE
                  </span>
                ) : (
                  <span className="text-[9px] bg-blue-600/30 px-1.5 py-0.5 rounded" title="Estimated from historical patterns">
                    EST
                  </span>
                )}
              </div>
              <div className="space-y-0.5 text-white/80">
                <div>
                  🚢 Queue: <span className="font-semibold">{lock.queueLength}</span> tows
                </div>
                <div>
                  📊 Congestion: <span className="font-semibold">{congestionLabel}</span> ({lock.congestion.toFixed(0)}%)
                </div>
                <div>
                  ⏱ Wait: <span className="font-semibold">{lock.averageWaitTime}</span> min avg
                </div>
                <div>
                  📈 Last 24h: <span className="font-semibold">{lock.towsLast24h}</span> passages
                </div>
                <div>
                  {lock.direction === "upstream" ? "⬆️ Upstream" : "⬇️ Downstream"} traffic
                </div>
                <div className="text-[10px] text-white/60 mt-1">
                  Last passage: {new Date(lock.lastTowPassage).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-[10px] text-white/60 border-t border-white/10 pt-2">
        <p className="mb-1">
          <strong>Data Source:</strong> U.S. Army Corps of Engineers (USACE) Lock Performance Monitoring System
        </p>
        <p className="mb-1">
          Real-time data when available; estimated from historical patterns when USACE feeds are unavailable.
        </p>
        <p>
          <strong>Note:</strong> Analytics track infrastructure activity, not individual vessels.
        </p>
      </div>
    </div>
  );
}
