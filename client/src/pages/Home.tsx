import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ArticleCard from "@/components/ArticleCard";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PenSquare } from "lucide-react";
import type { Article } from "@shared/schema";

export default function Home() {
  const { data: articles = [], isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
  });

  const featuredArticle = articles[0];
  const latestArticles = articles.slice(1);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading articles...</p>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">No Articles Yet</h2>
              <p className="text-muted-foreground mb-6">
                Get started by creating your first article
              </p>
              <Link href="/admin/new">
                <Button className="gap-2" data-testid="button-create-first-article">
                  <PenSquare className="w-4 h-4" />
                  Create First Article
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {featuredArticle && (
                <div className="mb-12">
                  <HeroSection
                    id={featuredArticle.id}
                    title={featuredArticle.title}
                    excerpt={featuredArticle.excerpt}
                    category={featuredArticle.category}
                    author={featuredArticle.author}
                    date={new Date(featuredArticle.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    imageUrl={featuredArticle.imageUrl || "/placeholder.jpg"}
                  />
                </div>
              )}

              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold">Latest Stories</h2>
                <Link href="/admin">
                  <Button variant="default" className="gap-2" data-testid="button-admin-dashboard">
                    <PenSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">Admin Dashboard</span>
                    <span className="sm:hidden">Admin</span>
                  </Button>
                </Link>
              </div>

              {latestArticles.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  {latestArticles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      id={article.id}
                      title={article.title}
                      excerpt={article.excerpt}
                      category={article.category}
                      author={article.author}
                      date={new Date(article.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      imageUrl={article.imageUrl || "/placeholder.jpg"}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* MarineTraffic Embed */}
        <iframe
          width="100%"
          height="530"
          frameBorder="0"
          style={{ border: 0 }}
          src="https://www.marinetraffic.com/en/ais/embed/map/zoom:10/centery:37.7700/centerx:-87.5747/layers:vessels:windbarbs"
          allowFullScreen
          loading="lazy"
          title="MarineTraffic Map"
        />

        {/* NOAA Water Level Embed */}
        <iframe
          src="https://water.noaa.gov/gauges/UNWK2"
          width="100%"
          height="800"
          frameBorder="0"
          style={{ border: 0, marginTop: "1rem" }}
          title="NOAA Water Level Gauge"
          loading="lazy"
        />
      </main>

      <Footer />
    </div>
  );
}
