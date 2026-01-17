<script lang="ts">
	import { Calendar } from '$lib/components/ui/calendar';
	import { CalendarDate, getLocalTimeZone, type DateValue } from '@internationalized/date';

	interface Props {
		selectedDate?: Date;
		onDateSelect?: (date: Date) => void;
	}

	let { selectedDate, onDateSelect }: Props = $props();

	// Convert JS Date to CalendarDate for the component
	function dateToCalendarDate(date: Date | undefined): CalendarDate | undefined {
		if (!date) return undefined;
		return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
	}

	// Convert CalendarDate to JS Date for the callback
	function calendarDateToDate(cd: DateValue): Date {
		return cd.toDate(getLocalTimeZone());
	}

	let calendarValue = $state<CalendarDate | undefined>(dateToCalendarDate(selectedDate));

	// Sync when external selectedDate changes
	$effect(() => {
		const newCalendarDate = dateToCalendarDate(selectedDate);
		if (newCalendarDate && calendarValue) {
			// Only update if they're different
			if (
				newCalendarDate.year !== calendarValue.year ||
				newCalendarDate.month !== calendarValue.month ||
				newCalendarDate.day !== calendarValue.day
			) {
				calendarValue = newCalendarDate;
			}
		} else if (newCalendarDate && !calendarValue) {
			calendarValue = newCalendarDate;
		}
	});

	function handleValueChange(newValue: DateValue | undefined) {
		if (newValue) {
			// Convert DateValue to CalendarDate (they share the same interface)
			calendarValue = new CalendarDate(newValue.year, newValue.month, newValue.day);
			onDateSelect?.(calendarDateToDate(newValue));
		}
	}
</script>

<div class="w-full">
	<Calendar
		type="single"
		bind:value={calendarValue}
		onValueChange={handleValueChange}
		class="rounded-md border-0 p-0 shadow-none [--cell-size:--spacing(7)]"
		weekdayFormat="narrow"
	/>
</div>
