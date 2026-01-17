<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';

	const navItems = [
		{ href: '/admin/services', label: 'Services', icon: 'clipboard-list' },
		{ href: '/admin/bookings', label: 'Bookings', icon: 'calendar-check' },
		{ href: '/admin/resources', label: 'Resources', icon: 'users' }
	];

	let { children } = $props();
</script>

<div class="min-h-screen bg-muted/30">
	<!-- Header -->
	<header class="border-b bg-background">
		<div class="flex h-14 items-center px-6">
			<a href="/admin" class="mr-8 flex items-center gap-2 font-semibold">
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
					/>
				</svg>
				<span>Admin</span>
			</a>

			<nav class="flex items-center gap-1">
				{#each navItems as item}
					<Button
						variant={$page.url.pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
						size="sm"
						href={item.href}
					>
						{item.label}
					</Button>
				{/each}
			</nav>

			<div class="ml-auto flex items-center gap-2">
				<Button variant="outline" size="sm" href="/">Back to Calendar</Button>
			</div>
		</div>
	</header>

	<!-- Main content -->
	<main class="mx-auto max-w-7xl p-6">
		{@render children()}
	</main>
</div>
