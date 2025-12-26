import { storage } from "@/lib/firebaseAdmin";
import { v4 as uuid } from "uuid";

export const config = {
  api: { bodyParser: false },
};

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const chunks = [];

    req.on("data", (chunk) => {
      chunks.push(chunk);
    });

    req.on("end", async () => {
      try {
        const fileBuffer = Buffer.concat(chunks);

        if (!fileBuffer.length) {
          return res.status(400).json({ error: "Empty file" });
        }

        const fileName = `article-images/${uuid()}.jpg`;
        const file = storage.file(fileName);

        await file.save(fileBuffer, {
          metadata: { contentType: "image/jpeg" },
        });

        const [signedUrl] = await file.getSignedUrl({
          action: "read",
          expires: "03-09-2491",
        });

        // Return both keys for safety, but the UI uses imageUrl
        return res.status(200).json({
          imageUrl: signedUrl,
          url: signedUrl,
        });
      } catch (err) {

        return res.status(500).json({ error: "Upload failed" });
      }
    });

    req.on("error", (err) => {

      if (!res.headersSent) {
        res.status(500).json({ error: "Upload stream error" });
      }
    });
  } catch (err) {

    if (!res.headersSent) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
