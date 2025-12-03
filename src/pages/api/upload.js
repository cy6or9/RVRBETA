// /src/pages/api/upload.js
import { storage } from "@/lib/firebaseAdmin";
import { v4 as uuid } from "uuid";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", async () => {
      const fileBuffer = Buffer.concat(chunks);
      const fileName = `article-images/${uuid()}.jpg`;
      const file = storage.file(fileName);

      await file.save(fileBuffer, {
        metadata: { contentType: "image/jpeg" },
      });

      const [url] = await file.getSignedUrl({
        action: "read",
        expires: "03-01-2099",
      });

      return res.status(200).json({
        message: "Upload successful",
        imageUrl: url,
      });
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: "Upload failed" });
  }
}
