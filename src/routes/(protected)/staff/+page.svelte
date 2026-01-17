<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import type { ServiceBookingWithDetails } from '$lib/types/service';
	import { format, startOfDay, endOfDay, isBefore, isAfter } from '$lib/utils/date';

	let bookings = $state<ServiceBookingWithDetails[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const today = new Date();

	async function loadTodaysBookings() {
		loading = true;
		error = null;

		try {
			const start = startOfDay(today).toISOString();
			const end = endOfDay(today).toISOString();

			const response = await fetch(`/api/admin/bookings?startDate=${start}&endDate=${end}`);
			if (!response.ok) throw new Error('Failed to load bookings');

			const data = await response.json();
			bookings = data.bookings
				.map((b: ServiceBookingWithDetails) => ({
					...b,
					startTime: new Date(b.startTime),
					endTime: new Date(b.endTime),
					createdAt: new Date(b.createdAt)
				}))
				.sort(
					(a: ServiceBookingWithDetails, b: ServiceBookingWithDetails) =>
						a.startTime.getTime() - b.startTime.getTime()
				);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load bookings';
		} finally {
			loading = false;
		}
	}

	async function updateStatus(bookingId: string, status: 'completed' | 'no_show') {
		try {
			const response = await fetch(`/api/admin/bookings/${bookingId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to update booking');
			}

			await loadTodaysBookings();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update booking';
		}
	}

	async function approveBooking(bookingId: string) {
		try {
			const response = await fetch(`/api/admin/bookings/${bookingId}/approve`, {
				method: 'POST'
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to approve booking');
			}

			await loadTodaysBookings();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to approve booking';
		}
	}

	function formatTime(date: Date): string {
		return format(date, 'h:mm a');
	}

	function getBookingTimeStatus(
		booking: ServiceBookingWithDetails
	): 'past' | 'current' | 'upcoming' {
		const now = new Date();
		if (isAfter(now, booking.endTime)) return 'past';
		if (isBefore(now, booking.startTime)) return 'upcoming';
		return 'current';
	}

	const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
		pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
		confirmed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
		cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
		completed: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
		no_show: { bg: 'bg-stone-100', text: 'text-stone-600', dot: 'bg-stone-400' }
	};

	let confirmedBookings = $derived(bookings.filter((b) => b.status === 'confirmed'));
	let pendingApproval = $derived(bookings.filter((b) => b.approvalStatus === 'pending'));
	let completedToday = $derived(bookings.filter((b) => b.status === 'completed').length);

	onMount(() => {
		loadTodaysBookings();
	});
</script>

<svelte:head>
	<title>Today's Schedule - Staff</title>
</svelte:head>

<div>
	<!-- Page Header -->
	<header class="mb-8 flex items-end justify-between border-b border-stone-200 pb-6">
		<div>
			<h1 class="text-3xl font-semibold tracking-tight text-stone-900">Today's Schedule</h1>
			<p class="mt-2 text-lg text-stone-500">{format(today, 'EEEE, MMMM d, yyyy')}</p>
		</div>
		<Button
			class="h-11 rounded-xl bg-stone-900 px-6 text-sm font-medium text-white shadow-sm transition-all hover:bg-stone-800 hover:shadow-md"
			href="/staff/bookings/new"
		>
			<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Create Booking
		</Button>
	</header>

	<!-- Error Alert -->
	{#if error}
		<div
			class="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700"
		>
			<svg class="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
				<path
					fill-rule="evenodd"
					d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
					clip-rule="evenodd"
				/>
			</svg>
			<span class="font-medium">{error}</span>
			<button
				class="ml-auto text-red-500 hover:text-red-700"
				onclick={() => (error = null)}
				aria-label="Dismiss error"
			>
				<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		</div>
	{/if}

	<!-- Stats Cards -->
	<div class="mb-8 grid gap-5 sm:grid-cols-3">
		<!-- Upcoming -->
		<div
			class="group overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:border-stone-300 hover:shadow-md"
		>
			<div class="flex items-start justify-between">
				<div>
					<p class="text-sm font-medium text-stone-500">Upcoming</p>
					<p class="mt-2 text-4xl font-bold tracking-tight text-stone-900">
						{confirmedBookings.length}
					</p>
				</div>
				<div
					class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
				</div>
			</div>
			<p class="mt-3 text-sm text-stone-500">Appointments today</p>
		</div>

		<!-- Pending Approval -->
		<div
			class="group overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/30 p-6 shadow-sm transition-all hover:border-amber-300 hover:shadow-md"
		>
			<div class="flex items-start justify-between">
				<div>
					<p class="text-sm font-medium text-amber-700">Pending Approval</p>
					<p class="mt-2 text-4xl font-bold tracking-tight text-amber-900">
						{pendingApproval.length}
					</p>
				</div>
				<div
					class="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 transition-colors group-hover:bg-amber-200"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
			</div>
			<p class="mt-3 text-sm text-amber-700">Awaiting review</p>
		</div>

		<!-- Completed -->
		<div
			class="group overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:border-stone-300 hover:shadow-md"
		>
			<div class="flex items-start justify-between">
				<div>
					<p class="text-sm font-medium text-stone-500">Completed</p>
					<p class="mt-2 text-4xl font-bold tracking-tight text-emerald-600">{completedToday}</p>
				</div>
				<div
					class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 13l4 4L19 7"
						/>
					</svg>
				</div>
			</div>
			<p class="mt-3 text-sm text-stone-500">Done today</p>
		</div>
	</div>

	<!-- Pending Approvals Section -->
	{#if pendingApproval.length > 0}
		<div class="mb-8 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50">
			<div class="border-b border-amber-200 bg-amber-100/50 px-6 py-4">
				<div class="flex items-center gap-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
					</div>
					<h2 class="text-lg font-semibold text-amber-900">Needs Your Attention</h2>
				</div>
			</div>
			<div class="divide-y divide-amber-100">
				{#each pendingApproval as booking}
					<div
						class="flex items-center justify-between px-6 py-4 transition-colors hover:bg-amber-100/50"
					>
						<div class="flex items-center gap-4">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-xl"
								style="background-color: {booking.serviceColor}15"
							>
								<div
									class="h-3 w-3 rounded-full"
									style="background-color: {booking.serviceColor}"
								></div>
							</div>
							<div>
								<div class="flex items-center gap-2">
									<span class="font-semibold text-stone-900">{booking.customerName}</span>
								</div>
								<div class="mt-0.5 text-sm text-stone-500">
									{booking.serviceName} • {formatTime(booking.startTime)} - {formatTime(
										booking.endTime
									)}
								</div>
							</div>
						</div>
						<div class="flex gap-2">
							<Button
								class="h-9 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
								onclick={() => approveBooking(booking.id)}
							>
								Approve
							</Button>
							<Button variant="outline" class="h-9 rounded-xl px-4 text-sm" href="/admin/bookings">
								View Details
							</Button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Loading State -->
	{#if loading}
		<div class="flex flex-col items-center justify-center py-24">
			<div class="relative h-12 w-12">
				<div class="absolute inset-0 rounded-full border-2 border-stone-200"></div>
				<div
					class="absolute inset-0 animate-spin rounded-full border-2 border-stone-900 border-t-transparent"
				></div>
			</div>
			<p class="mt-4 text-sm text-stone-500">Loading today's schedule...</p>
		</div>

		<!-- Empty State -->
	{:else if bookings.length === 0}
		<div
			class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/50 py-20"
		>
			<div
				class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-stone-400"
			>
				<svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
			</div>
			<h3 class="mb-1 text-lg font-semibold text-stone-900">No bookings today</h3>
			<p class="mb-6 text-stone-500">Your schedule is clear for today</p>
			<Button
				class="h-11 rounded-xl bg-stone-900 px-6 font-medium text-white transition-all hover:bg-stone-800"
				href="/staff/bookings/new"
			>
				Create a Booking
			</Button>
		</div>

		<!-- Schedule Timeline -->
	{:else}
		<div class="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
			<div class="border-b border-stone-100 bg-stone-50/80 px-6 py-4">
				<div class="flex items-center gap-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
							/>
						</svg>
					</div>
					<h2 class="text-lg font-semibold text-stone-900">Today's Schedule</h2>
				</div>
			</div>

			<div class="divide-y divide-stone-100">
				{#each bookings.filter((b) => b.status !== 'cancelled') as booking, index}
					{@const timeStatus = getBookingTimeStatus(booking)}
					<div
						class="relative transition-all duration-200 {timeStatus === 'current'
							? 'bg-blue-50/50'
							: timeStatus === 'past'
								? 'opacity-50'
								: 'hover:bg-stone-50/50'}"
					>
						<!-- Current indicator -->
						{#if timeStatus === 'current'}
							<div class="absolute inset-y-0 left-0 w-1 bg-blue-500"></div>
						{/if}

						<div class="flex items-center justify-between px-6 py-5">
							<!-- Time Column -->
							<div class="flex items-center gap-6">
								<div class="w-24 text-center">
									<div class="text-lg font-bold text-stone-900">
										{formatTime(booking.startTime)}
									</div>
									<div class="mt-0.5 text-sm text-stone-400">{formatTime(booking.endTime)}</div>
								</div>

								<!-- Service & Customer -->
								<div class="flex items-center gap-4">
									<div
										class="flex h-12 w-12 items-center justify-center rounded-xl"
										style="background-color: {booking.serviceColor}15"
									>
										<div
											class="h-3.5 w-3.5 rounded-full"
											style="background-color: {booking.serviceColor}"
										></div>
									</div>
									<div>
										<div class="flex items-center gap-3">
											<span class="font-semibold text-stone-900">{booking.serviceName}</span>
											<span
												class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium {statusConfig[
													booking.status
												]?.bg} {statusConfig[booking.status]?.text}"
											>
												<span class="h-1.5 w-1.5 rounded-full {statusConfig[booking.status]?.dot}"
												></span>
												{booking.status.replace('_', ' ')}
											</span>
										</div>
										<div class="mt-1 flex items-center gap-2 text-sm">
											<span class="font-medium text-stone-700">{booking.customerName}</span>
											<span class="text-stone-400">•</span>
											<span class="text-stone-500">{booking.customerEmail}</span>
										</div>
										{#if booking.assignedResources.length > 0}
											<div class="mt-2 flex flex-wrap gap-1.5">
												{#each booking.assignedResources as resource}
													<span
														class="inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium"
														style="background-color: {resource.resourceTypeColor}10; color: {resource.resourceTypeColor}"
													>
														{resource.resourceName}
													</span>
												{/each}
											</div>
										{/if}
									</div>
								</div>
							</div>

							<!-- Actions -->
							{#if booking.status === 'confirmed'}
								<div class="flex gap-2">
									<Button
										variant="outline"
										class="h-9 rounded-xl border-emerald-200 px-4 text-sm text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
										onclick={() => updateStatus(booking.id, 'completed')}
									>
										<svg
											class="mr-1.5 h-4 w-4"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M5 13l4 4L19 7"
											/>
										</svg>
										Complete
									</Button>
									<Button
										variant="ghost"
										class="h-9 rounded-xl px-4 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-700"
										onclick={() => updateStatus(booking.id, 'no_show')}
									>
										No-Show
									</Button>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
