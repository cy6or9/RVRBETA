export default async function handler(req, res) {
  // Placeholder until full CMS / DB integration.
  // You can replace this with real DB logic later.
  if (req.method === "GET") {
    return res.status(200).json([]);
  }

  return res.status(405).json({ error: "Method not allowed" });
}