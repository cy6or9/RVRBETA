#!/usr/bin/env node

/**
 * Advanced river path sorting using nearest-neighbor algorithm
 * 
 * This creates a continuous path by always connecting to the nearest unvisited point,
 * which should follow the natural river flow better than simple radial sorting.
 */

const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'public', 'geo', 'ohio-river.json');
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

console.log('Original coordinates:', data.coordinates.length);

// Calculate distance between two points (Haversine formula)
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
  return R * c;
}

// Find the point closest to Pittsburgh to start
const PITTSBURGH = [40.44, -79.99];
let startIdx = 0;
let minDist = Infinity;

data.coordinates.forEach((coord, idx) => {
  const dist = distance(coord, PITTSBURGH);
  if (dist < minDist) {
    minDist = dist;
    startIdx = idx;
  }
});

console.log(`Starting from point ${startIdx} (${minDist.toFixed(2)} km from Pittsburgh)`);
console.log('Building path using nearest-neighbor algorithm...');
console.log('This may take a few minutes for 47,000+ points...');

// Nearest-neighbor pathfinding (greedy algorithm)
// For very large datasets, we'll use a sampling approach
const coords = data.coordinates;
const visited = new Array(coords.length).fill(false);
const sortedPath = [];

let currentIdx = startIdx;
visited[currentIdx] = true;
sortedPath.push(coords[currentIdx]);

let progressCounter = 0;
const progressInterval = 1000;

// Main loop
for (let step = 1; step < coords.length; step++) {
  let nearestIdx = -1;
  let nearestDist = Infinity;
  
  // Search window: check points within a reasonable range
  // This speeds up the algorithm significantly for large datasets
  const searchWindow = 200;
  
  // Check nearby indices first (spatial locality)
  for (let offset = 1; offset <= searchWindow && offset < coords.length; offset++) {
    for (const sign of [-1, 1]) {
      const checkIdx = (currentIdx + sign * offset + coords.length) % coords.length;
      
      if (!visited[checkIdx]) {
        const dist = distance(coords[currentIdx], coords[checkIdx]);
        
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = checkIdx;
        }
      }
    }
  }
  
  // If no nearby point found, do a full search (rare but possible)
  if (nearestIdx === -1) {
    for (let i = 0; i < coords.length; i++) {
      if (!visited[i]) {
        const dist = distance(coords[currentIdx], coords[i]);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }
    }
  }
  
  if (nearestIdx === -1) {
    console.error('ERROR: No unvisited points found!');
    break;
  }
  
  visited[nearestIdx] = true;
  sortedPath.push(coords[nearestIdx]);
  currentIdx = nearestIdx;
  
  progressCounter++;
  if (progressCounter % progressInterval === 0) {
    const percent = ((step / coords.length) * 100).toFixed(1);
    process.stdout.write(`\r  Progress: ${percent}% (${step}/${coords.length}) - Last gap: ${nearestDist.toFixed(3)} km`);
  }
}

console.log('\n✓ Path construction complete!');
console.log('Path length:', sortedPath.length);

// Verify the path
console.log('\nFirst 3 points:');
sortedPath.slice(0, 3).forEach((coord, i) => {
  console.log(`  ${i + 1}. [${coord[0].toFixed(4)}, ${coord[1].toFixed(4)}]`);
});

console.log('\nLast 3 points:');
sortedPath.slice(-3).forEach((coord, i) => {
  console.log(`  ${sortedPath.length - 2 + i}. [${coord[0].toFixed(4)}, ${coord[1].toFixed(4)}]`);
});

// Calculate some stats
let maxGap = 0;
let totalDist = 0;
for (let i = 1; i < sortedPath.length; i++) {
  const dist = distance(sortedPath[i-1], sortedPath[i]);
  totalDist += dist;
  if (dist > maxGap) maxGap = dist;
}

console.log(`\n✓ Total path length: ${totalDist.toFixed(2)} km (${(totalDist * 0.621371).toFixed(0)} miles)`);
console.log(`✓ Average spacing: ${(totalDist / sortedPath.length).toFixed(3)} km`);
console.log(`✓ Maximum gap: ${maxGap.toFixed(3)} km`);

// Save the sorted path
const output = {
  name: data.name,
  source: data.source,
  date: new Date().toISOString(),
  note: "Coordinates sorted using nearest-neighbor algorithm for continuous path rendering from Pittsburgh to Cairo",
  coordinates: sortedPath
};

fs.writeFileSync(inputPath, JSON.stringify(output, null, 2));
console.log('\n✓ Optimized path written to:', inputPath);
console.log('✓ Map should now render a smooth, continuous river path!');
