// /src/pages/api/articles/[id].js
// Fetch, update, or delete a single article by ID.

import {
  getArticle,
  updateArticle,
  deleteArticle,
} from "@/lib/articlesStore";

export default function handler(req, res) {
  const {
    query: { id },
    method,
  } = req;

  if (!id) {
    return res.status(400).json({ error: "Missing article id" });
  }

  if (method === "GET") {
    const article = getArticle(id);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }
    return res.status(200).json(article);
  }

  if (method === "PATCH") {
    const { title, excerpt, content, category, author, imageUrl, status } =
      req.body || {};

    const updated = updateArticle(id, {
      title,
      excerpt,
      content,
      category,
      author,
      imageUrl,
      status,
    });

    if (!updated) {
      return res.status(404).json({ error: "Article not found" });
    }

    return res.status(200).json(updated);
  }

  if (method === "DELETE") {
    const ok = deleteArticle(id);
    if (!ok) {
      return res.status(404).json({ error: "Article not found" });
    }
    return res.status(204).end();
  }

  return res.status(405).json({ error: "Method not allowed" });
}
