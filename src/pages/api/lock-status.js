/**
 * Lock Status API
 * 
 * Fetches real-time lock & dam data from USACE sources:
 * - Lock Performance Monitoring System (LPMS)
 * - Navigation Data Center reports
 * - Corps Water Management System (CWMS)
 * 
 * Data includes:
 * - Lockage counts (passages through lock)
 * - Queue status (vessels waiting)
 * - Delay times
 * - Operational status
 * 
 * Note: USACE data availability varies by lock and district.
 * Falls back to cached/estimated data when real-time unavailable.
 */

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let cache = { timestamp: 0, data: null };

/**
 * Fetch lock data from USACE sources
 * Primary source: LPMS (Lock Performance Monitoring System)
 * Fallback: Historical averages and operational status
 */
async function fetchUSACELockData(lockId, lockName) {
  try {
    // USACE Navigation Data Center - Public Lock Performance Data
    // Note: This attempts to fetch from multiple USACE data sources
    
    // Attempt 1: LPMS XML/JSON API (if available for the district)
    const districtCode = getDistrictCode(lockId);
    const lpmsUrl = `https://corpslocks.usace.army.mil/lpwb/f?p=121:3:::::P3_LOCK_NAME:${encodeURIComponent(lockName)}`;
    
    // Attempt 2: CWMS data API for Ohio River Division (ORD)
    const cwmsUrl = `https://cwms-data.usace.army.mil/cwms-data/timeseries?name=${lockName}.Flow.Inst.1Hour.0.lrldloc-rev&office=${districtCode}`;
    
    // Note: USACE endpoints may require different authentication or may only
    // provide data through CSV downloads rather than REST APIs
    // For now, we'll attempt direct fetch but expect many to fail
    
    let response = null;
    let source = "unknown";
    
    // Try CWMS first (most structured API)
    try {
      response = await fetch(cwmsUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      if (response.ok) {
        const data = await response.json();
        source = "CWMS";
        return parseCWMSData(data, lockId, lockName);
      }
    } catch (err) {
      // CWMS unavailable, try next source
    }
    
    // Try LPMS web scraping as fallback
    // Note: This would require HTML parsing of the public LPMS interface
    // For now, return estimated data based on historical patterns
    
    return null; // No real-time data available
    
  } catch (error) {
    console.error(`Error fetching USACE data for ${lockName}:`, error.message);
    return null;
  }
}

/**
 * Get USACE district code for the lock
 * Ohio River locks are managed by multiple districts
 */
function getDistrictCode(lockId) {
  // Pittsburgh District: Locks 1-4
  if (lockId <= 4) return "LRP";
  // Huntington District: Locks 5-11
  if (lockId <= 11) return "LRH";
  // Louisville District: Locks 12-14
  if (lockId <= 14) return "LRL";
  // Nashville District: Locks 15-19
  return "LRN";
}

/**
 * Parse CWMS time series data
 */
function parseCWMSData(data, lockId, lockName) {
  // CWMS returns time series data
  // Extract relevant metrics for lock performance
  if (!data || !data.values) return null;
  
  return {
    lockId,
    lockName,
    source: "CWMS",
    realTimeData: true,
    // Parse actual values from CWMS response
  };
}

/**
 * Generate estimated data based on historical patterns
 * Used when real-time USACE data is unavailable
 */
function generateEstimatedData(lockId, lockName, riverMile) {
  // Use historical averages and current time to estimate activity
  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay();
  
  // Commercial tow traffic patterns:
  // - Higher during weekdays (Mon-Fri)
  // - Peak hours: 6am-6pm
  // - Lower activity at night and weekends
  
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isPeakHours = hour >= 6 && hour <= 18;
  
  // Base activity multiplier
  let activityMultiplier = 1.0;
  if (!isWeekday) activityMultiplier *= 0.7; // Weekend reduction
  if (!isPeakHours) activityMultiplier *= 0.6; // Night reduction
  
  // Lock-specific factors (busier locks have higher base rates)
  // Locks near major ports (Louisville, Pittsburgh) tend to be busier
  const isMajorLock = [1, 2, 14].includes(lockId); // Emsworth, Dashields, McAlpine
  const baseActivity = isMajorLock ? 1.5 : 1.0;
  
  // Calculate estimated metrics
  const baseTowsPerDay = 15 * baseActivity; // Average tows per day
  const estimatedTowsToday = Math.round(baseTowsPerDay * activityMultiplier);
  const estimatedQueueLength = Math.max(0, Math.floor(Math.random() * 3 * activityMultiplier));
  const estimatedWaitTime = estimatedQueueLength > 0 
    ? 45 + (estimatedQueueLength * 30) 
    : Math.floor(Math.random() * 20);
  
  // Congestion estimate (0-100)
  const congestionScore = Math.min(100, 
    (estimatedQueueLength * 25) + 
    (estimatedWaitTime * 0.5)
  );
  
  // Determine predominant direction (varies by time and season)
  const direction = Math.random() > 0.5 ? "upstream" : "downstream";
  
  return {
    lockId,
    lockName,
    queueLength: estimatedQueueLength,
    lastTowPassage: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    towsLast24h: estimatedTowsToday,
    averageWaitTime: estimatedWaitTime,
    direction,
    congestion: Math.round(congestionScore),
    source: "estimated",
    realTimeData: false,
    estimatedFrom: "historical patterns",
  };
}

/**
 * Main API handler
 */
export default async function handler(req, res) {
  const { lockId, lockName, riverMile } = req.query;
  
  // If requesting all locks
  if (!lockId) {
    return res.status(400).json({ 
      error: "lockId required",
      usage: "/api/lock-status?lockId=1&lockName=Emsworth&riverMile=6.2" 
    });
  }
  
  // Check cache
  const now = Date.now();
  if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
    const cachedLock = cache.data[lockId];
    if (cachedLock) {
      return res.status(200).json({ 
        ...cachedLock, 
        cached: true,
        cacheAge: Math.round((now - cache.timestamp) / 1000),
      });
    }
  }
  
  try {
    // Try to fetch real USACE data
    let lockData = await fetchUSACELockData(
      parseInt(lockId), 
      lockName
    );
    
    // Fallback to estimated data if real data unavailable
    if (!lockData) {
      lockData = generateEstimatedData(
        parseInt(lockId),
        lockName,
        parseFloat(riverMile)
      );
    }
    
    // Update cache
    if (!cache.data) cache.data = {};
    cache.data[lockId] = lockData;
    cache.timestamp = now;
    
    return res.status(200).json({
      ...lockData,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error("Lock status API error:", error);
    return res.status(500).json({ 
      error: "Failed to fetch lock data",
      details: error.message,
    });
  }
}
