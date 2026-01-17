<script lang="ts" module>
	import { setContext, getContext } from 'svelte';
	import type { CalendarState } from './stores/calendar-state.svelte';
	import type { EventStore } from './stores/event-store.svelte';

	const CALENDAR_STATE_KEY = Symbol('calendar-state');
	const EVENT_STORE_KEY = Symbol('event-store');

	export interface CalendarContext {
		state: CalendarState;
		eventStore: EventStore;
	}

	export function setCalendarContext(ctx: CalendarContext) {
		setContext(CALENDAR_STATE_KEY, ctx.state);
		setContext(EVENT_STORE_KEY, ctx.eventStore);
	}

	export function getCalendarContext(): CalendarContext {
		return {
			state: getContext<CalendarState>(CALENDAR_STATE_KEY),
			eventStore: getContext<EventStore>(EVENT_STORE_KEY)
		};
	}

	export function getCalendarStateContext(): CalendarState {
		return getContext<CalendarState>(CALENDAR_STATE_KEY);
	}

	export function getEventStoreContext(): EventStore {
		return getContext<EventStore>(EVENT_STORE_KEY);
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { createCalendarState } from './stores/calendar-state.svelte';
	import { createEventStore } from './stores/event-store.svelte';
	import type { Snippet } from 'svelte';
	import type { ViewType } from '$lib/types/calendar';

	interface Props {
		initialDate?: Date;
		initialView?: ViewType;
		children: Snippet;
	}

	let { initialDate, initialView = 'week', children }: Props = $props();

	const state = createCalendarState(initialDate, initialView);
	const eventStore = createEventStore();

	setCalendarContext({ state, eventStore });

	// Load calendars and events on mount
	onMount(() => {
		eventStore.fetchCalendars();
		eventStore.fetchEvents(state.visibleRange);
	});

	// Reload events when visible range changes
	$effect(() => {
		const range = state.visibleRange;
		eventStore.fetchEvents(range);
	});
</script>

{@render children()}
