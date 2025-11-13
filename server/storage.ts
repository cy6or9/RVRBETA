import { type Article, type InsertArticle } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getArticle(id: string): Promise<Article | undefined>;
  getAllArticles(): Promise<Article[]>;
  getPublishedArticles(): Promise<Article[]>;
  createArticle(article: InsertArticle): Promise<Article>;
  updateArticle(id: string, article: Partial<InsertArticle>): Promise<Article | undefined>;
  deleteArticle(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private articles: Map<string, Article>;

  constructor() {
    this.articles = new Map();
  }

  async getArticle(id: string): Promise<Article | undefined> {
    return this.articles.get(id);
  }

  async getAllArticles(): Promise<Article[]> {
    return Array.from(this.articles.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getPublishedArticles(): Promise<Article[]> {
    return Array.from(this.articles.values())
      .filter((article) => article.status === "published")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const id = randomUUID();
    const now = new Date();
    const article: Article = {
      ...insertArticle,
      imageUrl: insertArticle.imageUrl ?? null,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.articles.set(id, article);
    return article;
  }

  async updateArticle(id: string, updates: Partial<InsertArticle>): Promise<Article | undefined> {
    const existing = this.articles.get(id);
    if (!existing) {
      return undefined;
    }

    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    const updated: Article = {
      ...existing,
      ...cleanUpdates,
      updatedAt: new Date(),
    };
    this.articles.set(id, updated);
    return updated;
  }

  async deleteArticle(id: string): Promise<boolean> {
    return this.articles.delete(id);
  }
}

export const storage = new MemStorage();
