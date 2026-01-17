<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createDragState, setDragContext } from './drag-context.svelte';
	import type { EventInstance, DragData } from '$lib/types/calendar';
	import {
		differenceInMinutes,
		addMinutes,
		floorToNearestMinutes,
		formatTime
	} from '$lib/utils/date';

	interface Props {
		children: Snippet;
		onEventMove?: (eventId: string, newStart: Date, newEnd: Date) => void;
		onEventResize?: (eventId: string, newStart: Date, newEnd: Date) => void;
		onEventCreate?: (start: Date, end: Date) => void;
	}

	let { children, onEventMove, onEventResize, onEventCreate }: Props = $props();

	const dragState = createDragState();
	setDragContext(dragState);

	function handleDragEnd() {
		if (!dragState.dragData || !dragState.dropTarget) {
			dragState.reset();
			return;
		}

		// If there's a conflict, don't allow the drop - just reset
		if (dragState.hasConflict) {
			dragState.reset();
			return;
		}

		const { dragData, dropTarget, draggedEvent } = dragState;
		const targetTime = floorToNearestMinutes(dropTarget.time, 15);

		if (dragData.type === 'move' && draggedEvent && onEventMove) {
			// Calculate the time difference and apply to the event
			const duration = differenceInMinutes(dragData.originalEnd, dragData.originalStart);
			const newStart = targetTime;
			const newEnd = addMinutes(newStart, duration);

			onEventMove(dragData.eventId, newStart, newEnd);
		} else if (
			(dragData.type === 'resize-top' || dragData.type === 'resize-bottom') &&
			draggedEvent &&
			onEventResize
		) {
			if (dragData.type === 'resize-top') {
				onEventResize(dragData.eventId, targetTime, draggedEvent.endTime);
			} else {
				onEventResize(dragData.eventId, draggedEvent.startTime, targetTime);
			}
		} else if (dragData.type === 'create' && onEventCreate) {
			const duration = Math.max(30, differenceInMinutes(targetTime, dragData.startTime));
			const endTime = addMinutes(dragData.startTime, duration);
			onEventCreate(dragData.startTime, endTime);
		}

		dragState.reset();
	}

	function getContrastColor(hexColor: string): string {
		const r = parseInt(hexColor.slice(1, 3), 16);
		const g = parseInt(hexColor.slice(3, 5), 16);
		const b = parseInt(hexColor.slice(5, 7), 16);
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
		return luminance > 0.5 ? '#1f2937' : '#ffffff';
	}

	// Ghost styling - changes based on conflict status
	const baseGhostColor = $derived(dragState.draggedEvent?.color || '#3b82f6');
	const ghostColor = $derived(dragState.hasConflict ? '#ef4444' : baseGhostColor);
	const ghostTextColor = $derived(
		dragState.hasConflict ? '#ffffff' : getContrastColor(baseGhostColor)
	);
	const previewTimeText = $derived(
		dragState.dropPreview
			? `${formatTime(dragState.dropPreview.startTime)} - ${formatTime(dragState.dropPreview.endTime)}`
			: ''
	);
</script>

<svelte:window
	onmouseup={handleDragEnd}
	onmouseleave={() => dragState.isDragging && dragState.reset()}
/>

<div
	class="relative h-full w-full {dragState.isDragging ? 'cursor-grabbing' : ''}"
	role="application"
	aria-label="Calendar with drag and drop"
>
	{@render children()}

	<!-- Drag ghost - follows cursor -->
	{#if dragState.isDragging && dragState.ghostPosition && dragState.draggedEvent}
		<div
			class="pointer-events-none fixed z-50 min-w-[120px] rounded-md px-2 py-1.5 shadow-xl transition-colors duration-150 {dragState.hasConflict
				? 'animate-pulse ring-2 ring-red-300'
				: 'ring-2 ring-white/50'}"
			style="
				left: {dragState.ghostPosition.x + 12}px;
				top: {dragState.ghostPosition.y + 12}px;
				background-color: {ghostColor};
				color: {ghostTextColor};
			"
		>
			{#if dragState.hasConflict}
				<div class="flex items-center gap-1.5">
					<svg
						class="h-4 w-4 flex-shrink-0"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
					<span class="text-sm font-medium">Conflict</span>
				</div>
				<div class="mt-0.5 text-xs opacity-90">
					{dragState.conflictMessage || 'Resource unavailable'}
				</div>
			{:else}
				<div class="text-sm font-medium">{dragState.draggedEvent.title}</div>
				{#if previewTimeText}
					<div class="mt-0.5 text-xs opacity-90">{previewTimeText}</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>
