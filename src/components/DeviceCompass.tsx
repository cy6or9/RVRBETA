// src/components/DeviceCompass.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface DeviceCompassProps {
  /** Wind direction in meteorological degrees (0 = from North, 90 = from East) */
  windDirectionDeg?: number | null;
  /** Optional wind speed to show, in mph */
  windSpeedMph?: number | null;
  /** Size of the compass in pixels */
  size?: number;
  /** Show permission request UI */
  onRequestPermission?: () => void;
}

type SpeedUnit = 'mph' | 'knots' | 'kmh';

// 16-point compass with detailed directions
const DIRECTIONS = [
  { label: "N", angle: 0 },
  { label: "NNE", angle: 22.5 },
  { label: "NE", angle: 45 },
  { label: "ENE", angle: 67.5 },
  { label: "E", angle: 90 },
  { label: "ESE", angle: 112.5 },
  { label: "SE", angle: 135 },
  { label: "SSE", angle: 157.5 },
  { label: "S", angle: 180 },
  { label: "SSW", angle: 202.5 },
  { label: "SW", angle: 225 },
  { label: "WSW", angle: 247.5 },
  { label: "W", angle: 270 },
  { label: "WNW", angle: 292.5 },
  { label: "NW", angle: 315 },
  { label: "NNW", angle: 337.5 },
];

// Speed conversion functions
const convertSpeed = {
  mphToKnots: (mph: number) => mph * 0.868976,
  mphToKmh: (mph: number) => mph * 1.60934,
  mpsToMph: (mps: number) => mps * 2.23694,
};

/**
 * Device-orientation compass that rotates with user movement.
 * Shows both device heading and wind direction (cyan arrow).
 * Falls back to GPS bearing if no orientation sensors available.
 */
