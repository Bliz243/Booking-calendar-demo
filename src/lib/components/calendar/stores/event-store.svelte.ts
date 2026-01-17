import type {
	Calendar,
	CalendarEvent,
	EventInstance,
	DateRange,
	CreateEventInput,
	UpdateEventInput
} from '$lib/types/calendar';
import { isWithinInterval, isSameDay } from '$lib/utils/date';

export class EventStore {
	// Core state
	events = $state<CalendarEvent[]>([]);
	calendars = $state<Calendar[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);

	// Selection state
	selectedEventId = $state<string | null>(null);
	editingEvent = $state<Partial<CreateEventInput> | null>(null);

	// Derived: visible events based on calendar visibility
	visibleEvents = $derived.by(() => {
		const visibleCalendarIds = new Set(this.calendars.filter((c) => c.isVisible).map((c) => c.id));
		return this.events.filter((e) => visibleCalendarIds.has(e.calendarId));
	});

	// Get calendar by ID
	getCalendar(calendarId: string): Calendar | undefined {
		return this.calendars.find((c) => c.id === calendarId);
	}

	// Get event by ID
	getEvent(eventId: string): CalendarEvent | undefined {
		return this.events.find((e) => e.id === eventId);
	}

	// Get events for a date range
	getEventsForRange(range: DateRange): EventInstance[] {
		const instances: EventInstance[] = [];

		for (const event of this.visibleEvents) {
			const calendar = this.getCalendar(event.calendarId);
			if (!calendar) continue;

			// For non-recurring events, check if they overlap with the range
			if (!event.rrule) {
				if (this.eventOverlapsRange(event, range)) {
					instances.push(this.eventToInstance(event, calendar));
				}
			}
			// Recurring events will be handled by the recurrence service
			// For now, add the base event if in range
			else if (this.eventOverlapsRange(event, range)) {
				instances.push({
					...this.eventToInstance(event, calendar),
					isRecurring: true
				});
			}
		}

		return instances;
	}

	// Get events for a specific day
	getEventsForDay(date: Date): EventInstance[] {
		const instances: EventInstance[] = [];

		for (const event of this.visibleEvents) {
			const calendar = this.getCalendar(event.calendarId);
			if (!calendar) continue;

			if (this.eventOccursOnDay(event, date)) {
				instances.push(this.eventToInstance(event, calendar));
			}
		}

		return instances.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
	}

	// Get all-day events for a date
	getAllDayEventsForDay(date: Date): EventInstance[] {
		return this.getEventsForDay(date).filter((e) => e.isAllDay);
	}

	// Get timed events for a date
	getTimedEventsForDay(date: Date): EventInstance[] {
		return this.getEventsForDay(date).filter((e) => !e.isAllDay);
	}

	// Convert CalendarEvent to EventInstance
	private eventToInstance(event: CalendarEvent, calendar: Calendar): EventInstance {
		return {
			id: event.id,
			eventId: event.id,
			calendarId: event.calendarId,
			title: event.title,
			description: event.description,
			location: event.location,
			startTime: event.startTime,
			endTime: event.endTime,
			isAllDay: event.isAllDay,
			color: calendar.color,
			isRecurring: !!event.rrule,
			isException: false,
			originalStart: null,
			status: event.status,
			// Booking info for client-side conflict detection
			bookingId: event.bookingId,
			assignedResourceIds: event.assignedResourceIds
		};
	}

	// Check if event overlaps with date range
	private eventOverlapsRange(event: CalendarEvent, range: DateRange): boolean {
		return event.startTime <= range.end && event.endTime >= range.start;
	}

	// Check if event occurs on a specific day
	private eventOccursOnDay(event: CalendarEvent, date: Date): boolean {
		if (event.isAllDay) {
			// For all-day events, check if the day falls within the event span
			const eventStart = new Date(event.startTime);
			const eventEnd = new Date(event.endTime);
			eventStart.setHours(0, 0, 0, 0);
			eventEnd.setHours(23, 59, 59, 999);
			return isWithinInterval(date, { start: eventStart, end: eventEnd });
		}

		// For timed events, check if start or end is on this day
		return isSameDay(event.startTime, date) || isSameDay(event.endTime, date);
	}

	// CRUD Operations (will call API endpoints)
	async fetchEvents(range: DateRange, calendarIds?: string[]): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			const params = new URLSearchParams({
				start: range.start.toISOString(),
				end: range.end.toISOString()
			});

			if (calendarIds?.length) {
				params.set('calendarIds', calendarIds.join(','));
			}

			const response = await fetch(`/api/events?${params}`);
			if (!response.ok) {
				throw new Error('Failed to fetch events');
			}

