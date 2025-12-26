// /src/pages/api/admin/map-data.js
// Admin endpoint for saving map changes (river points, locks, stations)

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Return current map data
    res.status(200).json({
      success: true,
      message: 'Map data endpoint ready for updates',
    });
  } else if (req.method === 'POST') {
    // Save updated map data
    const { action, data } = req.body;

    // TODO: In production, validate admin token and save to database
    // For now, we'll return success and let client handle real-time updates

    if (action === 'updateRiverPoints') {
      // Save river polyline points

      res.status(200).json({
        success: true,
        message: 'River points saved',
        action,
      });
    } else if (action === 'updateLocks') {
      // Save lock positions

      res.status(200).json({
        success: true,
        message: 'Lock positions saved',
        action,
      });
    } else if (action === 'updateStations') {
      // Save station positions

      res.status(200).json({
        success: true,
        message: 'Station positions saved',
        action,
      });
    } else if (action === 'addStation') {
      // Add new station with validation
      const { id, township, state, lat, lon, ahps } = data;
      if (!id || !township || !state || lat == null || lon == null) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: id, township, state, lat, lon',
        });
      }

      res.status(201).json({
        success: true,
        message: 'Station added successfully',
        station: data,
      });
    } else if (action === 'removeStation') {
      // Remove station
      const { id } = data;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Station ID required',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Station removed successfully',
        id,
      });
    } else if (action === 'addLock') {
      // Add new lock/dam with validation
      const { id, name, riverMile, lat, lon } = data;
      if (!id || !name || riverMile == null || lat == null || lon == null) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: id, name, riverMile, lat, lon',
        });
      }

      res.status(201).json({
        success: true,
        message: 'Lock added successfully',
        lock: data,
      });
    } else if (action === 'removeLock') {
      // Remove lock/dam
      const { id } = data;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Lock ID required',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Lock removed successfully',
        id,
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Unknown action',
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
