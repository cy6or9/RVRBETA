// /pages/api/admin/users-client.js
// Alternative endpoint that uses client SDK to fetch users
// Used as fallback when Admin SDK can't access Firestore

export default async function handler(req, res) {
  console.log("[API /admin/users-client] Request received");
  
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // This endpoint returns a message that the client should use Firestore directly
  // The admin page can use the client SDK to query Firestore
  res.status(200).json({
    message: "Use client SDK",
    useClientSDK: true
  });
}
