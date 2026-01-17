<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { EventInstance } from '$lib/types/calendar';
	import { getDragContext } from './drag-context.svelte';

	interface Props {
		event: EventInstance;
		children: Snippet;
		disabled?: boolean;
		onclick?: () => void;
	}

	let { event, children, disabled = false, onclick }: Props = $props();

	const dragState = getDragContext();

	// Track if we're in "potential drag" state (mouse is down but hasn't moved enough)
	let mouseDownPos = $state<{ x: number; y: number } | null>(null);
	let hasDragStarted = $state(false);
	const DRAG_THRESHOLD = 5; // pixels before drag starts

	function handleMouseDown(e: MouseEvent) {
		if (disabled || e.button !== 0) return;

		// Don't prevent default or stop propagation yet - allow click to work
		mouseDownPos = { x: e.clientX, y: e.clientY };
		hasDragStarted = false;
	}

	function handleMouseMove(e: MouseEvent) {
		// Check if we should start dragging
		if (mouseDownPos && !hasDragStarted) {
			const dx = e.clientX - mouseDownPos.x;
			const dy = e.clientY - mouseDownPos.y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance >= DRAG_THRESHOLD) {
				// Start actual drag (this sets suppressNextClick on dragState)
				hasDragStarted = true;
				dragState.startDrag(
					{
						type: 'move',
						eventId: event.eventId,
						originalStart: event.startTime,
						originalEnd: event.endTime
					},
					event
				);
			}
		}

		// Update ghost position if dragging
		if (dragState.isDragging) {
			dragState.updateGhostPosition(e.clientX, e.clientY);
		}
	}

	function handleMouseUp() {
		mouseDownPos = null;
		hasDragStarted = false;
	}

	function handleClick(e: MouseEvent) {
		e.stopPropagation();
		// If a drag/resize just finished (within 200ms), don't trigger onclick
		if (dragState.shouldSuppressClick()) {
			e.preventDefault();
			return;
		}
		// Only call onclick if we didn't just drag/resize
		onclick?.();
	}

	const isDragging = $derived(
		dragState.isDragging &&
			dragState.dragData?.type === 'move' &&
			dragState.dragData?.eventId === event.eventId
	);

	const isAnyDragActive = $derived(dragState.isDragging);
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="h-full w-full transition-all duration-150 select-none {isDragging
		? 'scale-95 opacity-40 ring-2 ring-primary ring-offset-2'
		: isAnyDragActive
			? 'cursor-grabbing'
			: 'cursor-grab hover:ring-2 hover:ring-primary/30'}"
	role="button"
	tabindex="0"
	onmousedown={handleMouseDown}
	onclick={handleClick}
	onkeydown={(e) => e.key === 'Enter' && !dragState.shouldSuppressClick() && onclick?.()}
>
	{@render children()}
</div>
