<script lang="ts">
	import type { EventInstance } from '$lib/types/calendar';
	import { getDragContext } from './drag-context.svelte';

	interface Props {
		event: EventInstance;
		position: 'top' | 'bottom';
	}

	let { event, position }: Props = $props();

	const dragState = getDragContext();

	function handleMouseDown(e: MouseEvent) {
		if (e.button !== 0) return;

		e.preventDefault();
		e.stopPropagation();

		// startDrag sets suppressNextClick = true
		dragState.startDrag(
			{
				type: position === 'top' ? 'resize-top' : 'resize-bottom',
				eventId: event.eventId
			},
			event
		);

		dragState.updateGhostPosition(e.clientX, e.clientY);
	}

	function handleMouseMove(e: MouseEvent) {
		if (!dragState.isDragging) return;
		if (dragState.dragData?.type !== 'resize-top' && dragState.dragData?.type !== 'resize-bottom')
			return;
		if (dragState.dragData?.eventId !== event.eventId) return;

		dragState.updateGhostPosition(e.clientX, e.clientY);
	}
</script>

<svelte:window onmousemove={handleMouseMove} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="absolute right-0 left-0 z-10 h-3 cursor-ns-resize transition-all {position === 'top'
		? '-top-1'
		: '-bottom-1'} group"
	role="slider"
	tabindex="0"
	aria-label="Resize event {position}"
	aria-valuenow={0}
	onmousedown={handleMouseDown}
>
	<div
		class="mx-auto h-1 w-10 rounded-full bg-primary opacity-0 transition-opacity group-hover:opacity-70"
	></div>
</div>