			const data = await response.json();
			this.events = data.events.map(this.parseEventFromApi);
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			this.loading = false;
		}
	}

	async fetchCalendars(): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			const response = await fetch('/api/calendars');
			if (!response.ok) {
				throw new Error('Failed to fetch calendars');
			}

			const data = await response.json();
			this.calendars = data.calendars;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			this.loading = false;
		}
	}

	async createEvent(input: CreateEventInput): Promise<CalendarEvent | null> {
		this.loading = true;
		this.error = null;

		try {
			const response = await fetch('/api/events', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input)
			});

			if (!response.ok) {
				throw new Error('Failed to create event');
			}

			const data = await response.json();
			const event = this.parseEventFromApi(data.event);
			this.events = [...this.events, event];
			return event;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Unknown error';
			return null;
		} finally {
			this.loading = false;
		}
	}

	async updateEvent(
		eventId: string,
		input: UpdateEventInput,
		mode: 'all' | 'this' | 'future' = 'all'
	): Promise<{ event: CalendarEvent } | { error: string; code?: string }> {
		this.loading = true;
		this.error = null;

		try {
			const response = await fetch(`/api/events/${eventId}?mode=${mode}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input)
			});

			const data = await response.json();

			// Handle booking constraint violations (409 Conflict)
			if (response.status === 409) {
				const errorMessage = data.error || 'Cannot update event due to booking constraints';
				this.error = errorMessage;
				return { error: errorMessage, code: data.code };
			}

			if (!response.ok) {
				throw new Error(data.error || 'Failed to update event');
			}

			const updated = this.parseEventFromApi(data.event);
			this.events = this.events.map((e) => (e.id === eventId ? updated : e));
			return { event: updated };
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Unknown error';
			return { error: this.error };
		} finally {
			this.loading = false;
		}
	}

	async deleteEvent(eventId: string, mode: 'all' | 'this' | 'future' = 'all'): Promise<boolean> {
		this.loading = true;
		this.error = null;

		try {
			const response = await fetch(`/api/events/${eventId}?mode=${mode}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete event');
			}

			this.events = this.events.filter((e) => e.id !== eventId);
			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Unknown error';
			return false;
		} finally {
			this.loading = false;
		}
	}

	// Calendar visibility toggle
	toggleCalendarVisibility(calendarId: string): void {
		this.calendars = this.calendars.map((c) =>
			c.id === calendarId ? { ...c, isVisible: !c.isVisible } : c
		);
	}

	// Selection management
	selectEvent(eventId: string | null): void {
		this.selectedEventId = eventId;
	}

	startEditingEvent(event?: Partial<CreateEventInput>): void {
		this.editingEvent = event || null;
	}

	stopEditingEvent(): void {
		this.editingEvent = null;
	}

	// Optimistic updates for drag-drop
	moveEvent(eventId: string, newStart: Date, newEnd: Date): void {
		this.events = this.events.map((e) =>
			e.id === eventId ? { ...e, startTime: newStart, endTime: newEnd } : e
		);
	}

	// Revert an event to previous state (used when update fails)
	revertEvent(eventId: string, previousState: { startTime: Date; endTime: Date }): void {
		this.events = this.events.map((e) =>
			e.id === eventId
				? { ...e, startTime: previousState.startTime, endTime: previousState.endTime }
				: e
		);
	}

	/**
	 * Check if moving an event to a new time would cause a resource conflict.
	 * This is a CLIENT-SIDE check for instant feedback - no server round-trip.
	 * Returns null if no conflict, or an error message if there is one.
	 */
	checkResourceConflict(eventId: string, newStart: Date, newEnd: Date): string | null {
		const event = this.getEvent(eventId);
		if (!event) return null;

		// Only check booking events that have assigned resources
		if (!event.bookingId || event.assignedResourceIds.length === 0) {
			return null;
		}

		const draggedResources = new Set(event.assignedResourceIds);

		// Check all other visible events for conflicts
		for (const other of this.visibleEvents) {
			// Skip the event being moved
			if (other.id === eventId) continue;

			// Skip events without assigned resources
			if (!other.assignedResourceIds || other.assignedResourceIds.length === 0) continue;

			// Check if times overlap
			const timesOverlap = newStart < other.endTime && newEnd > other.startTime;
			if (!timesOverlap) continue;

			// Check if any resources overlap
			for (const resourceId of other.assignedResourceIds) {
				if (draggedResources.has(resourceId)) {
					// Found a conflict - return a descriptive message
					// Extract the resource info from the other event's title if it's a booking
					return `Conflicts with "${other.title}"`;
				}
			}
		}

		return null;
	}

	// Parse API response to CalendarEvent
	private parseEventFromApi(data: Record<string, unknown>): CalendarEvent {
		return {
			id: data.id as string,
			calendarId: data.calendarId as string,
			title: data.title as string,
			description: (data.description as string) || null,
			location: (data.location as string) || null,
			startTime: new Date(data.startTime as string),
			endTime: new Date(data.endTime as string),
			isAllDay: data.isAllDay as boolean,
			timezone: (data.timezone as string) || 'UTC',
			rrule: (data.rrule as string) || null,
			recurrenceStart: data.recurrenceStart ? new Date(data.recurrenceStart as string) : null,
			recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd as string) : null,
			status: (data.status as CalendarEvent['status']) || 'confirmed',
			// Booking info for client-side conflict detection
			bookingId: (data.bookingId as string) || null,
			assignedResourceIds: (data.assignedResourceIds as string[]) || []
		};
	}
}

// Singleton instance
let globalEventStore: EventStore | null = null;

export function getEventStore(): EventStore {
	if (!globalEventStore) {
		globalEventStore = new EventStore();
	}
	return globalEventStore;
}

export function createEventStore(): EventStore {
	return new EventStore();
}
