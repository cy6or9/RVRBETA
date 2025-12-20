#!/usr/bin/env node

/**
 * Sort Ohio River coordinates to create a proper sequential path
 * 
 * The Ohio River flows generally:
 * - Pittsburgh (40.44°N, -79.99°W) at river mile 0
 * - Cairo (36.99°N, -89.18°W) at river mile ~981
 * 
 * Strategy: Sort by a combination of longitude (west) and latitude (south)
 * since the river flows southwest. We'll use a scoring system that weights
 * both coordinates appropriately.
 */

const fs = require('fs');
const path = require('path');

// Read the jumbled data
const inputPath = path.join(__dirname, '..', 'public', 'geo', 'ohio-river.json');
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

console.log('Original coordinates:', data.coordinates.length);

// The Ohio River flows generally southwest from Pittsburgh to Cairo
// Pittsburgh: 40.44°N, -79.99°W
// Cairo: 36.99°N, -89.18°W
// 
// We need to sort these points to flow in sequence.
// Strategy: Use a weighted distance from Pittsburgh

const PITTSBURGH = { lat: 40.44, lon: -79.99 };

function distanceFromPittsburgh(coord) {
  const [lat, lon] = coord;
  
  // Simple Euclidean distance weighted for the river's SW flow
  // Since Ohio River flows SW, points further south and west are "downstream"
  const latDiff = PITTSBURGH.lat - lat;  // Positive = south of Pittsburgh (downstream)
  const lonDiff = lon - PITTSBURGH.lon;  // Positive = west of Pittsburgh (downstream)
  
  // Weight both dimensions, with slight emphasis on longitude since the river flows more west than south
  return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff * 1.2);
}

// Sort coordinates by distance from Pittsburgh (upstream to downstream)
const sorted = [...data.coordinates].sort((a, b) => {
  return distanceFromPittsburgh(a) - distanceFromPittsburgh(b);
});

console.log('Sorted coordinates:', sorted.length);

// Verify the sort worked by checking first and last points
console.log('\nFirst 5 points (should be near Pittsburgh):');
sorted.slice(0, 5).forEach((coord, i) => {
  console.log(`  ${i + 1}. [${coord[0].toFixed(4)}, ${coord[1].toFixed(4)}]`);
});

console.log('\nLast 5 points (should be near Cairo):');
sorted.slice(-5).forEach((coord, i) => {
  console.log(`  ${sorted.length - 4 + i}. [${coord[0].toFixed(4)}, ${coord[1].toFixed(4)}]`);
});

// Create output data
const output = {
  name: data.name,
  source: data.source,
  date: new Date().toISOString(),
  note: "Coordinates sorted from Pittsburgh (upstream) to Cairo (downstream) for proper path rendering",
  coordinates: sorted
};

// Write sorted data
fs.writeFileSync(inputPath, JSON.stringify(output, null, 2));
console.log('\n✓ Sorted coordinates written to:', inputPath);
console.log('✓ Map should now render a proper river path!');
