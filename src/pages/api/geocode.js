// Server-side reverse geocoding proxy to avoid CORS issues
export default async function handler(req, res) {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Missing lat or lon parameter' });
  }

  try {
    // Use Nominatim API from server-side (no CORS issues)
    const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
    
    const response = await fetch(geocodeUrl, {
      headers: {
        'User-Agent': 'RiverValleyReport/1.0 (GitHub @cy6or9/RVRBETA)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.address) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Extract location components
    const city = data.address.city || data.address.town || data.address.village || data.address.hamlet;
    const county = data.address.county;
    const state = data.address.state;

    // Build formatted location string
    let locationStr = '';
    if (city && state && county) {
      // Full format: City, State (County)
      locationStr = `${city}, ${state} (${county})`;
    } else if (city && state) {
      // City and state only
      locationStr = `${city}, ${state}`;
    } else if (county && state) {
      // County and state only
      locationStr = `${county}, ${state}`;
    } else if (state) {
      // State only
      locationStr = state;
    }

    return res.status(200).json({
      success: true,
      location: locationStr,
      raw: data.address,
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return res.status(500).json({ error: 'Geocoding failed', message: error.message });
  }
}
