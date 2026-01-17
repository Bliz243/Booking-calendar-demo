// Date utility functions for the calendar

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];
const MONTHS_SHORT = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec'
];

// Start/End helpers
export function startOfDay(date: Date): Date {
	const result = new Date(date);
	result.setHours(0, 0, 0, 0);
	return result;
}

export function endOfDay(date: Date): Date {
	const result = new Date(date);
	result.setHours(23, 59, 59, 999);
	return result;
}

export function startOfWeek(date: Date, weekStartsOn: number = 0): Date {
	const result = new Date(date);
	const day = result.getDay();
	const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
	result.setDate(result.getDate() - diff);
	result.setHours(0, 0, 0, 0);
	return result;
}

export function endOfWeek(date: Date, weekStartsOn: number = 0): Date {
	const result = startOfWeek(date, weekStartsOn);
	result.setDate(result.getDate() + 6);
	result.setHours(23, 59, 59, 999);
	return result;
}

export function startOfMonth(date: Date): Date {
	const result = new Date(date);
	result.setDate(1);
	result.setHours(0, 0, 0, 0);
	return result;
}

export function endOfMonth(date: Date): Date {
	const result = new Date(date.getFullYear(), date.getMonth() + 1, 0);
	result.setHours(23, 59, 59, 999);
	return result;
}

// Add/Subtract helpers
export function addDays(date: Date, amount: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + amount);
	return result;
}

export function addWeeks(date: Date, amount: number): Date {
	return addDays(date, amount * 7);
}

export function addMonths(date: Date, amount: number): Date {
	const result = new Date(date);
	const targetMonth = result.getMonth() + amount;
	result.setMonth(targetMonth);

	// Handle edge case where day doesn't exist in target month
	if (result.getMonth() !== ((targetMonth % 12) + 12) % 12) {
		result.setDate(0); // Go to last day of previous month
	}

	return result;
}

export function addYears(date: Date, amount: number): Date {
	const result = new Date(date);
	result.setFullYear(result.getFullYear() + amount);
	return result;
}

export function addMinutes(date: Date, amount: number): Date {
	const result = new Date(date);
	result.setTime(result.getTime() + amount * 60 * 1000);
	return result;
}

export function addHours(date: Date, amount: number): Date {
	return addMinutes(date, amount * 60);
}

// Comparison helpers
export function isSameDay(date1: Date, date2: Date): boolean {
	return (
		date1.getFullYear() === date2.getFullYear() &&
		date1.getMonth() === date2.getMonth() &&
		date1.getDate() === date2.getDate()
	);
}

export function isSameWeek(date1: Date, date2: Date, weekStartsOn: number = 0): boolean {
	const start1 = startOfWeek(date1, weekStartsOn);
	const start2 = startOfWeek(date2, weekStartsOn);
	return isSameDay(start1, start2);
}

export function isSameMonth(date1: Date, date2: Date): boolean {
	return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
}

export function isToday(date: Date): boolean {
	return isSameDay(date, new Date());
}

export function isBefore(date1: Date, date2: Date): boolean {
	return date1.getTime() < date2.getTime();
}

export function isAfter(date1: Date, date2: Date): boolean {
	return date1.getTime() > date2.getTime();
}

export function isWithinInterval(date: Date, interval: { start: Date; end: Date }): boolean {
	const time = date.getTime();
	return time >= interval.start.getTime() && time <= interval.end.getTime();
}

// Difference helpers
export function differenceInMinutes(date1: Date, date2: Date): number {
	return Math.round((date1.getTime() - date2.getTime()) / (1000 * 60));
}

export function differenceInHours(date1: Date, date2: Date): number {
	return Math.round((date1.getTime() - date2.getTime()) / (1000 * 60 * 60));
}

export function differenceInDays(date1: Date, date2: Date): number {
	const start1 = startOfDay(date1);
	const start2 = startOfDay(date2);
	return Math.round((start1.getTime() - start2.getTime()) / (1000 * 60 * 60 * 24));
}

