<script lang="ts">
	import { getHoursInDay } from '$lib/utils/date';

	interface Props {
		hourHeight?: number;
	}

	let { hourHeight = 60 }: Props = $props();

	const hours = getHoursInDay();

	function formatHour(hour: number): string {
		if (hour === 0) return '12 AM';
		if (hour === 12) return '12 PM';
		if (hour < 12) return `${hour} AM`;
		return `${hour - 12} PM`;
	}
</script>

<div class="flex flex-col" style="width: 60px;">
	{#each hours as hour}
		<div
			class="relative flex shrink-0 justify-end pr-2 text-xs text-muted-foreground"
			style="height: {hourHeight}px;"
		>
			{#if hour > 0}
				<span class="absolute -top-2">{formatHour(hour)}</span>
			{/if}
		</div>
	{/each}
</div>
