export type ViewType = 'month' | 'week' | 'day';

export type EventStatus = 'confirmed' | 'tentative' | 'cancelled';

export interface User {
	id: string;
	email: string;
	name: string;
	timezone: string;
	createdAt: Date;
}

export interface Calendar {
	id: string;
	userId: string;
	name: string;
	color: string;
	isDefault: boolean;
	isVisible: boolean;
	sortOrder: number;
}

export interface CalendarEvent {
	id: string;
	calendarId: string;
	title: string;
	description: string | null;
	location: string | null;
	startTime: Date;
	endTime: Date;
	isAllDay: boolean;
	timezone: string;
	rrule: string | null;
	recurrenceStart: Date | null;
	recurrenceEnd: Date | null;
	status: EventStatus;
	// Booking info for client-side conflict detection
	bookingId: string | null;
	assignedResourceIds: string[];
}

export interface EventException {
	id: string;
	eventId: string;
	originalStart: Date;
	exceptionType: 'modified' | 'deleted';
	title: string | null;
	startTime: Date | null;
	endTime: Date | null;
}

// Expanded event instance (for rendering, includes recurring instances)
export interface EventInstance {
	id: string;
	eventId: string;
	calendarId: string;
	title: string;
	description: string | null;
	location: string | null;
	startTime: Date;
	endTime: Date;
	isAllDay: boolean;
	color: string;
	isRecurring: boolean;
	isException: boolean;
	originalStart: Date | null;
	status: EventStatus;
	// Booking info for client-side conflict detection
	bookingId: string | null;
	assignedResourceIds: string[];
}

// Database row types (raw from SQLite)
export interface CalendarRow {
	id: string;
	user_id: string;
	name: string;
	color: string;
	is_default: number;
	is_visible: number;
	sort_order: number;
}

export interface EventRow {
	id: string;
	calendar_id: string;
	title: string;
	description: string | null;
	location: string | null;
	start_time: string;
	end_time: string;
	is_all_day: number;
	timezone: string;
	rrule: string | null;
	recurrence_start: string | null;
	recurrence_end: string | null;
	status: string;
}

export interface EventExceptionRow {
	id: string;
	event_id: string;
	original_start: string;
	exception_type: string;
	title: string | null;
	start_time: string | null;
	end_time: string | null;
}

// Conversion helpers
export function rowToCalendar(row: CalendarRow): Calendar {
	return {
		id: row.id,
		userId: row.user_id,
		name: row.name,
		color: row.color,
		isDefault: row.is_default === 1,
		isVisible: row.is_visible === 1,
		sortOrder: row.sort_order
	};
}

export function rowToEvent(row: EventRow): CalendarEvent {
	return {
		id: row.id,
		calendarId: row.calendar_id,
		title: row.title,
		description: row.description,
		location: row.location,
		startTime: new Date(row.start_time),
		endTime: new Date(row.end_time),
		isAllDay: row.is_all_day === 1,
		timezone: row.timezone,
		rrule: row.rrule,
		recurrenceStart: row.recurrence_start ? new Date(row.recurrence_start) : null,
		recurrenceEnd: row.recurrence_end ? new Date(row.recurrence_end) : null,
		status: row.status as EventStatus,
		// Booking info - these will be populated separately by the API
		bookingId: null,
		assignedResourceIds: []
	};
}

export function rowToEventException(row: EventExceptionRow): EventException {
	return {
		id: row.id,
		eventId: row.event_id,
		originalStart: new Date(row.original_start),
		exceptionType: row.exception_type as 'modified' | 'deleted',
		title: row.title,
		startTime: row.start_time ? new Date(row.start_time) : null,
		endTime: row.end_time ? new Date(row.end_time) : null
	};
}

// Input types for creating/updating
export interface CreateCalendarInput {
	name: string;
	color?: string;
	isDefault?: boolean;
}

export interface UpdateCalendarInput {
	name?: string;
	color?: string;
	isDefault?: boolean;
	isVisible?: boolean;
	sortOrder?: number;
}

export interface CreateEventInput {
	calendarId: string;
	title: string;
	description?: string;
	location?: string;
	startTime: Date;
	endTime: Date;
	isAllDay?: boolean;
	timezone?: string;
	rrule?: string;
}

export interface UpdateEventInput {
	title?: string;
	description?: string;
	location?: string;
	startTime?: Date;
	endTime?: Date;
	isAllDay?: boolean;
	timezone?: string;
	rrule?: string;
	status?: EventStatus;
}

export type RecurringUpdateMode = 'all' | 'this' | 'future';

// Drag-drop types
export interface DragMoveData {
	type: 'move';
	eventId: string;
	originalStart: Date;
	originalEnd: Date;
}

export interface DragResizeData {
	type: 'resize-top' | 'resize-bottom';
	eventId: string;
}

export interface DragCreateData {
	type: 'create';
	startTime: Date;
}

export type DragData = DragMoveData | DragResizeData | DragCreateData;

// View range
export interface DateRange {
	start: Date;
	end: Date;
}
