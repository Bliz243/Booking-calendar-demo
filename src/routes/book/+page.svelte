<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';

	let services = $state<
		{
			id: string;
			name: string;
			description: string | null;
			color: string;
			priceCents: number | null;
			durationMinutes: number;
			requiresApproval: boolean;
			capacity: number;
		}[]
	>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function loadServices() {
		loading = true;
		error = null;

		try {
			const response = await fetch('/api/services');
			if (!response.ok) throw new Error('Failed to load services');

			const data = await response.json();
			services = data.services;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load services';
		} finally {
			loading = false;
		}
	}

	function formatPrice(cents: number | null): string {
		if (!cents) return 'Free';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(cents / 100);
	}

	onMount(() => {
		loadServices();
	});
</script>

<svelte:head>
	<title>Book an Appointment</title>
</svelte:head>

<div class="mx-auto min-h-screen max-w-4xl p-6">
	<header class="mb-8 text-center">
		<h1 class="text-3xl font-bold">Book an Appointment</h1>
		<p class="mt-2 text-muted-foreground">Select a service to get started</p>
	</header>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div
				class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
			></div>
		</div>
	{:else if error}
		<div class="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
			<p class="text-destructive">{error}</p>
			<button class="mt-2 text-primary underline" onclick={loadServices}>Try again</button>
		</div>
	{:else if services.length === 0}
		<Card>
			<CardContent class="py-12 text-center">
				<p class="text-muted-foreground">No services available for booking at this time.</p>
			</CardContent>
		</Card>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each services as service}
				<Card class="flex flex-col transition-shadow hover:shadow-md">
					<CardHeader>
						<div class="flex items-start gap-3">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full"
								style="background-color: {service.color}20"
							>
								<div class="h-4 w-4 rounded-full" style="background-color: {service.color}"></div>
							</div>
							<div class="flex-1">
								<CardTitle class="text-lg">{service.name}</CardTitle>
								{#if service.description}
									<CardDescription class="mt-1 line-clamp-2">{service.description}</CardDescription>
								{/if}
							</div>
						</div>
					</CardHeader>
					<CardContent class="flex flex-1 flex-col">
						<div class="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
							<span>{service.durationMinutes} min</span>
							<span>•</span>
							<span>{formatPrice(service.priceCents)}</span>
							{#if service.capacity > 1}
								<span>•</span>
								<span>{service.capacity} spots</span>
							{/if}
						</div>

						{#if service.requiresApproval}
							<div class="mb-4 text-xs text-amber-600">Requires approval</div>
						{/if}

						<div class="mt-auto">
							<Button href={`/book/service/${service.id}`} class="w-full">Book Now</Button>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}
</div>
