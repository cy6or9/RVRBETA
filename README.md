# River Valley Report — Next.js Merge

This is a merged Next.js project that combines the RVRBETA frontend and the rvr-backend
USGS / OpenWeather logic into a single app.

## Scripts

- `npm install`
- `npm run dev` — local dev on http://localhost:3000
- `npm run build && npm start` — production

## Environment

Create a `.env.local` file in the project root with:

```bash
OPENWEATHER_API_KEY=your_openweather_key_here
AIRNOW_API_KEY=your_airnow_key_here   # optional, for /api/aqi
```

Deploy to Vercel / Netlify / Render as a **Next.js** app.