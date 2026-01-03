// src/hooks/useDeviceNav.ts
/**
 * Comprehensive device navigation hook for compass heading and GPS speed/course
 * 
 * Key features:
 * - Multi-source heading with quality scoring
 * - Proper Android alpha/beta/gamma rotation matrix math
 * - Always-on GPS for speed + course (not fallback-only)
 * - Explicit device vs travel modes
 * - Circular statistics (not linear EMA)
 * - Calibration offset persistence
 * - iOS permission gating
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

export type HeadingSource =
  | "ios-webkit"
  | "android-compass-math"
  | "absolute-orientation-sensor"
  | "gps-course"
  | "none";

export type NavMode = "device" | "travel";

interface HeadingSample {
  heading: number; // 0-360
  quality: number; // 0-1
  timestamp: number;
}

export interface UseDeviceNavResult {
  activeHeadingDeg: number | null;
  deviceHeadingDeg: number | null;
  travelCourseDeg: number | null;
  speedMph: number;
  speedMps: number;
  source: HeadingSource;
  quality: number;
  gpsAccuracyM: number | null;

  mode: NavMode;
  setMode: (m: NavMode) => void;

  autoModeEnabled: boolean;
  setAutoModeEnabled: (enabled: boolean) => void;
  baseMode: NavMode;
  setBaseMode: (m: NavMode) => void;

  offsetDeg: number;
  setOffsetDeg: (fn: (v: number) => number) => void;

  requestMotionPermission: () => Promise<"granted" | "denied" | "not-needed">;

  // Raw debug values
  rawAlpha: number | null;
  rawBeta: number | null;
  rawGamma: number | null;
  webkitAccuracy: number | null;
}

// ============================================================================
// Constants
// ============================================================================

const CALIBRATION_KEY = "compass-calibration-offset-v2";
const AUTO_MODE_KEY = "compass-auto-mode-enabled";
const BASE_MODE_KEY = "compass-base-mode";
const HEADING_BUFFER_SIZE_IOS = 15;
const HEADING_BUFFER_SIZE_ANDROID = 50; // Larger for much smoother Android rotation
const SPEED_BUFFER_SIZE = 6;
const AUTO_MODE_SPEED_THRESHOLD = 2.5; // mph
const GPS_MIN_ACCURACY_M = 50;
const GPS_MIN_DISTANCE_M = 5;
const GPS_MIN_INTERVAL_S = 0.8;
const GPS_MAX_INTERVAL_S = 5.0;
const COURSE_FLIP_THRESHOLD_DEG = 150; // Detect sudden ~180° flips
const SPEED_DECAY_TIMEOUT_MS = 5000; // Decay speed to 0 after 5s no update
const MIN_SPEED_FOR_COURSE_MPS = 0.5; // ~1.1 mph

// ============================================================================
// Math Utilities
// ============================================================================

const deg2rad = (deg: number): number => (deg * Math.PI) / 180;
const rad2deg = (rad: number): number => (rad * 180) / Math.PI;

const normalizeAngle = (angle: number): number => {
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
};

const angularDifference = (a: number, b: number): number => {
  let diff = a - b;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return diff;
};

/**
 * Circular mean of angles with quality weighting
 * Uses sin/cos method, NOT linear averaging
 */
const circularMean = (samples: HeadingSample[]): number => {
  if (samples.length === 0) return 0;

  let sumSin = 0;
  let sumCos = 0;
  let totalWeight = 0;

  for (const sample of samples) {
    const weight = sample.quality;
    const rad = deg2rad(sample.heading);
    sumSin += Math.sin(rad) * weight;
    sumCos += Math.cos(rad) * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return samples[samples.length - 1].heading;

  const meanRad = Math.atan2(sumSin / totalWeight, sumCos / totalWeight);
  return normalizeAngle(rad2deg(meanRad));
};

/**
 * Haversine distance in meters
 */
const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3;
  const φ1 = deg2rad(lat1);
  const φ2 = deg2rad(lat2);
  const Δφ = deg2rad(lat2 - lat1);
  const Δλ = deg2rad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Bearing from point1 to point2
 */
const calculateBearing = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const φ1 = deg2rad(lat1);
  const φ2 = deg2rad(lat2);
  const Δλ = deg2rad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return normalizeAngle(rad2deg(Math.atan2(y, x)));
};

