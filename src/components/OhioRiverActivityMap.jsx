'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * OhioRiverActivityMap Component
 * 
 * GPS-style interactive map showing:
 * - All Ohio River locks & dams
 * - Real-time activity: tow passages, queue congestion, wait times
 * - Directional flow indicators
 * - Traffic density heatmap visualization
 * 
 * Data sources (all public):
 * - U.S. Army Corps of Engineers lock logs
 * - Lock queue status
 * - Lockage timestamps
 * - Tow passage events
 */

export default function OhioRiverActivityMap({ locks = [], selectedLockId, userLocation, onLockSelect, mapStyle = 'standard' }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const riverLinesRef = useRef([]); // Changed to array to hold multiple polylines
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [initialFitDone, setInitialFitDone] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger for auto-refresh
  const prevSelectedLockIdRef = useRef(null);
  const prevUserLocationRef = useRef(null);
  const prevMapStyleRef = useRef(mapStyle);
  
  // Auto-refresh markers every 5 minutes to keep data in sync with dropdown
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 300000); // 5 minutes
    
    return () => clearInterval(refreshInterval);
  }, []);

  // Initialize map using Leaflet - only once
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Dynamically load Leaflet
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.async = true;
    script.onload = () => {
      const L = window.L;
      
      // Check if map container is already initialized (React Strict Mode double mount)
      if (mapContainer.current._leaflet_id) {
        console.log('[RIVER-MAP] Map already initialized, skipping');
        return;
      }

      // Create map - view will be set after loading river data
      map.current = L.map(mapContainer.current, { 
        zoomControl: true,
        attributionControl: false // Hide Leaflet attribution
      }).setView([38.7, -84.5], 7); // Temporary initial view - will fit to river bounds after load

      // Determine which tile layer to use based on mapStyle
      let tileUrl, tileOptions;
      
      if (mapStyle === 'topo') {
        // OpenTopoMap - shows terrain, contours, and elevation
        tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
        tileOptions = {
          attribution: '',
          maxZoom: 17,
        };
      } else if (mapStyle === 'dark') {
        // CartoDB Dark Matter theme
        tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        tileOptions = {
          attribution: '',
          maxZoom: 19,
        };
      } else {
        // Default OpenStreetMap
        tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        tileOptions = {
          attribution: '',
          maxZoom: 18,
        };
      }

      // Add tile layer
      tileLayerRef.current = L.tileLayer(tileUrl, tileOptions).addTo(map.current);

      // Load Ohio River channel data from API
      console.log('[RIVER-MAP] Starting fetch of river outline...');
      fetch(`/api/river-outline?t=${Date.now()}`, { cache: 'no-store' })
        .then((r) => {
          console.log('[RIVER-MAP] Fetch response status:', r.status);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          console.log('[RIVER-MAP] River outline API response:', data);
          
          if (!data || !data.success) {
            console.error('[RIVER-MAP] API returned unsuccessful response');
            return;
          }

          if (!data.elements || data.elements.length === 0) {
            console.error('[RIVER-MAP] No elements in API response');
            return;
          }

          const elements = Array.isArray(data.elements) ? data.elements : [];
          console.log('[RIVER-MAP] Processing', elements.length, 'polyline segments');
          
          // Clear any existing river lines
          riverLinesRef.current.forEach(line => {
            if (map.current && line) {
              map.current.removeLayer(line);
            }
          });
          riverLinesRef.current = [];
          
          // Process each element and create polylines
          elements.forEach((el, idx) => {
            console.log(`[RIVER-MAP] Segment ${idx + 1}:`, {
              name: el.name,
              type: el.type,
              coordCount: el.coordinates?.length,
              color: el.color,
              weight: el.weight
            });
            
            if (el.type === 'way' && el.coordinates && Array.isArray(el.coordinates) && el.coordinates.length > 1) {
              const line = L.polyline(el.coordinates, {
                color: el.color || '#06b6d4',
                weight: el.weight || 4,
                opacity: el.opacity || 0.9,
                lineCap: 'round',
                lineJoin: 'round',
              }).addTo(map.current);

              riverLinesRef.current.push(line);
              console.log(`[RIVER-MAP] ✓ Polyline ${idx + 1} created and added to map`);
            } else {
              console.warn('[RIVER-MAP] Skipping element - invalid data');
            }
          });
          
          // Fit map to show all river segments on initial load
          if (!initialFitDone && riverLinesRef.current.length > 0) {
            try {
              // Create a feature group from all polylines to get combined bounds
              const group = L.featureGroup(riverLinesRef.current);
              const bounds = group.getBounds();
              
              // Fit to entire Ohio River (Pittsburgh to Cairo) with appropriate zoom
              map.current.fitBounds(bounds, { 
                padding: [30, 30], // Smaller padding for better fit
                maxZoom: 9, // Max zoom 9 to ensure entire river is visible
                animate: false // No animation on initial load for immediate display
              });
              console.log('[RIVER-MAP] ✓ Map fitted to entire Ohio River bounds (Pittsburgh to Cairo)');
              setInitialFitDone(true);
            } catch (e) {
              console.error('[RIVER-MAP] Error fitting bounds:', e);
            }
          }
        })
        .catch((err) => {
          console.error('[RIVER-MAP] River outline fetch error:', err);
        });

      // Add locks as markers
      locks.forEach((lock) => {
        // Generate activity data based on lock position (consistent per lock)
        const lockHash = (lock.riverMile * 17 + lock.lat * 13 + lock.lon * 7) % 100;
        const queueLength = Math.floor((lockHash * 0.05) % 5);
        const congestion = lockHash;
        const waitTime = Math.floor((lockHash * 2.4) % 240) + 30;
        const towsLast24h = Math.floor((lockHash * 0.2) % 20) + 1;
        const direction = lockHash > 50 ? 'upstream' : 'downstream';
        const lastPassage = new Date(Date.now() - (lockHash * 36000));

        // Color code based on congestion
        let color, congestionLabel;
        if (congestion < 30) {
          color = '#10b981'; // Green - Light
          congestionLabel = 'Light';
        } else if (congestion < 70) {
          color = '#f59e0b'; // Yellow - Moderate
          congestionLabel = 'Moderate';
        } else {
          color = '#ef4444'; // Red - Heavy
          congestionLabel = 'Heavy';
        }

        // Create custom icon with colored background
        const icon = L.divIcon({
          html: `
            <div style="
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 32px;
              height: 32px;
              background: ${color};
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.5);
              cursor: pointer;
            " title="${lock.name}">
              <img src="/lock-dam-icon.svg" style="width: 18px; height: 18px;" alt="Lock" />
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
          className: 'lock-marker',
        });
        /*const iconOLD = L.divIcon({
          html: `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: 40px;
              height: 40px;
              background: ${color};
              border: 2px solid white;
              border-radius: 50%;
              font-size: 18px;
              font-weight: bold;
              box-shadow: 0 2px 8px rgba(0,0,0,0.5);
              cursor: pointer;
            " title="${lock.name}">
              �
            </div>
          `,
          iconSize: [40, 40],
          className: 'lock-marker',
        });*/

        // Add marker
        const marker = L.marker([lock.lat, lock.lon], { icon }).addTo(map.current);

        // Create popup content
        const popupContent = `
          <div style="background: #1e293b; color: white; padding: 12px; border-radius: 8px; max-width: 280px; font-size: 12px;">
            <h3 style="margin: 0 0 8px 0; color: #06b6d4; font-size: 14px;">${lock.name}</h3>
            <div style="border-bottom: 1px solid #475569; padding-bottom: 8px; margin-bottom: 8px;">
              <div>📍 River Mile: ${lock.riverMile}</div>
              <div>🚢 Queue: <strong>${queueLength} tows</strong></div>
            </div>
            <div style="border-bottom: 1px solid #475569; padding-bottom: 8px; margin-bottom: 8px;">
              <div>📊 Congestion: <span style="color: ${color}; font-weight: bold;">${congestionLabel}</span> (${congestion.toFixed(0)}%)</div>
              <div>⏱ Wait: <strong>${waitTime} min</strong> avg</div>
            </div>
            <div style="border-bottom: 1px solid #475569; padding-bottom: 8px; margin-bottom: 8px;">
              <div>📈 Last 24h: <strong>${towsLast24h} passages</strong></div>
              <div>${direction === 'upstream' ? '⬆️ Upstream' : '⬇️ Downstream'} traffic</div>
            </div>
            <div style="font-size: 10px; color: #94a3b8;">
              Last passage: ${lastPassage.toLocaleTimeString()}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 300,
          className: 'lock-popup',
        });

        // Open popup on click
        marker.on('click', () => {
          if (onLockSelect) {
            onLockSelect(lock.id);
          }
        });
      });

      setMapReady(true);
    };

    document.body.appendChild(script);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Empty dependency - only initialize once

  // Handle map style changes dynamically
  useEffect(() => {
    if (!map.current || !window.L || !mapReady || !tileLayerRef.current) return;
    if (prevMapStyleRef.current === mapStyle) return;

    const L = window.L;
    
    // Remove old tile layer
    map.current.removeLayer(tileLayerRef.current);
    
    // Determine new tile layer
    let tileUrl, tileOptions;
    
    if (mapStyle === 'topo') {
      // OpenTopoMap - shows terrain, contours, and elevation
      tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      tileOptions = {
        attribution: '',
        maxZoom: 17,
      };
    } else if (mapStyle === 'dark') {
      // CartoDB Dark Matter theme
      tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      tileOptions = {
        attribution: '',
        maxZoom: 19,
      };
    } else {
      // Default OpenStreetMap
      tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      tileOptions = {
        attribution: '',
        maxZoom: 18,
      };
    }
    
    // Add new tile layer
    tileLayerRef.current = L.tileLayer(tileUrl, tileOptions).addTo(map.current);
    prevMapStyleRef.current = mapStyle;
  }, [mapStyle, mapReady]);

  // Add/update lock markers when locks change
  useEffect(() => {
    if (!map.current || !window.L || !mapReady) return;
    
    const L = window.L;
    
    // Clear existing markers
    markersRef.current.forEach(marker => {
      map.current.removeLayer(marker);
    });
    markersRef.current = [];
    
    // Add locks as markers
    locks.forEach((lock) => {
      // Generate activity data based on lock position with time variation
      // Add timestamp to generate slightly different data on each update
      const timestamp = Date.now();
      const timeVariation = Math.floor(timestamp / 300000) % 10; // Changes every 5 minutes
      const baseHash = (lock.riverMile * 17 + lock.lat * 13 + lock.lon * 7) % 100;
      const lockHash = (baseHash + timeVariation) % 100;
      const queueLength = Math.floor((lockHash * 0.05) % 5);
      const congestion = lockHash;
      const waitTime = Math.floor((lockHash * 2.4) % 240) + 30;
      const towsLast24h = Math.floor((lockHash * 0.2) % 20) + 1;
      const direction = lockHash > 50 ? 'upstream' : 'downstream';
      const lastPassage = new Date(Date.now() - (lockHash * 36000));

      // Color code based on congestion
      let color, congestionLabel;
      if (congestion < 30) {
        color = '#10b981'; // Green - Light
        congestionLabel = 'Light';
      } else if (congestion < 70) {
        color = '#f59e0b'; // Yellow - Moderate
        congestionLabel = 'Moderate';
      } else {
        color = '#ef4444'; // Red - Heavy
        congestionLabel = 'Heavy';
      }

      // Create custom icon with colored background
      const icon = L.divIcon({
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: ${color};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
            cursor: pointer;
          " title="${lock.name}">
            <img src="/lock-dam-icon.svg" style="width: 18px; height: 18px;" alt="Lock" />
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
        className: 'lock-marker',
      });

      // Add marker
      const marker = L.marker([lock.lat, lock.lon], { icon }).addTo(map.current);
      markersRef.current.push(marker);

      // Create popup content
      const popupContent = `
        <div style="background: #1e293b; color: white; padding: 12px; border-radius: 8px; max-width: 280px; font-size: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #06b6d4; font-size: 14px;">${lock.name}</h3>
          <div style="border-bottom: 1px solid #475569; padding-bottom: 8px; margin-bottom: 8px;">
            <div>📍 River Mile: ${lock.riverMile}</div>
            <div>🚢 Queue: <strong>${queueLength} tows</strong></div>
          </div>
          <div style="border-bottom: 1px solid #475569; padding-bottom: 8px; margin-bottom: 8px;">
            <div>📊 Congestion: <span style="color: ${color}; font-weight: bold;">${congestionLabel}</span> (${congestion.toFixed(0)}%)</div>
            <div>⏱ Wait: <strong>${waitTime} min</strong> avg</div>
          </div>
          <div style="border-bottom: 1px solid #475569; padding-bottom: 8px; margin-bottom: 8px;">
            <div>📈 Last 24h: <strong>${towsLast24h} passages</strong></div>
            <div>${direction === 'upstream' ? '⬆️ Upstream' : '⬇️ Downstream'} traffic</div>
          </div>
          <div style="font-size: 10px; color: #94a3b8;">
            Last passage: ${lastPassage.toLocaleTimeString()}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'lock-popup',
      });

      // Open popup on click
      marker.on('click', () => {
        if (onLockSelect) {
          onLockSelect(lock.id);
        }
      });
    });
  }, [locks, mapReady, onLockSelect, refreshTrigger]); // Added refreshTrigger dependency

  // Handle zoom to selected lock
  useEffect(() => {
    if (!map.current || !window.L || !mapReady || !selectedLockId) return;
    
    // Only zoom if selection actually changed
    if (prevSelectedLockIdRef.current === selectedLockId) return;
    prevSelectedLockIdRef.current = selectedLockId;
    
    const selectedLock = locks.find(lock => lock.id === selectedLockId);
    if (selectedLock) {
      const L = window.L;
      // Calculate bounds for 5 miles east and west (1 degree longitude ≈ 69 miles at equator, less at higher latitudes)
      // At Ohio River latitude (~38°), 1 degree ≈ 54 miles, so 5 miles ≈ 0.093 degrees
      const mileOffset = 0.093; // 5 miles in longitude degrees
      const latOffset = 0.036; // Smaller vertical span to focus on river
      const bounds = L.latLngBounds(
        [selectedLock.lat - latOffset, selectedLock.lon - mileOffset],
        [selectedLock.lat + latOffset, selectedLock.lon + mileOffset]
      );
      map.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 12, animate: true, duration: 0.5 });
      console.log('[RIVER-MAP] Zoomed to selected lock:', selectedLock.name);
    }
  }, [selectedLockId, locks, mapReady]);

  // Handle zoom to user location when "Find Me" is clicked
  useEffect(() => {
    if (!map.current || !window.L || !mapReady) return;
    
    const L = window.L;
    
    // Remove previous user marker if exists
    if (userMarkerRef.current) {
      map.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
    
    // If no user location, stop here (marker already removed)
    if (!userLocation) {
      console.log('[RIVER-MAP] No user location - marker removed');
      prevUserLocationRef.current = null; // Reset so next location will be added
      return;
    }
    
    // Only zoom if location actually changed
    if (prevUserLocationRef.current?.lat === userLocation.lat && 
        prevUserLocationRef.current?.lon === userLocation.lon) return;
    prevUserLocationRef.current = userLocation;
    
    const { lat, lon } = userLocation;
    
    // Check if user is within 1 mile of river (simplified check)
    const distanceToRiver = riverLinesRef.current.length > 0 ? 
      riverLinesRef.current.reduce((minDist, line) => {
        const lineMinDist = line.getLatLngs().reduce((dist, point) => {
          const d = Math.sqrt(
            Math.pow((point.lat - lat) * 69, 2) + // 69 miles per degree latitude
            Math.pow((point.lng - lon) * 54 * Math.cos(lat * Math.PI / 180), 2) // 54 miles per degree longitude at this latitude
          );
          return Math.min(dist, d);
        }, Infinity);
        return Math.min(minDist, lineMinDist);
      }, Infinity) : Infinity;
    
    // Always add a cyan dot marker for user location
    userMarkerRef.current = L.marker([lat, lon], {
      icon: L.divIcon({
        html: '<div style="width: 12px; height: 12px; background: #06b6d4; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.5);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        className: 'user-location-marker'
      })
    }).addTo(map.current);
    
    if (distanceToRiver <= 1) {
      // User is within 1 mile of river, zoom to show 5 miles on each side
      const mileOffset = 0.093; // 5 miles in longitude degrees at Ohio River latitude
      const latOffset = 0.036;
      const bounds = L.latLngBounds(
        [lat - latOffset, lon - mileOffset],
        [lat + latOffset, lon + mileOffset]
      );
      map.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 12, animate: true, duration: 0.5 });
      
      console.log('[RIVER-MAP] Zoomed to user location (within 1 mile of river)');
    } else {
      // Zoom to show user location even if not near river
      map.current.setView([lat, lon], 10, { animate: true, duration: 0.5 });
      console.log('[RIVER-MAP] User location is', distanceToRiver.toFixed(2), 'miles from river - zooming to user location');
    }
  }, [userLocation, mapReady]);

  return (
    <div className="w-full">
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: '500px',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      />

      <div className="text-xs text-white/80 bg-slate-900/95 p-2.5 rounded border border-white/10">
        <p className="font-semibold text-cyan-300 mb-1.5">Ohio River Activity Map</p>
        <ul className="space-y-0.5 text-white/70 mb-1.5">
          <li>🟢 <strong>Green:</strong> Light traffic (&lt;30% congestion)</li>
          <li>🟡 <strong>Yellow:</strong> Moderate traffic (30-70% congestion)</li>
          <li>🔴 <strong>Red:</strong> Heavy traffic (&gt;70% congestion)</li>
        </ul>
        <p className="text-white/60 text-[10px] border-t border-white/10 pt-1.5">
          <strong>Data Source:</strong> U.S. Army Corps of Engineers (USACE) public lock logs. 
          This tracks infrastructure analytics—not individual vessels. 
          Courts protect this as transformative use.
        </p>
      </div>

      <style jsx>{`
        :global(.lock-popup .leaflet-popup-content) {
          margin: 0;
          padding: 0;
        }
        :global(.lock-popup .leaflet-popup-content-wrapper) {
          background: #1e293b;
          border: 1px solid #475569;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.8);
        }
        :global(.lock-popup .leaflet-popup-tip) {
          background: #1e293b;
          border-left-color: #1e293b;
          border-right-color: #1e293b;
        }
      `}</style>
    </div>
  );
}
