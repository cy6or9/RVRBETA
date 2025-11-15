import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import CategoryBadge from "./CategoryBadge";
import { Calendar, User } from "lucide-react";

interface HeroSectionProps {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  imageUrl: string;
}

export default function HeroSection({
  id,
  title,
  excerpt,
  category,
  author,
  date,
  imageUrl,
}: HeroSectionProps) {
  return (
    <div className="relative w-full aspect-[21/9] sm:aspect-[16/9] overflow-hidden rounded-lg" data-testid="section-hero">
      <img
        src={imageUrl}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover"
        data-testid={`img-hero-${id}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 lg:p-12">
        <div className="max-w-3xl">
          <div className="mb-4">
            <CategoryBadge category={category} />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4" data-testid={`text-hero-title-${id}`}>
            {title}
          </h2>
          <p className="text-base sm:text-lg text-gray-200 mb-6 line-clamp-2" data-testid={`text-hero-excerpt-${id}`}>
            {excerpt}
          </p>
          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span data-testid={`text-hero-author-${id}`}>{author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span data-testid={`text-hero-date-${id}`}>{date}</span>
            </div>
          </div>
          <Link href={`/article/${id}`}>
            <Button variant="outline" className="bg-background/10 backdrop-blur-sm border-white/20 text-white hover:bg-background/20" data-testid={`button-read-article-${id}`}>
              Read Article
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
