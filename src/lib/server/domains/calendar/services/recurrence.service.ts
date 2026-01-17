import pkg from 'rrule';
const { RRule, RRuleSet, rrulestr } = pkg;
import type { Event } from '$lib/server/db/drizzle/schema/events';
import type { Calendar } from '$lib/server/db/drizzle/schema/calendars';

export interface RecurrenceBounds {
	start: Date;
	end: Date | null;
}

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
	status: string;
}

export interface EventException {
	id: string;
	eventId: string;
	originalStart: string;
	exceptionType: 'modified' | 'deleted';
	title: string | null;
	startTime: string | null;
	endTime: string | null;
}

export interface RRuleOptions {
	frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
	interval?: number;
	byWeekday?: number[]; // 0 = Monday, 6 = Sunday (rrule convention)
	byMonthDay?: number;
	bySetPos?: number; // For "second Tuesday" etc
	until?: Date;
	count?: number;
}

export const recurrenceService = {
	/**
	 * Compute the bounds of a recurring event based on its RRULE
	 */
	computeRecurrenceBounds(rruleString: string, dtstart: Date): RecurrenceBounds {
		try {
			const rule = rrulestr(rruleString, { dtstart });
			const options = rule.options;

			if (options.until) {
				return { start: dtstart, end: options.until };
			}

			if (options.count) {
				const occurrences = rule.all();
				const lastOccurrence = occurrences[occurrences.length - 1];
				return { start: dtstart, end: lastOccurrence };
			}

			// No end specified - recurring indefinitely
			return { start: dtstart, end: null };
		} catch {
			return { start: dtstart, end: dtstart };
		}
	},

	/**
	 * Expand recurring events into individual instances within a date range
	 */
	expandRecurringEvents(
		events: Event[],
		calendars: Map<string, Calendar>,
		rangeStart: Date,
		rangeEnd: Date,
		exceptions: Map<string, EventException[]>
	): EventInstance[] {
		const instances: EventInstance[] = [];

		for (const event of events) {
			const calendar = calendars.get(event.calendarId);
			if (!calendar) continue;

			const eventStartTime = new Date(event.startTime);
			const eventEndTime = new Date(event.endTime);

			if (!event.rrule) {
				// Non-recurring event
				if (this.eventInRange(eventStartTime, eventEndTime, rangeStart, rangeEnd)) {
					instances.push(this.eventToInstance(event, calendar));
				}
				continue;
			}

			// Get exceptions for this event
			const eventExceptions = exceptions.get(event.id) || [];
			const deletedDates = new Set(
				eventExceptions.filter((e) => e.exceptionType === 'deleted').map((e) => e.originalStart)
			);
			const modifiedExceptions = new Map(
				eventExceptions
					.filter((e) => e.exceptionType === 'modified')
					.map((e) => [e.originalStart, e])
			);

			// Expand the recurrence rule
			try {
				const rruleSet = new RRuleSet();
				const rule = rrulestr(event.rrule, { dtstart: eventStartTime });
				rruleSet.rrule(rule);

				const occurrences = rruleSet.between(rangeStart, rangeEnd, true);
				const eventDuration = eventEndTime.getTime() - eventStartTime.getTime();

				for (const occurrence of occurrences) {
					const occurrenceKey = occurrence.toISOString();

					if (deletedDates.has(occurrenceKey)) continue;

					const modification = modifiedExceptions.get(occurrenceKey);

					if (modification) {
						instances.push({
							id: `${event.id}_${occurrenceKey}`,
							eventId: event.id,
							calendarId: event.calendarId,
							title: modification.title || event.title,
							description: event.description,
							location: event.location,
							startTime: modification.startTime ? new Date(modification.startTime) : occurrence,
							endTime: modification.endTime
								? new Date(modification.endTime)
								: new Date(occurrence.getTime() + eventDuration),
							isAllDay: event.isAllDay ?? false,
							color: calendar.color ?? '#3b82f6',
							isRecurring: true,
							isException: true,
							originalStart: occurrence,
							status: event.status ?? 'confirmed'
						});
					} else {
						instances.push({
							id: `${event.id}_${occurrenceKey}`,
							eventId: event.id,
							calendarId: event.calendarId,
							title: event.title,
							description: event.description,
							location: event.location,
							startTime: occurrence,
							endTime: new Date(occurrence.getTime() + eventDuration),
							isAllDay: event.isAllDay ?? false,
							color: calendar.color ?? '#3b82f6',
							isRecurring: true,
							isException: false,
							originalStart: occurrence,
							status: event.status ?? 'confirmed'
						});
					}
				}
			} catch {
				// If recurrence parsing fails, add the base event
				if (this.eventInRange(eventStartTime, eventEndTime, rangeStart, rangeEnd)) {
					instances.push({
						...this.eventToInstance(event, calendar),
						isRecurring: true
					});
				}
			}
		}

		return instances;
	},

	/**
	 * Build an RRULE string from user-friendly options
	 */
	buildRRule(options: RRuleOptions): string {
		const parts: string[] = [];

		const freqMap: Record<string, string> = {
			daily: 'DAILY',
			weekly: 'WEEKLY',
			monthly: 'MONTHLY',
			yearly: 'YEARLY'
		};
		parts.push(`FREQ=${freqMap[options.frequency]}`);

		if (options.interval && options.interval > 1) {
			parts.push(`INTERVAL=${options.interval}`);
		}

		if (options.byWeekday && options.byWeekday.length > 0) {
			const dayMap = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
			const days = options.byWeekday.map((d) => dayMap[d]).join(',');
			parts.push(`BYDAY=${days}`);
		}

		if (options.byMonthDay) {
			parts.push(`BYMONTHDAY=${options.byMonthDay}`);
		}

		if (options.bySetPos) {
			parts.push(`BYSETPOS=${options.bySetPos}`);
		}

		if (options.until) {
			const untilStr = options.until.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
			parts.push(`UNTIL=${untilStr}`);
		} else if (options.count) {
			parts.push(`COUNT=${options.count}`);
		}

		return `RRULE:${parts.join(';')}`;
	},

	/**
	 * Parse an RRULE string into user-friendly options
	 */
	parseRRule(rruleString: string): RRuleOptions | null {
		try {
			const rule = rrulestr(rruleString);
			const options = rule.options;

			const freqMap: Record<number, RRuleOptions['frequency']> = {
				[RRule.DAILY]: 'daily',
				[RRule.WEEKLY]: 'weekly',
				[RRule.MONTHLY]: 'monthly',
				[RRule.YEARLY]: 'yearly'
			};

			return {
				frequency: freqMap[options.freq] || 'weekly',
				interval: options.interval || 1,
				byWeekday: options.byweekday?.map((d) => {
					if (typeof d === 'number') return d;
					return (d as { weekday: number }).weekday;
				}),
				byMonthDay: options.bymonthday?.[0],
				bySetPos: options.bysetpos?.[0],
				until: options.until || undefined,
				count: options.count || undefined
			};
		} catch {
			return null;
		}
	},

	// Helper functions
	eventInRange(start: Date, end: Date, rangeStart: Date, rangeEnd: Date): boolean {
		return start <= rangeEnd && end >= rangeStart;
	},

	eventToInstance(event: Event, calendar: Calendar): EventInstance {
		return {
			id: event.id,
			eventId: event.id,
			calendarId: event.calendarId,
			title: event.title,
			description: event.description,
			location: event.location,
			startTime: new Date(event.startTime),
			endTime: new Date(event.endTime),
			isAllDay: event.isAllDay ?? false,
			color: calendar.color ?? '#3b82f6',
			isRecurring: false,
			isException: false,
			originalStart: null,
			status: event.status ?? 'confirmed'
		};
	}
};
