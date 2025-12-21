// Server-side reverse geocoding proxy to avoid CORS issues
const STATE_ABBREV = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

// Known towns/cities indexed by county/state when OSM doesn't have them
// Format: "County, State" => [{ name, lat, lon }, ...]
const KNOWN_TOWNS = {
  "Union County, Kentucky": [
    { name: "Uniontown", lat: 37.7683, lon: -87.9480 },
  ],
};

function getStateAbbrev(stateName) {
  if (!stateName) return '';
  // Check if already abbreviated
  if (stateName.length === 2) return stateName.toUpperCase();
  // Look up full name
  return STATE_ABBREV[stateName] || stateName.substring(0, 2).toUpperCase();
}

function findNearestKnownTown(county, state, userLat, userLon) {
  const key = `${county}, ${state}`;
  const towns = KNOWN_TOWNS[key];
  if (!towns || towns.length === 0) return null;
  
  let closest = null;
  let closestDist = Infinity;
  
  for (const town of towns) {
    const distSquared = Math.pow(town.lat - userLat, 2) + Math.pow(town.lon - userLon, 2);
    if (distSquared < closestDist) {
      closest = town;
      closestDist = distSquared;
    }
  }
  
  // Return if within ~30km (0.27 degrees squared)
  return closestDist < 0.27 ? closest : null;
}

