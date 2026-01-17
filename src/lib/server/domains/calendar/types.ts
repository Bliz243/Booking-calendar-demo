// Re-export types from Drizzle schema for convenience
export type { Calendar, NewCalendar } from '$lib/server/db/drizzle/schema/calendars';
export type {
	Event,
	NewEvent,
	EventException,
	NewEventException
} from '$lib/server/db/drizzle/schema/events';

// Re-export service types
export type {
	CreateCalendarInput,
	UpdateCalendarInput,
	CalendarResult,
	CalendarDeleteResult
} from './services/calendar.service';

export type {
	CreateEventInput,
	UpdateEventInput,
	EventResult,
	EventDeleteResult,
	EventInstance
} from './services/event.service';

export type { RecurrenceBounds, RRuleOptions } from './services/recurrence.service';
