// /src/pages/api/articles/index.js
// List and create articles using the local JSON store.

import { listArticles, createArticle } from "@/lib/articlesStore";

export default function handler(req, res) {
  const { method } = req;

  if (method === "GET") {
    const { status } = req.query || {};
    let articles = listArticles();

    if (status && typeof status === "string" && status !== "all") {
      articles = articles.filter((a) => a.status === status);
    }

    return res.status(200).json(articles);
  }

  if (method === "POST") {
    const {
      title,
      excerpt = "",
      content,
      category = "",
      author = "Editor",
      imageUrl = null,
      status = "draft",
    } = req.body || {};

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content required" });
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

      return res.status(500).json({ error: "Failed to create article" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method not allowed" });
}