export default async function handler(req, res) {
  const { lat, lon } = req.query;
  const userLat = parseFloat(lat);
  const userLon = parseFloat(lon);

  // Disable caching for geocode requests
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Missing lat or lon parameter' });
  }

  try {
    // Use Nominatim API from server-side (no CORS issues)
    // First try reverse geocoding with high detail
    let geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    
    let response = await fetch(geocodeUrl, {
      headers: {
        'User-Agent': 'RiverValleyReport/1.0 (GitHub @cy6or9/RVRBETA)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    let data = await response.json();

    if (!data || !data.address) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Extract location components with enhanced priority
    // OSM place names hierarchy: city > town > village > hamlet > suburb > county
    let city = null;
    let place_name = data.address.name; // Fallback to the main name field
    
    // Try to get best city/town name in priority order
    if (data.address.city) {
      city = data.address.city;
    } else if (data.address.town) {
      city = data.address.town;
    } else if (data.address.village) {
      city = data.address.village;
    } else if (data.address.hamlet) {
      city = data.address.hamlet;
    } else if (data.address.suburb) {
      city = data.address.suburb;
    }
    
    // If no city found, check known towns database first
    if (!city && data.address.county && data.address.state) {
      const knownTown = findNearestKnownTown(data.address.county, data.address.state, userLat, userLon);
      if (knownTown) {
        console.log(`[GEOCODE] Found known town: ${knownTown.name} for ${data.address.county}, ${data.address.state}`);
        city = knownTown.name;
      }
    }
    
    // If still no city found, try searching for nearby named places
    if (!city) {
      try {
        // First, try searching for towns/cities/villages near the coordinate
        const coordSearchUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=20&addressdetails=1&exclude_place_ids=${data.place_id || ''}&lat=${lat}&lon=${lon}&featuretype=city,town,village,hamlet`;
        const coordSearchResponse = await fetch(coordSearchUrl, {
          headers: {
            'User-Agent': 'RiverValleyReport/1.0 (GitHub @cy6or9/RVRBETA)',
            'Accept': 'application/json',
          },
        });
        
        if (coordSearchResponse.ok) {
          const coordSearchResults = await coordSearchResponse.json();
          console.log(`[GEOCODE] Coordinate search returned ${coordSearchResults?.length || 0} results`);
          
          if (coordSearchResults && coordSearchResults.length > 0) {
            // Find the closest place within ~10km
            let closestPlace = null;
            let closestDistance = Infinity;
            
            for (let result of coordSearchResults) {
              const resLat = parseFloat(result.lat);
              const resLon = parseFloat(result.lon);
              
              // Calculate distance (simple Euclidean)
              const distSquared = Math.pow(resLat - userLat, 2) + Math.pow(resLon - userLon, 2);
              
              // If closer than current best and within ~10km (~0.09 degrees squared)
              if (distSquared < 0.008) {
                const placeName = result.name;
                if (placeName && !placeName.includes('County') && !placeName.includes(data.address.state)) {
                  if (distSquared < closestDistance) {
                    closestPlace = {
                      name: placeName,
                      distance: distSquared,
                    };
                    closestDistance = distSquared;
                  }
                }
              }
            }
            
            if (closestPlace) {
              console.log(`[GEOCODE] Using coordinate-based result: ${closestPlace.name}`);
              city = closestPlace.name;
            }
          }
        }
      } catch (e) {
        console.error('[GEOCODE] Coordinate-based town search failed:', e.message);
      }
    }
    
    // If still no city, try searching for places by county/state
    if (!city) {
      try {
        const countySearchUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=30&addressdetails=1&q=${encodeURIComponent(data.address.county)}%20${encodeURIComponent(data.address.state)}&featuretype=city,town,village`;
        const countySearchResponse = await fetch(countySearchUrl, {
          headers: {
            'User-Agent': 'RiverValleyReport/1.0 (GitHub @cy6or9/RVRBETA)',
            'Accept': 'application/json',
          },
        });
        
        if (countySearchResponse.ok) {
          const countySearchResults = await countySearchResponse.json();
          console.log(`[GEOCODE] County search for "${data.address.county}, ${data.address.state}" returned ${countySearchResults?.length || 0} results`);
          
          if (countySearchResults && countySearchResults.length > 0) {
            // Find the closest place within ~20km
            let closestPlace = null;
            let closestDistance = Infinity;
            
            for (let result of countySearchResults) {
              const resLat = parseFloat(result.lat);
              const resLon = parseFloat(result.lon);
              
              // Calculate distance
              const distSquared = Math.pow(resLat - userLat, 2) + Math.pow(resLon - userLon, 2);
              
              // If closer than current best and within ~20km
              if (distSquared < 0.032) {
                const placeName = result.name;
                if (placeName && !placeName.includes('County')) {
                  if (distSquared < closestDistance) {
                    closestPlace = {
                      name: placeName,
                      distance: distSquared,
                    };
                    closestDistance = distSquared;
                  }
                }
              }
            }
            
            if (closestPlace) {
              console.log(`[GEOCODE] Using county-based result: ${closestPlace.name}`);
              city = closestPlace.name;
            }
          }
        }
      } catch (e) {
        console.error('[GEOCODE] County-based town search failed:', e.message);
      }
    }
    
    // Use place name from reverse geocoding as final fallback
    if (!city && place_name) {
      console.log(`[GEOCODE] Using place_name fallback: ${place_name}`);
      city = place_name;
    }
    
    const county = data.address.county;
    const state = data.address.state;

    // Build formatted location string - prioritize: City/Town > County > State
    let locationStr = '';
    const stateAbbrev = getStateAbbrev(state);
    
    if (city && state) {
      // Primary: City, State format
      locationStr = `${city}, ${stateAbbrev}`;
      // Add county in parentheses if it's different from city name
      if (county && county.toLowerCase() !== city.toLowerCase()) {
        locationStr += ` (${county})`;
      }
    } else if (county && state) {
      // Fallback: County, State if no city
      locationStr = `${county}, ${stateAbbrev}`;
    } else if (state) {
      // Last resort: State only
      locationStr = stateAbbrev;
    }

    console.log(`[GEOCODE] Final result for [${lat}, ${lon}]: "${locationStr}"`);

    return res.status(200).json({
      success: true,
      location: locationStr,
      raw: data.address,
      city,
      county,
      state,
      name: place_name,
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return res.status(500).json({ error: 'Geocoding failed', message: error.message });
  }
}
