<script lang="ts">
	import type { CalendarState } from '../stores/calendar-state.svelte';
	import type { EventStore } from '../stores/event-store.svelte';
	import type { EventInstance } from '$lib/types/calendar';
	import TimeGutter from '../grid/TimeGutter.svelte';
	import TimeGrid from '../grid/TimeGrid.svelte';
	import DayColumn from '../grid/DayColumn.svelte';
	import EventChip from '../events/EventChip.svelte';
	import { format, isToday } from '$lib/utils/date';

	interface Props {
		state: CalendarState;
		eventStore: EventStore;
		hourHeight?: number;
		onTimeClick?: (date: Date) => void;
		onEventClick?: (event: EventInstance) => void;
	}

	let {
		state: calendarState,
		eventStore,
		hourHeight = 60,
		onTimeClick,
		onEventClick
	}: Props = $props();

	const day = $derived(calendarState.currentDate);
	const allDayEvents = $derived(eventStore.getAllDayEventsForDay(day));
	const today = $derived(isToday(day));

	// Scroll to current time on mount
	let scrollContainer: HTMLDivElement | null = $state(null);

	$effect(() => {
		if (scrollContainer) {
			const now = new Date();
			const currentHour = now.getHours();
			const scrollTo = Math.max(0, (currentHour - 2) * hourHeight);
			scrollContainer.scrollTop = scrollTo;
		}
	});
</script>

<div class="flex h-full min-h-0 flex-col">
	<!-- Header -->
	<div class="flex border-b border-border">
		<div class="w-[60px] shrink-0"></div>
		<div class="flex-1 py-2">
			<div class="flex flex-col items-center">
				<span class="text-xs text-muted-foreground uppercase">
					{format(day, 'EEEE')}
				</span>
				<span
					class="mt-1 flex h-10 w-10 items-center justify-center rounded-full text-lg font-medium {today
						? 'bg-primary text-primary-foreground'
						: ''}"
				>
					{format(day, 'd')}
				</span>
			</div>
		</div>
	</div>

	<!-- All-day events -->
	{#if allDayEvents.length > 0}
		<div class="flex border-b border-border">
			<div class="w-[60px] shrink-0 p-2 text-xs text-muted-foreground">All day</div>
			<div class="flex flex-1 flex-wrap gap-1 p-2">
				{#each allDayEvents as event (event.id)}
					<EventChip {event} onclick={() => onEventClick?.(event)} />
				{/each}
			</div>
		</div>
	{/if}

	<!-- Time grid area -->
	<div class="min-h-0 flex-1 overflow-y-auto" bind:this={scrollContainer}>
		<div class="flex">
			<!-- Time gutter -->
			<TimeGutter {hourHeight} />

			<!-- Day column -->
			<div class="relative flex-1">
				<!-- Hour lines -->
				<TimeGrid {hourHeight} />

				<!-- Single day column -->
				<div class="relative" style="height: {24 * hourHeight}px;">
					<DayColumn date={day} {eventStore} {hourHeight} {onTimeClick} {onEventClick} />
				</div>
			</div>
		</div>
	</div>
</div>
