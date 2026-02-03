# Souto Vivo - Questionnaire Management System

## Overview

This is a web application for registering, digitizing, and integrating responses from the "CUESTIONARIO DE INTERÉS – PROYECTO SOUTO VIVO" (Interest Questionnaire for the Souto Vivo Project) related to participation in pilot agroforestry farms. The system centralizes questionnaire responses in a unified database with support for manual web entry, bulk PDF upload with OCR processing, and Google Forms synchronization.

The application is built as a full-stack TypeScript project with a React frontend and Express backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode support)
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite

The frontend follows a page-based structure under `client/src/pages/` with shared components in `client/src/components/`. Authentication state is managed via React Context with session storage persistence.

### Backend Architecture
- **Framework**: Express 5 on Node.js
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful JSON API under `/api/` prefix
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Zod schemas generated from Drizzle schema via drizzle-zod

The backend uses a storage pattern (`server/storage.ts`) that abstracts database operations, making it easier to test and potentially swap storage implementations.

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with typed schema definitions
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)
- **Migrations**: Drizzle Kit with migrations output to `./migrations`

The schema includes extensive use of PostgreSQL enums for categorical fields (gender, age ranges, farm relations, submission status, etc.) to ensure data integrity.

### Authentication
- Simple username/password authentication against environment variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD`)
- Session-based auth stored in browser sessionStorage
- Protected routes redirect unauthenticated users to `/login`
- No database-backed user management currently (admin credentials in secrets)

### Key Data Models
- **Users**: Basic user table with role-based access (currently unused for auth)
- **Submissions**: Main questionnaire response table with 50+ fields covering:
  - Personal data (name, contact, location)
  - Demographics (gender, age ranges)
  - Farm characteristics (ownership, size, terrain, access)
  - Project interests and availability
  - Consent and governance preferences

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **connect-pg-simple**: PostgreSQL session store (available but auth currently uses sessionStorage)

### Build & Development
- **Vite**: Frontend build tool with HMR support
- **esbuild**: Server bundling for production builds
- **tsx**: TypeScript execution for development

### UI Framework
- **Radix UI**: Headless component primitives (dialogs, dropdowns, forms, etc.)
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **class-variance-authority**: Component variant management

### Form & Validation
- **React Hook Form**: Form state management
- **Zod**: Schema validation (shared between client and server)
- **@hookform/resolvers**: Zod integration with React Hook Form

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `ADMIN_USERNAME`: Administrator username for login
- `ADMIN_PASSWORD`: Administrator password for login

### Replit-Specific Plugins
- `@replit/vite-plugin-runtime-error-modal`: Error overlay in development
- `@replit/vite-plugin-cartographer`: Development tooling
- `@replit/vite-plugin-dev-banner`: Development environment indicator