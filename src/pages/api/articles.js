import { firestore } from "@/lib/firebaseAdmin";

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function serializeArticle(id, data) {
  return {
    id,
    ...data,
    createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt || null,
    updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt || null,
  };
}

export default async function handler(req, res) {
  try {
    // GET LIST OR SINGLE
    if (req.method === "GET") {
      const { id, status } = req.query;

      if (id) {
        const doc = await firestore.collection("articles").doc(id).get();
        if (!doc.exists) return res.status(404).json({ error: "Article not found" });
        return res.status(200).json(serializeArticle(doc.id, doc.data()));
      }

      const filter = status || "published";
      const snapshot = await firestore
        .collection("articles")
        .where("status", "==", filter)
        .orderBy("createdAt", "desc")
        .get();

      const articles = snapshot.docs.map((d) => serializeArticle(d.id, d.data()));
      return res.status(200).json(articles);
    }

    // CREATE OR UPDATE
    if (req.method === "POST") {
      const { id, title, excerpt = "", content, category = "", author = "", status = "draft", featuredImage = "" } =
        req.body || {};

      if (!title || !content) {
        return res.status(400).json({ error: "Title and content required" });
      }

      const now = new Date();
      const slug = slugify(title);
      const base = { title, slug, excerpt, content, category, author, status, featuredImage, updatedAt: now };

      let ref;
      if (id) {
        ref = firestore.collection("articles").doc(id);
        await ref.set(base, { merge: true });
      } else {
        ref = await firestore.collection("articles").add({ ...base, createdAt: now });
      }

      const saved = await ref.get();
      return res.status(id ? 200 : 201).json(serializeArticle(saved.id, saved.data()));
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("ERROR in /api/articles:", err);
    if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
  }
}
