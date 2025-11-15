import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil, Trash2, Search, FileText, TrendingUp } from "lucide-react";
import { useState } from "react";
import type { Article } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: articles = [], isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles/all"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/articles/${id}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      queryClient.removeQueries({ queryKey: [`/api/articles/${deletedId}`] });
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

  const filteredArticles = articles.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: articles.length,
    published: articles.filter((a) => a.status === "published").length,
    drafts: articles.filter((a) => a.status === "draft").length,
  };

  const statItems = [
    { label: "Total Articles", value: stats.total.toString(), icon: FileText },
    { label: "Published", value: stats.published.toString(), icon: TrendingUp },
    { label: "Drafts", value: stats.drafts.toString(), icon: Pencil },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back-home">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
            </div>
            <Link href="/admin/new">
              <Button className="gap-2" data-testid="button-new-article">
                <Plus className="w-4 h-4" />
                New Article
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {statItems.map((stat) => (
            <Card key={stat.label} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold" data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {stat.value}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold">All Articles</h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-articles"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading articles...</p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery ? "No articles found" : "No articles yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="flex flex-col sm:flex-row items-start gap-4 p-4 border rounded-lg hover-elevate"
                  data-testid={`row-article-${article.id}`}
                >
                  {article.imageUrl && (
                    <div className="w-full sm:w-32 aspect-video overflow-hidden rounded-md flex-shrink-0">
                      <img
                        src={article.imageUrl}
                        alt={article.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-1 line-clamp-1" data-testid={`text-article-title-${article.id}`}>
                      {article.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <Badge variant="secondary">{article.category}</Badge>
                      <Badge variant={article.status === "published" ? "default" : "outline"}>
                        {article.status === "published" ? "Published" : "Draft"}
                      </Badge>
                      <span>
                        {new Date(article.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Link href={`/admin/edit/${article.id}`} className="flex-1 sm:flex-initial">
                      <Button variant="outline" size="sm" className="gap-2 w-full" data-testid={`button-edit-${article.id}`}>
                        <Pencil className="w-4 h-4" />
                        <span className="sm:hidden">Edit</span>
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this article?")) {
                          deleteMutation.mutate(article.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${article.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="sm:hidden">Delete</span>
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
