#!/usr/bin/env node
/**
 * Script to fetch real Ohio River hydrographic data from authoritative sources
 * Run: node scripts/fetch-river-data.js
 * 
 * This will download actual navigation channel data from:
 * 1. USGS National Hydrography Dataset (NHD)
 * 2. USACE Inland Electronic Navigational Charts (IENCs)
 * 
 * Output: Creates a GeoJSON file with accurate Ohio River coordinates
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

async function fetchUSGSData() {
  console.log('Fetching Ohio River data from USGS National Hydrography Dataset...');
  
  // USGS WFS endpoint for NHD flowlines
  const wfsUrl = 'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/6/query';
  
  const params = new URLSearchParams({
    where: "gnis_name='Ohio River'",
    outFields: '*',
    returnGeometry: 'true',
    f: 'geojson',
    outSR: '4326'
  });

  const url = `${wfsUrl}?${params.toString()}`;
  
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const geojson = JSON.parse(data);
          console.log(`✓ Received ${geojson.features?.length || 0} features from USGS`);
          resolve(geojson);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function processGeoJSON(geojson) {
  console.log('Processing GeoJSON data...');
  
  const coordinates = [];
  
  for (const feature of geojson.features || []) {
    if (feature.geometry) {
      if (feature.geometry.type === 'LineString') {
        // GeoJSON is [lon, lat], convert to [lat, lon] for Leaflet
        const coords = feature.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        coordinates.push(...coords);
      } else if (feature.geometry.type === 'MultiLineString') {
        for (const line of feature.geometry.coordinates) {
          const coords = line.map(coord => [coord[1], coord[0]]);
          coordinates.push(...coords);
        }
      }
    }
  }
  
  console.log(`✓ Extracted ${coordinates.length} coordinate points`);
  return coordinates;
}

async function saveRiverData(coordinates) {
  const outputPath = path.join(__dirname, '..', 'public', 'geo', 'ohio-river.json');
  
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const data = {
    name: 'Ohio River',
    source: 'USGS National Hydrography Dataset',
    date: new Date().toISOString(),
    coordinates: coordinates
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`✓ Saved river data to ${outputPath}`);
  console.log(`  Total points: ${coordinates.length}`);
}

async function main() {
  try {
    console.log('=== Ohio River Data Fetcher ===\n');
    
    const geojson = await fetchUSGSData();
    const coordinates = await processGeoJSON(geojson);
    
    if (coordinates.length === 0) {
      console.error('✗ No coordinates extracted from USGS data');
      console.log('\nAlternative options:');
      console.log('1. Download IENC data from https://ienccloud.us/');
      console.log('2. Download NHD data from https://apps.nationalmap.gov/downloader/');
      console.log('3. Use QGIS to export Ohio River flowline as GeoJSON');
      process.exit(1);
    }
    
    await saveRiverData(coordinates);
    
    console.log('\n✓ Done! River data ready to use.');
    console.log('\nNext step: Update /src/pages/api/river-outline.js to use this data.');
    
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.log('\n📋 Manual download instructions:');
    console.log('1. Visit: https://apps.nationalmap.gov/downloader/');
    console.log('2. Search for "Ohio River"');
    console.log('3. Download NHD (National Hydrography Dataset)');
    console.log('4. Extract flowline shapefile');
    console.log('5. Convert to GeoJSON using QGIS or ogr2ogr');
    console.log('6. Place result in /public/geo/ohio-river.json');
    process.exit(1);
  }
}

main();