// Formatting helpers
export function format(date: Date, formatStr: string): string {
	const day = date.getDate();
	const month = date.getMonth();
	const year = date.getFullYear();
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const dayOfWeek = date.getDay();

	// Use placeholders to prevent overlap issues
	const tokens: [string, string][] = [
		['yyyy', String(year)],
		['yy', String(year).slice(-2)],
		['MMMM', MONTHS[month]],
		['MMM', MONTHS_SHORT[month]],
		['MM', String(month + 1).padStart(2, '0')],
		['dd', String(day).padStart(2, '0')],
		['EEEE', DAYS[dayOfWeek]],
		['EEE', DAYS_SHORT[dayOfWeek]],
		['HH', String(hours).padStart(2, '0')],
		['hh', String(hours % 12 || 12).padStart(2, '0')],
		['mm', String(minutes).padStart(2, '0')],
		['a', hours < 12 ? 'AM' : 'PM'],
		['d', String(day)],
		['M', String(month + 1)],
		['H', String(hours)],
		['h', String(hours % 12 || 12)],
		['m', String(minutes)],
		['E', DAYS_SHORT[dayOfWeek]]
	];

	let result = formatStr;
	const placeholders: string[] = [];

	// First pass: replace tokens with placeholders
	for (let i = 0; i < tokens.length; i++) {
		const [token, value] = tokens[i];
		const placeholder = `\x00${i}\x00`;
		placeholders.push(value);
		result = result.replace(new RegExp(token, 'g'), placeholder);
	}

	// Second pass: replace placeholders with actual values
	for (let i = 0; i < placeholders.length; i++) {
		result = result.replace(new RegExp(`\x00${i}\x00`, 'g'), placeholders[i]);
	}

	return result;
}

export function formatTime(date: Date, use24Hour: boolean = false): string {
	if (use24Hour) {
		return format(date, 'HH:mm');
	}
	return format(date, 'h:mm a');
}

export function formatDateRange(start: Date, end: Date): string {
	if (isSameDay(start, end)) {
		return `${formatTime(start)} - ${formatTime(end)}`;
	}
	return `${format(start, 'MMM d')} ${formatTime(start)} - ${format(end, 'MMM d')} ${formatTime(end)}`;
}

// Parse helpers
export function parseTime(timeStr: string): { hours: number; minutes: number } {
	const [hours, minutes] = timeStr.split(':').map(Number);
	return { hours, minutes };
}

export function setTime(date: Date, hours: number, minutes: number): Date {
	const result = new Date(date);
	result.setHours(hours, minutes, 0, 0);
	return result;
}

export function combineDateAndTime(date: Date, timeStr: string): Date {
	const { hours, minutes } = parseTime(timeStr);
	return setTime(date, hours, minutes);
}

// Grid helpers for calendar
export function getHoursInDay(): number[] {
	return Array.from({ length: 24 }, (_, i) => i);
}

export function getMinuteSlots(interval: number = 15): number[] {
	const slots: number[] = [];
	for (let m = 0; m < 60; m += interval) {
		slots.push(m);
	}
	return slots;
}

export function roundToNearestMinutes(date: Date, nearestTo: number = 15): Date {
	const result = new Date(date);
	const minutes = result.getMinutes();
	const rounded = Math.round(minutes / nearestTo) * nearestTo;
	result.setMinutes(rounded, 0, 0);
	return result;
}

export function floorToNearestMinutes(date: Date, nearestTo: number = 15): Date {
	const result = new Date(date);
	const minutes = result.getMinutes();
	const floored = Math.floor(minutes / nearestTo) * nearestTo;
	result.setMinutes(floored, 0, 0);
	return result;
}

// Position calculation for calendar grid
export function getTimePosition(date: Date, dayStart: Date): number {
	const startOfDayMs = startOfDay(dayStart).getTime();
	const currentMs = date.getTime();
	const diffMinutes = (currentMs - startOfDayMs) / (1000 * 60);
	return (diffMinutes / (24 * 60)) * 100; // Returns percentage
}

export function getEventDuration(start: Date, end: Date): number {
	return differenceInMinutes(end, start);
}

// ISO string helpers
export function toISODateString(date: Date): string {
	return format(date, 'yyyy-MM-dd');
}

export function toISOTimeString(date: Date): string {
	return format(date, 'HH:mm');
}

export function fromISOString(isoString: string): Date {
	return new Date(isoString);
}
