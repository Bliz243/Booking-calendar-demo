# Booking Event Drag Validation - Design Document

## Problem

When dragging booking events on the calendar, no constraints are validated. This allows:

- Double-booking resources
- Exceeding service capacity
- Ignoring buffer time requirements
- Creating data inconsistency (event time differs from booking time)

## Solution

Validate booking constraints when calendar events linked to service bookings are moved/resized. On failure, revert the drag and show a toast error.

## Architecture

### Data Flow

```
User drags booking event
    ↓
Optimistic UI update (event moves immediately)
    ↓
API PATCH /api/events/[id]
    ↓
Server: Is event linked to a booking?
    ├─ No  → Update event, return success
    └─ Yes → Validate via bookingService.validateReschedule()
              ├─ Valid   → Update event + booking, return success
              └─ Invalid → Return 409 Conflict with reason
    ↓
Frontend receives response
    ├─ Success → Keep new position
    └─ Error   → Revert to original position + show toast
```

### Constraint Validation Matrix

| Constraint                | Behavior                       |
| ------------------------- | ------------------------------ |
| Resource double-booking   | Block                          |
| Service capacity exceeded | Block                          |
| Buffer time violated      | Block                          |
| Operating hours           | Allow (staff override implied) |
| Min notice                | Allow (staff rescheduling)     |

### Files to Modify

1. **`src/lib/server/domains/booking/services/booking.service.ts`**
   - Add `validateReschedule(bookingId, newStart, newEnd)`
   - Add `reschedule(bookingId, newStart, newEnd)`

2. **`src/lib/server/domains/booking/adapters/calendar.adapter.ts`**
   - Add `updateEventTime(eventId, startTime, endTime)`

3. **`src/lib/server/domains/booking/repositories/booking.repository.ts`**
   - Add `findByEventId(eventId)` - find booking by linked event
   - Add `updateTimes(bookingId, startTime, endTime)`

4. **`src/routes/api/events/[id]/+server.ts`**
   - In PATCH: detect booking events, validate, update both

5. **`src/lib/components/calendar/stores/event-store.svelte.ts`**
   - Handle 409 errors, revert optimistic update, return error

6. **`src/routes/(protected)/calendar/+page.svelte`**
   - Show toast on move/resize failure

## API Changes

### PATCH /api/events/[id]

**New response for booking constraint violation:**

```json
{
	"error": "Cannot move: Mechanic John is already booked at this time",
	"code": "BOOKING_CONSTRAINT_VIOLATION"
}
```

HTTP Status: 409 Conflict

## Implementation Tasks

1. Add `findByEventId` to booking repository
2. Add `updateTimes` to booking repository
3. Add `updateEventTime` to calendar adapter
4. Add `validateReschedule` to booking service
5. Add `reschedule` to booking service
6. Update PATCH endpoint to validate booking events
7. Update event store to handle validation errors
8. Add toast notification on drag failure
