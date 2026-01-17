import type {
	AvailabilityOverride,
	AvailabilityTemplate,
	AvailabilityWindow,
	Booking,
	TimeSlot
} from '$lib/types/booking';
import type { CalendarEvent } from '$lib/types/calendar';
import {
	addDays,
	addMinutes,
	combineDateAndTime,
	format,
	isAfter,
	isBefore,
	startOfDay
} from '$lib/utils/date';

export interface AvailabilityContext {
	template: AvailabilityTemplate;
	windows: AvailabilityWindow[];
	overrides: AvailabilityOverride[];
	existingBookings: Booking[];
	blockedTimes: CalendarEvent[];
}

export function calculateAvailableSlots(
	ctx: AvailabilityContext,
	rangeStart: Date,
	rangeEnd: Date
): TimeSlot[] {
	const slots: TimeSlot[] = [];
	const now = new Date();
	const minNoticeTime = addMinutes(now, ctx.template.minNotice);
	const maxAdvanceDate = addDays(now, ctx.template.maxAdvanceDays);

	const effectiveStart = isBefore(rangeStart, minNoticeTime) ? minNoticeTime : rangeStart;
	const effectiveEnd = isAfter(rangeEnd, maxAdvanceDate) ? maxAdvanceDate : rangeEnd;

	let currentDay = startOfDay(effectiveStart);
	const effectiveEndStr = format(effectiveEnd, 'yyyy-MM-dd');

	while (
		isBefore(currentDay, effectiveEnd) ||
		format(currentDay, 'yyyy-MM-dd') === effectiveEndStr
	) {
		const daySlots = getSlotsForDay(ctx, currentDay, minNoticeTime);
		slots.push(...daySlots);
		currentDay = addDays(currentDay, 1);
	}

	return slots;
}

function getSlotsForDay(ctx: AvailabilityContext, day: Date, minNoticeTime: Date): TimeSlot[] {
	const dateStr = format(day, 'yyyy-MM-dd');
	const dayOfWeek = day.getDay();

	const override = ctx.overrides.find((o) => o.date === dateStr);

	if (override) {
		if (!override.isAvailable) {
			return [];
		}
		if (override.startTime && override.endTime) {
			return generateSlots(ctx, day, override.startTime, override.endTime, minNoticeTime);
		}
	}

	const windows = ctx.windows.filter((w) => w.dayOfWeek === dayOfWeek && w.isActive);
	const allSlots: TimeSlot[] = [];

	for (const window of windows) {
		const windowSlots = generateSlots(ctx, day, window.startTime, window.endTime, minNoticeTime);
		allSlots.push(...windowSlots);
	}

	return allSlots;
}

function generateSlots(
	ctx: AvailabilityContext,
	day: Date,
	startTimeStr: string,
	endTimeStr: string,
	minNoticeTime: Date
): TimeSlot[] {
	const slots: TimeSlot[] = [];
	const { slotDuration, bufferBefore, bufferAfter } = ctx.template;

	let currentStart = combineDateAndTime(day, startTimeStr);
	const windowEnd = combineDateAndTime(day, endTimeStr);

	while (true) {
		const slotEnd = addMinutes(currentStart, slotDuration);

		if (isAfter(slotEnd, windowEnd)) {
			break;
		}

		if (isBefore(currentStart, minNoticeTime)) {
			currentStart = addMinutes(currentStart, slotDuration);
			continue;
		}

		const available = isSlotAvailable(ctx, currentStart, slotEnd, bufferBefore, bufferAfter);

		slots.push({
			startTime: currentStart,
			endTime: slotEnd,
			available
		});

		currentStart = addMinutes(currentStart, slotDuration);
	}

	return slots;
}

function isSlotAvailable(
	ctx: AvailabilityContext,
	start: Date,
	end: Date,
	bufferBefore: number,
	bufferAfter: number
): boolean {
	const bufferedStart = addMinutes(start, -bufferBefore);
	const bufferedEnd = addMinutes(end, bufferAfter);

	for (const booking of ctx.existingBookings) {
		if (booking.status === 'cancelled') continue;
		if (isBefore(booking.startTime, bufferedEnd) && isAfter(booking.endTime, bufferedStart)) {
			return false;
		}
	}

	for (const event of ctx.blockedTimes) {
		if (event.status === 'cancelled') continue;
		if (isBefore(event.startTime, bufferedEnd) && isAfter(event.endTime, bufferedStart)) {
			return false;
		}
	}

	return true;
}

export function validateBookingSlot(
	ctx: AvailabilityContext,
	startTime: Date,
	endTime: Date
): { valid: boolean; reason?: string } {
	const now = new Date();
	const minNoticeTime = addMinutes(now, ctx.template.minNotice);
	const maxAdvanceDate = addDays(now, ctx.template.maxAdvanceDays);

	if (isBefore(startTime, minNoticeTime)) {
		return { valid: false, reason: 'Booking is too soon. Please select a later time.' };
	}

	if (isAfter(startTime, maxAdvanceDate)) {
		return { valid: false, reason: 'Booking is too far in advance.' };
	}

	const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
	if (duration !== ctx.template.slotDuration) {
		return { valid: false, reason: 'Invalid slot duration.' };
	}

	const available = isSlotAvailable(
		ctx,
		startTime,
		endTime,
		ctx.template.bufferBefore,
		ctx.template.bufferAfter
	);

	if (!available) {
		return { valid: false, reason: 'This time slot is no longer available.' };
	}

	return { valid: true };
}
