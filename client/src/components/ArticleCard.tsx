import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import CategoryBadge from "./CategoryBadge";
import { Calendar, User } from "lucide-react";

interface ArticleCardProps {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  imageUrl: string;
  featured?: boolean;
}

export default function ArticleCard({
  id,
  title,
  excerpt,
  category,
  author,
  date,
  imageUrl,
  featured = false,
}: ArticleCardProps) {
  return (
    <Link href={`/article/${id}`}>
      <Card
        className="overflow-hidden hover-elevate active-elevate-2 transition-all h-full flex flex-col"
        data-testid={`card-article-${id}`}
      >
        <div className="aspect-video overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
            data-testid={`img-article-${id}`}
          />
        </div>
        <div className="p-4 sm:p-6 flex flex-col flex-1">
          <div className="mb-3">
            <CategoryBadge category={category} />
          </div>
          <h3
            className={`font-bold mb-2 line-clamp-2 ${
              featured ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"
            }`}
            data-testid={`text-article-title-${id}`}
          >
            {title}
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 line-clamp-3 flex-1" data-testid={`text-article-excerpt-${id}`}>
            {excerpt}
          </p>
          <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span data-testid={`text-article-author-${id}`}>{author}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span data-testid={`text-article-date-${id}`}>{date}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
