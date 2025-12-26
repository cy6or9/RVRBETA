// /src/lib/articlesStore.js
// Persistent file-based article storage for Next.js API routes.
//
// Netlify serverless resets memory – so we store articles in /data/articles.json
// to persist across cold starts and deployments.

import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "articles.json");

// Initialize data dir if missing
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function load() {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {

    return [];
  }
}

function save(list) {
  fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
}

let articles = load();
let nextId = articles.length ? Math.max(...articles.map(a => Number(a.id))) + 1 : 1;

export function listArticles() {
  return [...articles].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
    imageUrl: data.imageUrl ?? null,
    status: data.status ?? "draft",
    createdAt: now,
    updatedAt: now,
  };

  articles.unshift(article);
  save(articles);
  return article;
}

export function updateArticle(id, data) {
  const idx = articles.findIndex((a) => a.id === String(id));
  if (idx === -1) return null;

  const now = new Date().toISOString();
  articles[idx] = {
    ...articles[idx],
    ...data,
    updatedAt: now,
  };

  save(articles);
  return articles[idx];
}

export function deleteArticle(id) {
  const idx = articles.findIndex((a) => a.id === String(id));
  if (idx === -1) return false;

  articles.splice(idx, 1);
  save(articles);
  return true;
}
