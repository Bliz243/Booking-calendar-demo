/**
 * Calendar Adapter
 *
 * Provides a clean interface for the booking domain to interact with the calendar domain.
 * All calendar operations from booking should go through this adapter.
 */

import { calendarService, eventService } from '../../calendar';

export const calendarAdapter = {
	/**
	 * Ensure the system bookings calendar exists and return it
	 */
	ensureBookingsCalendar() {
		return calendarService.ensureSystemBookingsCalendar();
	},

	/**
	 * Create a calendar event for a confirmed booking
	 */
	createEventForBooking(
		title: string,
		description: string,
		startTime: Date,
		endTime: Date
	): string {
		const calendar = this.ensureBookingsCalendar();
		const event = eventService.createForBooking(
			calendar.id,
			title,
			description,
			startTime,
			endTime
		);
		return event.id;
	},

	/**
	 * Cancel a calendar event (when booking is cancelled)
	 */
	cancelEvent(eventId: string): boolean {
		return eventService.cancel(eventId);
	},

	/**
	 * Update calendar event times (when booking is rescheduled)
	 */
	updateEventTime(eventId: string, startTime: Date, endTime: Date): boolean {
		const result = eventService.update(eventId, { startTime, endTime });
		return 'event' in result;
	}
};
