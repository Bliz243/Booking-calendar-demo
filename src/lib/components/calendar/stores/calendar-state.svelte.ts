import type { ViewType, DateRange } from '$lib/types/calendar';
import {
	startOfWeek,
	endOfWeek,
	startOfMonth,
	endOfMonth,
	startOfDay,
	endOfDay,
	addDays,
	addWeeks,
	addMonths,
	format,
	isSameMonth,
	isSameWeek,
	isSameDay
} from '$lib/utils/date';

export class CalendarState {
	// Core state
	currentDate = $state(new Date());
	viewType = $state<ViewType>('week');

	// Derived state
	visibleRange = $derived.by(() => this.computeVisibleRange());
	viewTitle = $derived.by(() => this.computeViewTitle());
	isToday = $derived.by(() => this.checkIsToday());

	constructor(initialDate?: Date, initialView?: ViewType) {
		if (initialDate) {
			this.currentDate = initialDate;
		}
		if (initialView) {
			this.viewType = initialView;
		}
	}

	// Navigation methods
	goToToday(): void {
		this.currentDate = new Date();
	}

	goToPrevious(): void {
		switch (this.viewType) {
			case 'day':
				this.currentDate = addDays(this.currentDate, -1);
				break;
			case 'week':
				this.currentDate = addWeeks(this.currentDate, -1);
				break;
			case 'month':
				this.currentDate = addMonths(this.currentDate, -1);
				break;
		}
	}

	goToNext(): void {
		switch (this.viewType) {
			case 'day':
				this.currentDate = addDays(this.currentDate, 1);
				break;
			case 'week':
				this.currentDate = addWeeks(this.currentDate, 1);
				break;
			case 'month':
				this.currentDate = addMonths(this.currentDate, 1);
				break;
		}
	}

	goToDate(date: Date): void {
		this.currentDate = date;
	}

	setView(view: ViewType): void {
		this.viewType = view;
	}

	// Computed helpers
	private computeVisibleRange(): DateRange {
		switch (this.viewType) {
			case 'day':
				return {
					start: startOfDay(this.currentDate),
					end: endOfDay(this.currentDate)
				};
			case 'week':
				return {
					start: startOfWeek(this.currentDate),
					end: endOfWeek(this.currentDate)
				};
			case 'month': {
				// For month view, include days from adjacent months visible in the grid
				const monthStart = startOfMonth(this.currentDate);
				const monthEnd = endOfMonth(this.currentDate);
				return {
					start: startOfWeek(monthStart),
					end: endOfWeek(monthEnd)
				};
			}
		}
	}

	private computeViewTitle(): string {
		switch (this.viewType) {
			case 'day':
				return format(this.currentDate, 'EEEE, MMMM d, yyyy');
			case 'week': {
				const start = startOfWeek(this.currentDate);
				const end = endOfWeek(this.currentDate);
				if (isSameMonth(start, end)) {
					return format(start, 'MMMM yyyy');
				}
				return `${format(start, 'MMM')} - ${format(end, 'MMM yyyy')}`;
			}
			case 'month':
				return format(this.currentDate, 'MMMM yyyy');
		}
	}

	private checkIsToday(): boolean {
		const today = new Date();
		switch (this.viewType) {
			case 'day':
				return isSameDay(this.currentDate, today);
			case 'week':
				return isSameWeek(this.currentDate, today);
			case 'month':
				return isSameMonth(this.currentDate, today);
		}
	}

	// Utility methods
	getDaysInView(): Date[] {
		const days: Date[] = [];
		const { start, end } = this.visibleRange;
		let current = start;

		while (current <= end) {
			days.push(current);
			current = addDays(current, 1);
		}

		return days;
	}

	getWeeksInMonthView(): Date[][] {
		const days = this.getDaysInView();
		const weeks: Date[][] = [];

		for (let i = 0; i < days.length; i += 7) {
			weeks.push(days.slice(i, i + 7));
		}

		return weeks;
	}

	isCurrentMonth(date: Date): boolean {
		return isSameMonth(date, this.currentDate);
	}
}

// Singleton instance for global calendar state
let globalCalendarState: CalendarState | null = null;

export function getCalendarState(): CalendarState {
	if (!globalCalendarState) {
		globalCalendarState = new CalendarState();
	}
	return globalCalendarState;
}

export function createCalendarState(initialDate?: Date, initialView?: ViewType): CalendarState {
	return new CalendarState(initialDate, initialView);
}
