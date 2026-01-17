<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import {
		startOfWeek,
		addDays,
		addWeeks,
		format,
		isSameDay,
		isToday,
		isBefore,
		startOfDay
	} from '$lib/utils/date';
	import type { TimeSlot } from '$lib/types/booking';

	interface Props {
		slots: TimeSlot[];
		selectedSlot?: TimeSlot | null;
		onSelect: (slot: TimeSlot) => void;
		timezone?: string;
	}

	let { slots, selectedSlot, onSelect, timezone = 'UTC' }: Props = $props();

	let viewStart = $state(startOfWeek(new Date()));

	// Get the 7 days to display
	const viewDays = $derived(Array.from({ length: 7 }, (_, i) => addDays(viewStart, i)));

	// Group slots by date
	const slotsByDate = $derived.by(() => {
		const grouped = new Map<string, TimeSlot[]>();

		for (const slot of slots) {
			const dateKey = format(slot.startTime, 'yyyy-MM-dd');
			if (!grouped.has(dateKey)) {
				grouped.set(dateKey, []);
			}
			grouped.get(dateKey)!.push(slot);
		}

		return grouped;
	});

	function goToPrevWeek() {
		viewStart = addWeeks(viewStart, -1);
	}

	function goToNextWeek() {
		viewStart = addWeeks(viewStart, 1);
	}

	function canGoPrev(): boolean {
		return !isBefore(viewStart, startOfDay(new Date()));
	}

	function getSlotsForDay(day: Date): TimeSlot[] {
		const dateKey = format(day, 'yyyy-MM-dd');
		return (slotsByDate.get(dateKey) || []).filter((s) => s.available);
	}

	function isSlotSelected(slot: TimeSlot): boolean {
		if (!selectedSlot) return false;
		return slot.startTime.getTime() === selectedSlot.startTime.getTime();
	}
</script>

<div class="w-full">
	<!-- Week navigation -->
	<div class="mb-4 flex items-center justify-between">
		<Button variant="outline" size="icon" onclick={goToPrevWeek} disabled={!canGoPrev()}>
			<ChevronLeft class="h-4 w-4" />
		</Button>
		<span class="text-sm font-medium">
			{format(viewStart, 'MMMM d')} - {format(addDays(viewStart, 6), 'MMMM d, yyyy')}
		</span>
		<Button variant="outline" size="icon" onclick={goToNextWeek}>
			<ChevronRight class="h-4 w-4" />
		</Button>
	</div>

	<!-- Days grid -->
	<div class="grid grid-cols-7 gap-2">
		{#each viewDays as day}
			{@const daySlots = getSlotsForDay(day)}
			{@const today = isToday(day)}
			{@const past = isBefore(day, startOfDay(new Date()))}

			<div class="flex flex-col">
				<!-- Day header -->
				<div class="mb-2 text-center {past ? 'text-muted-foreground' : ''}">
					<div class="text-xs uppercase">{format(day, 'EEE')}</div>
					<div
						class="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium
							{today ? 'bg-primary text-primary-foreground' : ''}"
					>
						{format(day, 'd')}
					</div>
				</div>

				<!-- Time slots -->
				<div class="flex flex-col gap-1">
					{#if past}
						<span class="py-2 text-center text-xs text-muted-foreground">-</span>
					{:else if daySlots.length === 0}
						<span class="py-2 text-center text-xs text-muted-foreground"> No availability </span>
					{:else}
						{#each daySlots as slot}
							<Button
								variant={isSlotSelected(slot) ? 'default' : 'outline'}
								size="sm"
								class="h-8 text-xs"
								onclick={() => onSelect(slot)}
							>
								{format(slot.startTime, 'h:mm a')}
							</Button>
						{/each}
					{/if}
				</div>
			</div>
		{/each}
	</div>

	{#if timezone !== 'UTC'}
		<p class="mt-4 text-center text-xs text-muted-foreground">
			Times shown in {timezone}
		</p>
	{/if}
</div>
