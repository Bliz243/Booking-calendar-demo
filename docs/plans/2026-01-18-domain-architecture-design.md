# Domain Architecture Design

## Overview

Refactor the booking system from raw SQL in endpoints to a clean domain-driven architecture with proper separation of concerns.

## Goals

1. **Remove SQL from endpoints** - Endpoints become thin HTTP adapters
2. **Domain isolation** - Each domain owns its data and business rules
3. **Clear boundaries** - Cross-domain communication through adapters
4. **Testability** - Services can be tested without HTTP layer
5. **Maintainability** - Related code lives together

## Domain Structure

```
src/lib/server/domains/
├── calendar/
│   ├── adapters/              # (none - calendar is standalone)
│   ├── repositories/
│   │   ├── calendar.repository.ts
│   │   ├── event.repository.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── calendar.service.ts
│   │   ├── event.service.ts
│   │   ├── recurrence.service.ts
│   │   └── index.ts
│   ├── types.ts
│   └── index.ts
│
├── booking/
│   ├── adapters/
│   │   ├── calendar.adapter.ts    # Interface to calendar domain
│   │   ├── resource.adapter.ts    # Interface to resource domain
│   │   └── index.ts
│   ├── repositories/
│   │   ├── service.repository.ts  # "Service" = bookable offering
│   │   ├── booking.repository.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── service.service.ts     # CRUD for bookable services
│   │   ├── booking.service.ts     # Booking operations
│   │   ├── availability.service.ts # Slot calculation
│   │   └── index.ts
│   ├── types.ts
│   └── index.ts
│
├── resource/
│   ├── adapters/              # (none - resource is standalone)
│   ├── repositories/
│   │   ├── resource-type.repository.ts
│   │   ├── resource.repository.ts
│   │   ├── qualification.repository.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── resource-type.service.ts
│   │   ├── resource.service.ts
│   │   ├── qualification.service.ts
│   │   ├── availability.service.ts  # Resource availability checking
│   │   └── index.ts
│   ├── types.ts
│   └── index.ts
│
└── index.ts                   # Re-exports all domains
```

## Layer Responsibilities

### Repositories

- **Only data access** - CRUD operations and queries
- Return **row types** (raw database shapes)
- No business logic
- Use existing `queryOne`, `queryAll`, `execute`, `transaction` helpers
- Methods: `findById`, `findByX`, `findAllByX`, `create`, `update`, `delete`

```typescript
// Example: booking/repositories/service.repository.ts
export const serviceRepository = {
	findById(id: string): ServiceRow | null {
		return queryOne<ServiceRow>(`SELECT * FROM services WHERE id = ?`, [id]);
	},

	findByIdAndUserId(id: string, userId: string): ServiceRow | null {
		return queryOne<ServiceRow>(`SELECT * FROM services WHERE id = ? AND user_id = ?`, [
			id,
			userId
		]);
	}

	// ... other methods
};
```

### Services

- **Business logic** - Validation, orchestration, rules
- Coordinate repository calls
- Handle transactions for multi-step operations
- Return **domain types** or result types `{ data } | { error }`
- Cross-domain calls go through **adapters only**

```typescript
// Example: booking/services/booking.service.ts
export const bookingService = {
	approve(bookingId: string, staffId: string): BookingResult {
		const booking = bookingRepository.findById(bookingId);
		if (!booking) return { error: 'Booking not found' };
		if (booking.approval_status !== 'pending') {
			return { error: 'Booking is not pending approval' };
		}

		return transaction(() => {
			bookingRepository.updateStatus(bookingId, 'confirmed', {
				approvalStatus: 'approved',
				approvedBy: staffId
			});

			// Cross-domain call through adapter
			calendarAdapter.createEventForBooking(bookingId, booking.service_user_id);

			return { booking: this.getById(bookingId)! };
		});
	}
};
```

### Adapters

- **Bridge between domains** - Single point of contact
- Booking domain never imports from `../../calendar` directly
- Easy to mock for testing
- If external domain API changes, only adapter updates

```typescript
// Example: booking/adapters/calendar.adapter.ts
import { eventService } from '../../calendar';

export const calendarAdapter = {
	createEventForBooking(bookingId: string, userId: string): void {
		eventService.createForBooking(bookingId, userId);
	},

	cancelEvent(eventId: string): void {
		eventService.cancel(eventId);
	}
};
```

### Endpoints (After Refactoring)

- **Thin HTTP adapters** - No business logic
- Auth → Parse → Call service → Respond
- ~30-50 lines per file

```typescript
// Example: routes/api/admin/services/[id]/+server.ts
import { json } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';
import { bookingDomain } from '$lib/server/domains';
import { updateServiceSchema } from '$lib/schemas/service';

export const GET: RequestHandler = async (event) => {
	const user = requireAdmin(event);
	const { id } = event.params;

	const service = bookingDomain.serviceService.getByIdForUser(id, user.id);
	if (!service) return errors.notFound('Service', event.locals.requestId);

	return json({ service });
};

export const PATCH: RequestHandler = async (event) => {
	const user = requireAdmin(event);
	const { id } = event.params;

	const body = await event.request.json().catch(() => null);
	if (!body) return errors.validation('Invalid JSON', event.locals.requestId);

	const parsed = updateServiceSchema.safeParse(body);
	if (!parsed.success)
		return errors.validation('Invalid input', event.locals.requestId, parsed.error.issues);

	const result = bookingDomain.serviceService.update(id, user.id, parsed.data);
	if ('error' in result) return errors.badRequest(result.error, event.locals.requestId);

	return json({ service: result.service });
};
```

