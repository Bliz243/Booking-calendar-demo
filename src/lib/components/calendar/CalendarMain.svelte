<script lang="ts">
	import { getCalendarContext } from './CalendarRoot.svelte';
	import WeekView from './views/WeekView.svelte';
	import DayView from './views/DayView.svelte';
	import MonthView from './views/MonthView.svelte';
	import type { EventInstance } from '$lib/types/calendar';

	interface Props {
		onTimeClick?: (date: Date) => void;
		onEventClick?: (event: EventInstance) => void;
	}

	let { onTimeClick, onEventClick }: Props = $props();

	const { state, eventStore } = getCalendarContext();
</script>

<div class="h-full min-h-0 flex-1 overflow-hidden">
	{#if state.viewType === 'day'}
		<DayView {state} {eventStore} {onTimeClick} {onEventClick} />
	{:else if state.viewType === 'week'}
		<WeekView {state} {eventStore} {onTimeClick} {onEventClick} />
	{:else if state.viewType === 'month'}
		<MonthView {state} {eventStore} {onEventClick} />
	{/if}
</div>
