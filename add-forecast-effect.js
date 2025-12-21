const fs = require('fs');

const file = 'src/pages/river-conditions.js';
let content = fs.readFileSync(file, 'utf8');

// Find the line with predictionSeries
const searchLine = 'const predictionSeries = normalizeForecastSeries(data, 7);';
const idx = content.indexOf(searchLine);

if (idx === -1) {
  console.log('ERROR: Could not find prediction series line');
  process.exit(1);
}

// Find the next meaningful line after the blank line
const afterPrediction = idx + searchLine.length;
const nextLineStart = content.indexOf('\n', afterPrediction);
const blankLineEnd = content.indexOf('\n', nextLineStart + 1);

// Check if useEffect already exists
if (content.includes('updateCachedForecast(predictionSeries)')) {
  console.log('✓ Forecast caching effect already exists');
  process.exit(0);
}

// Insert the useEffect hook
const effectCode = `

  // Update cached forecast when prediction data changes
  useEffect(() => {
    if (updateCachedForecast && predictionSeries && predictionSeries.length > 0) {
      updateCachedForecast(predictionSeries);
    }
  }, [predictionSeries, updateCachedForecast]);
`;

content = content.substring(0, blankLineEnd) + effectCode + content.substring(blankLineEnd);

fs.writeFileSync(file, content);
console.log('✓ Added forecast caching useEffect hook');
