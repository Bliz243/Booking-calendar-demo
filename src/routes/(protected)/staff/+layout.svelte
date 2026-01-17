<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';

	const navItems = [
		{ href: '/staff', label: 'Today', icon: 'calendar' },
		{ href: '/staff/bookings', label: 'All Bookings', icon: 'list' },
		{ href: '/staff/bookings/new', label: 'New Booking', icon: 'plus' }
	];

	let { children } = $props();
</script>

<div class="min-h-screen bg-muted/30">
	<!-- Header -->
	<header class="border-b bg-background">
		<div class="flex h-14 items-center px-6">
			<a href="/staff" class="mr-8 flex items-center gap-2 font-semibold">
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
				<span>Staff Dashboard</span>
			</a>

			<nav class="flex items-center gap-1">
				{#each navItems as item}
					<Button
						variant={$page.url.pathname === item.href ? 'secondary' : 'ghost'}
						size="sm"
						href={item.href}
					>
						{item.label}
					</Button>
				{/each}
			</nav>

			<div class="ml-auto flex items-center gap-2">
				<Button variant="outline" size="sm" href="/admin">Admin Panel</Button>
				<Button variant="outline" size="sm" href="/">Back to Calendar</Button>
			</div>
		</div>
	</header>

	<!-- Main content -->
	<main class="mx-auto max-w-7xl p-6">
		{@render children()}
	</main>
</div>
