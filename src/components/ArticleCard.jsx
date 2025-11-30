import Link from "next/link";
import CategoryBadge from "./CategoryBadge";
import { Calendar, User } from "lucide-react";

export default function ArticleCard({ id, title, excerpt, category, author, date, imageUrl }) {
  return (
    <article className="border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-card">
      <Link href={`/article/${id}`}>
        <div className="cursor-pointer">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-48 object-cover rounded-t-lg"
            loading="lazy"
          />

          <div className="p-4 space-y-3">
            <CategoryBadge category={category} />

            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-3">{excerpt}</p>

            <div className="flex items-center text-xs text-muted-foreground gap-4 pt-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>

              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {author}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
