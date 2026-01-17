export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface AvailabilityTemplate {
	id: string;
	userId: string;
	name: string;
	timezone: string;
	slotDuration: number; // in minutes
	bufferBefore: number; // in minutes
	bufferAfter: number; // in minutes
	minNotice: number; // in minutes
	maxAdvanceDays: number;
	isActive: boolean;
}

export interface AvailabilityWindow {
	id: string;
	templateId: string;
	dayOfWeek: number; // 0 = Sunday, 6 = Saturday
	startTime: string; // HH:mm format
	endTime: string; // HH:mm format
	isActive: boolean;
}

export interface AvailabilityOverride {
	id: string;
	templateId: string;
	date: string; // YYYY-MM-DD format
	isAvailable: boolean;
	startTime: string | null; // HH:mm format, if available
	endTime: string | null; // HH:mm format, if available
	reason: string | null;
}

export interface Booking {
	id: string;
	templateId: string;
	eventId: string | null;
	bookerName: string;
	bookerEmail: string;
	bookerPhone: string | null;
	bookerNotes: string | null;
	startTime: Date;
	endTime: Date;
	status: BookingStatus;
	confirmationToken: string | null;
	createdAt: Date;
}

export interface TimeSlot {
	startTime: Date;
	endTime: Date;
	available: boolean;
}

// Database row types
export interface AvailabilityTemplateRow {
	id: string;
	user_id: string;
	name: string;
	timezone: string;
	slot_duration: number;
	buffer_before: number;
	buffer_after: number;
	min_notice: number;
	max_advance_days: number;
	is_active: number;
}

export interface AvailabilityWindowRow {
	id: string;
	template_id: string;
	day_of_week: number;
	start_time: string;
	end_time: string;
	is_active: number;
}

export interface AvailabilityOverrideRow {
	id: string;
	template_id: string;
	date: string;
	is_available: number;
	start_time: string | null;
	end_time: string | null;
	reason: string | null;
}

export interface BookingRow {
	id: string;
	template_id: string;
	event_id: string | null;
	booker_name: string;
	booker_email: string;
	booker_phone: string | null;
	booker_notes: string | null;
	start_time: string;
	end_time: string;
	status: string;
	confirmation_token: string | null;
	created_at: string;
}

// Conversion helpers
export function rowToAvailabilityTemplate(row: AvailabilityTemplateRow): AvailabilityTemplate {
	return {
		id: row.id,
		userId: row.user_id,
		name: row.name,
		timezone: row.timezone,
		slotDuration: row.slot_duration,
		bufferBefore: row.buffer_before,
		bufferAfter: row.buffer_after,
		minNotice: row.min_notice,
		maxAdvanceDays: row.max_advance_days,
		isActive: row.is_active === 1
	};
}

export function rowToAvailabilityWindow(row: AvailabilityWindowRow): AvailabilityWindow {
	return {
		id: row.id,
		templateId: row.template_id,
		dayOfWeek: row.day_of_week,
		startTime: row.start_time,
		endTime: row.end_time,
		isActive: row.is_active === 1
	};
}

export function rowToAvailabilityOverride(row: AvailabilityOverrideRow): AvailabilityOverride {
	return {
		id: row.id,
		templateId: row.template_id,
		date: row.date,
		isAvailable: row.is_available === 1,
		startTime: row.start_time,
		endTime: row.end_time,
		reason: row.reason
	};
}

export function rowToBooking(row: BookingRow): Booking {
	return {
		id: row.id,
		templateId: row.template_id,
		eventId: row.event_id,
		bookerName: row.booker_name,
		bookerEmail: row.booker_email,
		bookerPhone: row.booker_phone,
		bookerNotes: row.booker_notes,
		startTime: new Date(row.start_time),
		endTime: new Date(row.end_time),
		status: row.status as BookingStatus,
		confirmationToken: row.confirmation_token,
		createdAt: new Date(row.created_at)
	};
}

// Input types
export interface CreateAvailabilityTemplateInput {
	name: string;
	timezone: string;
	slotDuration: number;
	bufferBefore?: number;
	bufferAfter?: number;
	minNotice?: number;
	maxAdvanceDays?: number;
}

export interface UpdateAvailabilityTemplateInput {
	name?: string;
	timezone?: string;
	slotDuration?: number;
	bufferBefore?: number;
	bufferAfter?: number;
	minNotice?: number;
	maxAdvanceDays?: number;
	isActive?: boolean;
}

export interface CreateAvailabilityWindowInput {
	templateId: string;
	dayOfWeek: number;
	startTime: string;
	endTime: string;
}

export interface CreateAvailabilityOverrideInput {
	templateId: string;
	date: string;
	isAvailable: boolean;
	startTime?: string;
	endTime?: string;
	reason?: string;
}

export interface CreateBookingInput {
	templateId: string;
	bookerName: string;
	bookerEmail: string;
	bookerPhone?: string;
	bookerNotes?: string;
	startTime: Date;
	endTime: Date;
}
