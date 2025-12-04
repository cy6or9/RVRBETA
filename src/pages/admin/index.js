// /src/pages/admin/index.js
import Link from "next/link";
import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useQuery, useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Search,
  FileText,
  Loader2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function AdminArticlesPage() {
  const router = useRouter();
  const { isAdmin, loading } = useAuth();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: articles = [],
    isLoading,
  } = useQuery({
    // FIX: use the real list endpoint
    queryKey: ["/api/articles"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiRequest("DELETE", `/api/articles/${id}`);
    },
    onSuccess: (_, deletedId) => {
      // FIX: invalidate the same key the list query uses
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      queryClient.removeQueries({ queryKey: ["/api/articles", deletedId] });

      toast({
        title: "Article deleted",
        description: "The article has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete article. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredArticles = useMemo(
    () =>
      articles.filter((article) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
          article.title?.toLowerCase().includes(term) ||
          article.excerpt?.toLowerCase().includes(term) ||
          article.category?.toLowerCase().includes(term)
        );
      }),
    [articles, searchTerm],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Checking permissions…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4">
          <h1 className="text-xl font-semibold">Access Denied</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to view this page.
          </p>
          <Button onClick={() => router.push("/")}>Go to Homepage</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/")}
              className="hidden sm:inline-flex"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Admin
              </p>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Manage Articles
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/admin/new" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Article</span>
                <span className="sm:hidden">New</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Card className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Articles</h2>
              <p className="text-sm text-muted-foreground">
                Search, edit, publish, or delete articles.
              </p>
            </div>
            <div className="relative w-full sm:w-72 md:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, category, or text…"
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <p className="font-medium mb-2">No articles found</p>
              <p className="text-sm mb-4">
                Try adjusting your search, or create a new article.
              </p>
              <Button asChild>
                <Link href="/admin/new">
                  <Plus className="w-4 h-4 mr-2" />
                  New Article
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 sm:p-4 rounded-lg border bg-card"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold leading-tight">
                        {article.title}
                      </h3>
                      {article.status === "draft" ? (
                        <Badge variant="outline" className="text-xs">
                          Draft
                        </Badge>
                      ) : (
                        <Badge className="text-xs">Published</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {article.category} •{" "}
                      {new Date(article.createdAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {article.excerpt}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      data-testid={`button-edit-${article.id}`}
                    >
                      <Link href={`/admin/edit/${article.id}`}>
                        <Pencil className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Edit</span>
                        <span className="sm:hidden">Edit</span>
                      </Link>
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        deleteMutation.mutate(article.id, {
                          onSuccess: () => {},
                        })
                      }
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${article.id}`}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline ml-1">Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
