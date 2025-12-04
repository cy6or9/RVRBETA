// /src/pages/api/upload.js
import { storage } from "@/lib/firebaseAdmin";
import { v4 as uuid } from "uuid";

export const config = { api: { bodyParser: false } };

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const contentType = req.headers["content-type"] || "application/octet-stream";

  const chunks = [];

  req.on("data", (chunk) => {
    chunks.push(chunk);
  });

  req.on("end", async () => {
    try {
      const fileBuffer = Buffer.concat(chunks);

      if (!fileBuffer.length) {
        return res.status(400).json({ error: "No file received" });
      }

      const extFromType =
        typeof contentType === "string" && contentType.includes("/")
          ? contentType.split("/")[1]
          : "bin";

      const fileName = `article-images/${uuid()}.${extFromType}`;
      const file = storage.file(fileName);

      await file.save(fileBuffer, {
        metadata: { contentType },
      });

      const [url] = await file.getSignedUrl({
        action: "read",
        expires: "03-01-2099",
      });

      return res.status(200).json({
        message: "Upload successful",
        imageUrl: url,
      });
    } catch (error) {
      console.error("Upload error:", error);
      if (!res.headersSent) {
        return res.status(500).json({ error: "Upload failed" });
      }
    }
  });

  req.on("error", (err) => {
    console.error("Upload stream error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Upload failed" });
    }
  });
}
