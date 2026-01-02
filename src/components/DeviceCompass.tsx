// src/components/DeviceCompass.tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import { useDeviceHeading } from "@/hooks/useDeviceHeading";

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
};

/**
 * Device-orientation compass that uses multi-source heading strategy.
 * Features GPS fusion, circular mean smoothing, and per-device calibration.
 * Shows both device heading and wind direction (cyan arrow).
 */
export function DeviceCompass({ 
  windDirectionDeg, 
  windSpeedMph,
  size = 160,
  onRequestPermission
}: DeviceCompassProps) {
  // Use the new multi-source heading hook
  const {
    headingDeg,
    source,
    quality,
    speedMph,
    offsetDeg,
    setOffsetDeg,
    permissionState,
    requestPermission,
  } = useDeviceHeading();

  const [speedUnit, setSpeedUnit] = React.useState<SpeedUnit>('mph');
  const [showDebug, setShowDebug] = React.useState(false);
  const rotationHeadingRef = React.useRef<number>(0);
  const smoothingFactorRef = React.useRef<number>(1.0);

  // Smooth rotation for continuous compass movement (handle 359° → 0° wrap)
  React.useEffect(() => {
    if (headingDeg === null) return;
    
    const current = rotationHeadingRef.current;
    let target = headingDeg;
    let diff = target - (current % 360);
    
    // Take shortest angular path
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    
    // Adaptive smoothing: higher quality = faster response, lower quality = more smoothing
    // This helps on Android where quality varies
    let smoothingFactor = 1.0;
    if (quality < 0.5) {
      smoothingFactor = 0.3; // Heavy smoothing for poor quality
    } else if (quality < 0.7) {
      smoothingFactor = 0.5; // Medium smoothing
    } else {
      smoothingFactor = 0.8; // Light smoothing for good quality
    }
    smoothingFactorRef.current = smoothingFactor;
    
    // Apply smoothed rotation
    rotationHeadingRef.current = current + diff * smoothingFactor;
  }, [headingDeg, quality]);

  const handleRequestPermission = async () => {
    await requestPermission();
    if (onRequestPermission) {
      onRequestPermission();
    }
  };

  // Format speed display
  const getSpeedDisplay = () => {
    if (speedMph === 0) return { value: '0.0', unit: speedUnit };
    
    let value: number;
    switch (speedUnit) {
      case 'knots':
        value = convertSpeed.mphToKnots(speedMph);
        break;
      case 'kmh':
        value = convertSpeed.mphToKmh(speedMph);
        break;
      default:
        value = speedMph;
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
  const hasHeading = headingDeg !== null;
  
  // Wind arrow points TO where wind is going (opposite of FROM direction)
  const windToDirection = hasWind ? (windDirectionDeg! + 180) % 360 : 0;
  
  // Wind arrow rotation relative to compass (which rotates with device)
  const rotationHeading = rotationHeadingRef.current;
  const windArrowRotation = hasWind && hasHeading 
    ? windToDirection - rotationHeading
    : hasWind 
      ? windToDirection 
      : 0;

  const radius = size / 2;
  const speedDisplay = getSpeedDisplay();

  // Source display names
  const sourceDisplayName = {
    'ios-webkit': 'iOS Compass',
    'absolute-orientation-sensor': 'Abs Orient Sensor',
    'deviceorientationabsolute': 'Device Orient (Abs)',
    'deviceorientation': 'Device Orient',
    'gps': 'GPS Course',
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Permission request UI */}
      {permissionState === 'prompt' && (
        <button
          onClick={handleRequestPermission}
          className="mb-2 px-6 py-3 text-sm font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors shadow-lg"
        >
          Enable Motion & Orientation
        </button>
      )}
      
      {permissionState === 'denied' && (
        <div className="px-5 py-3 text-sm bg-red-900/50 text-red-100 font-semibold rounded-lg border-2 border-red-500/70 shadow-lg shadow-red-500/30">
          Sensor access denied. Using GPS fallback.
        </div>
      )}
      
      {permissionState === 'checking' && (
        <div className="px-5 py-3 text-sm bg-emerald-900/50 text-emerald-100 font-semibold rounded-lg border-2 border-emerald-500/70 shadow-lg shadow-emerald-500/30">
          Checking sensors...
        </div>
      )}

      {/* Info display - heading above compass */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-xl border-2 border-emerald-400/50 shadow-lg shadow-emerald-500/30">
          <div className="text-white font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-sm">
            HDG: <span className="text-emerald-400 text-base">
              {hasHeading ? `${Math.round(headingDeg)}°` : '—'}
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

      {/* Debug info toggle */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="text-xs text-white/50 hover:text-white/80 transition-colors"
      >
        {showDebug ? '▲ Hide Debug' : '▼ Show Debug'}
      </button>

      {/* Debug information panel */}
      {showDebug && source && (
        <div className="bg-black/80 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/20 text-xs font-mono space-y-1">
          <div className="text-white/70">
            Source: <span className="text-emerald-400">{sourceDisplayName[source] || source}</span>
          </div>
          <div className="text-white/70">
            Quality: <span className="text-emerald-400">{(quality * 100).toFixed(0)}%</span>
          </div>
          <div className="text-white/70">
            Speed: <span className="text-emerald-400">{speedMph.toFixed(1)} mph</span>
          </div>
          <div className="text-white/70">
            Offset: <span className="text-emerald-400">{offsetDeg.toFixed(0)}°</span>
          </div>
        </div>
      )}

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
            
            {/* Direction labels - 16 compass points */}
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

      {/* Calibration controls */}
      {permissionState === 'granted' && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-white/60 text-xs font-semibold tracking-wide">
            CALIBRATION OFFSET: {offsetDeg.toFixed(0)}°
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffsetDeg(prev => prev - 1)}
              className="px-3 py-1.5 bg-slate-700/80 hover:bg-slate-600/80 text-white rounded-lg text-sm font-semibold transition-colors border border-white/20"
            >
              -1°
            </button>
            <button
              onClick={() => setOffsetDeg(() => 0)}
              className="px-4 py-1.5 bg-emerald-700/80 hover:bg-emerald-600/80 text-white rounded-lg text-sm font-semibold transition-colors border border-emerald-400/30"
            >
              Reset
            </button>
            <button
              onClick={() => setOffsetDeg(prev => prev + 1)}
              className="px-3 py-1.5 bg-slate-700/80 hover:bg-slate-600/80 text-white rounded-lg text-sm font-semibold transition-colors border border-white/20"
            >
              +1°
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
