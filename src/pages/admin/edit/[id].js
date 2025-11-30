import Link from "next/link";
import { useRouter } from "next/router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Eye, Upload, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

export default function EditArticlePage() {
  const router = useRouter();
  const { id } = router.query;
  const { isAdmin, loading } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("Editor");
  const [imageUrl, setImageUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    data: article,
    isLoading: isArticleLoading,
  } = useQuery({
    queryKey: id ? ["/api/articles", id] : null,
    queryFn: () => apiRequest("GET", `/api/articles/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (article) {
      setTitle(article.title || "");
      setCategory(article.category || "");
      setExcerpt(article.excerpt || "");
      setContent(article.content || "");
      setAuthor(article.author || "Editor");
      setImageUrl(article.imageUrl || null);
    }
  }, [article]);

  const saveMutation = useMutation({
    mutationFn: async (status) => {
      const articleData = {
        title,
        excerpt,
        content,
        category,
        author,
        imageUrl: imageUrl || undefined,
        status,
      };

      return await apiRequest("PATCH", `/api/articles/${id}`, articleData);
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ["/api/articles", id] });
      }
      toast({
        title: status === "published" ? "Article published" : "Draft saved",
        description: `Your article has been ${
          status === "published" ? "published" : "saved as a draft"
        }.`,
      });
      router.push("/admin");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save article. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setImageUrl(data.imageUrl);
      toast({
        title: "Image uploaded",
        description: "Your image has been uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => saveMutation.mutate("draft");
  const handlePublish = () => saveMutation.mutate("published");

  const isFormValid =
    title.trim() &&
    category.trim() &&
    excerpt.trim() &&
    content.trim() &&
    author.trim();

  // --------- ADMIN GUARD ---------
  if (loading || isArticleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">
          {loading ? "Checking permissions…" : "Loading article…"}
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4">
          <h1 className="text-xl font-bold mb-2">Admin access only</h1>
          <p className="text-muted-foreground text-sm">
            You must be signed in with an approved admin account to edit
            articles.
          </p>
          <Button onClick={() => router.push("/")}>Back to homepage</Button>
        </Card>
      </div>
    );
  }
  // --------------------------------

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="button-back-admin"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold">Edit Article</h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleSave}
                disabled={!isFormValid || saveMutation.isPending}
                data-testid="button-save-draft"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Save Draft</span>
              </Button>
              <Button
                className="gap-2"
                onClick={handlePublish}
                disabled={!isFormValid || saveMutation.isPending}
                data-testid="button-publish"
              >
                <Eye className="w-4 h-4" />
                Publish
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="title">Article Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter article title..."
                    className="text-lg font-semibold mt-2"
                    data-testid="input-article-title"
                  />
                </div>

                <div>
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Author name..."
                    className="mt-2"
                    data-testid="input-article-author"
                  />
                </div>

                <div>
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea
                    id="excerpt"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Brief summary of the article..."
                    className="mt-2 resize-none"
                    rows={3}
                    data-testid="input-article-excerpt"
                  />
                </div>

                <div>
                  <Label htmlFor="content">Article Content</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your article here..."
                    className="mt-2 resize-none font-serif text-base leading-relaxed"
                    rows={20}
                    data-testid="input-article-content"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {content.split(/\s+/).filter(Boolean).length} words
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Article Settings</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger
                      className="mt-2"
                      data-testid="select-category"
                    >
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Local News">Local News</SelectItem>
                      <SelectItem value="News">News</SelectItem>
                      <SelectItem value="Community">Community</SelectItem>
                      <SelectItem value="Events">Events</SelectItem>
                      <SelectItem value="Weather">Weather</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Featured Image</h3>
              <div className="space-y-4">
                {imageUrl ? (
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    <img
                      src={imageUrl}
                      alt="Featured"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => setImageUrl(null)}
                      data-testid="button-remove-image"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="block">
                    <div
                      className="border-2 border-dashed rounded-lg p-8 text-center hover-elevate active-elevate-2 cursor-pointer"
                      data-testid="button-upload-image"
                    >
                      {isUploading ? (
                        <>
                          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-pulse" />
                          <p className="text-sm text-muted-foreground">
                            Uploading...
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload image
                          </p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
