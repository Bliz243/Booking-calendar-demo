<script lang="ts">
	import type { CalendarState } from '../stores/calendar-state.svelte';
	import type { EventStore } from '../stores/event-store.svelte';
	import type { EventInstance } from '$lib/types/calendar';
	import EventChip from '../events/EventChip.svelte';
	import { format, isToday, isSameMonth } from '$lib/utils/date';

	interface Props {
		state: CalendarState;
		eventStore: EventStore;
		onDateClick?: (date: Date) => void;
		onEventClick?: (event: EventInstance) => void;
	}

	let { state: calendarState, eventStore, onDateClick, onEventClick }: Props = $props();

	const weeks = $derived(calendarState.getWeeksInMonthView());
	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	const MAX_EVENTS_SHOWN = 3;

	function getEventsForDay(date: Date): EventInstance[] {
		return eventStore.getEventsForDay(date);
	}
</script>

<div class="flex h-full flex-col">
	<!-- Day names header -->
	<div class="grid grid-cols-7 border-b border-border">
		{#each dayNames as dayName}
			<div
				class="border-r border-border py-2 text-center text-xs font-medium text-muted-foreground last:border-r-0"
			>
				{dayName}
			</div>
		{/each}
	</div>

	<!-- Calendar grid -->
	<div class="grid flex-1 grid-rows-[repeat(auto-fill,1fr)]">
		{#each weeks as week, weekIndex}
			<div class="grid grid-cols-7 border-b border-border last:border-b-0">
				{#each week as day}
					{@const today = isToday(day)}
					{@const inCurrentMonth = isSameMonth(day, calendarState.currentDate)}
					{@const events = getEventsForDay(day)}
					{@const hiddenCount = Math.max(0, events.length - MAX_EVENTS_SHOWN)}

					<button
						type="button"
						class="flex min-h-[100px] flex-col border-r border-border p-1 text-left last:border-r-0 {inCurrentMonth
							? 'bg-background'
							: 'bg-muted/30'}"
						onclick={() => onDateClick?.(day)}
					>
						<!-- Date number -->
						<span
							class="mb-1 flex h-6 w-6 items-center justify-center rounded-full text-sm {today
								? 'bg-primary text-primary-foreground'
								: ''} {!inCurrentMonth ? 'text-muted-foreground' : ''}"
						>
							{format(day, 'd')}
						</span>

						<!-- Events -->
						<div class="flex w-full flex-1 flex-col gap-0.5 overflow-hidden">
							{#each events.slice(0, MAX_EVENTS_SHOWN) as event (event.id)}
								<EventChip
									{event}
									showTime={!event.isAllDay}
									onclick={(e) => {
										e.stopPropagation();
										onEventClick?.(event);
									}}
								/>
							{/each}

							{#if hiddenCount > 0}
								<span class="px-1 text-xs text-muted-foreground">
									+{hiddenCount} more
								</span>
							{/if}
						</div>
					</button>
				{/each}
			</div>
		{/each}
	</div>
</div>
