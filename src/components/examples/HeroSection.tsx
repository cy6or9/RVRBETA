import HeroSection from '../HeroSection'
import heroImage from '@assets/generated_images/River_valley_hero_image_030b0bdb.png'

export default function HeroSectionExample() {
  return (
    <div className="p-4">
      <HeroSection
        id="featured"
        title="River Valley Community Comes Together for Annual Fall Festival"
        excerpt="Thousands gathered along the riverfront this weekend to celebrate our region's heritage with food, music, and family-friendly activities."
        category="Local News"
        author="Michael Anderson"
        date="Nov 5, 2025"
        imageUrl={heroImage}
      />
    </div>
  )
}
