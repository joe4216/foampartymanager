# Foam Works Party Co - Replit Configuration

## Overview

Foam Works Party Co is a foam party rental booking platform featuring a customer-facing website for browsing packages and making reservations, plus an owner portal for managing bookings. The application enables customers to select foam party packages, choose event dates, and submit booking requests, while owners can track and manage bookings through multiple views (dashboard, calendar, and kanban board).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- No server-side rendering (RSC disabled)

**UI Component System**
- shadcn/ui component library (New York style preset) for consistent UI patterns
- Radix UI primitives for accessible, unstyled components
- Tailwind CSS for utility-first styling with custom design tokens
- Class Variance Authority (CVA) for type-safe component variants

**Design System**
- Typography: Poppins for headings, Inter for body text
- Color system based on HSL CSS variables for theme flexibility
- Neutral base color palette (210° hue, 6% saturation)
- Spacing system using Tailwind's 4px-based scale
- Custom shadow and elevation utilities

**State Management**
- TanStack Query (React Query) for server state management and caching
- Local component state with React hooks
- Query client configured with infinite stale time and disabled auto-refetching for controlled data updates

**Key Pages & Routing**
- Customer homepage (`/`) - 8-section marketing site with booking flow
- Owner dashboard (`/owner/dashboard`) - Stats and recent bookings overview
- Calendar view (`/owner/calendar`) - Date-based booking management
- Kanban view (`/owner/kanban`) - Workflow-based booking management
- Shared layout wrapper for owner portal with sidebar navigation

### Backend Architecture

**Server Framework**
- Express.js with TypeScript running on Node.js
- Custom middleware for request logging and JSON body parsing
- HTTP server creation for potential WebSocket upgrades

**API Design**
- RESTful endpoints under `/api` prefix
- Resource-based routing for bookings CRUD operations
- Validation using Zod schemas from shared types
- Consistent error handling with appropriate HTTP status codes

**Key Endpoints**
- `POST /api/bookings` - Create new booking
- `GET /api/bookings` - List all bookings
- `GET /api/bookings/:id` - Fetch single booking
- `PATCH /api/bookings/:id/status` - Update booking status
- `POST /api/create-venmo-booking` - Create booking with Venmo payment method
- `POST /api/venmo/upload-receipt` - Upload receipt screenshot for AI verification
- `GET /api/venmo/pending` - Get pending Venmo payments (owner only)
- `POST /api/venmo/verify` - Manually verify Venmo payment (owner only)

**Venmo Payment Integration**
- Venmo username: @joe4216
- AI-powered receipt verification using OpenAI Vision API
- Auto-verification when detected amount matches expected amount (within $1 tolerance)
- Manual review queue for mismatched or low-confidence detections
- Receipt images stored in uploads/receipts directory

**AI Chatbot**
- Floating chat widget on homepage (bottom-right corner)
- OpenAI-powered natural language understanding
- Capabilities: booking lookup, reschedule, cancel, package info, contact owner
- Booking verification by email or phone number
- Context-aware conversation with booking details
- Quick action buttons for common tasks

**Development Features**
- Vite middleware integration for HMR during development
- Custom error overlay plugin for runtime error visibility
- Request/response logging with duration tracking
- Cartographer and dev banner plugins for Replit environment

### Data Layer

**ORM & Database**
- Drizzle ORM for type-safe database queries
- PostgreSQL dialect configuration
- Neon serverless database driver with WebSocket support
- Schema-first approach with automatic TypeScript type inference

**Database Schema**
- `users` table with fields: id, username, password, firstName, lastName, phone, email
- `verification_codes` table with fields: id, user_id, code, expires_at, created_at, used
- `bookings` table with fields: id, customerName, email, phone, address, partySize, packageType, eventDate, eventTime, status, notes, createdAt, paymentMethod, expectedAmount, receivedAmount, receiptImageUrl, paymentVerified, verifiedAt, verificationNotes, pendingExpiresAt, reminder1SentAt, reminder2SentAt, cancelNote
- Status enum: pending, confirmed, completed, cancelled
- Payment methods: stripe, venmo
- Serial primary key with auto-incrementing IDs
- Timestamp fields with automatic `defaultNow()` for creation tracking

**Abandoned Booking Recovery System**
- 3-day grace period for pending bookings before auto-cancellation
- Background scheduler runs hourly (server/scheduler.ts)
- Reminder 1: Email sent after 24 hours of pending status
- Reminder 2: Email sent after 48 hours of pending status
- Auto-cancellation: Booking cancelled after 72 hours with note "Booking was not completed"
- Returning customer detection: Lookup by email or phone, pre-fills form with pending booking data
- Time slots only blocked after payment completion, not during pending status

**Email Verification for Owner Login**
- Two-step authentication: password verification followed by email code
- Uses Resend API for sending verification emails (RESEND_API_KEY secret required)
- 6-digit codes expire after 10 minutes
- First-time login prompts user to set up email address
- Endpoints: POST /api/login/request-code, POST /api/login/verify-code, POST /api/login/set-email
- Email service in server/email.ts using Resend SDK

**Note on Twilio SMS**
- SMS verification via Twilio was initially planned but user's Twilio account is restricted
- Contact compliance-review@twilio.com to lift restrictions if SMS is needed in future

**Data Access Pattern**
- Repository pattern via `DatabaseStorage` class
- Interface-driven design (`IStorage`) for potential mock implementations
- Drizzle query builder for type-safe SQL generation
- Schema definitions shared between client and server via `@shared` alias

**Type Safety**
- Drizzle-Zod integration for runtime validation from schema
- Shared TypeScript types exported from schema file
- Insert schemas that omit auto-generated fields
- Separate validation schemas for partial updates (e.g., status changes)

### External Dependencies

**UI Libraries**
- @radix-ui/* - Complete set of accessible UI primitives (accordion, dialog, dropdown, popover, select, etc.)
- embla-carousel-react - Touch-enabled carousel component
- react-day-picker - Calendar date picker component
- date-fns - Date formatting and manipulation
- lucide-react - Icon library
- cmdk - Command menu component

**Form Handling**
- react-hook-form - Form state management
- @hookform/resolvers - Zod schema validation integration

**Database & ORM**
- @neondatabase/serverless - Neon database client with WebSocket support
- drizzle-orm - Type-safe ORM
- drizzle-kit - Schema migrations and push tools
- connect-pg-simple - PostgreSQL session store (for potential authentication)

**Build & Development**
- vite - Build tool and dev server
- @vitejs/plugin-react - React support for Vite
- tsx - TypeScript execution for development
- esbuild - Server-side bundling for production
- @replit/* plugins - Replit-specific development tools

**Utilities**
- wouter - Lightweight routing library
- clsx & tailwind-merge - Conditional CSS class management
- nanoid - Unique ID generation
- ws - WebSocket library for database connections

## Deployment

### Production Infrastructure
- **Hosting**: Railway (railway.app)
- **Database**: Neon PostgreSQL (serverless)
- **Payments**: Stripe with Connect

### Environment Variables (Required for Railway)
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `SESSION_SECRET` | Random string for session encryption |
| `APP_DOMAIN` | Railway domain (e.g., `your-app.up.railway.app`) |

### Build & Start Commands
- `npm run build` - Builds frontend (Vite) and backend (esbuild)
- `npm run start` - Runs production server on PORT env variable