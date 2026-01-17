// Calendar Domain
// Handles calendars, events, and recurrence logic

export { calendarService, eventService, recurrenceService } from './services';
export { calendarRepository, eventRepository } from './repositories';

// Types
export type {
	Calendar,
	NewCalendar,
	Event,
	NewEvent,
	EventException,
	NewEventException,
	CreateCalendarInput,
	UpdateCalendarInput,
	CalendarResult,
	CalendarDeleteResult,
	CreateEventInput,
	UpdateEventInput,
	EventResult,
	EventDeleteResult,
	EventInstance,
	RecurrenceBounds,
	RRuleOptions
} from './types';