/**
 * Android compass heading from alpha/beta/gamma using rotation matrices
 * 
 * Corrected formula to fix 180° pole flip issue.
 * The heading represents the direction the TOP of the device points to.
 * 
 * Reference: https://www.w3.org/TR/orientation-event/
 */
const computeAndroidCompassHeading = (
  alpha: number,
  beta: number,
  gamma: number,
  screenOrientation: number
): number => {
  // Convert to radians
  const alphaRad = deg2rad(alpha);
  const betaRad = deg2rad(beta);
  const gammaRad = deg2rad(gamma);

  // Rotation matrix calculations
  const cA = Math.cos(alphaRad);
  const sA = Math.sin(alphaRad);
  const cB = Math.cos(betaRad);
  const sB = Math.sin(betaRad);
  const cG = Math.cos(gammaRad);
  const sG = Math.sin(gammaRad);

  // Compute compass heading using corrected rotation matrix projection
  // This projects the device's forward direction onto the horizontal plane
  // Sign correction to fix 180° flip
  const heading = Math.atan2(
    cB * sA + sB * sG * cA,  // Corrected signs for proper pole orientation
    cB * cA - sB * sG * sA
  );

  // Negate for correct compass rose rotation
  // When device turns clockwise, compass rose rotates counterclockwise
  let headingDeg = -rad2deg(heading);

  // Adjust for screen orientation
  headingDeg -= screenOrientation;

  return normalizeAngle(headingDeg);
};

const getScreenOrientation = (): number => {
  if (typeof window === "undefined") return 0;
  
  // Prefer Screen Orientation API
  if (window.screen?.orientation?.angle !== undefined) {
    return window.screen.orientation.angle;
  }
  
  // Fallback to deprecated window.orientation
  if (typeof window.orientation === "number") {
    return window.orientation;
  }
  
  return 0;
};

const isIOS = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

// ============================================================================
// Main Hook
// ============================================================================

