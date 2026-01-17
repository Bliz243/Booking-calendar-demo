<script lang="ts">
	import type { CalendarState } from '../stores/calendar-state.svelte';
	import type { EventStore } from '../stores/event-store.svelte';
	import type { EventInstance } from '$lib/types/calendar';
	import TimeGutter from '../grid/TimeGutter.svelte';
	import TimeGrid from '../grid/TimeGrid.svelte';
	import DayColumn from '../grid/DayColumn.svelte';
	import { format, isToday, isSameMonth } from '$lib/utils/date';

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

	const days = $derived(calendarState.getDaysInView());

	// Scroll to current time on mount
	let scrollContainer: HTMLDivElement | null = $state(null);

	$effect(() => {
		if (scrollContainer) {
			const now = new Date();
			const currentHour = now.getHours();
			// Scroll to show current time in the middle-ish of the view
			const scrollTo = Math.max(0, (currentHour - 2) * hourHeight);
			scrollContainer.scrollTop = scrollTo;
		}
	});
</script>

<div class="flex h-full min-h-0 flex-col">
	<!-- Header with day names -->
	<div class="flex border-b border-border">
		<div class="w-[60px] shrink-0"></div>
		<div class="grid flex-1" style="grid-template-columns: repeat({days.length}, 1fr);">
			{#each days as day}
				{@const today = isToday(day)}
				{@const inMonth = isSameMonth(day, calendarState.currentDate)}
				<div class="flex flex-col items-center border-r border-border py-2 last:border-r-0">
					<span class="text-xs text-muted-foreground uppercase">
						{format(day, 'EEE')}
					</span>
					<span
						class="mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium {today
							? 'bg-primary text-primary-foreground'
							: ''} {!inMonth ? 'text-muted-foreground' : ''}"
					>
						{format(day, 'd')}
					</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Time grid area -->
	<div class="min-h-0 flex-1 overflow-y-auto" bind:this={scrollContainer}>
		<div class="flex">
			<!-- Time gutter -->
			<TimeGutter {hourHeight} />

			<!-- Day columns -->
			<div class="relative flex-1">
				<!-- Hour lines -->
				<TimeGrid {hourHeight} />

				<!-- Day columns grid -->
				<div
					class="relative grid h-full"
					style="grid-template-columns: repeat({days.length}, 1fr); height: {24 * hourHeight}px;"
				>
					{#each days as day (day.toISOString())}
						<DayColumn date={day} {eventStore} {hourHeight} {onTimeClick} {onEventClick} />
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
