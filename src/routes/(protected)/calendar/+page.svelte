<script lang="ts">
	import CalendarRoot from '$lib/components/calendar/CalendarRoot.svelte';
	import CalendarHeader from '$lib/components/calendar/CalendarHeader.svelte';
	import CalendarSidebar from '$lib/components/calendar/CalendarSidebar.svelte';
	import CalendarMain from '$lib/components/calendar/CalendarMain.svelte';
	import EventDrawer from '$lib/components/calendar/events/EventDrawer.svelte';
	import CalendarDragProvider from '$lib/components/calendar/dnd/CalendarDragProvider.svelte';
	import { getCalendarContext } from '$lib/components/calendar/CalendarRoot.svelte';
	import type { CreateEventInput, CalendarEvent, EventInstance } from '$lib/types/calendar';
	import type { PageData } from './$types';
	import { toast } from 'svelte-sonner';

	let { data }: { data: PageData } = $props();

	// Drawer state
	let drawerOpen = $state(false);
	let editingEvent = $state<CalendarEvent | null>(null);
	let defaultStartTime = $state<Date | undefined>(undefined);

	// Sidebar state
	let sidebarCollapsed = $state(false);

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
	}
</script>

<svelte:head>
	<title>Calendar</title>
</svelte:head>

<CalendarRoot>
	{#snippet children()}
		{@const ctx = getCalendarContext()}

		{@const handleCreateEvent = () => {
			editingEvent = null;
			defaultStartTime = new Date();
			drawerOpen = true;
		}}

		{@const handleEventClick = (event: EventInstance) => {
			const fullEvent = ctx.eventStore.getEvent(event.eventId);
			if (fullEvent) {
				editingEvent = fullEvent;
				drawerOpen = true;
			}
		}}

		{@const handleTimeClick = (date: Date) => {
			editingEvent = null;
			defaultStartTime = date;
			drawerOpen = true;
		}}

		{@const handleSaveEvent = async (input: CreateEventInput) => {
			if (editingEvent) {
				await ctx.eventStore.updateEvent(editingEvent.id, input);
			} else {
				await ctx.eventStore.createEvent(input);
			}
		}}

		{@const handleDeleteEvent = async (eventId: string) => {
			await ctx.eventStore.deleteEvent(eventId);
		}}

		{@const handleDrawerClose = () => {
			drawerOpen = false;
			editingEvent = null;
			defaultStartTime = undefined;
		}}

		{@const handleEventMove = async (eventId: string, newStart: Date, newEnd: Date) => {
			// CLIENT-SIDE conflict check (instant - no server round-trip)
			const conflict = ctx.eventStore.checkResourceConflict(eventId, newStart, newEnd);
			if (conflict) {
				toast.error(conflict);
				return; // Instant rejection
			}

			// Store original state for potential revert (rare server-side rejection)
			const event = ctx.eventStore.getEvent(eventId);
			const originalState = event ? { startTime: event.startTime, endTime: event.endTime } : null;

			// Optimistic update
			ctx.eventStore.moveEvent(eventId, newStart, newEnd);

			// Persist to server (server also validates as defense-in-depth)
			const result = await ctx.eventStore.updateEvent(eventId, {
				startTime: newStart,
				endTime: newEnd
			});

			// Handle rare server-side rejections
			if ('error' in result) {
				if (originalState) {
					ctx.eventStore.revertEvent(eventId, originalState);
				}
				toast.error(result.error);
			}
		}}

		{@const handleEventResize = async (eventId: string, newStart: Date, newEnd: Date) => {
			// CLIENT-SIDE conflict check (instant - no server round-trip)
			const conflict = ctx.eventStore.checkResourceConflict(eventId, newStart, newEnd);
			if (conflict) {
				toast.error(conflict);
				return; // Instant rejection
			}

			// Store original state for potential revert (rare server-side rejection)
			const event = ctx.eventStore.getEvent(eventId);
			const originalState = event ? { startTime: event.startTime, endTime: event.endTime } : null;

			// Optimistic update
			ctx.eventStore.moveEvent(eventId, newStart, newEnd);

			// Persist to server (server also validates as defense-in-depth)
			const result = await ctx.eventStore.updateEvent(eventId, {
				startTime: newStart,
				endTime: newEnd
			});

			// Handle rare server-side rejections
			if ('error' in result) {
				if (originalState) {
					ctx.eventStore.revertEvent(eventId, originalState);
				}
				toast.error(result.error);
			}
		}}

		{@const handleDragCreate = (start: Date, end: Date) => {
			editingEvent = null;
			defaultStartTime = start;
			drawerOpen = true;
		}}

		<CalendarDragProvider
			onEventMove={handleEventMove}
			onEventResize={handleEventResize}
			onEventCreate={handleDragCreate}
		>
			{#snippet children()}
				<div class="flex h-screen flex-col bg-white">
					<CalendarHeader state={ctx.state} onToggleSidebar={toggleSidebar} user={data.user} />

					<div class="flex min-h-0 flex-1 overflow-hidden">
						<CalendarSidebar
							onCreateEvent={handleCreateEvent}
							collapsed={sidebarCollapsed}
							userRole={data.user?.role as 'admin' | 'staff' | 'customer' | undefined}
						/>

						<main class="min-h-0 flex-1 overflow-hidden bg-white">
							<CalendarMain onTimeClick={handleTimeClick} onEventClick={handleEventClick} />
						</main>
					</div>
				</div>
			{/snippet}
		</CalendarDragProvider>

		<EventDrawer
			bind:open={drawerOpen}
			event={editingEvent}
			calendars={ctx.eventStore.calendars}
			defaultCalendarId={ctx.eventStore.calendars.find((c) => c.isDefault)?.id}
			{defaultStartTime}
			onSave={handleSaveEvent}
			onDelete={handleDeleteEvent}
			onClose={handleDrawerClose}
		/>
	{/snippet}
</CalendarRoot>
