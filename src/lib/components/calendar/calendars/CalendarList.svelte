<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import {
		Plus,
		MoreHorizontal,
		Pencil,
		Trash2,
		Check,
		ChevronDown,
		ChevronRight
	} from '@lucide/svelte';
	import type { Calendar } from '$lib/types/calendar';

	interface Props {
		calendars: Calendar[];
		onToggleVisibility?: (calendarId: string) => void;
		onCreateCalendar?: () => void;
		onEditCalendar?: (calendar: Calendar) => void;
		onDeleteCalendar?: (calendarId: string) => void;
	}

	let { calendars, onToggleVisibility, onCreateCalendar, onEditCalendar, onDeleteCalendar }: Props =
		$props();

	let isExpanded = $state(true);
</script>

<div class="flex flex-col">
	<!-- Collapsible header like Google Calendar -->
	<button
		type="button"
		class="group mb-1 flex items-center gap-1 rounded-sm px-1 py-1 text-left hover:bg-slate-50"
		onclick={() => (isExpanded = !isExpanded)}
	>
		{#if isExpanded}
			<ChevronDown class="h-4 w-4 text-slate-500" />
		{:else}
			<ChevronRight class="h-4 w-4 text-slate-500" />
		{/if}
		<span class="text-sm font-medium text-slate-700">My calendars</span>
		{#if onCreateCalendar}
			<Button
				variant="ghost"
				size="icon"
				class="ml-auto h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
				onclick={(e: MouseEvent) => {
					e.stopPropagation();
					onCreateCalendar?.();
				}}
			>
				<Plus class="h-4 w-4 text-slate-500" />
			</Button>
		{/if}
	</button>

	{#if isExpanded}
		<div class="flex flex-col gap-0.5 pl-1">
			{#each calendars as calendar (calendar.id)}
				<div class="group flex items-center justify-between rounded-md px-1 py-1 hover:bg-slate-50">
					<button
						type="button"
						class="flex flex-1 cursor-pointer items-center gap-2.5"
						onclick={() => onToggleVisibility?.(calendar.id)}
					>
						<!-- Custom colored checkbox that matches Google Calendar style -->
						<div
							class="flex h-4 w-4 items-center justify-center rounded-sm border-2 transition-colors"
							style="
								border-color: {calendar.color};
								background-color: {calendar.isVisible ? calendar.color : 'transparent'};
							"
						>
							{#if calendar.isVisible}
								<Check class="h-3 w-3 text-white" strokeWidth={3} />
							{/if}
						</div>
						<span class="truncate text-sm text-slate-700">{calendar.name}</span>
						{#if calendar.isDefault}
							<span class="text-xs text-slate-400">(default)</span>
						{/if}
					</button>

					{#if onEditCalendar || onDeleteCalendar}
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								<Button
									variant="ghost"
									size="icon"
									class="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
								>
									<MoreHorizontal class="h-4 w-4 text-slate-500" />
								</Button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end" class="w-36">
								{#if onEditCalendar}
									<DropdownMenu.Item onclick={() => onEditCalendar(calendar)}>
										<Pencil class="mr-2 h-4 w-4" />
										Edit
									</DropdownMenu.Item>
								{/if}
								{#if onDeleteCalendar && !calendar.isDefault}
									<DropdownMenu.Item
										class="text-red-600 focus:bg-red-50 focus:text-red-700"
										onclick={() => onDeleteCalendar(calendar.id)}
									>
										<Trash2 class="mr-2 h-4 w-4" />
										Delete
									</DropdownMenu.Item>
								{/if}
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
