// /src/pages/api/articles.js
// List all articles and create new ones.

import {
  listArticles,
  createArticle,
} from "@/lib/articlesStore";

export default function handler(req, res) {
  if (req.method === "GET") {
    const articles = listArticles();
    return res.status(200).json(articles);
  }

  if (req.method === "POST") {
    const { title, excerpt, content, category, author, imageUrl, status } =
      req.body || {};

    if (
      !title ||
      !excerpt ||
      !content ||
      !category ||
      !author
    ) {
      return res.status(400).json({
        error:
          "Missing required fields. Title, excerpt, content, category, and author are required.",
      });
    }

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
  }

  return res.status(405).json({ error: "Method not allowed" });
}
