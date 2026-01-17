import { calendarRepository } from '../repositories/calendar.repository';
import { eventRepository } from '../repositories/event.repository';
import type { Calendar, NewCalendar } from '$lib/server/db/drizzle/schema/calendars';

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

export type CalendarResult = { calendar: Calendar } | { error: string };
export type CalendarDeleteResult = { success: true } | { error: string };

export const calendarService = {
	/**
	 * Get all calendars for a user (including system calendars)
	 */
	getAllForUser(userId: string): Calendar[] {
		return calendarRepository.findByUserId(userId);
	},

	/**
	 * Get personal calendars only (no system calendars)
	 */
	getPersonalForUser(userId: string): Calendar[] {
		return calendarRepository.findPersonalByUserId(userId);
	},

	/**
	 * Get a calendar by ID for a user
	 */
	getByIdForUser(id: string, userId: string): Calendar | undefined {
		return calendarRepository.findByIdAndUserId(id, userId);
	},

	/**
	 * Get the default calendar for a user
	 */
	getDefaultForUser(userId: string): Calendar | undefined {
		return calendarRepository.findDefaultByUserId(userId);
	},

	/**
	 * Create a new calendar
	 */
	create(userId: string, input: CreateCalendarInput): CalendarResult {
		// If setting as default, unset other defaults first
		if (input.isDefault) {
			calendarRepository.unsetDefaultForUser(userId);
		}

		const data: Omit<NewCalendar, 'id'> = {
			userId,
			name: input.name,
			color: input.color || '#3b82f6',
			isDefault: input.isDefault || false,
			isVisible: true,
			isSystem: false,
			sortOrder: 0
		};

		const calendar = calendarRepository.create(data);
		return { calendar };
	},

	/**
	 * Update a calendar
	 */
	update(id: string, userId: string, input: UpdateCalendarInput): CalendarResult {
		const existing = calendarRepository.findByIdAndUserId(id, userId);
		if (!existing) {
			return { error: 'Calendar not found' };
		}

		// If setting as default, unset other defaults first
		if (input.isDefault) {
			calendarRepository.unsetDefaultForUser(userId);
		}

		const calendar = calendarRepository.update(id, userId, input);
		if (!calendar) {
			return { error: 'Failed to update calendar' };
		}

		return { calendar };
	},

	/**
	 * Delete a calendar
	 */
	delete(id: string, userId: string): CalendarDeleteResult {
		const existing = calendarRepository.findByIdAndUserId(id, userId);
		if (!existing) {
			return { error: 'Calendar not found' };
		}

		if (existing.isDefault) {
			return { error: 'Cannot delete default calendar' };
		}

		// Delete all events first
		eventRepository.deleteByCalendarId(id);

		// Delete the calendar
		calendarRepository.delete(id, userId);

		return { success: true };
	},

	/**
	 * Get or create the system bookings calendar
	 */
	ensureSystemBookingsCalendar(): Calendar {
		return calendarRepository.ensureSystemBookingsCalendar();
	}
};
