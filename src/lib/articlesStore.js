// /src/lib/articlesStore.js
// Persistent file-based article storage for Next.js API routes.
//
// This replaces the old in-memory store that reset on Netlify.
// Articles are now saved into /data/articles.json and remain
// intact across deployments and function cold starts.

import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "articles.json");

// Ensure /data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load articles from disk or initialize
function loadArticles() {
  if (!fs.existsSync(filePath)) {
    // First-time init: seed the example article
    const now = new Date().toISOString();
    const seed = [
      {
        id: "1",
        title: "Welcome to River Valley Report",
        excerpt:
          "RiverValleyReport.com is live. Track river levels, weather, and local conditions along the Ohio River valley.",
        content:
          "River Valley Report is now live and ready to bring you up-to-date information on river stages, weather, and conditions along the Ohio River corridor. This is a demo article created by the persistent storage initializer. Once you publish your own stories, they will appear here instead.",
        category: "River Conditions",
        author: "Editor",
        imageUrl:
          "https://images.unsplash.com/photo-1502218808492-05bcb9c3c087?auto=format&fit=crop&w=1200&q=80",
        status: "published",
        createdAt: now,
        updatedAt: now,
      },
    ];

    fs.writeFileSync(filePath, JSON.stringify(seed, null, 2));
    return seed;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return [];
  }
}

// Save articles to disk
function saveArticles(articles) {
  fs.writeFileSync(filePath, JSON.stringify(articles, null, 2));
}

// Cached in-memory reference for faster ops
let articles = loadArticles();
let nextId =
  articles.length > 0
    ? Math.max(...articles.map((a) => Number(a.id))) + 1
    : 1;

// ---- PUBLIC API ---- //

export function listArticles() {
  // newest first
  return [...articles].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

export function getArticle(id) {
  return articles.find((a) => a.id === String(id)) || null;
}

export function createArticle(data) {
  const now = new Date().toISOString();
  const article = {
    id: String(nextId++),
    title: data.title,
    excerpt: data.excerpt,
    content: data.content,
    category: data.category,
    author: data.author || "Editor",
    imageUrl:
      data.imageUrl ||
      "https://images.unsplash.com/photo-1502218808492-05bcb9c3c087?auto=format&fit=crop&w=1200&q=80",
    status: data.status || "draft",
    createdAt: now,
    updatedAt: now,
  };

  articles.unshift(article);
  saveArticles(articles);

  return article;
}

export function updateArticle(id, data) {
  const idx = articles.findIndex((a) => a.id === String(id));
  if (idx === -1) return null;

  const now = new Date().toISOString();
  const updated = {
    ...articles[idx],
    ...data,
    author: data.author ?? articles[idx].author,
    imageUrl: data.imageUrl ?? articles[idx].imageUrl,
    status: data.status ?? articles[idx].status,
    updatedAt: now,
  };

  articles[idx] = updated;
  saveArticles(articles);

  return updated;
}

export function deleteArticle(id) {
  const idx = articles.findIndex((a) => a.id === String(id));
  if (idx === -1) return false;

  articles.splice(idx, 1);
  saveArticles(articles);

  return true;
}
