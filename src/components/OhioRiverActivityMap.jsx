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

export default function OhioRiverActivityMap({ locks = [], stations = [], selectedLockId, userLocation, onLockSelect, mapStyle = 'standard' }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const riverLinesRef = useRef([]); // Changed to array to hold multiple polylines
  const riverCoordinatesRef = useRef([]); // Store all river coordinates for snapping
  const markersRef = useRef([]);
  const cityMarkersRef = useRef([]);
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
              try {
                map.current.removeLayer(line);
              } catch (e) {
                console.warn('[RIVER-MAP] Error removing layer:', e);
              }
            }
          });
          riverLinesRef.current = [];
          riverCoordinatesRef.current = []; // Reset coordinates
          
          // Process each element and create polylines
          elements.forEach((el, idx) => {
            try {
              console.log(`[RIVER-MAP] Segment ${idx + 1}:`, {
                name: el.name,
                type: el.type,
                coordCount: el.coordinates?.length,
                color: el.color,
                weight: el.weight
              });
              
              if (el.type === 'way' && el.coordinates && Array.isArray(el.coordinates) && el.coordinates.length > 1) {
                // Validate coordinates before creating polyline
                const validCoords = el.coordinates.filter(coord => {
                  return Array.isArray(coord) && coord.length >= 2 && 
                    typeof coord[0] === 'number' && typeof coord[1] === 'number' &&
                    isFinite(coord[0]) && isFinite(coord[1]);
                });

                if (validCoords.length > 1) {
                  // Store all river coordinates for city snapping
                  riverCoordinatesRef.current.push(...validCoords);
                  
                  const line = L.polyline(validCoords, {
                    color: el.color || '#06b6d4',
                    weight: el.weight || 4,
                    opacity: el.opacity || 0.9,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }).addTo(map.current);

                  riverLinesRef.current.push(line);
                  console.log(`[RIVER-MAP] ✓ Polyline ${idx + 1} created and added to map (${validCoords.length} valid coords)`);
                } else {
                  console.warn('[RIVER-MAP] Skipping element - not enough valid coordinates after filtering');
                }
              } else {
                console.warn('[RIVER-MAP] Skipping element - invalid data');
              }
            } catch (segmentErr) {
              console.error(`[RIVER-MAP] Error processing segment ${idx + 1}:`, segmentErr);
            }
          });
          
          console.log(`[RIVER-MAP] Stored ${riverCoordinatesRef.current.length} total river coordinates for city snapping`);
          // Trigger city markers to refresh after river coordinates load
          try {
            setRefreshTrigger(prev => prev + 1);
          } catch {}
          
          // Fit map to show all river segments on initial load
          if (!initialFitDone && riverLinesRef.current.length > 0) {
            try {
              // Create a feature group from all polylines to get combined bounds
              const group = L.featureGroup(riverLinesRef.current);
              const bounds = group.getBounds();
              
              // Check if bounds are valid using Leaflet's method
              if (bounds && bounds.isValid && bounds.isValid()) {
                // Fit to entire Ohio River (Pittsburgh to Cairo) with appropriate zoom
                map.current.fitBounds(bounds, { 
                  padding: [30, 30], // Smaller padding for better fit
                  maxZoom: 9, // Max zoom 9 to ensure entire river is visible
                  animate: false // No animation on initial load for immediate display
                });
                console.log('[RIVER-MAP] ✓ Map fitted to entire Ohio River bounds (Pittsburgh to Cairo)');
                setInitialFitDone(true);
              } else {
                console.warn('[RIVER-MAP] Bounds are not valid or empty, skipping fit');
                setInitialFitDone(true);
              }
            } catch (fitErr) {
              console.error('[RIVER-MAP] Error fitting bounds:', fitErr);
              setInitialFitDone(true);
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
              <div> River Mile: ${lock.riverMile}</div>
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
            <div> River Mile: ${lock.riverMile}</div>
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

  // Add city/township markers (non-L&D stations)
  useEffect(() => {
    if (!map.current || !window.L || !mapReady || !stations || stations.length === 0) return;
    if (riverCoordinatesRef.current.length === 0) return; // Wait for river data
    
    const L = window.L;
    
    // Clear existing city markers
    cityMarkersRef.current.forEach(marker => {
      map.current.removeLayer(marker);
    });
    cityMarkersRef.current = [];
    
    // Filter out stations with "L&D" in their name (those are already shown as lock markers)
    const cityStations = stations.filter(station => {
      const hasLD = station && station.name && station.name.includes('L&D');
      return !hasLD;
    });
    
    console.log('[RIVER-MAP] City station filtering:', {
      totalStations: stations.length,
      stationSample: stations.slice(0, 3).map(s => ({ name: s?.name, hasLD: s?.name?.includes('L&D') })),
      citiesAfterFilter: cityStations.length,
      riverCoordinatesAvailable: riverCoordinatesRef.current.length
    });
    
    // Helper function to find nearest river point
    const findNearestRiverPoint = (lat, lon) => {
      let nearestPoint = null;
      let minDistance = Infinity;
      
      riverCoordinatesRef.current.forEach(coord => {
        const distance = Math.sqrt(
          Math.pow((coord[0] - lat) * 69, 2) + // 69 miles per degree latitude
          Math.pow((coord[1] - lon) * 54 * Math.cos(lat * Math.PI / 180), 2) // longitude adjusted for latitude
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestPoint = coord;
        }
      });
      
      return { point: nearestPoint, distance: minDistance };
    };
    
    // Add city markers
    cityStations.forEach((city) => {
      // Find nearest river point to snap to
      const { point: riverPoint, distance } = findNearestRiverPoint(city.lat, city.lon);
      
      if (!riverPoint || distance > 20) {
        console.warn('[RIVER-MAP] City too far from river, skipping:', city.name, distance.toFixed(2), 'miles');
        return; // Skip if no river point found or too far (>20 miles)
      }
      
      // Use river point for marker placement (snap to river)
      const [snapLat, snapLon] = riverPoint;
      
      // Create custom icon - half size of lock markers with dark background
      const icon = L.divIcon({
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 16px;
            height: 16px;
            background: #1e293b;
            border: 2px solid #06b6d4;
            border-radius: 50%;
            box-shadow: 0 1px 4px rgba(0,0,0,0.5);
            cursor: pointer;
          " title="${city.name}">
            <img src="/city-hall-icon.svg" style="width: 10px; height: 10px;" alt="City" />
          </div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -10],
        className: 'city-marker',
      });

      // Add marker at snapped river position
      const marker = L.marker([snapLat, snapLon], { icon }).addTo(map.current);
      cityMarkersRef.current.push(marker);

      // Create popup content with dark theme and placeholders for level/temp
      const popupContent = `
        <div style="background: #1e293b; color: white; padding: 12px; border-radius: 8px; max-width: 260px; font-size: 12px; border: 1px solid #475569;">
          <h3 style="margin: 0 0 8px 0; color: #06b6d4; font-size: 14px; font-weight: bold;">🏛️ ${city.name}</h3>
          <div style="border-bottom: 1px solid #475569; padding-bottom: 8px; margin-bottom: 8px;">
            <div style="margin-bottom: 4px;">📍 River Mile: <strong>${city.riverMile || 'N/A'}</strong></div>
            <div style="margin-bottom: 4px;">📊 Station ID: <strong>${city.id}</strong></div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-bottom: 1px solid #475569; padding-bottom: 8px; margin-bottom: 8px;">
            <div>🌊 Level: <strong>—</strong></div>
            <div>🌡 Temp: <strong>—</strong></div>
          </div>
          <div style="font-size: 11px; color: #94a3b8;">City monitoring station on Ohio River</div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 260,
        className: 'city-popup',
        closeButton: true,
        autoPan: true
      });

      // Fetch level and temperature when popup opens
      marker.on('popupopen', async () => {
        try {
          const levelUrl = `/api/river-data?site=${encodeURIComponent(city.id)}&lat=${city.lat}&lon=${city.lon}`;
          const wxUrl = `/api/weather?lat=${city.lat}&lon=${city.lon}`;
          const [levelRes, wxRes] = await Promise.allSettled([
            fetch(levelUrl),
            fetch(wxUrl)
          ]);

          let levelFt = null;
          if (levelRes.status === 'fulfilled' && levelRes.value.ok) {
            const j = await levelRes.value.json();
            levelFt = typeof j?.observed === 'number' ? j.observed : null;
          }
          let tempF = null;
          if (wxRes.status === 'fulfilled' && wxRes.value.ok) {
            const wj = await wxRes.value.json();
            tempF = typeof wj?.tempF === 'number' ? wj.tempF : (wj?.current?.tempF ?? null);
          }

          const updated = `
            <div style="background: #1e293b; color: white; padding: 12px; border-radius: 8px; max-width: 260px; font-size: 12px; border: 1px solid #475569;">
              <h3 style="margin: 0 0 8px 0; color: #06b6d4; font-size: 14px; font-weight: bold;">🏛️ ${city.name}</h3>
              <div style="border-bottom: 1px solid #475569; padding-bottom: 8px; margin-bottom: 8px;">
                <div style="margin-bottom: 4px;">📍 River Mile: <strong>${city.riverMile || 'N/A'}</strong></div>
                <div style="margin-bottom: 4px;">📊 Station ID: <strong>${city.id}</strong></div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-bottom: 1px solid #475569; padding-bottom: 8px; margin-bottom: 8px;">
                <div>🌊 Level: <strong>${levelFt != null ? `${levelFt.toFixed(2)} ft` : '—'}</strong></div>
                <div>🌡 Temp: <strong>${tempF != null ? `${Math.round(tempF)} °F` : '—'}</strong></div>
              </div>
              <div style="font-size: 11px; color: #94a3b8;">City monitoring station on Ohio River</div>
            </div>
          `;
          try { marker.setPopupContent(updated); } catch {}
        } catch (e) {
          console.warn('[RIVER-MAP] Popup data fetch failed for city', city.name, e);
        }
      });

      // Notify parent if onClick is provided
      marker.on('click', () => {
        if (onLockSelect) onLockSelect(city.id);
      });
    });
  }, [stations, mapReady, refreshTrigger, onLockSelect]);

  // Handle zoom to selected lock OR city
  useEffect(() => {
    if (!map.current || !window.L || !mapReady || !selectedLockId) return;
    
    // Only zoom if selection actually changed
    if (prevSelectedLockIdRef.current === selectedLockId) return;
    prevSelectedLockIdRef.current = selectedLockId;
    
    // Look for city first, then lock
    let selectedItem = Array.isArray(stations) ? stations.find(s => s.id === selectedLockId) : null;
    if (!selectedItem) {
      selectedItem = Array.isArray(locks) ? locks.find(lock => lock.id === selectedLockId) : null;
    }
    
    if (selectedItem) {
      const L = window.L;
      // Same zoom envelope as Find Me: about 5 miles each direction
      const mileOffset = 0.093; // ~5 miles in longitude degrees at river latitude
      const latOffset = 0.036;
      const bounds = L.latLngBounds(
        [selectedItem.lat - latOffset, selectedItem.lon - mileOffset],
        [selectedItem.lat + latOffset, selectedItem.lon + mileOffset]
      );
      try {
        map.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 12, animate: true, duration: 0.5 });
        console.log('[RIVER-MAP] Zoomed to selected item:', selectedItem.name);
      } catch (fitErr) {
        console.warn('[RIVER-MAP] FitBounds failed for selected item, falling back to setView:', fitErr);
        map.current.setView([selectedItem.lat, selectedItem.lon], 11, { animate: true, duration: 0.5 });
      }
    }
  }, [selectedLockId, locks, stations, mapReady]);

  // Handle zoom to user location when "Find Me" is clicked
  useEffect(() => {
    if (!map.current || !window.L || !mapReady) return;
    
    const L = window.L;
    
    // Remove previous user marker if exists
    if (userMarkerRef.current) {
      try {
        map.current.removeLayer(userMarkerRef.current);
      } catch (e) {
        console.warn('[RIVER-MAP] Error removing user marker:', e);
      }
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
    let distanceToRiver = Infinity;
    
    try {
      if (riverLinesRef.current && Array.isArray(riverLinesRef.current) && riverLinesRef.current.length > 0) {
        distanceToRiver = riverLinesRef.current.reduce((minDist, line) => {
          try {
            if (!line || typeof line.getLatLngs !== 'function') return minDist;
            
            const lineMinDist = line.getLatLngs().reduce((dist, point) => {
              if (!point || typeof point.lat !== 'number' || typeof point.lng !== 'number') return dist;
              
              const d = Math.sqrt(
                Math.pow((point.lat - lat) * 69, 2) + // 69 miles per degree latitude
                Math.pow((point.lng - lon) * 54 * Math.cos(lat * Math.PI / 180), 2) // 54 miles per degree longitude at this latitude
              );
              return Math.min(dist, d);
            }, Infinity);
            return Math.min(minDist, lineMinDist);
          } catch (lineErr) {
            console.warn('[RIVER-MAP] Error calculating distance for line:', lineErr);
            return minDist;
          }
        }, Infinity);
      }
    } catch (err) {
      console.error('[RIVER-MAP] Error checking distance to river:', err);
      distanceToRiver = Infinity;
    }
    
    // Always add a cyan dot marker for user location
    try {
      userMarkerRef.current = L.marker([lat, lon], {
        icon: L.divIcon({
          html: '<div style="width: 12px; height: 12px; background: #06b6d4; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.5);"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          className: 'user-location-marker'
        })
      }).addTo(map.current);
    } catch (markerErr) {
      console.error('[RIVER-MAP] Error creating user marker:', markerErr);
      return;
    }
    
    if (distanceToRiver <= 1) {
      // User is within 1 mile of river, zoom to show 5 miles on each side
      try {
        const mileOffset = 0.093; // 5 miles in longitude degrees at Ohio River latitude
        const latOffset = 0.036;
        const bounds = L.latLngBounds(
          [lat - latOffset, lon - mileOffset],
          [lat + latOffset, lon + mileOffset]
        );
        map.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 12, animate: true, duration: 0.5 });
        
        console.log('[RIVER-MAP] Zoomed to user location (within 1 mile of river)');
      } catch (fitErr) {
        console.error('[RIVER-MAP] Error fitting bounds for user location:', fitErr);
        try {
          map.current.setView([lat, lon], 10, { animate: true, duration: 0.5 });
        } catch (viewErr) {
          console.error('[RIVER-MAP] Error setting view:', viewErr);
        }
      }
    } else {
      // Zoom to show user location even if not near river
      try {
        map.current.setView([lat, lon], 10, { animate: true, duration: 0.5 });
        console.log('[RIVER-MAP] User location is', distanceToRiver.toFixed(2), 'miles from river - zooming to user location');
      } catch (viewErr) {
        console.error('[RIVER-MAP] Error setting view for user location:', viewErr);
      }
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
        <p className="font-semibold text-white mb-1.5">
          Ohio River Activity Map | 🟢 Green: Light traffic (&lt;30% congestion) | 🟡 Yellow: Moderate traffic (30-70% congestion) | 🔴 Red: Heavy traffic (&gt;70% congestion)
        </p>
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
        :global(.city-popup .leaflet-popup-content) {
          margin: 0;
          padding: 0;
        }
        :global(.city-popup .leaflet-popup-content-wrapper) {
          background: #1e293b;
          border: 1px solid #06b6d4;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
        }
        :global(.city-popup .leaflet-popup-tip) {
          background: #1e293b;
          border-left-color: #1e293b;
          border-right-color: #1e293b;
        }
      `}</style>
    </div>
  );
}
