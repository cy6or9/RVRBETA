// /src/lib/articlesStore.js
// Simple in-memory article store used by the Next.js API routes.
//
// NOTE: This is NOT persistent storage. On Netlify (or any serverless host)
// the data will reset whenever the function container is recycled or redeployed.
// It's perfect for local dev and temporary testing.

let articles = [];
let nextId = 1;

// Seed with a single example article so the homepage isn't empty
function seedIfEmpty() {
  if (articles.length === 0) {
    const now = new Date().toISOString();
    articles.push({
      id: String(nextId++),
      title: "Welcome to River Valley Report",
      excerpt:
        "RiverValleyReport.com is live. Track river levels, weather, and local conditions along the Ohio River valley.",
      content:
        "River Valley Report is now live and ready to bring you up-to-date information on river stages, weather, and conditions along the Ohio River corridor. This is a demo article created by the in-memory store. Once you publish your own stories, they will appear here instead.",
      category: "River Conditions",
      author: "Editor",
      imageUrl:
        "https://images.unsplash.com/photo-1502218808492-05bcb9c3c087?auto=format&fit=crop&w=1200&q=80",
      status: "published",
      createdAt: now,
      updatedAt: now,
    });
  }
}

export function listArticles() {
  seedIfEmpty();
  // newest first
  return [...articles].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

export function getArticle(id) {
  seedIfEmpty();
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
  return article;
}

export function updateArticle(id, data) {
  const idx = articles.findIndex((a) => a.id === String(id));
  if (idx === -1) return null;

  const existing = articles[idx];
  const now = new Date().toISOString();

  const updated = {
    ...existing,
    ...data,
    author: data.author ?? existing.author,
    imageUrl: data.imageUrl ?? existing.imageUrl,
    status: data.status ?? existing.status,
    updatedAt: now,
  };

  articles[idx] = updated;
  return updated;
}

export function deleteArticle(id) {
  const idx = articles.findIndex((a) => a.id === String(id));
  if (idx === -1) return false;
  articles.splice(idx, 1);
  return true;
}
