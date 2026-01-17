<script lang="ts">
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Trash2, ChevronDown, ChevronUp } from '@lucide/svelte';
	import type { CalendarEvent, Calendar, CreateEventInput } from '$lib/types/calendar';
	import { toISODateString, toISOTimeString, addHours } from '$lib/utils/date';

	interface Props {
		open: boolean;
		event?: CalendarEvent | null;
		calendars: Calendar[];
		defaultCalendarId?: string;
		defaultStartTime?: Date;
		onSave: (input: CreateEventInput) => Promise<void>;
		onDelete?: (eventId: string) => Promise<void>;
		onClose: () => void;
	}

	let {
		open = $bindable(),
		event,
		calendars,
		defaultCalendarId,
		defaultStartTime,
		onSave,
		onDelete,
		onClose
	}: Props = $props();

	// Form state
	let title = $state('');
	let description = $state('');
	let location = $state('');
	let calendarId = $state('');
	let startDate = $state('');
	let startTime = $state('');
	let endDate = $state('');
	let endTime = $state('');
	let isAllDay = $state(false);
	let saving = $state(false);
	let showMoreOptions = $state(false);

	// Initialize form when drawer opens or event changes
	$effect(() => {
		if (open) {
			if (event) {
				title = event.title;
				description = event.description || '';
				location = event.location || '';
				calendarId = event.calendarId;
				startDate = toISODateString(event.startTime);
				startTime = toISOTimeString(event.startTime);
				endDate = toISODateString(event.endTime);
				endTime = toISOTimeString(event.endTime);
				isAllDay = event.isAllDay;
				showMoreOptions = !!(event.location || event.description);
			} else {
				const start = defaultStartTime || new Date();
				const end = addHours(start, 1);
				title = '';
				description = '';
				location = '';
				calendarId = defaultCalendarId || calendars[0]?.id || '';
				startDate = toISODateString(start);
				startTime = toISOTimeString(start);
				endDate = toISODateString(end);
				endTime = toISOTimeString(end);
				isAllDay = false;
				showMoreOptions = false;
			}
		}
	});

	const isEditing = $derived(!!event);
	const selectedCalendar = $derived(calendars.find((c) => c.id === calendarId));
	const triggerContent = $derived(selectedCalendar?.name ?? 'Select calendar');

	async function handleSave() {
		if (!title.trim() || !calendarId) return;

		saving = true;
		try {
			const startDateTime = isAllDay
				? new Date(`${startDate}T00:00:00`)
				: new Date(`${startDate}T${startTime}`);
			const endDateTime = isAllDay
				? new Date(`${endDate}T23:59:59`)
				: new Date(`${endDate}T${endTime}`);

			await onSave({
				calendarId,
				title: title.trim(),
				description: description.trim() || undefined,
				location: location.trim() || undefined,
				startTime: startDateTime,
				endTime: endDateTime,
				isAllDay
			});

			onClose();
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!event || !onDelete) return;

		saving = true;
		try {
			await onDelete(event.id);
			onClose();
		} finally {
			saving = false;
		}
	}
</script>

<Drawer.Root bind:open>
	<Drawer.Portal>
		<Drawer.Overlay />
		<Drawer.Content class="max-h-[90vh]">
			<Drawer.Header>
				<Drawer.Title>
					{isEditing ? 'Edit Event' : 'New Event'}
				</Drawer.Title>
			</Drawer.Header>

			<div class="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
				<!-- Title -->
				<Input bind:value={title} placeholder="Add title" class="text-lg font-medium" />

				<!-- Calendar selector -->
				<Select.Root type="single" bind:value={calendarId}>
					<Select.Trigger class="w-full">
						<div class="flex items-center gap-2">
							{#if selectedCalendar}
								<div
									class="h-3 w-3 shrink-0 rounded-full"
									style="background-color: {selectedCalendar.color}"
								></div>
							{/if}
							{triggerContent}
						</div>
					</Select.Trigger>
					<Select.Content>
						{#each calendars as cal (cal.id)}
							<Select.Item value={cal.id} label={cal.name}>
								<div class="flex items-center gap-2">
									<div class="h-3 w-3 rounded-full" style="background-color: {cal.color}"></div>
									{cal.name}
								</div>
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>

				<!-- All day toggle -->
				<div class="flex items-center gap-2">
					<Checkbox id="all-day" bind:checked={isAllDay} />
					<Label for="all-day" class="cursor-pointer">All day</Label>
				</div>

				<!-- Date/Time -->
				<div class="space-y-3">
					<div class="flex items-center gap-2">
						<span class="w-12 text-sm text-muted-foreground">Start</span>
						<input
							type="date"
							bind:value={startDate}
							class="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
						/>
						{#if !isAllDay}
							<input
								type="time"
								bind:value={startTime}
								class="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm"
							/>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<span class="w-12 text-sm text-muted-foreground">End</span>
						<input
							type="date"
							bind:value={endDate}
							class="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
						/>
						{#if !isAllDay}
							<input
								type="time"
								bind:value={endTime}
								class="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm"
							/>
						{/if}
					</div>
				</div>

				<!-- More options toggle -->
				<button
					type="button"
					class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
					onclick={() => (showMoreOptions = !showMoreOptions)}
				>
					{#if showMoreOptions}
						<ChevronUp class="h-4 w-4" />
						Less options
					{:else}
						<ChevronDown class="h-4 w-4" />
						More options
					{/if}
				</button>

				{#if showMoreOptions}
					<!-- Location -->
					<Input bind:value={location} placeholder="Add location" />

					<!-- Description -->
					<textarea
						bind:value={description}
						placeholder="Add description"
						rows="2"
						class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					></textarea>
				{/if}
			</div>

			<Drawer.Footer class="border-t pt-4">
				<div class="flex w-full justify-between">
					{#if isEditing && onDelete}
						<Button variant="destructive" size="icon" onclick={handleDelete} disabled={saving}>
							<Trash2 class="h-4 w-4" />
						</Button>
					{:else}
						<div></div>
					{/if}

					<div class="flex gap-2">
						<Button variant="outline" onclick={onClose} disabled={saving}>Cancel</Button>
						<Button onclick={handleSave} disabled={saving || !title.trim() || !calendarId}>
							{saving ? 'Saving...' : 'Save'}
						</Button>
					</div>
				</div>
			</Drawer.Footer>
		</Drawer.Content>
	</Drawer.Portal>
</Drawer.Root>