export function DeviceCompass({ 
  windDirectionDeg, 
  windSpeedMph,
  size = 160,
  onRequestPermission
}: DeviceCompassProps) {
  const [heading, setHeading] = React.useState<number | null>(null);
  const [rotationHeading, setRotationHeading] = React.useState<number>(0); // Unnormalized for smooth rotation
  const [permissionState, setPermissionState] = React.useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking');
  const [isCalibrating, setIsCalibrating] = React.useState(false);
  const [userSpeed, setUserSpeed] = React.useState<number>(0); // in mph
  const [speedUnit, setSpeedUnit] = React.useState<SpeedUnit>('mph');
  const [useGpsFallback, setUseGpsFallback] = React.useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = React.useState(false);
  const [permissionsGranted, setPermissionsGranted] = React.useState(false); // Trigger to re-setup after permission grant
  const [manualRecalibrating, setManualRecalibrating] = React.useState(false);
  const [calibrationComplete, setCalibrationComplete] = React.useState(false);
  const [screenOrientation, setScreenOrientation] = React.useState<number>(0); // Current screen orientation angle
  
  const animationFrameRef = React.useRef<number | undefined>(undefined);
  const smoothedHeadingRef = React.useRef<number>(0);
  const gpsWatchIdRef = React.useRef<number | null>(null);
  const lastPositionRef = React.useRef<{ lat: number; lon: number; time: number } | null>(null);
  const lastGpsHeadingRef = React.useRef<number | null>(null);
  const calibrationStartTimeRef = React.useRef<number | null>(null);
  const stableReadingsRef = React.useRef<number>(0);
  
  // Get screen orientation adjustment
  const getOrientationAdjustment = () => {
    if (typeof window === 'undefined') return 0;
    
    // Use Screen Orientation API if available
    if (window.screen?.orientation?.angle !== undefined) {
      return window.screen.orientation.angle;
    }
    
    // Fallback to window.orientation (deprecated but still useful)
    if (window.orientation !== undefined) {
      // window.orientation values: 0 (portrait), 90 (landscape left), -90/270 (landscape right), 180 (portrait upside down)
      return window.orientation;
    }
    
    return 0;
  };
  
  // 90-degree offset for sensor accuracy
  const HEADING_OFFSET = -90;

  // Smooth heading changes to prevent jitter
  const smoothHeading = (newHeading: number) => {
    const current = smoothedHeadingRef.current;
    let diff = newHeading - current;
    
    // Handle wrapping - take shortest angular path
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    
    // Apply smoothing (exponential moving average)
    const smoothed = current + diff * 0.15;
    // Don't normalize with modulo - let it go beyond 0-360 for smooth rotation
    smoothedHeadingRef.current = smoothed;
    
    // Return normalized value for display
    const normalized = (smoothed + 360) % 360;
    
    // Update both the display heading and rotation heading
    setRotationHeading(smoothed); // Raw value for continuous rotation
    
    return normalized;
  };

  // Calculate bearing between two GPS coordinates
  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    
    // Convert to degrees and normalize to 0-360
    const bearing = ((θ * 180) / Math.PI + 360) % 360;
    return bearing;
  };

  // Calculate distance between two GPS coordinates (in meters)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // GPS fallback for heading and speed
  const setupGpsTracking = () => {
    if (!('geolocation' in navigator)) {
      return;
    }

    gpsWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed: gpsSpeed, accuracy } = position.coords;
        const currentTime = Date.now();
        
        // Skip updates with poor accuracy (> 50 meters)
        if (accuracy && accuracy > 50) {
          return;
        }

        // Calculate speed from GPS (in m/s, convert to mph)
        // Only use GPS speed if moving significantly (> 2 m/s = ~4.5 mph)
        if (gpsSpeed !== null && gpsSpeed > 2) {
          const speedMph = convertSpeed.mpsToMph(gpsSpeed);
          setUserSpeed(Math.round(speedMph * 10) / 10); // Round to 1 decimal
        } else {
          setUserSpeed(0); // Stop showing speed when not moving fast enough
        }

        // Calculate bearing from movement if we have a previous position
        if (lastPositionRef.current) {
          const prev = lastPositionRef.current;
          const timeDiff = (currentTime - prev.time) / 1000; // seconds
          
          if (timeDiff > 1.0) { // Update every 1 second for better accuracy
            const distance = calculateDistance(prev.lat, prev.lon, latitude, longitude);
            
            // Only calculate bearing if moved significantly (> 10 meters)
            if (distance > 10) {
              const bearing = calculateBearing(prev.lat, prev.lon, latitude, longitude);
              lastGpsHeadingRef.current = bearing; // Store for blending with sensors
              const smoothed = smoothHeading(bearing);
              setHeading(smoothed);
              
              // Calculate speed from position change if GPS speed unavailable
              if (gpsSpeed === null || gpsSpeed < 2) {
                const speedMps = distance / timeDiff;
                const speedMph = convertSpeed.mpsToMph(speedMps);
                if (speedMph > 2) { // Only show speed if > 2 mph
                  setUserSpeed(Math.round(speedMph * 10) / 10);
                } else {
                  setUserSpeed(0);
                }
              }
              
              lastPositionRef.current = { lat: latitude, lon: longitude, time: currentTime };
            }
          }
        } else {
          lastPositionRef.current = { lat: latitude, lon: longitude, time: currentTime };
        }
      },
      (error) => {
        console.error('GPS error:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );
  };

  // Listen for screen orientation changes
  React.useEffect(() => {
    const handleOrientationChange = () => {
      const angle = getOrientationAdjustment();
      setScreenOrientation(angle);
    };
    
    // Set initial orientation
    handleOrientationChange();
    
    // Listen for orientation changes
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', handleOrientationChange);
    } else {
      // Fallback for older browsers
      window.addEventListener('orientationchange', handleOrientationChange);
    }
    
    return () => {
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', handleOrientationChange);
      } else {
        window.removeEventListener('orientationchange', handleOrientationChange);
      }
    };
  }, []);

  // Check for sensor support and request permission
  React.useEffect(() => {
    let handler: ((e: DeviceOrientationEvent) => void) | null = null;
    let motionHandler: ((e: DeviceMotionEvent) => void) | null = null;

    const setupOrientationListeners = () => {
      handler = (event: DeviceOrientationEvent) => {
        let compassHeading: number | null = null;

        // Use webkitCompassHeading (iOS Safari) if available
        // This gives true north heading (0-360) directly
        if ((event as any).webkitCompassHeading !== undefined) {
          // iOS webkitCompassHeading is already calibrated to true north
          // Apply offset and screen orientation
          compassHeading = ((event as any).webkitCompassHeading + HEADING_OFFSET - screenOrientation + 360) % 360;
        } 
        // Use alpha for Android/others with compass
        else if (event.alpha !== null && event.absolute) {
          // Android alpha: 0 = North, increases clockwise
          // Invert for counter-clockwise rotation and add 180 to correct pole orientation
          compassHeading = (180 - event.alpha + HEADING_OFFSET + 360) % 360;
        }
        // Fallback to alpha even without absolute flag
        else if (event.alpha !== null) {
          // Relative orientation - less accurate but better than nothing
          compassHeading = (180 - event.alpha + HEADING_OFFSET + 360) % 360;
        }

        if (compassHeading !== null) {
          const smoothed = smoothHeading(compassHeading);
          
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          
          animationFrameRef.current = requestAnimationFrame(() => {
            setHeading(smoothed);
          });
          
          // Just clear auto-calibration flag
          if (!manualRecalibrating) {
            setIsCalibrating(false);
          }
        } else {
          setIsCalibrating(true);
        }
      };

      motionHandler = (event: DeviceMotionEvent) => {
        // Motion handler for future speed calculation improvements
      };

      window.addEventListener('deviceorientation', handler as any, true);
      window.addEventListener('devicemotion', motionHandler as any, true);
    };

    const setupOrientation = async () => {
      // Check if DeviceOrientation API is supported
      if (!('DeviceOrientationEvent' in window)) {
        console.log('[Compass] DeviceOrientation not supported, using GPS fallback');
        setPermissionState('granted');
        setUseGpsFallback(true);
        setupGpsTracking();
        return;
      }

      // Check if permission is needed (iOS 13+ or other browsers that require it)
      const needsPermission = typeof (DeviceOrientationEvent as any).requestPermission === 'function' ||
                              typeof (DeviceMotionEvent as any).requestPermission === 'function';

      if (needsPermission && !permissionsGranted) {
        setShowPermissionPrompt(true);
        setPermissionState('prompt');
        return;
      }

      // If permissions were just granted, set up listeners
      if (needsPermission && permissionsGranted) {
        console.log('[Compass] Permissions granted, setting up listeners');
        setPermissionState('granted');
        setupOrientationListeners();
        return;
      }

      // For browsers that don't need permission, test if sensors work
      const testOrientationWorks = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 2000);
        const testHandler = (e: DeviceOrientationEvent) => {
          if (e.alpha !== null || (e as any).webkitCompassHeading !== undefined) {
            clearTimeout(timeout);
            window.removeEventListener('deviceorientation', testHandler as any);
            resolve(true);
          }
        };
        window.addEventListener('deviceorientation', testHandler as any);
      });

      const sensorWorks = await testOrientationWorks;
      
      if (!sensorWorks) {
        console.log('[Compass] Orientation sensors not responding, using GPS fallback');
        setPermissionState('granted');
        setUseGpsFallback(true);
        setupGpsTracking();
        return;
      }

      // Sensors work, set up listener
      setPermissionState('granted');
      setupOrientationListeners();
    };

    setupOrientation();

    return () => {
      if (handler) {
        window.removeEventListener('deviceorientation', handler as any, true);
      }
      if (motionHandler) {
        window.removeEventListener('devicemotion', motionHandler as any, true);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      }
    };
  }, [permissionsGranted, screenOrientation]);

  const handleRecalibrate = () => {
    setManualRecalibrating(true);
    setCalibrationComplete(false);
    calibrationStartTimeRef.current = Date.now();
    stableReadingsRef.current = 0;
    // Reset smoothing for fresh calibration
    smoothedHeadingRef.current = 0;
    
    // Auto-complete after 10 seconds
    setTimeout(() => {
      setManualRecalibrating(false);
      setCalibrationComplete(true);
      calibrationStartTimeRef.current = null;
      stableReadingsRef.current = 0;
      
      // Hide completion message after 3 seconds
      setTimeout(() => {
        setCalibrationComplete(false);
      }, 3000);
    }, 10000);
  };

  const handleRequestPermission = async () => {
    console.log('[Compass] Permission request started');
    let orientationGranted = false;
    let motionGranted = false;

    // Request DeviceOrientation permission
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        console.log('[Compass] Requesting DeviceOrientation permission…');
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        console.log('[Compass] DeviceOrientation permission result:', permission);
        orientationGranted = permission === 'granted';
      } catch (error) {
        console.error('Error requesting orientation permission:', error);
      }
    }

    // Request DeviceMotion permission
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        console.log('[Compass] Requesting DeviceMotion permission…');
        const permission = await (DeviceMotionEvent as any).requestPermission();
        console.log('[Compass] DeviceMotion permission result:', permission);
        motionGranted = permission === 'granted';
      } catch (error) {
        console.error('Error requesting motion permission:', error);
      }
    }

    if (orientationGranted || motionGranted) {
      console.log('[Compass] Permissions granted, triggering listener setup…');
      setShowPermissionPrompt(false);
      setUseGpsFallback(false);
      // Trigger the useEffect with permissionsGranted flag
      setPermissionsGranted(true);
    } else {
      console.log('[Compass] Permission denied, falling back to GPS');
      setPermissionState('denied');
      // Fall back to GPS
      setUseGpsFallback(true);
      setupGpsTracking();
    }
    
    if (onRequestPermission) {
      onRequestPermission();
    }
  };

  // Format speed display
  const getSpeedDisplay = () => {
    if (userSpeed === 0) return { value: '0.0', unit: speedUnit };
    
    let value: number;
    switch (speedUnit) {
      case 'knots':
        value = convertSpeed.mphToKnots(userSpeed);
        break;
      case 'kmh':
        value = convertSpeed.mphToKmh(userSpeed);
        break;
      default:
        value = userSpeed;
    }
    
    return { value: value.toFixed(1), unit: speedUnit };
  };

  const cycleSpeedUnit = () => {
    const units: SpeedUnit[] = ['mph', 'knots', 'kmh'];
    const currentIndex = units.indexOf(speedUnit);
    const nextIndex = (currentIndex + 1) % units.length;
    setSpeedUnit(units[nextIndex]);
  };

  // Calculate wind direction relative to device heading
  const hasWind = windDirectionDeg != null && !Number.isNaN(windDirectionDeg);
  const hasHeading = heading !== null;
  
  // Wind arrow points TO where wind is going (opposite of FROM direction)
  const windToDirection = hasWind ? (windDirectionDeg! + 180) % 360 : 0;
  
  // Wind arrow rotation relative to compass (which rotates with device)
  // Use rotationHeading for smooth continuous rotation
  const windArrowRotation = hasWind && hasHeading 
    ? windToDirection - rotationHeading
    : hasWind 
      ? windToDirection 
      : 0;

  const radius = size / 2;
  const labelRadius = radius - 22;
  const speedDisplay = getSpeedDisplay();

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Permission request UI */}
      {showPermissionPrompt && permissionState === 'prompt' && (
        <button
          onClick={handleRequestPermission}
          className="mb-2 px-6 py-3 text-sm font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors shadow-lg"
        >
          Enable Motion & Orientation
        </button>
      )}
      
      {permissionState === 'denied' && !useGpsFallback && (
        <div className="px-5 py-3 text-sm bg-red-900/50 text-red-100 font-semibold rounded-lg border-2 border-red-500/70 shadow-lg shadow-red-500/30">
          Sensor access denied. Using GPS fallback.
        </div>
      )}
      
      {permissionState === 'checking' && (
        <div className="px-5 py-3 text-sm bg-emerald-900/50 text-emerald-100 font-semibold rounded-lg border-2 border-emerald-500/70 shadow-lg shadow-emerald-500/30">
          Checking sensors...
        </div>
      )}

      {useGpsFallback && (
        <div className="px-5 py-3 text-sm bg-yellow-900/50 text-yellow-100 font-semibold rounded-lg border-2 border-yellow-500/70 shadow-lg shadow-yellow-500/30">
          📍 GPS Mode
        </div>
      )}

      {/* Info display - heading above compass */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-xl border-2 border-emerald-400/50 shadow-lg shadow-emerald-500/30">
          <div className="text-white font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-sm">
            HDG: <span className="text-emerald-400 text-base">
              {hasHeading ? `${Math.round(heading)}°` : '—'}
            </span>
          </div>
          {hasWind && (
            <div className="text-cyan-300 font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-sm">
              WIND: <span className="text-cyan-400 text-base">
                {Math.round(windToDirection)}°
              </span>
            </div>
          )}
        </div>
        {windSpeedMph != null && !Number.isNaN(windSpeedMph) && (
          <div className="text-cyan-300 font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] bg-black/70 backdrop-blur-sm px-4 py-1.5 rounded-lg border-2 border-cyan-400/50 shadow-lg shadow-cyan-500/30 text-sm">
            Wind: {windSpeedMph.toFixed(1)} mph
          </div>
        )}
      </div>

      {/* Compass */}
      <div 
        className="relative rounded-full border-4 border-emerald-400/40 bg-gradient-to-b from-slate-800/95 to-slate-950/98 shadow-2xl shadow-emerald-500/20"
        style={{ width: size, height: size }}
      >
        {/* Neon green glow ring */}
        <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-emerald-500/20 blur-xl" />
        {/* Center SVG for markers and arrows */}
        <svg
          className="absolute inset-0"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ pointerEvents: 'none' }}
        >
          {/* Degree tick marks */}
          <g transform={hasHeading ? `rotate(${-rotationHeading} ${radius} ${radius})` : ''}>
            {Array.from({ length: 36 }, (_, i) => i * 10).map((angle) => {
              const isMajor = angle % 30 === 0;
              const rad = (angle - 90) * (Math.PI / 180);
              const innerRadius = radius - (isMajor ? 18 : 9);
              const outerRadius = radius - 5;
              
              const x1 = radius + innerRadius * Math.cos(rad);
              const y1 = radius + innerRadius * Math.sin(rad);
              const x2 = radius + outerRadius * Math.cos(rad);
              const y2 = radius + outerRadius * Math.sin(rad);
              const isNorth = angle === 0;

              return (
                <line
                  key={angle}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isNorth ? "#10b981" : "white"}
                  strokeOpacity={isNorth ? 0.9 : isMajor ? 0.8 : 0.4}
                  strokeWidth={isMajor ? 3 : 2}
                />
              );
            })}
            
            {/* Direction labels - all 16 compass points */}
            {DIRECTIONS.map((direction) => {
              const rad = (direction.angle - 90) * (Math.PI / 180);
              const labelRadius = radius - 28;
              const labelX = radius + labelRadius * Math.cos(rad);
              const labelY = radius + labelRadius * Math.sin(rad);
              const isNorth = direction.angle === 0;
              const isMajor = direction.label.length === 1;

              return (
                <text
                  key={direction.label}
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isNorth ? "#10b981" : isMajor ? "white" : "rgba(255,255,255,0.7)"}
                  fontSize={isNorth ? "20" : isMajor ? "18" : "12"}
                  fontWeight="bold"
                  className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                  transform={`rotate(${rotationHeading} ${labelX} ${labelY})`}
                >
                  {direction.label}
                </text>
              );
            })}
          </g>

          {/* Wind arrow (cyan) */}
          {hasWind && (
            <g transform={`rotate(${windArrowRotation} ${radius} ${radius})`}>
              <line
                x1={radius}
                y1={radius}
                x2={radius}
                y2={radius - 50}
                stroke="#06b6d4"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.95"
              />
              <polygon
                points={`${radius},${radius - 58} ${radius - 9},${radius - 42} ${radius + 9},${radius - 42}`}
                fill="#06b6d4"
                opacity="0.95"
              />
              <rect
                x={radius - 25}
                y={radius - 75}
                width="50"
                height="16"
                fill="rgba(0, 0, 0, 0.85)"
                rx="4"
              />
              <text
                x={radius}
                y={radius - 62}
                textAnchor="middle"
                fill="#06b6d4"
                fontSize="13"
                fontWeight="bold"
                className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
              >
                WIND
              </text>
            </g>
          )}

          {/* Center dot with neon green glow */}
          <circle
            cx={radius}
            cy={radius}
            r="8"
            fill="#10b981"
            opacity="0.3"
            filter="url(#glow)"
          />
          <circle
            cx={radius}
            cy={radius}
            r="5"
            fill="#10b981"
            opacity="0.95"
          />

          {/* Glow filter */}
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Device heading pointer (red triangle) */}
          <polygon
            points={`${radius},12 ${radius - 20},45 ${radius + 20},45`}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.5"
            opacity="0.95"
          />
        </svg>

        {/* Calibration indicator - text only, smaller */}
        {(isCalibrating || manualRecalibrating) && permissionState === 'granted' && !useGpsFallback && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-full border-4 border-emerald-400/30">
            <div className="text-center text-xs font-semibold drop-shadow-lg px-4">
              <div className="mb-1 text-sm text-emerald-400">Move device in</div>
              <div className="font-bold text-base text-emerald-400">figure-8 pattern</div>
              <div className="mt-1 text-emerald-400/80 text-[10px]">to calibrate</div>
            </div>
          </div>
        )}
        
        {/* Calibration complete message */}
        {calibrationComplete && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/75 rounded-full border-4 border-emerald-400/50">
            <div className="text-center text-white font-semibold drop-shadow-lg">
              <div className="text-2xl text-emerald-400 mb-2">✓</div>
              <div className="text-base text-emerald-300">Calibration Complete</div>
            </div>
          </div>
        )}
      </div>

      {/* Speed display with unit selector */}
      <button
        onClick={cycleSpeedUnit}
        className="px-6 py-2 bg-gradient-to-r from-slate-800/95 to-slate-900/95 rounded-xl border-2 border-emerald-400/50 hover:border-emerald-400/80 hover:shadow-lg hover:shadow-emerald-500/30 transition-all backdrop-blur-sm"
      >
        <div className="text-white font-semibold text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          <span className="text-emerald-400">{speedDisplay.value}</span>
          <span className="text-base ml-2 text-white/80">{speedDisplay.unit}</span>
        </div>
      </button>
      
      {/* Recalibrate button - only show when sensors are active and not in GPS mode */}
      {permissionState === 'granted' && !useGpsFallback && !showPermissionPrompt && (
        <button
          onClick={handleRecalibrate}
          disabled={manualRecalibrating || calibrationComplete}
          className="text-emerald-400 hover:text-emerald-300 text-xs font-light tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {manualRecalibrating ? 'Calibrating...' : calibrationComplete ? 'Complete ✓' : 'Recalibrate'}
        </button>
      )}
    </div>
  );
}
