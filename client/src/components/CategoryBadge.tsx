import { Badge } from "@/components/ui/badge";

interface CategoryBadgeProps {
  category: string;
  variant?: "default" | "secondary" | "outline";
}

export default function CategoryBadge({ category, variant = "secondary" }: CategoryBadgeProps) {
  return (
    <Badge variant={variant} data-testid={`badge-category-${category.toLowerCase()}`}>
      {category}
    </Badge>
  );
}
