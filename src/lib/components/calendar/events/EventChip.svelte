<script lang="ts">
	import type { EventInstance } from '$lib/types/calendar';
	import { formatTime } from '$lib/utils/date';

	interface Props {
		event: EventInstance;
		showTime?: boolean;
		onclick?: (e: MouseEvent) => void;
	}

	let { event, showTime = false, onclick }: Props = $props();

	function getContrastColor(hexColor: string): string {
		const r = parseInt(hexColor.slice(1, 3), 16);
		const g = parseInt(hexColor.slice(3, 5), 16);
		const b = parseInt(hexColor.slice(5, 7), 16);
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
		return luminance > 0.5 ? '#1f2937' : '#ffffff';
	}

	const textColor = $derived(getContrastColor(event.color));
</script>

<button
	type="button"
	class="flex w-full cursor-pointer items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-xs transition-opacity hover:opacity-80"
	style="background-color: {event.color}; color: {textColor};"
	{onclick}
>
	{#if showTime && !event.isAllDay}
		<span class="shrink-0 opacity-80">{formatTime(event.startTime)}</span>
	{/if}
	<span class="truncate font-medium">{event.title}</span>
</button>
