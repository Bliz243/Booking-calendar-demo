<script lang="ts">
	import { getHoursInDay } from '$lib/utils/date';

	interface Props {
		hourHeight?: number;
	}

	let { hourHeight = 60 }: Props = $props();

	const hours = getHoursInDay();
</script>

<div class="pointer-events-none absolute inset-0">
	{#each hours as hour}
		<div
			class="absolute right-0 left-0 border-t border-border"
			style="top: {hour * hourHeight}px;"
		></div>
	{/each}
</div>
