<script lang="ts">
	import { getCalendarContext } from './CalendarRoot.svelte';
	import MiniCalendar from './mini-calendar/MiniCalendar.svelte';
	import CalendarList from './calendars/CalendarList.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Plus, ChevronDown, Calendar, CalendarCheck, CalendarPlus } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import type { Calendar as CalendarType } from '$lib/types/calendar';

	interface Props {
		onCreateEvent?: () => void;
		onCreateCalendar?: () => void;
		onEditCalendar?: (calendar: CalendarType) => void;
		onDeleteCalendar?: (calendarId: string) => void;
		collapsed?: boolean;
		userRole?: 'admin' | 'staff' | 'customer';
	}

	let {
		onCreateEvent,
		onCreateCalendar,
		onEditCalendar,
		onDeleteCalendar,
		collapsed = false,
		userRole
	}: Props = $props();

	// Staff and admin can create bookings on behalf of customers
	const canCreateBooking = userRole === 'admin' || userRole === 'staff';

	const { state, eventStore } = getCalendarContext();

	function handleDateSelect(date: Date) {
		state.goToDate(date);
	}

	function handleToggleVisibility(calendarId: string) {
		eventStore.toggleCalendarVisibility(calendarId);
	}
</script>

<!-- Collapsed: Floating button that overlays the calendar -->
{#if collapsed}
	<div class="absolute top-20 left-3 z-50">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						class="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-lg transition-all hover:shadow-xl active:scale-95"
					>
						<Plus class="h-7 w-7 text-slate-600" strokeWidth={1.5} />
					</button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start" side="right" class="w-52">
				{#if onCreateEvent}
					<DropdownMenu.Item onclick={onCreateEvent}>
						<Calendar class="mr-2 h-4 w-4 text-slate-500" />
						Event
					</DropdownMenu.Item>
				{/if}
				{#if canCreateBooking}
					<DropdownMenu.Item onclick={() => goto('/staff/bookings/new')}>
						<CalendarPlus class="mr-2 h-4 w-4 text-emerald-600" />
						Booking
						<span class="ml-auto text-[10px] text-slate-400">Staff</span>
					</DropdownMenu.Item>
				{/if}
				{#if onCreateCalendar}
					<DropdownMenu.Separator />
					<DropdownMenu.Item onclick={onCreateCalendar}>
						<CalendarCheck class="mr-2 h-4 w-4 text-slate-500" />
						New calendar
					</DropdownMenu.Item>
				{/if}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
{:else}
	<!-- Expanded: Full sidebar -->
	<aside class="flex w-64 flex-col border-r border-slate-200 bg-white">
		<!-- Create Button (Google-style, centered) -->
		<div class="flex justify-center px-3 pt-4 pb-2">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							class="group flex h-14 w-full max-w-[220px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white shadow-md transition-all hover:shadow-lg active:shadow-sm"
						>
							<Plus class="h-6 w-6 text-slate-700" strokeWidth={2} />
							<span class="text-sm font-medium text-slate-700">Create</span>
							<ChevronDown class="h-4 w-4 text-slate-400" />
						</button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start" class="w-52">
					{#if onCreateEvent}
						<DropdownMenu.Item onclick={onCreateEvent}>
							<Calendar class="mr-2 h-4 w-4 text-slate-500" />
							Event
						</DropdownMenu.Item>
					{/if}
					{#if canCreateBooking}
						<DropdownMenu.Item onclick={() => goto('/staff/bookings/new')}>
							<CalendarPlus class="mr-2 h-4 w-4 text-emerald-600" />
							Booking
							<span class="ml-auto text-[10px] text-slate-400">Staff</span>
						</DropdownMenu.Item>
					{/if}
					{#if onCreateCalendar}
						<DropdownMenu.Separator />
						<DropdownMenu.Item onclick={onCreateCalendar}>
							<CalendarCheck class="mr-2 h-4 w-4 text-slate-500" />
							New calendar
						</DropdownMenu.Item>
					{/if}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>

		<!-- Mini Calendar Section -->
		<div class="px-3 py-2">
			<MiniCalendar selectedDate={state.currentDate} onDateSelect={handleDateSelect} />
		</div>

		<!-- Calendar List Section -->
		<div class="flex-1 overflow-y-auto px-3 py-2">
			<CalendarList
				calendars={eventStore.calendars}
				onToggleVisibility={handleToggleVisibility}
				{onCreateCalendar}
				{onEditCalendar}
				{onDeleteCalendar}
			/>
		</div>
	</aside>
{/if}