export function useDeviceNav(): UseDeviceNavResult {
  // State
  const [deviceHeadingDeg, setDeviceHeadingDeg] = useState<number | null>(null);
  const [travelCourseDeg, setTravelCourseDeg] = useState<number | null>(null);
  const [speedMps, setSpeedMps] = useState<number>(0);
  const [speedMph, setSpeedMph] = useState<number>(0);
  const [source, setSource] = useState<HeadingSource>("none");
  const [quality, setQuality] = useState<number>(0);
  const [gpsAccuracyM, setGpsAccuracyM] = useState<number | null>(null);
  const [mode, setMode] = useState<NavMode>("device");
  const [autoModeEnabled, setAutoModeEnabled] = useState<boolean>(false);
  const [baseMode, setBaseMode] = useState<NavMode>("device");
  const [offsetDeg, setOffsetDeg] = useState<number>(0);

  // Raw debug values
  const [rawAlpha, setRawAlpha] = useState<number | null>(null);
  const [rawBeta, setRawBeta] = useState<number | null>(null);
  const [rawGamma, setRawGamma] = useState<number | null>(null);
  const [webkitAccuracy, setWebkitAccuracy] = useState<number | null>(null);

  // Refs
  const headingBufferRef = useRef<HeadingSample[]>([]);
  const speedBufferRef = useRef<number[]>([]);
  const gpsWatchIdRef = useRef<number | null>(null);
  const lastGpsRef = useRef<{
    lat: number;
    lon: number;
    time: number;
    course: number | null;
  } | null>(null);
  const lastSpeedUpdateRef = useRef<number>(0);
  const lastCourseRef = useRef<number | null>(null);
  const absoluteOrientationSensorRef = useRef<any>(null);
  const motionPermissionGranted = useRef<boolean>(false);

  // Load persisted calibration offset and auto mode settings
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(CALIBRATION_KEY);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) setOffsetDeg(parsed);
    }

    const savedAutoMode = localStorage.getItem(AUTO_MODE_KEY);
    if (savedAutoMode === "true") setAutoModeEnabled(true);

    const savedBaseMode = localStorage.getItem(BASE_MODE_KEY) as NavMode | null;
    if (savedBaseMode === "device" || savedBaseMode === "travel") {
      setBaseMode(savedBaseMode);
    }
  }, []);

  // Save calibration offset
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(CALIBRATION_KEY, offsetDeg.toString());
  }, [offsetDeg]);

  // Save auto mode and base mode settings
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(AUTO_MODE_KEY, autoModeEnabled.toString());
  }, [autoModeEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(BASE_MODE_KEY, baseMode);
  }, [baseMode]);

  // ============================================================================
  // GPS Tracking (Always-On for Speed + Course)
  // ============================================================================

  const setupGPS = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      return;
    }

    if (gpsWatchIdRef.current !== null) {
      return; // Already running
    }

    gpsWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, heading, accuracy } = position.coords;
        const now = Date.now();

        setGpsAccuracyM(accuracy || null);

        // Handle speed
        let currentSpeedMps: number | null = null;

        if (speed !== null && speed >= 0) {
          // Use GPS-provided speed
          currentSpeedMps = speed;
        } else if (lastGpsRef.current) {
          // Compute speed from position change
          const prev = lastGpsRef.current;
          const dt = (now - prev.time) / 1000;
          const distance = haversineDistance(prev.lat, prev.lon, latitude, longitude);

          if (dt >= GPS_MIN_INTERVAL_S && dt <= GPS_MAX_INTERVAL_S && distance >= GPS_MIN_DISTANCE_M) {
            currentSpeedMps = distance / dt;
          }
        }

        // Update speed buffers and state
        if (currentSpeedMps !== null) {
          speedBufferRef.current.push(currentSpeedMps);
          if (speedBufferRef.current.length > SPEED_BUFFER_SIZE) {
            speedBufferRef.current.shift();
          }

          // Median filter to remove spikes
          const sorted = [...speedBufferRef.current].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];

          setSpeedMps(median);
          setSpeedMph(median * 2.23694);
          lastSpeedUpdateRef.current = now;
        }

        // Handle course (travel direction)
        let currentCourse: number | null = null;

        if (accuracy && accuracy < GPS_MIN_ACCURACY_M) {
          const effectiveSpeed = speedMps;

          if (heading !== null && heading >= 0 && effectiveSpeed > MIN_SPEED_FOR_COURSE_MPS) {
            // Use GPS-provided heading
            currentCourse = heading;
          } else if (lastGpsRef.current && effectiveSpeed > MIN_SPEED_FOR_COURSE_MPS) {
            // Compute bearing from movement
            const prev = lastGpsRef.current;
            const dt = (now - prev.time) / 1000;
            const distance = haversineDistance(prev.lat, prev.lon, latitude, longitude);

            if (
              dt >= GPS_MIN_INTERVAL_S &&
              dt <= GPS_MAX_INTERVAL_S &&
              distance >= GPS_MIN_DISTANCE_M
            ) {
              const bearing = calculateBearing(prev.lat, prev.lon, latitude, longitude);

              // Flip detection: reject sudden ~180° jumps
              if (lastCourseRef.current !== null) {
                const diff = Math.abs(angularDifference(bearing, lastCourseRef.current));
                if (diff > COURSE_FLIP_THRESHOLD_DEG && accuracy < 20) {
                  // Likely reversed/noisy, skip
                  console.warn("[useDeviceNav] Rejected flipped course:", bearing);
                } else {
                  currentCourse = bearing;
                }
              } else {
                currentCourse = bearing;
              }
            }
          }
        }

        if (currentCourse !== null) {
          lastCourseRef.current = currentCourse;
          setTravelCourseDeg(currentCourse);
        }

        // Store position for next update
        lastGpsRef.current = {
          lat: latitude,
          lon: longitude,
          time: now,
          course: currentCourse,
        };
      },
      (error) => {
        console.error("[useDeviceNav] GPS error:", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 250,
        timeout: 10000,
      }
    );

    console.log("[useDeviceNav] GPS tracking started");
  }, [speedMps]);

  // Decay speed to 0 if no updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastSpeedUpdateRef.current > 0) {
        const elapsed = Date.now() - lastSpeedUpdateRef.current;
        if (elapsed > SPEED_DECAY_TIMEOUT_MS) {
          setSpeedMps(0);
          setSpeedMph(0);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ============================================================================
  // Sensor Setup
  // ============================================================================

  const addHeadingSample = useCallback(
    (heading: number, qual: number, src: HeadingSource) => {
      const sample: HeadingSample = {
        heading,
        quality: qual,
        timestamp: Date.now(),
      };

      headingBufferRef.current.push(sample);
      // Use larger buffer on Android for smoother rotation
      const maxSize = isIOS() ? HEADING_BUFFER_SIZE_IOS : HEADING_BUFFER_SIZE_ANDROID;
      if (headingBufferRef.current.length > maxSize) {
        headingBufferRef.current.shift();
      }

      const mean = circularMean(headingBufferRef.current);
      const calibrated = normalizeAngle(mean + offsetDeg);

      setDeviceHeadingDeg(calibrated);
      setSource(src);
      setQuality(qual);
    },
    [offsetDeg]
  );

  // Setup AbsoluteOrientationSensor (Tier A on Android if available)
  const setupAbsoluteOrientationSensor = useCallback(() => {
    if (typeof window === "undefined" || !("AbsoluteOrientationSensor" in window)) {
      return false;
    }

    try {
      // @ts-ignore
      const sensor = new AbsoluteOrientationSensor({ frequency: 8 });

      sensor.addEventListener("reading", () => {
        const quat = sensor.quaternion;
        if (!quat || quat.length < 4) return;

        const [x, y, z, w] = quat;
        const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
        const heading = normalizeAngle(rad2deg(yaw));

        addHeadingSample(heading, 0.9, "absolute-orientation-sensor");
      });

      sensor.addEventListener("error", (event: any) => {
        console.error("[useDeviceNav] AbsoluteOrientationSensor error:", event.error);
      });

      sensor.start();
      absoluteOrientationSensorRef.current = sensor;
      console.log("[useDeviceNav] AbsoluteOrientationSensor started");
      return true;
    } catch (error) {
      console.error("[useDeviceNav] AbsoluteOrientationSensor failed:", error);
      return false;
    }
  }, [addHeadingSample]);

  // Setup deviceorientation (iOS webkit or Android compass math)
  const setupDeviceOrientation = useCallback(() => {
    const handler = (event: DeviceOrientationEvent) => {
      const { alpha, beta, gamma, absolute } = event;

      setRawAlpha(alpha);
      setRawBeta(beta);
      setRawGamma(gamma);

      // iOS Safari: webkitCompassHeading (TIER A)
      if ((event as any).webkitCompassHeading !== undefined) {
        const heading = (event as any).webkitCompassHeading;
        const accuracy = (event as any).webkitCompassAccuracy;

        setWebkitAccuracy(accuracy);

        // Quality from accuracy
        let qual = 0.8;
        if (accuracy !== undefined) {
          if (accuracy < 0) qual = 0.3;
          else if (accuracy <= 15) qual = 0.95;
          else if (accuracy <= 30) qual = 0.8;
          else if (accuracy <= 50) qual = 0.6;
          else qual = 0.4;
        }

        // webkitCompassHeading is already correct - use as is
        addHeadingSample(heading, qual, "ios-webkit");
        return;
      }

      // Android: Use rotation matrix math
      if (alpha !== null && beta !== null && gamma !== null) {
        const screenOrientation = getScreenOrientation();
        const heading = computeAndroidCompassHeading(alpha, beta, gamma, screenOrientation);

        // Quality based on absolute flag and sensor stability
        let qual = 0.7;
        if (absolute === true) {
          qual = 0.85; // Higher quality for absolute orientation
        } else {
          qual = 0.5; // Lower for relative
        }

        // Reduce quality if beta/gamma are at extremes (unreliable)
        if (Math.abs(beta) > 75 || Math.abs(gamma) > 75) {
          qual *= 0.5;
        }

        addHeadingSample(heading, qual, "android-compass-math");
        return;
      }

      // Fallback: alpha-only (lowest quality)
      if (alpha !== null) {
        // Use alpha directly, but mark as very low quality
        const heading = normalizeAngle(alpha);
        addHeadingSample(heading, 0.3, "android-compass-math");
      }
    };

    window.addEventListener("deviceorientation", handler, true);
    return () => window.removeEventListener("deviceorientation", handler, true);
  }, [addHeadingSample]);

  // Request motion permission (iOS 13+)
  const requestMotionPermission = useCallback(async (): Promise<
    "granted" | "denied" | "not-needed"
  > => {
    if (typeof window === "undefined") return "not-needed";

    if (typeof (DeviceOrientationEvent as any).requestPermission !== "function") {
      motionPermissionGranted.current = true;
      return "not-needed";
    }

    try {
      const permission = await (DeviceOrientationEvent as any).requestPermission();
      if (permission === "granted") {
        motionPermissionGranted.current = true;
        console.log("[useDeviceNav] Motion permission granted, sensors will initialize");
        return "granted";
      }
      console.warn("[useDeviceNav] Motion permission denied");
      return "denied";
    } catch (error) {
      console.error("[useDeviceNav] Permission request failed:", error);
      return "denied";
    }
  }, []);

  // Main sensor setup effect
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cleanupOrientation: (() => void) | null = null;

    const setup = async () => {
      // Check if we need permission
      const needsPermission =
        typeof (DeviceOrientationEvent as any).requestPermission === "function";

      if (needsPermission && !motionPermissionGranted.current) {
        // Don't auto-request, wait for user action
        return;
      }

      // Try sensors
      const sensorStarted = setupAbsoluteOrientationSensor();
      cleanupOrientation = setupDeviceOrientation();

      console.log(
        `[useDeviceNav] Sensors active: ${sensorStarted ? "AbsoluteOrientationSensor + " : ""}deviceorientation`
      );
    };

    setup();

    return () => {
      if (cleanupOrientation) cleanupOrientation();
      if (absoluteOrientationSensorRef.current) {
        try {
          absoluteOrientationSensorRef.current.stop();
        } catch (e) {}
        absoluteOrientationSensorRef.current = null;
      }
    };
  }, [setupAbsoluteOrientationSensor, setupDeviceOrientation, motionPermissionGranted.current]);

  // GPS setup effect
  useEffect(() => {
    setupGPS();

    return () => {
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }
    };
  }, [setupGPS]);

  // ============================================================================
  // Active Heading (Device or Travel based on mode + Auto mode logic)
  // ============================================================================

  // Auto mode: automatically switches to travel when speed > threshold
  let effectiveMode = mode;
  if (autoModeEnabled) {
    if (speedMph > AUTO_MODE_SPEED_THRESHOLD && gpsAccuracyM !== null && gpsAccuracyM < 50) {
      effectiveMode = "travel";
    } else {
      effectiveMode = baseMode;
    }
  }

  // Travel mode: remember last course when stopped (don't set to null)
  const activeHeadingDeg =
    effectiveMode === "travel"
      ? travelCourseDeg // Use last known course even when stopped
      : deviceHeadingDeg;

  return {
    activeHeadingDeg,
    deviceHeadingDeg,
    travelCourseDeg,
    speedMph,
    speedMps,
    source,
    quality,
    gpsAccuracyM,

    mode,
    setMode,

    autoModeEnabled,
    setAutoModeEnabled,
    baseMode,
    setBaseMode,

    offsetDeg,
    setOffsetDeg,

    requestMotionPermission,

    rawAlpha,
    rawBeta,
    rawGamma,
    webkitAccuracy,
  };
}
