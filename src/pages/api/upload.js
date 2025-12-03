import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const uploadDir = path.join(process.cwd(), "public/uploads");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = formidable({ multiples: false, uploadDir, keepExtensions: true });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Upload failed" });
    }

    const file = files.image;
    const filePath = `/uploads/${path.basename(file.filepath)}`;

    return res.status(200).json({
      message: "Upload successful",
      imageUrl: filePath,
    });
  });
}
