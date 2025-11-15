import CategoryBadge from '../CategoryBadge'

export default function CategoryBadgeExample() {
  return (
    <div className="flex gap-2 p-4">
      <CategoryBadge category="Local News" />
      <CategoryBadge category="News" variant="outline" />
      <CategoryBadge category="Community" />
    </div>
  )
}
