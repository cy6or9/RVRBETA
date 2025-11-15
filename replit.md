# River Valley Report

## Overview

River Valley Report is a local news publishing platform built as a full-stack web application. The system provides a dual-interface design: a public-facing news website for readers and an administrative dashboard for content management. The platform enables journalists and editors to create, edit, and publish articles with rich media content, while readers can browse and consume local news stories organized by category.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript for component-based UI development
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack React Query for server state management and data fetching
- shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens

**Design System:**
- Typography: Inter font for headlines/UI, Georgia/Merriweather for article body text
- Component library follows "New York" shadcn style variant
- Custom CSS variables for theming (light/dark mode support)
- Responsive grid layouts: single-column content for reading, multi-column grids for article listings
- Touch-friendly interactions optimized for tablet/mobile publishing

**Key Pages:**
- Home: Featured hero article plus grid of latest articles
- Article Page: Full article view with related content suggestions
- Admin Dashboard: Article management with statistics, search, and CRUD operations
- Article Editor: Rich form-based content creation/editing with image upload

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript running on Node.js
- Vite for development server with HMR (Hot Module Replacement)
- esbuild for production builds

**API Design:**
- RESTful endpoints under `/api` namespace
- Routes for article CRUD operations (GET, POST, PUT, DELETE)
- Separate endpoints for public articles vs. all articles (including drafts)
- Multer middleware for handling multipart/form-data file uploads

**Data Layer:**
- Drizzle ORM for type-safe database operations
- PostgreSQL as the primary database (via Neon serverless driver)
- Schema defines articles table with fields: id, title, excerpt, content, category, author, imageUrl, status, timestamps
- In-memory storage fallback implementation for development/testing

**Session Management:**
- Express sessions with PostgreSQL session store (connect-pg-simple)
- Session-based request tracking and logging

### File Storage

**Google Cloud Storage Integration:**
- Object storage client configured for Replit's sidecar authentication
- Custom ObjectStorageService class for managing file operations
- Image uploads stored in private buckets with controlled access
- Cache-control headers for optimized content delivery

### Data Models

**Article Schema:**
- Primary fields: title, excerpt, content, category, author
- Optional image URL for featured images
- Status field: "draft" or "published" for workflow management
- Automatic timestamp tracking (createdAt, updatedAt)
- UUID-based primary keys

**Validation:**
- Zod schemas for runtime type validation
- Frontend form validation using react-hook-form with Zod resolvers
- Server-side validation before database operations

### State Management

**Client-Side:**
- React Query for server state caching and synchronization
- Optimistic updates and automatic cache invalidation
- Query keys organized by resource paths (e.g., `/api/articles`)
- Custom query client configuration with infinite stale time

**Form State:**
- React Hook Form for complex form state management in the editor
- Controlled components for all input fields
- Real-time validation feedback

### Build & Development

**Development Workflow:**
- Vite dev server with middleware mode for integrated frontend/backend development
- Hot module replacement for rapid iteration
- Source maps for debugging
- Replit-specific plugins for enhanced development experience

**Production Build:**
- Client: Vite builds to `dist/public`
- Server: esbuild bundles to `dist/index.js` with ESM format
- Platform-agnostic Node.js bundle with external packages

### Routing Strategy

**Client-Side Routes:**
- `/` - Public homepage
- `/article/:id` - Individual article view
- `/admin` - Article management dashboard
- `/admin/new` - Create new article
- `/admin/edit/:id` - Edit existing article

**API Routes:**
- `GET /api/articles` - Published articles only (public)
- `GET /api/articles/all` - All articles including drafts (admin)
- `GET /api/articles/:id` - Single article by ID
- `POST /api/articles` - Create new article
- `PUT /api/articles/:id` - Update article
- `DELETE /api/articles/:id` - Delete article
- `POST /api/upload` - Image upload endpoint

## External Dependencies

**Cloud Services:**
- **Neon Database**: Serverless PostgreSQL database hosting
- **Google Cloud Storage**: Object storage for article images and media files
- **Replit Infrastructure**: Sidecar authentication service for GCS integration

**Key NPM Packages:**
- **UI Framework**: React, React DOM
- **Routing**: Wouter (lightweight client-side router)
- **Data Fetching**: TanStack React Query
- **Form Management**: React Hook Form, @hookform/resolvers
- **Validation**: Zod, drizzle-zod
- **Database**: Drizzle ORM, @neondatabase/serverless
- **File Upload**: Multer
- **UI Components**: Radix UI primitives (@radix-ui/react-*)
- **Styling**: Tailwind CSS, class-variance-authority, clsx
- **Date Handling**: date-fns
- **Build Tools**: Vite, esbuild, TypeScript

**Authentication:**
- External account authentication via Replit sidecar for GCS access
- Token-based credential exchange for cloud storage operations