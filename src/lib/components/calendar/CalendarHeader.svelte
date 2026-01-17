<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { ChevronLeft, ChevronRight, LogOut, LayoutGrid, Menu, ChevronDown } from '@lucide/svelte';
	import type { CalendarState } from './stores/calendar-state.svelte';
	import type { ViewType } from '$lib/types/calendar';
	import { signOut } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	interface Props {
		state: CalendarState;
		onCreateEvent?: () => void;
		onToggleSidebar?: () => void;
		user?: { name: string; email: string; role?: string } | null;
	}

	let { state, onCreateEvent, onToggleSidebar, user }: Props = $props();

	// Get today's date for the calendar icon
	const today = new Date();
	const todayDate = today.getDate();

	// Get user initial for avatar
	function getUserInitial(name: string): string {
		return name.charAt(0).toUpperCase();
	}

	// Generate a consistent color from user name
	function getAvatarColor(name: string): string {
		const colors = [
			'bg-blue-500',
			'bg-emerald-500',
			'bg-violet-500',
			'bg-amber-500',
			'bg-rose-500',
			'bg-cyan-500',
			'bg-indigo-500',
			'bg-teal-500'
		];
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}
		return colors[Math.abs(hash) % colors.length];
	}

	async function handleSignOut() {
		await signOut();
		goto('/login');
	}

	function handleViewChange(value: string | undefined) {
		if (value) {
			state.setView(value as ViewType);
		}
	}
</script>

<header class="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-3">
	<!-- Left section: Hamburger, Logo, Today, Navigation, Title -->
	<div class="flex items-center gap-1">
		<!-- Hamburger Menu -->
		{#if onToggleSidebar}
			<Button
				variant="ghost"
				size="icon"
				class="h-10 w-10 text-slate-600 hover:bg-slate-100"
				onclick={onToggleSidebar}
			>
				<Menu class="h-5 w-5" />
				<span class="sr-only">Toggle sidebar</span>
			</Button>
		{/if}

		<!-- Calendar Icon with Date Badge (Google-style) -->
		<a
			href="/calendar"
			class="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50"
		>
			<div class="relative flex h-10 w-10 items-center justify-center">
				<!-- Calendar shape background -->
				<div class="absolute inset-0 rounded-lg border-[2.5px] border-blue-600"></div>
				<!-- Calendar top strip (like the rings/header) -->
				<div class="absolute top-0 right-0 left-0 h-3 rounded-t-[5px] bg-blue-600"></div>
				<!-- Date number -->
				<span class="relative mt-1.5 text-[17px] font-bold text-blue-600">{todayDate}</span>
			</div>
			<span class="hidden text-[22px] font-normal text-slate-700 xl:block">Calendar</span>
		</a>

		<!-- Today Button -->
		<Button
			variant="outline"
			size="sm"
			onclick={() => state.goToToday()}
			class="ml-3 h-9 rounded-md border-slate-300 px-5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow"
		>
			Today
		</Button>

		<!-- Navigation Arrows -->
		<div class="ml-1 flex items-center">
			<Button
				variant="ghost"
				size="icon"
				class="h-9 w-9 rounded-full text-slate-600 transition-colors hover:bg-slate-100"
				onclick={() => state.goToPrevious()}
			>
				<ChevronLeft class="h-5 w-5" />
				<span class="sr-only">Previous</span>
			</Button>
			<Button
				variant="ghost"
				size="icon"
				class="h-9 w-9 rounded-full text-slate-600 transition-colors hover:bg-slate-100"
				onclick={() => state.goToNext()}
			>
				<ChevronRight class="h-5 w-5" />
				<span class="sr-only">Next</span>
			</Button>
		</div>

		<!-- Month/Year Title -->
		<h1 class="ml-3 text-[22px] font-normal tracking-tight text-slate-800">{state.viewTitle}</h1>
	</div>

	<!-- Right section: View Toggle, Apps, Profile -->
	<div class="flex items-center gap-1">
		<!-- View Toggle -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button
						variant="outline"
						size="sm"
						{...props}
						class="h-9 gap-1 border-slate-300 px-3 text-sm font-medium text-slate-700 shadow-sm"
					>
						{state.viewType === 'day' ? 'Day' : state.viewType === 'week' ? 'Week' : 'Month'}
						<ChevronDown class="h-4 w-4 text-slate-500" />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-32">
				<DropdownMenu.Item onclick={() => handleViewChange('day')}>Day</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => handleViewChange('week')}>Week</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => handleViewChange('month')}>Month</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<!-- Divider -->
		<div class="mx-1 h-6 w-px bg-slate-200"></div>

		<!-- Quick Links / Apps Dropdown -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button
						variant="ghost"
						size="icon"
						{...props}
						class="h-10 w-10 rounded-full text-slate-600 transition-colors hover:bg-slate-100"
					>
						<LayoutGrid class="h-5 w-5" />
						<span class="sr-only">Apps</span>
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-48">
				<DropdownMenu.Label class="text-xs font-medium text-slate-500"
					>Quick Access</DropdownMenu.Label
				>
				<DropdownMenu.Separator />
				<DropdownMenu.Item onclick={() => goto('/book')}>Book Appointment</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => goto('/staff')}>Staff Dashboard</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => goto('/admin')}>Admin Panel</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<!-- User Profile -->
		{#if user}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							class="flex h-10 w-10 items-center justify-center rounded-full {getAvatarColor(
								user.name
							)} text-sm font-semibold text-white shadow-sm ring-2 ring-white transition-all hover:shadow-md hover:ring-slate-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
							title={user.name}
						>
							{getUserInitial(user.name)}
						</button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" class="w-72">
					<div class="flex items-center gap-4 px-4 py-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full {getAvatarColor(
								user.name
							)} text-xl font-semibold text-white shadow-sm"
						>
							{getUserInitial(user.name)}
						</div>
						<div class="flex flex-col">
							<span class="text-sm font-semibold text-slate-900">{user.name}</span>
							<span class="text-xs text-slate-500">{user.email}</span>
							{#if user.role}
								<span
									class="mt-1 inline-flex w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-slate-600 uppercase"
								>
									{user.role}
								</span>
							{/if}
						</div>
					</div>
					<DropdownMenu.Separator />
					<DropdownMenu.Item
						onclick={handleSignOut}
						class="text-red-600 focus:bg-red-50 focus:text-red-700"
					>
						<LogOut class="mr-2 h-4 w-4" />
						Sign out
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		{/if}
	</div>
</header>
