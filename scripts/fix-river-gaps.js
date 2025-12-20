#!/usr/bin/env node

/**
 * Fix river rendering by splitting into multiple polylines at large gaps
 * This prevents straight lines from being drawn across long distances
 */

const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'public', 'geo', 'ohio-river.json');
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

console.log('Original coordinates:', data.coordinates.length);

// Calculate distance between two points
function distance(coord1, coord2) {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Split into separate polylines at gaps larger than threshold
const MAX_GAP_KM = 3.0; // Break polyline if gap is larger than 3km
const coords = data.coordinates;
const polylines = [];
let currentLine = [coords[0]];

console.log('Splitting into separate polylines at gaps > 3km...');

for (let i = 1; i < coords.length; i++) {
  const dist = distance(coords[i-1], coords[i]);
  
  if (dist < MAX_GAP_KM) {
    // Continue current line
    currentLine.push(coords[i]);
  } else {
    // Save current line if it has enough points
    if (currentLine.length > 5) {
      polylines.push({
        coordinates: currentLine,
        length: currentLine.length
      });
    }
    // Start new line
    currentLine = [coords[i]];
  }
  
  if (i % 5000 === 0) {
    process.stdout.write(`\r  Processed ${i}/${coords.length} points, ${polylines.length} polylines`);
  }
}

// Add last line
if (currentLine.length > 5) {
  polylines.push({
    coordinates: currentLine,
    length: currentLine.length
  });
}

console.log(`\n✓ Split into ${polylines.length} separate polylines`);

// Calculate stats for each polyline
polylines.forEach((line, idx) => {
  let lineLength = 0;
  for (let i = 1; i < line.coordinates.length; i++) {
    lineLength += distance(line.coordinates[i-1], line.coordinates[i]);
  }
  
  line.lengthKm = lineLength;
  
  const first = line.coordinates[0];
  const last = line.coordinates[line.coordinates.length - 1];
  
  console.log(`  Polyline ${idx + 1}: ${line.length} points, ${lineLength.toFixed(2)} km`);
  console.log(`    From: [${first[0].toFixed(4)}, ${first[1].toFixed(4)}]`);
  console.log(`    To:   [${last[0].toFixed(4)}, ${last[1].toFixed(4)}]`);
});

// Calculate total stats
const totalPoints = polylines.reduce((sum, line) => sum + line.length, 0);
const totalLength = polylines.reduce((sum, line) => sum + line.lengthKm, 0);

console.log(`\n✓ Total points: ${totalPoints}`);
console.log(`✓ Total length: ${totalLength.toFixed(2)} km (${(totalLength * 0.621371).toFixed(0)} miles)`);

// Save with multiple polylines
const output = {
  name: data.name,
  source: data.source,
  date: new Date().toISOString(),
  note: "Split into multiple polylines to prevent rendering of long gap connections",
  polylines: polylines.map((line, idx) => ({
    id: idx + 1,
    name: `Ohio River Segment ${idx + 1}`,
    type: 'way',
    coordinates: line.coordinates,
    lengthKm: line.lengthKm,
    pointCount: line.length
  }))
};

fs.writeFileSync(inputPath, JSON.stringify(output, null, 2));
console.log('\n✓ Multi-polyline data written to:', inputPath);
console.log('✓ Map will now render without long gap lines!');
