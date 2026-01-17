<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/calendar');
	});
</script>

<div class="flex h-screen items-center justify-center">
	<p class="text-muted-foreground">Redirecting to calendar...</p>
</div>
