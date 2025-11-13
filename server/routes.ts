import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertArticleSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";
import multer from "multer";
import { randomUUID } from "crypto";
import { ObjectStorageService, parseObjectPath } from "./objectStorage";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all published articles (public)
  app.get("/api/articles", async (req, res) => {
    try {
      const articles = await storage.getPublishedArticles();
      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  // Get all articles including drafts (admin)
  app.get("/api/articles/all", async (req, res) => {
    try {
      const articles = await storage.getAllArticles();
      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  // Get single article
  app.get("/api/articles/:id", async (req, res) => {
    try {
      const article = await storage.getArticle(req.params.id);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json(article);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch article" });
    }
  });

  // Create new article
  app.post("/api/articles", async (req, res) => {
    try {
      const result = insertArticleSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: fromError(result.error).toString(),
        });
      }

      const article = await storage.createArticle(result.data);
      res.status(201).json(article);
    } catch (error) {
      res.status(500).json({ message: "Failed to create article" });
    }
  });

  // Update article
  app.patch("/api/articles/:id", async (req, res) => {
    try {
      const result = insertArticleSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: fromError(result.error).toString(),
        });
      }

      const article = await storage.updateArticle(req.params.id, result.data);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }

      res.json(article);
    } catch (error) {
      res.status(500).json({ message: "Failed to update article" });
    }
  });

  // Delete article
  app.delete("/api/articles/:id", async (req, res) => {
    try {
      const success = await storage.deleteArticle(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete article" });
    }
  });

  // Upload image
  app.post("/api/upload", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const objectStorageService = new ObjectStorageService();
      const privateDir = objectStorageService.getPrivateObjectDir();
      const ext = req.file.originalname.split(".").pop() || "jpg";
      const filename = `${randomUUID()}.${ext}`;
      const fullPath = `${privateDir}/images/${filename}`;

      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageService.objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      await file.save(req.file.buffer, {
        contentType: req.file.mimetype,
        metadata: {
          metadata: {
            "custom:aclPolicy": JSON.stringify({
              owner: "admin",
              visibility: "public",
            }),
          },
        },
      });

      const imageUrl = `/api/storage/images/${filename}`;
      res.json({ imageUrl });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Serve uploaded images
  app.get("/api/storage/images/:filename", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const privateDir = objectStorageService.getPrivateObjectDir();
      const fullPath = `${privateDir}/images/${req.params.filename}`;

      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageService.objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).json({ message: "Image not found" });
      }

      await objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Storage error:", error);
      res.status(500).json({ message: "Failed to retrieve image" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
