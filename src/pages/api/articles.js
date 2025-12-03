// /src/pages/api/articles.js
// List all articles and create new ones.

import { listArticles, createArticle } from "@/lib/articlesStore";

export default function handler(req, res) {
  const { method } = req;

  if (method === "GET") {
    const articles = listArticles();
    return res.status(200).json(articles);
  }

  if (method === "POST") {
    const { title, excerpt, content, category, author, imageUrl, status } =
      req.body || {};

    if (!title || !excerpt || !content || !category || !author) {
      return res.status(400).json({
        error:
          "Missing required fields. Title, excerpt, content, category, and author are required.",
      });
    }

    try {
      const article = createArticle({
        title,
        excerpt,
        content,
        category,
        author,
        imageUrl,
        status,
      });

      return res.status(201).json(article);
    } catch (err) {
      console.error("Error creating article:", err);
      return res.status(500).json({ error: "Failed to create article" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
