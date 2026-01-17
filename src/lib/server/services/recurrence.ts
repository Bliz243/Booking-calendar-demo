/**
 * Recurrence Service Re-exports
 *
 * Re-exports from the calendar domain for backward compatibility.
 * New code should import from '$lib/server/domains/calendar' instead.
 *
 * Note: expandRecurringEvents uses CalendarEvent type from types/calendar
 * while the domain layer uses Event type from drizzle schema.
 */

import pkg from 'rrule';
const { RRuleSet, rrulestr } = pkg;

import {
	recurrenceService,
	type RecurrenceBounds as DomainRecurrenceBounds
} from '$lib/server/domains/calendar';
import type { Calendar } from '$lib/server/db/drizzle/schema/calendars';
import type { CalendarEvent, EventException, EventInstance } from '$lib/types/calendar';

export type { DomainRecurrenceBounds as RecurrenceBounds };

export interface RRuleOptions {
	frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
	interval?: number;
	byWeekday?: number[];
	byMonthDay?: number;
	bySetPos?: number;
	until?: Date;
	count?: number;
}

const DEFAULT_COLOR = '#3b82f6';

export function computeRecurrenceBounds(
	rruleString: string,
	dtstart: Date
): DomainRecurrenceBounds {
	return recurrenceService.computeRecurrenceBounds(rruleString, dtstart);
}

export function expandRecurringEvents(
	events: CalendarEvent[],
	calendars: Map<string, Calendar>,
	rangeStart: Date,
	rangeEnd: Date,
	exceptions: Map<string, EventException[]>
): EventInstance[] {
	const instances: EventInstance[] = [];

	for (const event of events) {
		const calendar = calendars.get(event.calendarId);
		if (!calendar) continue;

		if (!event.rrule) {
			if (eventInRange(event, rangeStart, rangeEnd)) {
				instances.push(eventToInstance(event, calendar));
			}
			continue;
		}

		const eventExceptions = exceptions.get(event.id) || [];
		const deletedDates = new Set(
			eventExceptions
				.filter((e) => e.exceptionType === 'deleted')
				.map((e) => e.originalStart.toISOString())
		);
		const modifiedExceptions = new Map(
			eventExceptions
				.filter((e) => e.exceptionType === 'modified')
				.map((e) => [e.originalStart.toISOString(), e])
		);

		try {
			const rruleSet = new RRuleSet();
			const rule = rrulestr(event.rrule, { dtstart: event.startTime });
			rruleSet.rrule(rule);

			const occurrences = rruleSet.between(rangeStart, rangeEnd, true);
			const eventDuration = event.endTime.getTime() - event.startTime.getTime();
			const color = calendar.color ?? DEFAULT_COLOR;

			for (const occurrence of occurrences) {
				const occurrenceKey = occurrence.toISOString();

				if (deletedDates.has(occurrenceKey)) continue;

				const modification = modifiedExceptions.get(occurrenceKey);
				const baseInstance = {
					id: `${event.id}_${occurrenceKey}`,
					eventId: event.id,
					calendarId: event.calendarId,
					description: event.description,
					location: event.location,
					isAllDay: event.isAllDay,
					color,
					isRecurring: true,
					originalStart: occurrence,
					status: event.status,
					bookingId: event.bookingId,
					assignedResourceIds: event.assignedResourceIds
				};

				if (modification) {
					instances.push({
						...baseInstance,
						title: modification.title || event.title,
						startTime: modification.startTime || occurrence,
						endTime: modification.endTime || new Date(occurrence.getTime() + eventDuration),
						isException: true
					});
				} else {
					instances.push({
						...baseInstance,
						title: event.title,
						startTime: occurrence,
						endTime: new Date(occurrence.getTime() + eventDuration),
						isException: false
					});
				}
			}
		} catch {
			if (eventInRange(event, rangeStart, rangeEnd)) {
				instances.push({
					...eventToInstance(event, calendar),
					isRecurring: true
				});
			}
		}
	}

	return instances;
}

export function buildRRule(options: RRuleOptions): string {
	return recurrenceService.buildRRule(options);
}

export function parseRRule(rruleString: string): RRuleOptions | null {
	return recurrenceService.parseRRule(rruleString);
}

function eventInRange(event: CalendarEvent, rangeStart: Date, rangeEnd: Date): boolean {
	return event.startTime <= rangeEnd && event.endTime >= rangeStart;
}

function eventToInstance(event: CalendarEvent, calendar: Calendar): EventInstance {
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
		color: calendar.color ?? DEFAULT_COLOR,
		isRecurring: false,
		isException: false,
		originalStart: null,
		status: event.status,
		bookingId: event.bookingId,
		assignedResourceIds: event.assignedResourceIds
	};
}
