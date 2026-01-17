<script lang="ts">
	import type { EventInstance } from '$lib/types/calendar';
	import { formatTime } from '$lib/utils/date';
	import EventDraggable from '../dnd/EventDraggable.svelte';
	import ResizeHandle from '../dnd/ResizeHandle.svelte';

	interface Props {
		event: EventInstance;
		compact?: boolean;
		draggable?: boolean;
		resizable?: boolean;
		onclick?: () => void;
	}

	let { event, compact = false, draggable = true, resizable = true, onclick }: Props = $props();

	function getContrastColor(hexColor: string): string {
		// Convert hex to RGB
		const r = parseInt(hexColor.slice(1, 3), 16);
		const g = parseInt(hexColor.slice(3, 5), 16);
		const b = parseInt(hexColor.slice(5, 7), 16);

		// Calculate luminance
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

		return luminance > 0.5 ? '#1f2937' : '#ffffff';
	}

	const textColor = $derived(getContrastColor(event.color));
	const timeText = $derived(formatTime(event.startTime));

	function handleClick(e: MouseEvent) {
		e.stopPropagation();
		onclick?.();
	}
</script>

{#if draggable}
	<EventDraggable {event} {onclick}>
		{#snippet children()}
			<div
				class="group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded px-1.5 py-0.5 text-left text-xs transition-opacity hover:opacity-90"
				style="background-color: {event.color}; color: {textColor};"
			>
				{#if resizable && !compact}
					<ResizeHandle {event} position="top" />
				{/if}

				{#if !compact}
					<span class="truncate font-medium">{event.title}</span>
					<span class="truncate opacity-80">{timeText}</span>
				{:else}
					<span class="truncate font-medium">{event.title}</span>
				{/if}

				{#if resizable && !compact}
					<ResizeHandle {event} position="bottom" />
				{/if}
			</div>
		{/snippet}
	</EventDraggable>
{:else}
	<button
		class="group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded px-1.5 py-0.5 text-left text-xs transition-opacity hover:opacity-90"
		style="background-color: {event.color}; color: {textColor};"
		type="button"
		onclick={handleClick}
	>
		{#if !compact}
			<span class="truncate font-medium">{event.title}</span>
			<span class="truncate opacity-80">{timeText}</span>
		{:else}
			<span class="truncate font-medium">{event.title}</span>
		{/if}
	</button>
{/if}
