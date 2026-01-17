<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/admin/services', { replaceState: true });
	});
</script>

<div class="flex items-center justify-center py-12">
	<div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
</div>
