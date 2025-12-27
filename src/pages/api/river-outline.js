// Ohio River outline API - Fetches real hydrographic data from USGS
// Uses actual navigation channel data from authoritative sources

import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    console.log('[API river-outline] Request received');
    
    // First, check if we have pre-downloaded USGS data
    const localDataPath = path.join(process.cwd(), 'public', 'geo', 'ohio-river.json');
    console.log('[API river-outline] Checking path:', localDataPath);
    console.log('[API river-outline] File exists:', fs.existsSync(localDataPath));
    
    if (fs.existsSync(localDataPath)) {
      console.log('[API river-outline] Reading local file');
      const localData = JSON.parse(fs.readFileSync(localDataPath, 'utf8'));
      console.log('[API river-outline] Local data loaded successfully');

      // Handle both old format (single coordinates array) and new format (multiple polylines)
      let elements = [];
      
      if (localData.polylines && Array.isArray(localData.polylines)) {
        // New format: multiple polylines
        console.log('[API river-outline] Using polylines format, count:', localData.polylines.length);

        elements = localData.polylines.map(line => ({
          type: 'way',
          name: line.name || 'Ohio River',
          coordinates: line.coordinates,
          color: '#06b6d4',
          weight: 4,
          opacity: 0.9
        }));
      } else if (localData.coordinates && Array.isArray(localData.coordinates)) {
        // Old format: single coordinates array
        console.log('[API river-outline] Using coordinates format, count:', localData.coordinates.length);

        elements = [{
          type: 'way',
          name: 'Ohio River',
          coordinates: localData.coordinates,
          color: '#06b6d4',
          weight: 4,
          opacity: 0.9
        }];
      }
      
      console.log('[API river-outline] Returning', elements.length, 'elements');
      return res.status(200).json({
        success: true,
        source: localData.source || 'USGS NHD (cached)',
        elements: elements
      });
    }

    // Fetch actual Ohio River flowline from USGS National Hydrography Dataset
    // Using WFS (Web Feature Service) to get real hydrographic data
    const wfsUrl = 'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/6/query';
    
    const params = new URLSearchParams({
      where: "gnis_name='Ohio River'",
      outFields: '*',
      returnGeometry: 'true',
      geometryType: 'esriGeometryPolyline',
      f: 'geojson',
      outSR: '4326'
    });

    const response = await fetch(`${wfsUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`USGS API request failed: ${response.status}`);
    }

    const geojson = await response.json();

    if (geojson.features && geojson.features.length > 0) {
      // Extract coordinates from GeoJSON features
      const allCoordinates = [];
      
      for (const feature of geojson.features) {
        if (feature.geometry && feature.geometry.type === 'LineString') {
          // GeoJSON uses [lon, lat], Leaflet uses [lat, lon]
          const coords = feature.geometry.coordinates.map(coord => [coord[1], coord[0]]);
          allCoordinates.push(...coords);
        } else if (feature.geometry && feature.geometry.type === 'MultiLineString') {
          // Handle MultiLineString
          for (const line of feature.geometry.coordinates) {
            const coords = line.map(coord => [coord[1], coord[0]]);
            allCoordinates.push(...coords);
          }
        }
      }

      if (allCoordinates.length > 0) {

        return res.status(200).json({
          success: true,
          source: 'USGS National Hydrography Dataset',
          elements: [{
            type: 'way',
            name: 'Ohio River',
            coordinates: allCoordinates,
            color: '#06b6d4',
            weight: 4,
            opacity: 0.9
          }]
        });
      }
    }

    throw new Error('No valid geometry data found in USGS response');

  } catch (error) {
    console.error('[API river-outline] Error:', error);
    console.error('[API river-outline] Error stack:', error.stack);

    // Try alternative: OpenStreetMap waterway data (better than nothing)
    try {
      console.log('[API river-outline] Trying OSM fallback');
      const overpassUrl = 'https://overpass-api.de/api/interpreter';
      const query = `
        [out:json][timeout:30];
        (
          way["waterway"="river"]["name"="Ohio River"];
          relation["waterway"="river"]["name"="Ohio River"];
        );
        out geom;
      `;

      const osmResponse = await fetch(overpassUrl, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      if (osmResponse.ok) {
        const osmData = await osmResponse.json();
        const coordinates = [];
        
        // Sort elements by position to maintain order
        const sortedElements = osmData.elements.sort((a, b) => {
          const aLat = a.geometry?.[0]?.lat || a.lat || 0;
          const bLat = b.geometry?.[0]?.lat || b.lat || 0;
          return bLat - aLat; // Sort north to south (Pittsburgh to Cairo)
        });
        
        for (const element of sortedElements) {
          if (element.type === 'way' && element.geometry) {
            for (const node of element.geometry) {
              coordinates.push([node.lat, node.lon]);
            }
          }
        }

        if (coordinates.length > 0) {

          return res.status(200).json({
            success: true,
            source: 'OpenStreetMap (fallback)',
            elements: [{
              type: 'way',
              name: 'Ohio River',
              coordinates: coordinates,
              color: '#06b6d4',
              weight: 4,
              opacity: 0.9
            }]
          });
        }
      }
    } catch (osmError) {

    }

    // Final fallback: Use major navigation waypoints based on lock positions

    const navigationWaypoints = [
    // Pittsburgh to Emsworth (Mile 0-6)
    [40.4406, -80.0195], // Pittsburgh - Point State Park
    [40.4520, -80.0450],
    [40.4680, -80.0720],
    [40.4850, -80.0950],
    [40.5020, -80.1180],
    
    // Emsworth to Dashields (Mile 6-13)
    [40.5180, -80.1450],
    [40.5220, -80.1980], // Dashields Lock
    [40.5350, -80.2280],
    [40.5480, -80.2580],
    [40.5650, -80.2880],
    
    // Dashields to Montgomery (Mile 13-32)
    [40.5820, -80.3150],
    [40.6000, -80.3420],
    [40.6180, -80.3680],
    [40.6350, -80.3900], // Montgomery Lock
    [40.6280, -80.4180],
    [40.6150, -80.4480],
    [40.5980, -80.4800],
    [40.5780, -80.5150],
    [40.5550, -80.5520],
    [40.5280, -80.5920],
    [40.5050, -80.6280],
    
    // New Cumberland (Mile 54)
    [40.5120, -80.6490], // New Cumberland Lock
    [40.4850, -80.6620],
    [40.4520, -80.6720],
    [40.4150, -80.6800],
    [40.3750, -80.6850],
    [40.3320, -80.6880],
    [40.2850, -80.6920],
    [40.2350, -80.6980],
    [40.1820, -80.7030],
    [40.1280, -80.7050],
    [40.0950, -80.7020], // Pike Island Lock (Mile 84)
    
    // Pike Island to Hannibal (Mile 84-126)
    [40.0640, -80.7209], // Wheeling
    [40.0380, -80.7380],
    [40.0080, -80.7580],
    [39.9750, -80.7750],
    [39.9380, -80.7920],
    [39.9000, -80.8050],
    [39.8580, -80.8180],
    [39.8150, -80.8320],
    [39.7720, -80.8450],
    [39.7280, -80.8580],
    [39.6850, -80.8680], // Hannibal Lock (Mile 126)
    
    // Hannibal to Willow Island (Mile 126-161)
    [39.6420, -80.8850],
    [39.5980, -80.9150],
    [39.5580, -80.9580],
    [39.5220, -81.0150],
    [39.4920, -81.0820],
    [39.4680, -81.1550],
    [39.4520, -81.2280],
    [39.4400, -81.3020],
    [39.4320, -81.3780],
    [39.4250, -81.4420], // Willow Island Lock (Mile 161)
    
    // Willow Island to Belleville (Mile 161-204)
    [39.4050, -81.4780],
    [39.3820, -81.4980],
    [39.3580, -81.5150],
    [39.3320, -81.5280],
    [39.3050, -81.5420],
    [39.2780, -81.5550],
    [39.2710, -81.5590], // Belleville Lock (Mile 204)
    
    // Belleville to Racine (Mile 204-237)
    [39.2420, -81.5680],
    [39.2120, -81.5820],
    [39.1820, -81.5980],
    [39.1520, -81.6180],
    [39.1220, -81.6420],
    [39.0920, -81.6720],
    [39.0680, -81.7080],
    [39.0520, -81.7580],
    [39.0420, -81.8180],
    [39.0360, -81.8820],
    [39.0320, -81.9480], // Racine Lock (Mile 237)
    
    // Racine to R.C. Byrd (Mile 237-279)
    [39.0220, -82.0150],
    [39.0080, -82.0650],
    [38.9900, -82.0980],
    [38.9680, -82.1120],
    [38.9420, -82.1180],
    [38.9320, -82.1200], // R.C. Byrd Lock (Mile 279)
    [38.9020, -82.1250],
    [38.8680, -82.1300],
    
    // R.C. Byrd to Greenup (Mile 279-341)
    [38.8420, -82.1330], // Point Pleasant
    [38.8050, -82.1620],
    [38.7680, -82.2080],
    [38.7350, -82.2680],
    [38.7050, -82.3350],
    [38.6750, -82.4050],
    [38.6450, -82.4720],
    [38.6150, -82.5350],
    [38.5850, -82.5950],
    [38.5580, -82.6520],
    [38.5380, -82.7080],
    [38.5280, -82.7580],
    [38.5320, -82.8020],
    [38.5480, -82.8320], // Greenup Lock (Mile 341)
    
    // Greenup to Meldahl (Mile 341-436)
    [38.5720, -82.8680],
    [38.6020, -82.9020],
    [38.6380, -82.9380],
    [38.6720, -82.9680],
    [38.7020, -82.9920],
    [38.7280, -83.0150], // Portsmouth
    [38.7380, -83.0720],
    [38.7480, -83.1380],
    [38.7560, -83.2080],
    [38.7620, -83.2780],
    [38.7660, -83.3480],
    [38.7650, -83.4180],
    [38.7580, -83.4820],
    [38.7420, -83.5420],
    [38.7220, -83.6020],
    [38.7020, -83.6520],
    [38.6850, -83.7080],
    [38.6820, -83.7590], // Meldahl Lock (Mile 436)
    
    // Meldahl to McAlpine (Mile 436-606)
    [38.6880, -83.8080],
    [38.6980, -83.8580],
    [38.7120, -83.9020],
    [38.7320, -83.9480],
    [38.7520, -83.9920],
    [38.7680, -84.0420],
    [38.7820, -84.0920], // Maysville
    [38.7980, -84.1480],
    [38.8180, -84.1980],
    [38.8420, -84.2420],
    [38.8720, -84.2880],
    [38.9080, -84.3320],
    [38.9480, -84.3720],
    [38.9920, -84.4080],
    [39.0380, -84.4520],
    [39.0780, -84.4920],
    [39.0980, -84.5150], // Cincinnati
    [39.1020, -84.5520],
    [39.0980, -84.5920],
    [39.0880, -84.6320],
    [39.0720, -84.6720],
    [39.0520, -84.7180],
    [39.0280, -84.7620],
    [39.0020, -84.8020],
    [38.9720, -84.8380],
    [38.9420, -84.8680],
    [38.9080, -84.8980],
    [38.8720, -84.9180],
    [38.8380, -84.9300],
    [38.8020, -84.9400],
    [38.7780, -84.9420], // Markland Lock (Mile 531)
    [38.7420, -84.9780],
    [38.7080, -85.0220],
    [38.6780, -85.0720],
    [38.6520, -85.1320],
    [38.6280, -85.1920],
    [38.6020, -85.2520],
    [38.5780, -85.3120],
    [38.5480, -85.3680],
    [38.5120, -85.4220],
    [38.4780, -85.4780],
    [38.4420, -85.5280],
    [38.4080, -85.5680],
    [38.3720, -85.6020],
    [38.3380, -85.6480],
    [38.3080, -85.6980],
    [38.2820, -85.7480],
    [38.2580, -85.7920], // McAlpine Lock (Louisville, Mile 606)
    
    // McAlpine to Smithland (Mile 606-919)
    [38.2320, -85.8420],
    [38.2080, -85.8880],
    [38.1820, -85.9280],
    [38.1520, -85.9720],
    [38.1220, -86.0220],
    [38.0920, -86.0820],
    [38.0680, -86.1480],
    [38.0480, -86.2120],
    [38.0280, -86.2820],
    [38.0080, -86.3480],
    [37.9880, -86.4080],
    [37.9680, -86.4720],
    [37.9480, -86.5320],
    [37.9280, -86.5880],
    [37.9180, -86.6480],
    [37.9120, -86.7080],
    [37.9080, -86.7680], // Cannelton Lock (Mile 720)
    [37.9100, -86.8280],
    [37.9150, -86.8880],
    [37.9200, -86.9480],
    [37.9250, -87.0120],
    [37.9280, -87.0780],
    [37.9300, -87.1420],
    [37.9310, -87.2120],
    [37.9310, -87.2880],
    [37.9305, -87.3580],
    [37.9300, -87.4180], // Newburgh Lock (Mile 776)
    [37.9350, -87.4680],
    [37.9420, -87.5080],
    [37.9520, -87.5420],
    [37.9650, -87.5680],
    [37.9750, -87.5780], // Evansville (Mile 792)
    [37.9650, -87.6220],
    [37.9480, -87.6720],
    [37.9280, -87.7120],
    [37.9020, -87.7520],
    [37.8780, -87.7980],
    [37.8480, -87.8420],
    [37.8180, -87.8920],
    [37.7920, -87.9420],
    [37.7720, -87.9880], // J.T. Myers Lock (Mile 846)
    [37.7520, -88.0280],
    [37.7320, -88.0620],
    [37.7120, -88.0980],
    [37.6980, -88.1280],
    [37.6800, -88.1580],
    [37.6620, -88.1880],
    [37.6420, -88.2180],
    [37.6220, -88.2480],
    [37.6020, -88.2780],
    [37.5780, -88.3080],
    [37.5520, -88.3380],
    [37.5220, -88.3620],
    [37.4920, -88.3880],
    [37.4580, -88.4120],
    [37.4280, -88.4320],
    [37.3980, -88.4520],
    [37.3680, -88.4720],
    [37.3380, -88.4880],
    [37.3080, -88.5020],
    [37.2780, -88.5120],
    [37.2480, -88.5080],
    [37.2120, -88.4980],
    [37.1820, -88.4780],
    [37.1580, -88.4580],
    [37.1480, -88.4420], // Smithland Lock (Mile 919)
    
    // Smithland to Cairo (Mile 919-981)
    [37.1450, -88.4880],
    [37.1420, -88.5380],
    [37.1400, -88.5980],
    [37.1420, -88.6580],
    [37.1460, -88.7120],
    [37.1500, -88.7480], // Paducah (Mile 935)
    [37.1480, -88.7980],
    [37.1420, -88.8480],
    [37.1280, -88.8920],
    [37.1120, -88.9380],
    [37.0920, -88.9820],
    [37.0680, -89.0220],
    [37.0480, -89.0580],
    [37.0280, -89.0980],
    [37.0120, -89.1380],
    [37.0050, -89.1620],
    [37.0000, -89.1700]  // Cairo - Mile 981 (mouth)
  ];

    return res.status(200).json({
      success: true,
      source: 'Static navigation waypoints (USGS/OSM unavailable)',
      elements: [{
        type: 'way',
        name: 'Ohio River',
        coordinates: navigationWaypoints,
        color: '#06b6d4',
        weight: 4,
        opacity: 0.9
      }]
    });
  }
}
