# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev          # Start dev server
bun run build        # Production build
bun run check        # TypeScript + Svelte type checking
bun run format       # Format code with Prettier
bun run lint         # Check formatting
```

## Architecture Overview

This is a **SvelteKit booking system** with a Google Calendar-style interface. It combines two systems:

1. **Calendar System** - Event management with recurring events (rrule)
2. **Constraint-Based Booking System** - Service bookings with resource allocation

### Tech Stack

- **Frontend**: SvelteKit (Svelte 5 with runes), Tailwind CSS 4, shadcn-svelte (bits-ui)
- **Backend**: SvelteKit API routes, better-sqlite3 (SQLite)
- **Validation**: Zod schemas in `src/lib/schemas/`

### Key Directories

```
src/lib/
├── server/
│   ├── db/client.ts          # SQLite connection, query helpers (queryOne, queryAll, execute, transaction)
│   ├── db/schema.sql         # All database tables
│   └── services/
│       ├── booking-service.ts        # Service booking CRUD with approval workflow
│       ├── availability-calculator.ts # Slot generation with constraints
│       └── resource-availability.ts   # Resource conflict checking
├── types/
│   ├── calendar.ts   # Calendar, Event, EventInstance types
│   └── service.ts    # Service, ServiceBooking, Resource types + row converters
├── schemas/          # Zod validation schemas
├── utils/date.ts     # Date utilities (custom, no date-fns)
└── components/
    ├── ui/           # shadcn-svelte components (Button, Drawer, Select, etc.)
    ├── calendar/     # Calendar components with stores
    └── booking/      # Booking flow components
```

### Data Flow

**Booking Creation:**

1. `GET /api/services/[id]/slots` → `availability-calculator.ts` generates available slots
2. `POST /api/services/[id]/book` → `booking-service.ts` validates and creates booking
3. On confirmation → `createCalendarEventForBooking()` creates linked calendar event

**Key Constraint Checks** (in `availability-calculator.ts`):

- Operating days/hours
- Min notice & max advance days
- Buffer time between appointments
- Resource availability (via `resource-availability.ts`)
- Capacity for class-type services
- Customer concurrent booking limits

### Database Schema Highlights

- `services` - Bookable offerings with constraints (duration, operating hours, capacity, etc.)
- `service_bookings` - Bookings with approval workflow, linked to `events` via `event_id`
- `resources` + `resource_types` - Bookable resources (rooms, staff, equipment)
- `service_resource_requirements` - Which resource types a service needs
- `booking_resource_assignments` - Which specific resources are assigned to a booking

### Svelte 5 Patterns

Uses Svelte 5 runes throughout:

- `$state()` for reactive state
- `$derived()` for computed values
- `$effect()` for side effects
- Class-based stores (e.g., `CalendarState` in `calendar-state.svelte.ts`)

### UI Components

Uses shadcn-svelte with `vaul-svelte` for Drawer (not Dialog). Components are in `$lib/components/ui/`.

Import pattern:

```svelte
import {Button} from '$lib/components/ui/button'; import * as Select from '$lib/components/ui/select';
import * as Drawer from '$lib/components/ui/drawer';
```

### Routes Structure

- `/calendar` - Full calendar view
- `/admin/services` - Service management
- `/admin/bookings` - Booking management with approval
- `/staff` - Staff dashboard for today's bookings
- `/book/service/[serviceId]` - Public booking flow
- `/api/...` - REST API endpoints