## Domain Dependencies

```
booking → calendar  (creates calendar events for confirmed bookings)
booking → resource  (checks resource availability, assigns resources)
calendar → (none)
resource → (none)
```

## Type Organization

Each domain has a `types.ts` that defines:

- **Row types** - Database row shapes (for repositories)
- **Domain types** - Clean domain objects (for services/endpoints)
- **Input types** - Create/update payloads
- **Result types** - Service return types

```typescript
// booking/types.ts

// Row types (match database)
export interface ServiceRow {
  id: string;
  user_id: string;
  name: string;
  // ... snake_case from DB
}

// Domain types (clean interface)
export interface Service {
  id: string;
  userId: string;
  name: string;
  // ... camelCase for app
}

// Converters
export function rowToService(row: ServiceRow): Service { ... }

// Input types
export interface CreateServiceInput {
  name: string;
  description?: string;
  // ...
}

// Result types
export type ServiceResult = { service: Service } | { error: string };
```

## Migration Plan

### Phase 1: Create Structure + Move Existing Code

1. Create `domains/` folder structure
2. Move existing `repositories/calendar.repository.ts` → `domains/calendar/repositories/`
3. Move existing `repositories/event.repository.ts` → `domains/calendar/repositories/`
4. Move existing services:
   - `booking-service.ts` → `domains/booking/services/booking.service.ts`
   - `availability-calculator.ts` → `domains/booking/services/availability.service.ts`
   - `resource-availability.ts` → `domains/resource/services/availability.service.ts`
   - `recurrence.ts` → `domains/calendar/services/recurrence.service.ts`
5. Create domain `index.ts` files with exports
6. Update imports across codebase

### Phase 2: Extract Repositories from Endpoints

1. **Resource domain** - Extract SQL from:
   - `api/resource-types/+server.ts` → `resource/repositories/resource-type.repository.ts`
   - `api/resource-types/[id]/+server.ts`
   - `api/resources/+server.ts` → `resource/repositories/resource.repository.ts`
   - `api/resources/[id]/+server.ts`
   - `api/admin/qualifications/+server.ts` → `resource/repositories/qualification.repository.ts`
   - `api/admin/qualifications/[id]/+server.ts`

2. **Booking domain** - Extract SQL from:
   - `api/admin/services/+server.ts` → `booking/repositories/service.repository.ts`
   - `api/admin/services/[id]/+server.ts`
   - `api/admin/services/[id]/requirements/+server.ts`
   - `api/admin/bookings/+server.ts` → (already in booking.service)
   - `api/admin/bookings/[id]/+server.ts`

3. **Calendar domain** - Extract SQL from:
   - `api/calendars/+server.ts` → (already has repository)
   - `api/events/+server.ts` → (already has repository)

### Phase 3: Create Service Layer

1. Create `resource/services/resource-type.service.ts`
2. Create `resource/services/resource.service.ts`
3. Create `resource/services/qualification.service.ts`
4. Create `booking/services/service.service.ts` (for bookable services CRUD)
5. Wire up adapters in booking domain

### Phase 4: Simplify Endpoints

1. Update all endpoints to use domain services
2. Remove direct SQL imports from endpoints
3. Ensure consistent error handling pattern

### Phase 5: Cleanup

1. Delete old `src/lib/server/services/` folder
2. Delete old `src/lib/server/repositories/` folder
3. Update any remaining imports
4. Run type check and tests

## Files to Create

### Calendar Domain

- `domains/calendar/repositories/calendar.repository.ts` (move existing)
- `domains/calendar/repositories/event.repository.ts` (move existing)
- `domains/calendar/repositories/index.ts`
- `domains/calendar/services/calendar.service.ts`
- `domains/calendar/services/event.service.ts`
- `domains/calendar/services/recurrence.service.ts` (move existing)
- `domains/calendar/services/index.ts`
- `domains/calendar/types.ts`
- `domains/calendar/index.ts`

### Booking Domain

- `domains/booking/adapters/calendar.adapter.ts`
- `domains/booking/adapters/resource.adapter.ts`
- `domains/booking/adapters/index.ts`
- `domains/booking/repositories/service.repository.ts`
- `domains/booking/repositories/booking.repository.ts`
- `domains/booking/repositories/index.ts`
- `domains/booking/services/service.service.ts`
- `domains/booking/services/booking.service.ts` (move + refactor existing)
- `domains/booking/services/availability.service.ts` (move + refactor existing)
- `domains/booking/services/index.ts`
- `domains/booking/types.ts`
- `domains/booking/index.ts`

### Resource Domain

- `domains/resource/repositories/resource-type.repository.ts`
- `domains/resource/repositories/resource.repository.ts`
- `domains/resource/repositories/qualification.repository.ts`
- `domains/resource/repositories/index.ts`
- `domains/resource/services/resource-type.service.ts`
- `domains/resource/services/resource.service.ts`
- `domains/resource/services/qualification.service.ts`
- `domains/resource/services/availability.service.ts` (move existing)
- `domains/resource/services/index.ts`
- `domains/resource/types.ts`
- `domains/resource/index.ts`

### Root

- `domains/index.ts`

## Success Criteria

1. **No SQL in endpoints** - All data access through repositories
2. **No business logic in endpoints** - All logic in services
3. **No cross-domain repository access** - Only through adapters
4. **Type check passes** - `bun run check` succeeds
5. **App works** - Manual testing of key flows
