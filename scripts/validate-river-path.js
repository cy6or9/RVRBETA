#!/usr/bin/env node

/**
 * Validate that the sorted Ohio River coordinates form a reasonable path
 * Check for any large gaps that might indicate ordering issues
 */

const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'public', 'geo', 'ohio-river.json');
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const coords = data.coordinates;

// Calculate distance between consecutive points
function distance(coord1, coord2) {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

let maxGap = 0;
let maxGapIndex = -1;
let totalDistance = 0;
let largeGaps = [];

for (let i = 1; i < coords.length; i++) {
  const dist = distance(coords[i-1], coords[i]);
  totalDistance += dist;
  
  if (dist > maxGap) {
    maxGap = dist;
    maxGapIndex = i;
  }
  
  // Flag gaps larger than 5km as potentially problematic
  if (dist > 5) {
    largeGaps.push({
      index: i,
      distance: dist,
      from: coords[i-1],
      to: coords[i]
    });
  }
}

console.log(`✓ Validated ${coords.length} coordinate points`);
console.log(`✓ Total river length: ${totalDistance.toFixed(2)} km (~${(totalDistance * 0.621371).toFixed(0)} miles)`);
console.log(`✓ Average spacing: ${(totalDistance / coords.length).toFixed(3)} km`);
console.log(`✓ Maximum gap: ${maxGap.toFixed(3)} km at index ${maxGapIndex}`);

if (largeGaps.length > 0) {
  console.log(`\n⚠ Found ${largeGaps.length} gaps larger than 5km:`);
  largeGaps.slice(0, 10).forEach(gap => {
    console.log(`  - Index ${gap.index}: ${gap.distance.toFixed(2)} km gap`);
    console.log(`    From: [${gap.from[0].toFixed(4)}, ${gap.from[1].toFixed(4)}]`);
    console.log(`    To:   [${gap.to[0].toFixed(4)}, ${gap.to[1].toFixed(4)}]`);
  });
  if (largeGaps.length > 10) {
    console.log(`  ... and ${largeGaps.length - 10} more`);
  }
  console.log(`\n  These gaps might indicate the path needs further refinement.`);
} else {
  console.log(`\n✓ No large gaps found - path should render smoothly!`);
}

// Check that we start near Pittsburgh and end near Cairo
const first = coords[0];
const last = coords[coords.length - 1];
const pittsburgh = [40.44, -79.99];
const cairo = [36.99, -89.18];

const distFromPitt = distance(first, pittsburgh);
const distToCairo = distance(last, cairo);

console.log(`\n✓ First point: [${first[0].toFixed(4)}, ${first[1].toFixed(4)}]`);
console.log(`  Distance from Pittsburgh: ${distFromPitt.toFixed(2)} km`);
console.log(`✓ Last point: [${last[0].toFixed(4)}, ${last[1].toFixed(4)}]`);
console.log(`  Distance to Cairo: ${distToCairo.toFixed(2)} km`);

if (distFromPitt < 10 && distToCairo < 50) {
  console.log(`\n✅ Coordinates are properly ordered from Pittsburgh to Cairo!`);
} else {
  console.log(`\n⚠ Warning: Path may not start/end at expected locations`);
}
