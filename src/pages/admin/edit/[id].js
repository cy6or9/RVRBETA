// /src/pages/admin/edit/[id].js
// Article editing has been disabled

import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function EditArticlePage() {
  const router = useRouter();
  const { isAdmin, loading } = useAuth();

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin")}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <Card className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Article Editing Disabled</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Article editing through the admin panel has been disabled. Please
              contact the site administrator if you need to modify content.
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <Button onClick={() => router.push("/admin")}>
              Back to Admin
            </Button>
            <Button variant="outline" onClick={() => router.push("/")}>
              Go to Homepage
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
  } = useQuery({
    queryKey: ["/api/articles", id],
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
    },
    onError: (error) => {

      toast({
        title: "Error",
        description:
          "Failed to save article. Please check your fields and try again.",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: arrayBuffer,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setImageUrl(data.imageUrl);

      toast({
        title: "Image uploaded",
        description: "The image has been uploaded successfully.",
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
              onClick={() => router.push("/admin")}
              className="hidden sm:inline-flex"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Admin
              </p>
              <h1 className="text-xl sm:text-2xl font-bold">Edit Article</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={handleSave}
              disabled={!isFormValid || saveMutation.isPending}
              data-testid="button-save-draft"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Save Draft</span>
            </Button>

            <Button
              type="button"
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
                  <div className="relative">
                    <img
                      src={imageUrl}
                      alt="Featured"
                      className="w-full rounded-md object-cover max-h-64"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => setImageUrl(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-muted-foreground/30 rounded-md cursor-pointer hover:border-primary/60 transition">
                    <div className="flex flex-col items-center gap-2">
                      {isUploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      ) : (
                        <Upload className="w-6 h-6 text-muted-foreground" />
                      )}
                      <p className="text-sm font-medium">
                        {isUploading
                          ? "Uploading image..."
                          : "Click to upload image"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JPG or PNG, up to a few MB.
                      </p>
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
