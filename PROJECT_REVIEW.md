# GymLink Project Review

> Comprehensive codebase audit conducted on 2026-02-25

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Stack](#architecture--stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Server Functions](#server-functions)
6. [Routes & Pages](#routes--pages)
7. [Components](#components)
8. [Hooks & Context](#hooks--context)
9. [Utilities & Constants](#utilities--constants)
10. [Testing](#testing)
11. [Configuration & DevOps](#configuration--devops)
12. [Identified Issues](#identified-issues)
13. [Strengths](#strengths)
14. [Recommendations](#recommendations)

---

## Project Overview

GymLink is a full-stack fitness tracking application with social features, workout planning, achievement systems, challenges, and detailed progress analytics. It supports collaborative workout plans, leaderboards, user comparison, and an activity feed.

**Key Features:**

- Workout session tracking with set logging and PR detection
- Workout plan creation, sharing, and collaboration
- Achievement system (38 achievements across 7 categories)
- Social features (follow system, activity feed, user profiles)
- Challenges with multiple types (volume, workouts, streaks, etc.)
- Comprehensive statistics and progress charts
- Leaderboards (global and friends)
- Exercise library with muscle group/equipment filtering

---

## Architecture & Stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Frontend   | React 19 + TypeScript                           |
| Framework  | TanStack Start (full-stack, file-based routing) |
| Server     | Nitro (via TanStack Start)                      |
| Database   | PostgreSQL 16 + Prisma ORM 7.1                  |
| Styling    | Tailwind CSS v4                                 |
| Icons      | Lucide React                                    |
| Charts     | Recharts                                        |
| Auth       | JWT (jsonwebtoken) + bcryptjs (12 rounds)       |
| Testing    | Vitest + Testing Library                        |
| Build      | Vite 7.1                                        |
| Deployment | Docker (multi-stage, non-root)                  |

**Key architectural patterns:**

- Server functions in `*.server.ts` files using `createServerFn()` from TanStack Start
- File-based routing with `createFileRoute()` pattern
- JWT tokens stored in `localStorage` as `gymlink_auth_token`
- Prisma Client singleton with PrismaPg adapter for connection pooling
- Context providers for auth and toasts (set up in `__root.tsx`)
- Path alias `@/*` maps to `./src/*`

---

## Project Structure

```
gymlink2/
├── prisma/
│   ├── schema.prisma              # Database schema (13 models, 12 enums)
│   ├── seed.ts                    # Seeds 38 achievement definitions
│   └── migrations/                # 7 migrations
├── src/
│   ├── routes/                    # 35 route files (file-based routing)
│   │   ├── __root.tsx             # Root layout (providers)
│   │   ├── index.tsx              # Landing page
│   │   ├── login.tsx              # Login
│   │   ├── register.tsx           # Registration
│   │   ├── dashboard.tsx          # Main dashboard
│   │   ├── feed.tsx               # Activity feed
│   │   ├── stats.tsx              # Statistics dashboard
│   │   ├── prs.tsx                # Personal records
│   │   ├── history.tsx            # Workout history
│   │   ├── health.tsx             # Health check
│   │   ├── achievements.tsx       # Achievement gallery
│   │   ├── leaderboards.tsx       # Leaderboards
│   │   ├── followers.tsx          # Follow management
│   │   ├── notifications.tsx      # Notifications
│   │   ├── workout/               # Workout flows (index, active, summary)
│   │   ├── plans/                 # Plan CRUD (list, new, detail, day)
│   │   ├── exercises/             # Exercise library
│   │   ├── profile/               # Profile (view, edit, settings, setup, admin)
│   │   ├── challenges/            # Challenges (list, new, detail, join)
│   │   ├── u/$username.tsx        # Public user profile
│   │   ├── compare/$username.tsx  # User comparison
│   │   ├── users/search.tsx       # User search
│   │   └── progress.$exerciseId.tsx # Exercise progression
│   ├── components/                # 73 component files across 18 subdirectories
│   │   ├── ui/                    # 10 reusable UI components
│   │   ├── workout/               # 7 workout components
│   │   ├── stats/                 # 12 stats/chart components
│   │   ├── plans/                 # 4 plan components
│   │   ├── exercises/             # 5 exercise components
│   │   ├── achievements/          # 5 achievement components
│   │   ├── history/               # 5 history components
│   │   ├── forms/                 # 4 form components
│   │   ├── progression/           # 3 progression components
│   │   ├── compare/               # 4 comparison components
│   │   ├── sharing/               # 2 sharing modals
│   │   ├── feed/                  # 2 feed components
│   │   ├── social/                # 2 social components
│   │   ├── notifications/         # 2 notification components
│   │   ├── prs/                   # 1 PR component
│   │   ├── AppLayout.tsx          # Main layout with auth guard
│   │   ├── BottomNav.tsx          # Mobile bottom navigation
│   │   └── ErrorBoundary.tsx      # Error boundary
│   ├── lib/                       # 36 files (server functions + utilities)
│   │   ├── db.ts                  # Prisma Client singleton
│   │   ├── constants.ts           # 35+ app constants
│   │   ├── formatting.ts          # Display formatting utilities
│   │   ├── date-utils.ts          # Date helpers
│   │   ├── pr-utils.ts            # PR display/priority logic
│   │   ├── plan-types.ts          # Plan-related types
│   │   ├── progression-utils.ts   # Progression utilities
│   │   └── *.server.ts            # 20 server function files
│   ├── hooks/                     # 2 custom hooks
│   │   ├── useBodyOverflow.ts     # Modal body scroll lock
│   │   └── useChartDimensions.ts  # Responsive chart sizing
│   ├── context/                   # 2 context providers
│   │   ├── AuthContext.tsx         # Authentication state
│   │   └── ToastContext.tsx        # Toast notifications
│   ├── test/
│   │   └── setup.ts               # Vitest setup with Prisma mocks
│   ├── router.tsx                 # Router configuration
│   ├── routeTree.gen.ts           # Auto-generated (do not edit)
│   └── styles.css                 # Global CSS
├── Dockerfile                     # Multi-stage production build
├── docker-compose.yml             # Dev setup (app + postgres)
├── vite.config.ts                 # Build config
├── vitest.config.ts               # Test config
├── tsconfig.json                  # TypeScript (strict, ES2022)
├── eslint.config.js               # ESLint (TanStack config)
└── prettier.config.js             # No semicolons, single quotes
```

---

## Database Schema

### Models (13 core + 6 social)

| Model                    | Purpose                                              | Key Relations                                          |
| ------------------------ | ---------------------------------------------------- | ------------------------------------------------------ |
| **User**                 | Core user (email, password, admin flag, soft-delete) | Has many: sessions, plans, profiles, PRs, achievements |
| **UserProfile**          | Social profile (username, bio, privacy settings)     | Belongs to User                                        |
| **WorkoutPlan**          | Workout programs                                     | Has many: PlanDay, PlanCollaborator                    |
| **PlanDay**              | Days within a plan                                   | Has many: PlanExercise                                 |
| **PlanExercise**         | Exercises in a plan day (with targets)               | References Exercise                                    |
| **Exercise**             | Exercise library (name, muscle group, equipment)     | Custom or built-in                                     |
| **WorkoutSession**       | Individual workout (start/end, mood, notes)          | Has many: WorkoutSet                                   |
| **WorkoutSet**           | Individual sets (weight, reps, time, RPE)            | Part of WorkoutSession                                 |
| **PersonalRecord**       | PRs (unique per user/exercise/recordType)            | References Exercise                                    |
| **PlanShareCode**        | Shareable plan codes (8-char, expirable)             | References WorkoutPlan                                 |
| **PlanCollaborator**     | Collaboration (roles: EDITOR/VIEWER)                 | References WorkoutPlan + User                          |
| **Achievement**          | Achievement definitions (38 seeded)                  | Has many: UserAchievement                              |
| **UserAchievement**      | Earned achievements per user                         | Unique constraint: user+achievement                    |
| **Follow**               | Follow requests (PENDING/ACCEPTED/DECLINED)          | Follower -> Following                                  |
| **ActivityFeedItem**     | Social feed items                                    | References User                                        |
| **Challenge**            | Challenges (5 types, dates, targets)                 | Has many: ChallengeParticipant                         |
| **ChallengeParticipant** | Challenge membership + progress                      | References Challenge + User                            |
| **Notification**         | User notifications (7 types)                         | References User                                        |

### Enums

| Enum                | Values                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------- |
| MuscleGroup         | CHEST, BACK, LEGS, SHOULDERS, ARMS, CORE, CARDIO, FULL_BODY                              |
| Equipment           | BARBELL, DUMBBELL, MACHINE, BODYWEIGHT, CABLE, KETTLEBELL, BANDS, NONE                   |
| ExerciseType        | STRENGTH, CARDIO, FLEXIBILITY, PLYOMETRIC                                                |
| WeightUnit          | KG, LBS                                                                                  |
| RecordType          | MAX_WEIGHT, MAX_REPS, MAX_VOLUME, MAX_TIME                                               |
| AchievementCategory | MILESTONE, STREAK, PERSONAL_RECORD, VOLUME, CONSISTENCY, MUSCLE_FOCUS, EXERCISE_SPECIFIC |
| AchievementRarity   | COMMON, UNCOMMON, RARE, EPIC, LEGENDARY                                                  |
| ChallengeType       | TOTAL_WORKOUTS, TOTAL_VOLUME, WORKOUT_STREAK, SPECIFIC_EXERCISE, TOTAL_SETS              |
| ChallengeStatus     | UPCOMING, ACTIVE, COMPLETED, CANCELLED                                                   |
| ActivityType        | WORKOUT_COMPLETED, PR_ACHIEVED, ACHIEVEMENT_EARNED                                       |

### Indexing

**Well-indexed:** User (email, deletedAt), UserProfile (username, profileCode), PersonalRecord (user/exercise/recordType composite), UserAchievement (user+earnedAt composite), WorkoutSession (user+completedAt composite), Follow (follower/following unique composite), PlanCollaborator (plan/user unique)

**Missing indexes (minor):**

- `ActivityFeedItem.referenceId` - reverse lookups would be slow
- `PlanExercise(planDayId, exerciseOrder)` - no uniqueness guarantee on order
- `Challenge/ChallengeParticipant` - could benefit from status-based composite indexes

---

## Server Functions

### Overview (20 files, ~100+ server functions)

All server functions use the `createServerFn({method}).inputValidator().handler()` pattern. Most authenticated endpoints accept a `token` field and call `getCurrentUser(token)` for verification.

### auth.server.ts

| Function                | Method | Purpose                                       |
| ----------------------- | ------ | --------------------------------------------- |
| `registerUser()`        | POST   | Create account with email/password validation |
| `loginUser()`           | POST   | Authenticate and return JWT                   |
| `logoutUser()`          | POST   | Server-side logout                            |
| `checkEmailAvailable()` | POST   | Email uniqueness check                        |
| `getCurrentUser()`      | POST   | Verify token and return user                  |

**Security:** Bcrypt 12 rounds, password strength validation (length + uppercase + lowercase + number), generic error messages to prevent user enumeration.

### workouts.server.ts (Critical - Largest File)

| Function                   | Method | Purpose                                      |
| -------------------------- | ------ | -------------------------------------------- |
| `getActiveSession()`       | GET    | Get current in-progress workout              |
| `startWorkoutSession()`    | POST   | Begin workout (from plan day or quick-start) |
| `completeWorkoutSession()` | POST   | Finish workout + trigger achievements        |
| `discardWorkoutSession()`  | POST   | Cancel workout + recalculate PRs             |
| `logWorkoutSet()`          | POST   | Log a set with PR detection                  |
| `updateWorkoutSet()`       | POST   | Modify set + recalculate PRs                 |
| `deleteWorkoutSet()`       | POST   | Remove set + recalculate PRs                 |
| `getWorkoutSession()`      | GET    | Get session with all sets                    |
| `getRecentWorkouts()`      | GET    | Paginated recent workouts                    |
| `getLastExerciseSets()`    | GET    | Previous workout sets for reference          |
| `getMonthlyWorkoutDays()`  | GET    | Calendar data                                |
| `getFilteredWorkouts()`    | GET    | Filtered workout history                     |

**Complex Logic:** PR scoring with weight normalization (lbs to kg), transaction-based atomic updates, warmup/dropset exclusion from PRs, dominated PR handling.

### plans.server.ts

| Function                                                              | Method | Purpose                                 |
| --------------------------------------------------------------------- | ------ | --------------------------------------- |
| `getPlans()`                                                          | GET    | User's plans + shared collaborations    |
| `getPlan()`                                                           | GET    | Plan detail with pending invite support |
| `createPlan()` / `updatePlan()` / `deletePlan()`                      | POST   | Plan CRUD                               |
| `setActivePlan()`                                                     | POST   | Set current active plan                 |
| `createPlanDay()` / `updatePlanDay()` / `deletePlanDay()`             | POST   | Day CRUD                                |
| `reorderPlanDays()`                                                   | POST   | Reorder days                            |
| `addPlanExercise()` / `updatePlanExercise()` / `removePlanExercise()` | POST   | Exercise CRUD                           |
| `reorderPlanExercises()`                                              | POST   | Reorder exercises                       |
| `getPlanDay()`                                                        | GET    | Day detail                              |

**Access Control:** Uses `requirePlanEditAccess()`, `requirePlanOwnership()` from `plan-auth.server.ts`.

### stats.server.ts

| Function                  | Method | Purpose                                 |
| ------------------------- | ------ | --------------------------------------- |
| `getOverviewStats()`      | GET    | Period comparison (current vs previous) |
| `getVolumeHistory()`      | GET    | 12-week volume chart data               |
| `getExerciseStats()`      | GET    | Muscle group distribution               |
| `getRecentPRs()`          | GET    | Recent PR list                          |
| `getDurationStats()`      | GET    | Workout duration analytics              |
| `getMoodStats()`          | GET    | Mood tracking data                      |
| `getUserExercisePRs()`    | GET    | PRs grouped by muscle                   |
| `getWorkoutConsistency()` | GET    | 16-week heatmap data                    |
| `getRpeStats()`           | GET    | RPE distribution and trends             |
| `getPrTimeline()`         | GET    | PR improvement timeline                 |

### Other Server Files

| File                      | Functions    | Purpose                                  |
| ------------------------- | ------------ | ---------------------------------------- |
| `profile.server.ts`       | 10 functions | Profile CRUD, search, soft-delete, stats |
| `social.server.ts`        | 10 functions | Follow/unfollow, followers, mutuals      |
| `collaboration.server.ts` | 7 functions  | Plan collaboration invites and roles     |
| `achievements.server.ts`  | 8 functions  | Achievement checking, admin CRUD         |
| `challenges.server.ts`    | 8 functions  | Challenge CRUD, joining, progress        |
| `sharing.server.ts`       | 6 functions  | Share code generation, import, revoke    |
| `feed.server.ts`          | 3 functions  | Activity feed with privacy               |
| `notifications.server.ts` | 6 functions  | Notification CRUD with deduplication     |
| `leaderboards.server.ts`  | 2 functions  | Global and friends leaderboards          |
| `dashboard.server.ts`     | 2 functions  | Dashboard stats and suggestions          |
| `compare.server.ts`       | 1 function   | Head-to-head user comparison             |
| `exercises.server.ts`     | 5 functions  | Exercise library CRUD                    |
| `health.server.ts`        | 3 functions  | Health/liveness/readiness probes         |
| `progression.server.ts`   | 3 functions  | Exercise progression tracking            |
| `date-utils.server.ts`    | 1 function   | Streak calculation                       |
| `plan-auth.server.ts`     | 4 functions  | Plan access control utilities            |

---

## Routes & Pages

### Authentication (3 routes)

| Route       | Purpose                                                                 |
| ----------- | ----------------------------------------------------------------------- |
| `/`         | Landing page (redirects logged-in users to dashboard)                   |
| `/login`    | Login with email/password                                               |
| `/register` | Registration with real-time validation (email check, password strength) |

### Core App (5 routes)

| Route                         | Purpose                                                              |
| ----------------------------- | -------------------------------------------------------------------- |
| `/dashboard`                  | Home with stats, active workout banner, suggestions, recent workouts |
| `/workout`                    | Plan selection and quick-start                                       |
| `/workout/active`             | Live workout tracking (set logger, rest timer, PR celebration)       |
| `/workout/summary/$sessionId` | Post-workout summary with mood, notes, achievements                  |
| `/health`                     | Server health status                                                 |

### Plans (4 routes)

| Route                       | Purpose                                                 |
| --------------------------- | ------------------------------------------------------- |
| `/plans`                    | Plan list (personal + shared)                           |
| `/plans/new`                | Create plan                                             |
| `/plans/$planId`            | Plan detail with day management, sharing, collaborators |
| `/plans/$planId/day/$dayId` | Day detail with exercise management                     |

### Statistics & Progress (4 routes)

| Route                   | Purpose                                 |
| ----------------------- | --------------------------------------- |
| `/stats`                | 10-section analytics dashboard          |
| `/prs`                  | Personal records by muscle group        |
| `/progress/$exerciseId` | Exercise-specific progression charts    |
| `/history`              | Workout history (list + calendar views) |

### Social (6 routes)

| Route                | Purpose                                |
| -------------------- | -------------------------------------- |
| `/u/$username`       | Public user profile with privacy       |
| `/followers`         | Follow management (4 tabs)             |
| `/users/search`      | User discovery (search + profile code) |
| `/notifications`     | Notification center (grouped by date)  |
| `/feed`              | Activity feed with infinite scroll     |
| `/compare/$username` | Head-to-head comparison                |

### Profile (4 routes)

| Route                         | Purpose                      |
| ----------------------------- | ---------------------------- |
| `/profile`                    | User profile dashboard       |
| `/profile/edit`               | Edit bio                     |
| `/profile/settings`           | Privacy toggles, logout      |
| `/profile/setup`              | Initial username setup       |
| `/profile/achievements-admin` | Admin achievement management |

### Competitive (5 routes)

| Route                      | Purpose                         |
| -------------------------- | ------------------------------- |
| `/achievements`            | Achievement gallery             |
| `/leaderboards`            | Global and friends leaderboards |
| `/challenges`              | Challenge list with tabs        |
| `/challenges/new`          | Create challenge                |
| `/challenges/$challengeId` | Challenge detail                |
| `/challenges/join/$code`   | Auto-join via invite code       |

### Exercises (1 route)

| Route        | Purpose                                        |
| ------------ | ---------------------------------------------- |
| `/exercises` | Exercise library with filtering and admin CRUD |

---

## Components

### Summary: 73 components across 18 directories

### UI Components (`ui/`)

| Component         | Purpose                                                          |
| ----------------- | ---------------------------------------------------------------- |
| `Modal`           | Slide-up mobile / centered desktop modal with escape key support |
| `ConfirmDialog`   | Confirmation dialog with danger variant                          |
| `SearchInput`     | Debounced search input (300ms default)                           |
| `Avatar`          | User avatar with initials fallback (6 sizes, 2 variants)         |
| `Confetti`        | Canvas-based particle animation (150 particles)                  |
| `Skeleton`        | 10 skeleton loading variants matching actual layouts             |
| `SocialSkeletons` | 8 additional skeleton variants for social features               |
| `EmptyState`      | Empty state with icon, title, and optional actions               |
| `ErrorState`      | Error display (default, network, inline variants)                |
| `PRToast`         | PR achievement toast with improvement calculation                |

### Workout Components (`workout/`)

| Component             | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| `ExerciseWorkoutCard` | Exercise card during active workout                    |
| `SetLoggerModal`      | Modal for logging sets with previous workout reference |
| `RestTimer`           | Persistent rest timer between sets                     |
| `MoodRating`          | Mood selector (1-5 stars)                              |
| `RecentWorkoutsList`  | Recent workout cards                                   |
| `WorkoutHeader`       | Active workout header with timer                       |
| `WorkoutSetRow`       | Individual set display row                             |

### Stats Components (`stats/`) - 12 components

Includes: VolumeChart, MuscleDonutChart, MuscleRadarChart, WeeklyHeatmap, RpeChart, DurationStats, MoodStats, PrTimeline, StatCard, StatsSection, StatsSkeleton, AchievementShowcase

### Form Components (`forms/`)

| Component             | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| `PlanForm`            | Create/edit workout plan                           |
| `PlanDayForm`         | Create/edit plan day with rest day toggle          |
| `ExerciseForm`        | Create/edit exercise with enum selectors           |
| `ExerciseTargetsForm` | Set targets (sets, reps/time, weight, rest, notes) |

### Other Component Groups

- **plans/** (4): PlanCard, PlanDayCard, PlanExerciseCard, ManageCollaboratorsModal
- **exercises/** (5): ExerciseCard, ExercisePicker, ExerciseFilters, MuscleGroupBadge, EquipmentBadge
- **achievements/** (5): AchievementCard, AchievementBadge (23 icon mappings), AchievementGrid, AchievementToast
- **history/** (5): MonthlyCalendar, CalendarDayWorkouts, ExpandableWorkoutCard, HistoryFilters, ViewToggle
- **progression/** (3): ProgressionChart, TimeRangeSelector, MetricSelector
- **compare/** (4): CompareHeader, CompareStatRow, CompareSummaryBar, ComparePRCard
- **sharing/** (2): SharePlanModal, ImportPlanModal
- **feed/** (1): ActivityFeedItem (memoized, 5 activity types)
- **social/** (1): FollowButton
- **notifications/** (1): NotificationBell (30s polling)
- **prs/** (1): PRSortSelector

### Layout Components

- **AppLayout** - Auth guard, sticky header, notification bell, bottom nav
- **BottomNav** - 5-tab mobile navigation (Home, Workout, History, Stats, Profile)
- **ErrorBoundary** - Class component with dev stack trace

---

## Hooks & Context

### Custom Hooks

| Hook                      | Purpose                                              | Used By                                                   |
| ------------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| `useBodyOverflow(isOpen)` | Prevents body scroll when modals open                | Modal, ConfirmDialog, ExercisePicker                      |
| `useChartDimensions()`    | Returns `{ compact: boolean }` for viewport <= 640px | VolumeChart, RpeChart, ProgressionChart, MuscleRadarChart |

### Context Providers

| Context        | Hook         | Purpose                                             |
| -------------- | ------------ | --------------------------------------------------- |
| `AuthContext`  | `useAuth()`  | Auth state, login/register/logout, token management |
| `ToastContext` | `useToast()` | Toast notifications (success, error, warning, info) |

**AuthContext features:** JWT in localStorage, token refresh on mount, loading vs initializing state separation, proper error management.

**ToastContext features:** Auto-dismissal with configurable duration, unique IDs, dismiss button, safe-area support.

---

## Utilities & Constants

### formatting.ts (11 functions)

| Function               | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `formatRelativeDate()` | "Just now", "5m ago", "2h ago", "Dec 25" |
| `formatFullDate()`     | "Dec 25, 2025, 10:30 AM"                 |
| `formatDuration()`     | Seconds to "1h 23m"                      |
| `formatElapsedTime()`  | Start time to "1:23:45"                  |
| `formatTime()`         | Seconds to "1:30" or "1h 30m"            |
| `formatVolume()`       | Kilograms to "1,234 kg" or "1.2K kg"     |
| `formatWeight()`       | Number to "100 kg" with unit             |
| `formatPR()`           | PR value formatted by type               |
| `parseDecimalInput()`  | Handles comma/dot decimal separators     |

### constants.ts (35+ constants)

- **Auth:** PASSWORD_MIN_LENGTH=8, USERNAME_REGEX, BCRYPT_ROUNDS=12
- **Pagination:** DEFAULT_PAGE_SIZE=20, MAX_PAGE_SIZE=100
- **Workout:** MIN_REPS=1, MAX_REPS=9999, DEFAULT_REST_SECONDS=90
- **Social:** SHARE_CODE_LENGTH=8, MAX_SHARE_CODE_USES=10, SHARE_CODE_EXPIRY_DAYS=7
- **UI:** DEBOUNCE_MS=300, TOAST_DURATION=5000, ANIMATION_DURATION=300

### pr-utils.ts

- `BODYWEIGHT_BASE_SCORE = 60` for weighted bodyweight calculations
- `PR_PRIORITY` ordering: MAX_VOLUME > MAX_TIME = MAX_REPS > MAX_WEIGHT
- `selectDisplayPR()` - Best PR selection with priority/value/recency tiebreaks
- `isDominatedByExistingPR()` - Suppresses lesser PR celebrations

---

## Testing

### Setup

- **Framework:** Vitest with node environment
- **Mocking:** vitest-mock-extended for deep Prisma mocks
- **Coverage:** Scoped to `src/lib/**`
- **Setup file:** Sets JWT_SECRET, DATABASE_URL, mocks `@/lib/db`

### Test Files (8 test files)

| File                        | Tests                                             |
| --------------------------- | ------------------------------------------------- |
| `formatting.test.ts`        | Display formatting functions                      |
| `auth.test.ts`              | Client-side auth utilities                        |
| `auth.server.test.ts`       | Server auth (register, login, token verification) |
| `workouts.server.test.ts`   | Workout CRUD and PR logic                         |
| `social.server.test.ts`     | Follow/unfollow operations                        |
| `feed.server.test.ts`       | Activity feed generation                          |
| `profile.server.test.ts`    | Profile CRUD                                      |
| `challenges.server.test.ts` | Challenge operations                              |
| `pr-utils.test.ts`          | PR priority and selection                         |
| `date-utils.test.ts`        | Date utility functions                            |

### Coverage Gaps

- No component tests
- No route/page integration tests
- No end-to-end tests
- Stats, achievements, leaderboards, sharing server functions untested

---

## Configuration & DevOps

### Dockerfile

- Multi-stage build: deps -> prod-deps -> builder -> runner
- Base: node:22-alpine
- Non-root user: gymlink (UID 1001)
- Auto-runs migrations on startup (`prisma migrate deploy`)
- Health check: `GET /health` every 30s
- Memory limit: 512M

### docker-compose.yml

- Services: app + db (postgres:16-alpine)
- Database volume for persistence
- Resource limits: 512M memory, 1.0 CPU
- App depends on healthy database

### TypeScript

- Strict mode enabled
- Target: ES2022
- Module resolution: bundler
- Path alias: `@/*` -> `./src/*`
- No unused variables/parameters

### Code Style

- Prettier: no semicolons, single quotes, trailing commas
- ESLint: TanStack config (flat config)

---

## Identified Issues

### Critical

| #   | Location                | Issue                                                                                |
| --- | ----------------------- | ------------------------------------------------------------------------------------ |
| 1   | `dashboard.server.ts`   | References `set.isDropset` but variable is undefined - **bug in volume calculation** |
| 2   | `progression.server.ts` | Potentially missing import for `selectDisplayPR()`                                   |

### High Priority

| #   | Location             | Issue                                                                               |
| --- | -------------------- | ----------------------------------------------------------------------------------- |
| 3   | `profile.server.ts`  | `getProfileStats()` volume calculation sums weight but doesn't multiply by reps     |
| 4   | `workouts.server.ts` | `calculatePRScore()` for bodyweight: negative weight could produce incorrect scores |
| 5   | `plans.server.ts`    | `setActivePlan()` doesn't verify edit access, only checks userId                    |

### Medium Priority

| #   | Location                 | Issue                                                                                |
| --- | ------------------------ | ------------------------------------------------------------------------------------ |
| 6   | Multiple server files    | Inconsistent null checking in weight \* reps volume calculations                     |
| 7   | `leaderboards.server.ts` | Streak calculation loops through all users (up to 500) - performance concern         |
| 8   | `stats.server.ts`        | `getRpeStats()` returns null while other functions return objects - inconsistent API |
| 9   | `stats.server.ts`        | `getExerciseStats()` doesn't handle null muscleGroup - could produce undefined keys  |
| 10  | `register.tsx`           | Email availability check can be null when form submits (should wait for result)      |
| 11  | `sharing.server.ts`      | Share code uniqueness uses 10 attempts - could fail under high concurrency           |

### Low Priority

| #   | Location                             | Issue                                                                      |
| --- | ------------------------------------ | -------------------------------------------------------------------------- |
| 12  | `profile.server.ts`                  | `getProfileByCode()` doesn't uppercase input but stores as uppercase       |
| 13  | `profile.server.ts`                  | `searchUsers()` doesn't validate limit parameter bounds                    |
| 14  | `notifications/NotificationBell.tsx` | Polls every 30s - should use SSE or WebSockets                             |
| 15  | `hooks/useBodyOverflow.ts`           | Multiple overlays may conflict (last one wins); needs stack-based approach |
| 16  | `collaboration.server.ts`            | No limit on concurrent invites - race condition possible                   |
| 17  | `achievements.server.ts`             | No validation on achievement threshold values when creating                |
| 18  | `challenges.server.ts`               | No validation on `maxParticipants` range                                   |
| 19  | `date-utils.server.ts`               | Date string comparison in streak calc could fail with timezone differences |
| 20  | Schema                               | `PlanExercise` lacks unique constraint on `(planDayId, exerciseOrder)`     |
| 21  | Schema                               | `ActivityFeedItem.referenceId` is not indexed                              |
| 22  | Global                               | No rate limiting on any endpoints                                          |

---

## Strengths

### Architecture

- Clean separation between server functions (`*.server.ts`) and client code
- Consistent `createServerFn()` pattern across all server files
- Proper role-based access control (plan-auth utility)
- File-based routing keeps code organized by feature
- Prisma Client singleton prevents multiple instances

### Security

- Bcrypt with 12 rounds for password hashing
- JWT token verification on all authenticated endpoints
- Generic error messages prevent user enumeration
- Soft-delete pattern preserves data integrity
- Cascade deletes properly configured
- Non-root Docker user
- Admin checks on privileged operations

### UX

- Consistent loading skeletons matching actual layouts (18+ variants)
- Optimistic updates with rollback on error
- Toast notifications for all user actions
- Modal-driven editing workflows
- Staggered animations for visual polish
- Empty states with actionable CTAs
- Error boundaries with retry capability
- Safe area padding for notched devices

### Code Quality

- TypeScript strict mode
- Comprehensive input validation on server functions
- Transaction-based atomic operations for complex writes
- PR scoring with proper normalization
- Dominated PR detection prevents spam celebrations
- Memoized components where needed (ActivityFeedItem, skeletons)
- Proper useRef usage to prevent unnecessary re-renders

### Testing

- Well-structured test setup with deep Prisma mocks
- Tests cover critical paths (auth, workouts, social, PRs)
- Coverage scoped appropriately to `src/lib/`

### DevOps

- Multi-stage Docker build with layer caching
- Health/liveness/readiness probes for container orchestration
- Docker Compose for local development
- Proper resource limits

---

## Recommendations

### Short Term

1. **Fix critical bugs:** Dashboard volume calculation (`set.isDropset`), profile stats volume (missing reps multiplier)
2. **Add null safety** to all weight \* reps calculations across server functions
3. **Add rate limiting** to auth endpoints (login, register) at minimum
4. **Fix register form** to disable submit while email availability check is pending
5. **Add validation** for challenge `maxParticipants` and achievement `threshold` values

### Medium Term

6. **Replace notification polling** (30s interval) with Server-Sent Events
7. **Add component tests** for critical UI flows (workout logging, plan editing)
8. **Add integration tests** for stats and achievements server functions
9. **Implement stack-based body overflow** management for nested modals
10. **Add composite indexes** for ActivityFeedItem and Challenge queries

### Long Term

11. **Add end-to-end tests** with Playwright for critical user journeys
12. **Consider caching layer** for leaderboard calculations (expensive raw SQL)
13. **Add pagination** to leaderboard streak calculations (currently loops all users)
14. **Implement WebSocket** for real-time features (active workout sync, live challenge updates)
15. **Add error tracking** service (Sentry or similar) for production monitoring

---

_Review conducted by Claude Code on 2026-02-25. Total files reviewed: 146 (35 routes, 73 components, 36 lib files, 2 config files)._
