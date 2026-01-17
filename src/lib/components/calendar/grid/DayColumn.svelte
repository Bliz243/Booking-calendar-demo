<script lang="ts">
	import type { EventInstance } from '$lib/types/calendar';
	import type { EventStore } from '../stores/event-store.svelte';
	import EventBlock from '../events/EventBlock.svelte';
	import { getDragContext } from '../dnd/drag-context.svelte';
	import {
		isToday,
		startOfDay,
		differenceInMinutes,
		floorToNearestMinutes,
		addMinutes,
		isSameDay,
		formatTime
	} from '$lib/utils/date';

	interface Props {
		date: Date;
		eventStore: EventStore;
		hourHeight?: number;
		onTimeClick?: (date: Date) => void;
		onEventClick?: (event: EventInstance) => void;
	}

	let { date, eventStore, hourHeight = 60, onTimeClick, onEventClick }: Props = $props();

	// Drag context - may not exist if not wrapped in provider
	let dragState: ReturnType<typeof getDragContext> | null = null;
	try {
		dragState = getDragContext();
		// Update hour height in drag state
		dragState.setHourHeight(hourHeight);
	} catch {
		// No drag context available
	}

	// Check if this column is the current drop target
	const isDropTarget = $derived(
		dragState?.isDragging && dragState?.dropPreview && isSameDay(dragState.dropPreview.date, date)
	);

	// Get the drop preview for this column
	const dropPreview = $derived(isDropTarget ? dragState?.dropPreview : null);

	// Get timed events for this day
	const events = $derived(eventStore.getTimedEventsForDay(date));

	// Check if this is today
	const isTodayColumn = $derived(isToday(date));

	// Current time indicator position
	const currentTimePosition = $derived.by(() => {
		if (!isTodayColumn) return null;
		const now = new Date();
		const dayStart = startOfDay(date);
		const minutes = differenceInMinutes(now, dayStart);
		return (minutes / 60) * hourHeight;
	});

	// Calculate event positions to handle overlapping events
	function calculateEventPositions(
		events: EventInstance[]
	): Map<string, { left: number; width: number }> {
		const positions = new Map<string, { left: number; width: number }>();

		// Sort by start time
		const sorted = [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

		// Group overlapping events
		const columns: EventInstance[][] = [];

		for (const event of sorted) {
			let placed = false;

			for (let i = 0; i < columns.length; i++) {
				const column = columns[i];
				const lastInColumn = column[column.length - 1];

				// Check if event can fit in this column (no overlap)
				if (lastInColumn.endTime <= event.startTime) {
					column.push(event);
					placed = true;
					break;
				}
			}

			if (!placed) {
				columns.push([event]);
			}
		}

		// Calculate positions
		const numColumns = columns.length;
		const columnWidth = 100 / numColumns;

		for (let i = 0; i < columns.length; i++) {
			for (const event of columns[i]) {
				positions.set(event.id, {
					left: i * columnWidth,
					width: columnWidth - 1 // Small gap
				});
			}
		}

		return positions;
	}

	const eventPositions = $derived(calculateEventPositions(events));

	function getEventStyle(event: EventInstance): string {
		const dayStart = startOfDay(date);
		const top = (differenceInMinutes(event.startTime, dayStart) / 60) * hourHeight;
		const height = (differenceInMinutes(event.endTime, event.startTime) / 60) * hourHeight;
		const pos = eventPositions.get(event.id) || { left: 0, width: 100 };

		return `top: ${top}px; height: ${Math.max(height, 20)}px; left: ${pos.left}%; width: ${pos.width}%;`;
	}

	function handleClick(e: MouseEvent) {
		if (!onTimeClick) return;

		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const y = e.clientY - rect.top;
		const minutes = (y / hourHeight) * 60;
		const dayStart = startOfDay(date);
		const clickedTime = floorToNearestMinutes(addMinutes(dayStart, minutes), 15);

		onTimeClick(clickedTime);
	}

	function handleMouseMove(e: MouseEvent) {
		if (!dragState?.isDragging) return;

		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const y = e.clientY - rect.top;
		const minutes = (y / hourHeight) * 60;
		const dayStart = startOfDay(date);
		const time = floorToNearestMinutes(addMinutes(dayStart, minutes), 15);

		dragState.updateDropTarget(date, time);

		// Real-time conflict detection for visual feedback
		if (dragState.dragData?.type === 'move' && dragState.draggedEvent && dragState.dropPreview) {
			const eventId = dragState.dragData.eventId;
			const newStart = dragState.dropPreview.startTime;
			const newEnd = dragState.dropPreview.endTime;
			const conflict = eventStore.checkResourceConflict(eventId, newStart, newEnd);
			dragState.setConflictStatus(!!conflict, conflict);
		} else if (
			dragState.dragData?.type === 'resize-top' ||
			dragState.dragData?.type === 'resize-bottom'
		) {
			// Also check conflicts for resize operations
			if (dragState.draggedEvent && dragState.dropPreview) {
				const eventId = dragState.dragData.eventId;
				const newStart = dragState.dropPreview.startTime;
				const newEnd = dragState.dropPreview.endTime;
				const conflict = eventStore.checkResourceConflict(eventId, newStart, newEnd);
				dragState.setConflictStatus(!!conflict, conflict);
			}
		}
	}
</script>

<div
	class="relative min-h-full border-r border-border last:border-r-0"
	style="height: {24 * hourHeight}px;"
	role="button"
	tabindex="0"
	onclick={handleClick}
	onmousemove={handleMouseMove}
	onkeydown={(e) => e.key === 'Enter' && handleClick(e as unknown as MouseEvent)}
>
	<!-- Events -->
	{#each events as event (event.id)}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div
			class="absolute flex px-0.5"
			style={getEventStyle(event)}
			onclick={(e) => e.stopPropagation()}
		>
			<EventBlock {event} onclick={() => onEventClick?.(event)} />
		</div>
	{/each}

	<!-- Drop zone preview -->
	{#if dropPreview && dragState?.draggedEvent}
		{@const hasConflict = dragState.hasConflict}
		{@const previewColor = hasConflict ? '#ef4444' : dragState.draggedEvent.color}
		<div
			class="pointer-events-none absolute right-1 left-1 z-10 rounded-md border-2 border-dashed transition-colors duration-150 {hasConflict
				? 'animate-pulse'
				: ''}"
			style="
				top: {dropPreview.top}px;
				height: {Math.max(dropPreview.height, 20)}px;
				background-color: {previewColor}40;
				border-color: {previewColor};
			"
		>
			<div
				class="absolute -top-6 left-0 rounded px-2 py-0.5 text-xs font-medium text-white shadow-lg {hasConflict
					? 'bg-red-600'
					: 'bg-gray-900'}"
			>
				{#if hasConflict}
					⚠ Conflict
				{:else}
					{formatTime(dropPreview.startTime)}
				{/if}
			</div>
		</div>
	{/if}

	<!-- Current time indicator -->
	{#if currentTimePosition !== null}
		<div
			class="pointer-events-none absolute right-0 left-0 z-20"
			style="top: {currentTimePosition}px;"
		>
			<div class="h-0.5 w-full bg-destructive"></div>
			<div class="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-destructive"></div>
		</div>
	{/if}
</div>
