# River Valley Report - Design Guidelines

## Design Approach

**Selected Approach:** Design System with News Industry Best Practices

Drawing from modern news platforms like Medium, Substack, and The Athletic for content presentation, combined with Material Design principles for the admin interface. This creates a professional, trustworthy local news experience while ensuring the publishing tools are intuitive across all devices.

**Core Principles:**
- Content-first hierarchy emphasizing readability
- Dual-interface design: Public news site + Admin publishing dashboard
- Touch-friendly interactions for tablet/mobile publishing
- Professional credibility for local journalism

## Typography System

**Font Stack:**
- Headlines: Inter (weights: 700, 800) - Bold, authoritative news headlines
- Body Text: Georgia or Merriweather - Optimized for long-form reading
- UI Elements: Inter (weights: 400, 500, 600) - Clean interface text

**Type Scale:**
- Article Headlines: text-4xl lg:text-5xl (bold, attention-grabbing)
- Section Headers: text-2xl lg:text-3xl
- Article Subheadings: text-xl font-semibold
- Body Copy: text-base lg:text-lg (generous line-height: leading-relaxed)
- Metadata/Bylines: text-sm
- UI Labels: text-sm font-medium

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4 to p-8
- Section spacing: py-12 to py-16
- Card gaps: gap-6 to gap-8
- Content margins: mb-4 to mb-8

**Grid Strategy:**
- Public Site: Single column content (max-w-3xl) for optimal reading
- Article Grid: 1-2-3 column responsive grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Admin Dashboard: Sidebar + main content layout

## Component Library

### Public News Site Components

**Navigation Header:**
- Fixed top navigation with site logo "River Valley Report"
- Category links (Local News, Community, Events, Weather)
- Search functionality
- Mobile: Hamburger menu

**Hero Section:**
- Featured article with large landscape image
- Headline overlay with semi-transparent background blur
- Author byline and publication date
- "Read Article" button with backdrop blur

**Article Cards:**
- Thumbnail image (16:9 aspect ratio)
- Category tag
- Headline (text-xl font-bold)
- Excerpt (2-3 lines, text-gray-600)
- Author and date metadata
- Hover effect: subtle elevation change

**Article Page Layout:**
- Hero image (full-width, aspect-video)
- Article metadata bar (author, date, category, read time)
- Content container (max-w-3xl, centered)
- Generous paragraph spacing
- Pull quotes styling
- Related articles footer section

### Admin Publishing Interface

**Dashboard Layout:**
- Side navigation (collapsible on mobile)
- Article list with status indicators (Published, Draft)
- Quick action buttons (New Article, Edit, Delete)
- Search and filter options

**Article Editor:**
- Rich text editor with formatting toolbar (sticky on scroll)
- Image upload zone with drag-and-drop
- Title input (large, prominent)
- Category selector dropdown
- Excerpt textarea
- Featured image selector
- Publish/Save Draft action buttons (bottom-right, sticky)
- Mobile: Streamlined single-column layout with collapsible toolbar

**Image Upload Component:**
- Large drop zone with visual feedback
- Progress indicator during upload
- Image preview with crop/resize options
- Alt text input field

### Form Elements
- Input fields: Consistent border, rounded-lg, p-3
- Textareas: Generous sizing, auto-expanding
- Buttons: Solid primary actions, outline secondary
- Dropdowns: Native select styling with custom arrow

## Images

**Hero Image:** Yes - Large landscape image for featured article on homepage
- Placement: Top of page, full-width container
- Aspect ratio: 21:9 or 16:9
- Overlay: Dark gradient for text legibility
- Description: Compelling local news photography (community events, landscapes, local interest)

**Article Thumbnails:**
- Grid layout images (16:9 ratio)
- Description: Supporting imagery for each article preview

**Article Content Images:**
- Embedded within article flow
- Full-width within content container
- Caption support below images

## Page Structures

**Homepage:**
1. Navigation header
2. Hero featured article (with large image)
3. Latest articles grid (3 columns desktop, 2 tablet, 1 mobile)
4. Category sections (Local News, Weather, Community - each with 4-6 articles)
5. Newsletter signup section
6. Footer (categories, about, contact, social links)

**Article Page:**
1. Navigation
2. Hero article image
3. Article metadata
4. Article content (proper reading width)
5. Related articles
6. Comments section placeholder
7. Footer

**Admin Dashboard:**
1. Side navigation
2. Article management table
3. Quick stats (total articles, drafts, published this week)
4. Recent activity feed

**Editor Page:**
1. Top toolbar (Save, Preview, Publish)
2. Article title input
3. Rich text editor
4. Featured image upload
5. Settings sidebar (category, tags, excerpt)

## Animations

Minimal, purposeful interactions only:
- Smooth page transitions
- Card hover elevation (subtle)
- Button state changes
- Image lazy loading fade-in
- No scroll-triggered animations

This design creates a trustworthy, professional local news platform optimized for both content consumption and easy multi-device publishing.