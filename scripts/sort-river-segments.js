#!/usr/bin/env node

/**
 * Advanced river sorting: Identify continuous segments, order them, then connect
 * This handles the case where the source data contains multiple disconnected LineString features
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

// Step 1: Identify continuous segments (points close together)
const GAP_THRESHOLD = 2.0; // km - points further apart are in different segments
const coords = data.coordinates;
const segments = [];
let currentSegment = [coords[0]];

console.log('Identifying continuous segments...');

for (let i = 1; i < coords.length; i++) {
  const dist = distance(coords[i-1], coords[i]);
  
  if (dist < GAP_THRESHOLD) {
    // Continue current segment
    currentSegment.push(coords[i]);
  } else {
    // Start new segment
    if (currentSegment.length > 1) {
      segments.push(currentSegment);
    }
    currentSegment = [coords[i]];
  }
  
  if (i % 5000 === 0) {
    process.stdout.write(`\r  Processed ${i}/${coords.length} points, found ${segments.length} segments`);
  }
}

// Add last segment
if (currentSegment.length > 1) {
  segments.push(currentSegment);
}

console.log(`\n✓ Found ${segments.length} continuous segments`);

// Show segment info
segments.forEach((seg, idx) => {
  const first = seg[0];
  const last = seg[seg.length - 1];
  const segLength = seg.slice(1).reduce((sum, point, i) => {
    return sum + distance(seg[i], point);
  }, 0);
  
  console.log(`  Segment ${idx + 1}: ${seg.length} points, ${segLength.toFixed(2)} km`);
  console.log(`    Start: [${first[0].toFixed(4)}, ${first[1].toFixed(4)}]`);
  console.log(`    End:   [${last[0].toFixed(4)}, ${last[1].toFixed(4)}]`);
});

// Step 2: Order segments from Pittsburgh to Cairo
// Calculate average position and distance from Pittsburgh for each segment
const PITTSBURGH = [40.44, -79.99];

const segmentInfo = segments.map((seg, idx) => {
  // Use first point to determine segment position
  const first = seg[0];
  const distFromPitt = distance(first, PITTSBURGH);
  
  return {
    index: idx,
    segment: seg,
    length: seg.length,
    distFromPitt,
    firstPoint: first
  };
});

// Sort segments by distance from Pittsburgh
segmentInfo.sort((a, b) => a.distFromPitt - b.distFromPitt);

console.log('\n✓ Segments ordered by distance from Pittsburgh:');
segmentInfo.forEach((info, idx) => {
  console.log(`  ${idx + 1}. Segment ${info.index + 1}: ${info.length} points, ${info.distFromPitt.toFixed(2)} km from Pittsburgh`);
});

// Step 3: Connect segments into final path
console.log('\nBuilding final continuous path...');
const finalPath = [];

segmentInfo.forEach((info, idx) => {
  const seg = info.segment;
  
  if (finalPath.length === 0) {
    // First segment - add all points
    finalPath.push(...seg);
  } else {
    // Check which end of segment is closer to current path end
    const pathEnd = finalPath[finalPath.length - 1];
    const distToSegStart = distance(pathEnd, seg[0]);
    const distToSegEnd = distance(pathEnd, seg[seg.length - 1]);
    
    if (distToSegStart < distToSegEnd) {
      // Add segment in normal order
      finalPath.push(...seg);
    } else {
      // Add segment in reverse order
      finalPath.push(...seg.reverse());
    }
  }
  
  console.log(`  Added segment ${info.index + 1} (${info.length} points)`);
});

console.log(`\n✓ Final path has ${finalPath.length} points`);

// Calculate final stats
let maxGap = 0;
let totalDist = 0;
let gapsOver5km = 0;

for (let i = 1; i < finalPath.length; i++) {
  const dist = distance(finalPath[i-1], finalPath[i]);
  totalDist += dist;
  if (dist > maxGap) maxGap = dist;
  if (dist > 5) gapsOver5km++;
}

console.log(`\n✓ Total path length: ${totalDist.toFixed(2)} km (${(totalDist * 0.621371).toFixed(0)} miles)`);
console.log(`✓ Average spacing: ${(totalDist / finalPath.length).toFixed(3)} km`);
console.log(`✓ Maximum gap: ${maxGap.toFixed(3)} km`);
console.log(`✓ Gaps > 5km: ${gapsOver5km}`);

// Verify endpoints
const first = finalPath[0];
const last = finalPath[finalPath.length - 1];
const CAIRO = [36.99, -89.18];

console.log(`\n✓ First point: [${first[0].toFixed(4)}, ${first[1].toFixed(4)}]`);
console.log(`  Distance from Pittsburgh: ${distance(first, PITTSBURGH).toFixed(2)} km`);
console.log(`✓ Last point: [${last[0].toFixed(4)}, ${last[1].toFixed(4)}]`);
console.log(`  Distance to Cairo: ${distance(last, CAIRO).toFixed(2)} km`);

// Save
const output = {
  name: data.name,
  source: data.source,
  date: new Date().toISOString(),
  note: "Coordinates organized into continuous segments and ordered from Pittsburgh to Cairo for smooth path rendering",
  segments: segments.length,
  coordinates: finalPath
};

fs.writeFileSync(inputPath, JSON.stringify(output, null, 2));
console.log('\n✓ Optimized segmented path written to:', inputPath);
console.log('✓ River should now render properly on the map!');
