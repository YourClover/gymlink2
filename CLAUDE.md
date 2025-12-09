# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev              # Start dev server on port 3000
npm run build            # Build for production
npm run test             # Run tests (Vitest)
npm run check            # Fix formatting and linting (Prettier + ESLint)
npm run db:migrate       # Create and run Prisma migrations
npm run db:generate      # Generate Prisma Client after schema changes
npm run db:seed          # Seed database with initial data
npm run db:studio        # Open Prisma Studio UI
```

## Architecture

**Stack:** React 19 + TypeScript + TanStack Start (full-stack framework) + Prisma + PostgreSQL + Tailwind CSS v4

### File-Based Routing (TanStack Router)

- Routes defined in `src/routes/` directory
- Use `createFileRoute(path)({component})` pattern
- `routeTree.gen.ts` is auto-generated - do not edit manually
- Root layout in `__root.tsx` wraps all pages with AuthProvider

### Server Functions

- Defined in `*.server.ts` files (e.g., `src/lib/auth.server.ts`)
- Use `createServerFn({method}).inputValidator().handler()` pattern
- Run on server via Nitro, called transparently from client

### Authentication

- JWT tokens stored in localStorage
- `AuthContext` provides `useAuth()` hook for auth state
- Password hashing with bcryptjs (12 rounds)
- Server-side token verification in `auth.server.ts`

### Database (Prisma)

- Schema in `prisma/schema.prisma`
- Prisma Client singleton in `src/lib/db.ts` (prevents multiple instances)
- Uses PrismaPg adapter for connection pooling

## Key Directories

- `src/routes/` - Page components (file-based routing)
- `src/components/` - Reusable UI components
- `src/context/` - React Context providers (AuthContext)
- `src/lib/` - Utilities, database, and server functions
- `prisma/` - Database schema and migrations

## Code Style

- Prettier: no semicolons, single quotes, trailing commas
- TypeScript strict mode enabled
- Path alias: `@/*` maps to `./src/*`
- Tailwind CSS for styling (dark theme with zinc/blue accents)
