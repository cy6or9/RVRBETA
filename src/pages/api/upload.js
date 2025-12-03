// /src/pages/api/upload.js
// Minimal stub upload endpoint so the editor doesn't break.
// NOTE: This does NOT actually store the uploaded file. It simply returns
// a placeholder image URL so the UI works and articles can be saved.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // At this stage we are NOT parsing the multipart body, because doing
  // real file uploads on Netlify would require external storage (S3, etc).
  // We just respond with a valid JSON payload so the front-end flow works.

  // Use a decent generic river image as a placeholder.
  const placeholderUrl =
    "https://images.unsplash.com/photo-1502218808492-05bcb9c3c087?auto=format&fit=crop&w=1200&q=80";

  return res.status(200).json({
    message: "Upload stub: using placeholder image.",
    imageUrl: placeholderUrl,
  });
}
