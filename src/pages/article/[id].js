import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import CategoryBadge from "@/components/CategoryBadge";
import { Calendar, User, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { apiRequest } from "@/lib/queryClient";

export default function ArticlePage() {
  const router = useRouter();
  const { id } = router.query;
  const articleId = id || "";

  // Fetch this article
  const {
    data: article,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/articles", articleId],
    queryFn: () => apiRequest("GET", `/api/articles/${articleId}`),
    enabled: !!articleId,
  });

  // Fetch all articles for related section
  const { data: allArticles = [] } = useQuery({
    queryKey: ["/api/articles"],
  });

  const relatedArticles = allArticles
    .filter((a) => a.id !== articleId && a.category === article?.category)
    .slice(0, 3);

  if (isLoading || !articleId) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Loading article…</p>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !article) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center text-center p-6">
          <h1 className="text-3xl font-bold mb-4">Article Not Found</h1>
          <Link href="/">
            <button className="underline text-[hsl(142,70%,35%)]">Return to Home</button>
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <article className="max-w-4xl mx-auto px-4 py-8">
          <Link href="/">
            <button className="flex items-center gap-2 text-sm mb-6 text-muted-foreground hover:text-[hsl(142,70%,35%)] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </Link>

          <div className="mb-4">
            <CategoryBadge category={article.category} />
          </div>

          <h1 className="text-4xl font-bold mb-6">{article.title}</h1>

          <div className="flex flex-wrap gap-6 mb-8 text-muted-foreground text-sm">
            <span className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {article.author}
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(article.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          {article.imageUrl && (
            <img
              src={article.imageUrl}
              alt={article.title}
              className="rounded-lg w-full object-cover max-h-[450px] mb-8"
            />
          )}

          <div className="prose prose-lg max-w-none font-serif leading-relaxed">
            {article.content}
          </div>
        </article>

        {relatedArticles.length > 0 && (
          <section className="border-t bg-card mt-12 py-12">
            <div className="max-w-7xl mx-auto px-4">
              <h2 className="text-2xl font-bold mb-8">Related Stories</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedArticles.map((ra) => (
                  <ArticleCard
                    key={ra.id}
                    id={ra.id}
                    title={ra.title}
                    excerpt={ra.excerpt}
                    category={ra.category}
                    author={ra.author}
                    date={ra.createdAt}
                    imageUrl={ra.imageUrl || "/placeholder.jpg"}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
