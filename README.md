# Booking Calendar Demo

A Google Calendar-style booking system built with SvelteKit, featuring constraint-based appointment scheduling with resource allocation.

## Features

- Full-featured calendar with day/week/month views
- Recurring events support (rrule)
- Service booking with configurable constraints (hours, buffers, capacity)
- Resource management (rooms, staff, equipment)
- Approval workflow for pending bookings
- Multi-role system (admin, staff, customer)

## Tech Stack

- **Frontend**: SvelteKit (Svelte 5), Tailwind CSS 4, shadcn-svelte
- **Backend**: SvelteKit API routes, SQLite (better-sqlite3), Drizzle ORM
- **Auth**: Better Auth with Drizzle adapter

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+

### Setup

```bash
# 1. Install dependencies
bun install

# 2. Create environment file
cp .env.example .env
```

Edit `.env` and set a secret key (min 32 characters):

```
BETTER_AUTH_SECRET=your-secret-key-at-least-32-characters-long
```

```bash
# 3. Initialize the database
bun run db:push
```

This creates the SQLite database and applies the schema.

### Run

```bash
bun run dev
```

Open http://localhost:5173

### Create an Admin User

1. Register a new account at `/register`
2. Open the database with `bun run db:studio` and update the user's role to `admin`, or run:

```bash
sqlite3 data/calendar.db "UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';"
```

Now you can access `/admin` to manage services, resources, and bookings.

## Available Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server |
| `bun run build` | Production build |
| `bun run check` | TypeScript checking |
| `bun run format` | Format code |
| `bun run test` | Run tests |
| `bun run db:push` | Push schema to database (development) |
| `bun run db:generate` | Generate migration files |
| `bun run db:migrate` | Apply migrations |
| `bun run db:studio` | Open Drizzle Studio |

## Project Structure

```
src/
├── lib/
│   ├── server/
│   │   ├── db/drizzle/     # Drizzle ORM schema & connection
│   │   └── services/       # Business logic
│   ├── components/         # UI components
│   └── types/              # TypeScript types
└── routes/
    ├── calendar/           # Calendar view
    ├── admin/              # Admin dashboard
    ├── staff/              # Staff dashboard
    ├── book/               # Public booking flow
    └── api/                # REST API
```

## Key Pages

| Route | Description |
|-------|-------------|
| `/calendar` | Main calendar view |
| `/admin/services` | Manage bookable services |
| `/admin/bookings` | View and approve bookings |
| `/admin/resources` | Manage resources |
| `/book` | Public booking page |

## Database

SQLite database is stored at `./data/calendar.db`.

To reset the database:
```bash
rm -rf data/
bun run db:push
```

## License

MIT
