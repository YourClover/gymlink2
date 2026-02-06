# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev              # Start dev server on port 3000
npm run start            # Start dev server on port 3000 with network access (--host)
npm run build            # Build for production
npm run test             # Run tests once (Vitest)
npm run test:watch       # Run tests in watch mode
npm run check            # Fix formatting and linting (Prettier + ESLint)
npm run lint             # Run ESLint only
npm run format           # Run Prettier only
npm run db:migrate       # Create and run Prisma migrations
npm run db:generate      # Generate Prisma Client after schema changes
npm run db:push          # Push schema to database (no migrations, useful for prototyping)
npm run db:seed          # Seed database with initial data
npm run db:studio        # Open Prisma Studio UI
```

Run a single test file: `npx vitest run src/lib/formatting.test.ts`

Tests live alongside source code as `*.test.ts` in `src/lib/`. Coverage is scoped to `src/lib/**`.

## Architecture

**Stack:** React 19 + TypeScript + TanStack Start (full-stack framework) + Prisma + PostgreSQL + Tailwind CSS v4

**Icons:** Lucide React (`lucide-react`)
**Charts:** Recharts (`recharts`)

### File-Based Routing (TanStack Router)

- Routes defined in `src/routes/` directory
- Use `createFileRoute(path)({component})` pattern
- `routeTree.gen.ts` is auto-generated - do not edit manually
- Root layout in `__root.tsx` wraps all pages with AuthProvider and ToastProvider
- Dynamic segments use `$param` syntax (e.g., `plans/$planId/day/$dayId.tsx`)

### Server Functions

- Defined in `*.server.ts` files in `src/lib/` (e.g., `auth.server.ts`, `workouts.server.ts`)
- Use `createServerFn({method}).inputValidator().handler()` pattern from `@tanstack/react-start`
- Run on server via Nitro, called transparently from client
- Most authenticated endpoints accept a `token` field and call `getCurrentUser(token)` to verify auth
- Prisma is SSR-external in vite config — if adding new server-only packages, add them to `ssr.external` in `vite.config.ts`

### Authentication

- JWT tokens stored in localStorage as `gymlink_auth_token`
- `AuthContext` (`src/context/AuthContext.tsx`) provides `useAuth()` hook for auth state
- Password hashing with bcryptjs (12 rounds)
- Server-side token verification via `getCurrentUser()` in `auth.server.ts`

### Database (Prisma)

- Schema in `prisma/schema.prisma`
- Prisma Client singleton in `src/lib/db.ts` (prevents multiple instances)
- Uses PrismaPg adapter for connection pooling
- After schema changes: run `npm run db:generate` then `npm run db:migrate`

### Context Providers

- `useAuth()` — authentication state, login/register/logout
- `useToast()` — toast notification display

Both throw if used outside their providers (which are set up in `__root.tsx`).

## Key Directories

- `src/routes/` — Page components (file-based routing)
- `src/components/` — Reusable UI components, organized by feature subdirectory
- `src/context/` — React Context providers (AuthContext, ToastContext)
- `src/lib/` — Utilities, database client, and `*.server.ts` server functions
- `src/hooks/` — Custom React hooks
- `prisma/` — Database schema, migrations, and seed script

## Code Style

- Prettier: no semicolons, single quotes, trailing commas
- TypeScript strict mode enabled
- Path alias: `@/*` maps to `./src/*`
- Tailwind CSS for styling (dark theme with zinc/blue accents)

## Docker

### Development with Docker Compose

```bash
docker compose up -d       # Start app and PostgreSQL database
docker compose logs -f app # View logs
docker compose down        # Stop services
```

Required environment variables (set in `.env` or shell):

- `POSTGRES_PASSWORD` - PostgreSQL password
- `JWT_SECRET` - Secret for JWT token signing
- `JWT_EXPIRES_IN` - Token expiration (default: 7d)

### Production Build

```bash
docker build -t gymlink .

docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=... \
  gymlink
```

The Dockerfile uses multi-stage builds and runs as non-root user. Migrations run automatically on container start.
