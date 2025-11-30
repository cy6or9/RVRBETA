import ArticleCard from '../ArticleCard'
import heroImage from '@assets/generated_images/Farmers_market_community_event_ac4fa7ea.png'

export default function ArticleCardExample() {
  return (
    <div className="max-w-sm p-4">
      <ArticleCard
        id="1"
        title="Community Farmers Market Draws Record Crowd"
        excerpt="Local farmers and artisans showcased their finest produce and handcrafted goods at this weekend's farmers market, attracting the largest crowd in the event's history."
        category="Community"
        author="Sarah Johnson"
        date="Nov 6, 2025"
        imageUrl={heroImage}
      />
    </div>
  )
}
