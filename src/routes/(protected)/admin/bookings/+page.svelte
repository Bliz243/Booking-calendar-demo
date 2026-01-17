<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { BookingTable, BookingDetailDrawer } from '$lib/components/bookings';
	import type { ServiceBookingWithDetails, ServiceWithRequirements } from '$lib/types/service';

	let bookings = $state<ServiceBookingWithDetails[]>([]);
	let services = $state<ServiceWithRequirements[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let filters = $state({
		serviceId: '',
		status: '',
		approvalStatus: ''
	});

	let selectedBooking = $state<ServiceBookingWithDetails | null>(null);

	async function loadData() {
		loading = true;
		error = null;

		try {
			const [bookingsRes, servicesRes] = await Promise.all([
				fetch(buildBookingsUrl()),
				fetch('/api/admin/services')
			]);

			if (!bookingsRes.ok) throw new Error('Failed to load bookings');
			if (!servicesRes.ok) throw new Error('Failed to load services');

			const bookingsData = await bookingsRes.json();
			const servicesData = await servicesRes.json();

			bookings = bookingsData.bookings.map((b: ServiceBookingWithDetails) => ({
				...b,
				startTime: new Date(b.startTime),
				endTime: new Date(b.endTime),
				createdAt: new Date(b.createdAt)
			}));
			services = servicesData.services;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load data';
		} finally {
			loading = false;
		}
	}

	function buildBookingsUrl(): string {
		const params = new URLSearchParams();
		if (filters.serviceId) params.set('serviceId', filters.serviceId);
		if (filters.status) params.set('status', filters.status);
		if (filters.approvalStatus) params.set('approvalStatus', filters.approvalStatus);
		return `/api/admin/bookings?${params.toString()}`;
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

			await loadData();
			selectedBooking = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to approve booking';
		}
	}

	async function rejectBooking(bookingId: string) {
		const reason = prompt('Reason for rejection (optional):');

		try {
			const response = await fetch(`/api/admin/bookings/${bookingId}/reject`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to reject booking');
			}

			await loadData();
			selectedBooking = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to reject booking';
		}
	}

	async function cancelBooking(bookingId: string) {
		if (!confirm('Cancel this booking?')) return;

		const reason = prompt('Reason for cancellation (optional):');

		try {
			const response = await fetch(`/api/admin/bookings/${bookingId}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to cancel booking');
			}

			await loadData();
			selectedBooking = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to cancel booking';
		}
	}

	async function updateBookingStatus(bookingId: string, status: 'completed' | 'no_show') {
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

			await loadData();
			selectedBooking = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update booking';
		}
	}

	// Reload when filters change
	$effect(() => {
		// Access filters to create dependency
		const { serviceId, status, approvalStatus } = filters;
		loadData();
	});
</script>

<svelte:head>
	<title>Bookings - Admin</title>
</svelte:head>

<div>
	<!-- Page Header -->
	<header class="mb-8 flex items-end justify-between border-b border-stone-200 pb-6">
		<div>
			<h1 class="text-3xl font-semibold tracking-tight text-stone-900">Bookings</h1>
			<p class="mt-2 text-lg text-stone-500">Manage and track all service bookings</p>
		</div>
		<Button
			class="h-11 rounded-xl bg-stone-900 px-6 text-sm font-medium text-white shadow-sm transition-all hover:bg-stone-800 hover:shadow-md"
			href="/staff/bookings/new"
		>
			<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			New Booking
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

	<!-- Filters -->
	<div class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-stone-200 bg-white p-5">
		<div class="flex items-center gap-2">
			<svg class="h-5 w-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
				/>
			</svg>
			<span class="text-sm font-medium text-stone-700">Filters</span>
		</div>

		<div class="flex flex-1 flex-wrap gap-3">
			<div class="w-52">
				<Select.Root
					type="single"
					value={filters.serviceId}
					onValueChange={(v) => (filters.serviceId = v || '')}
				>
					<Select.Trigger class="h-10 rounded-lg border-stone-200 bg-stone-50">
						{services.find((s) => s.id === filters.serviceId)?.name || 'All Services'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="" label="All Services" />
						{#each services as service}
							<Select.Item value={service.id} label={service.name} />
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="w-40">
				<Select.Root
					type="single"
					value={filters.status}
					onValueChange={(v) => (filters.status = v || '')}
				>
					<Select.Trigger class="h-10 rounded-lg border-stone-200 bg-stone-50">
						{filters.status
							? filters.status.charAt(0).toUpperCase() + filters.status.slice(1)
							: 'All Statuses'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="" label="All Statuses" />
						<Select.Item value="pending" label="Pending" />
						<Select.Item value="confirmed" label="Confirmed" />
						<Select.Item value="completed" label="Completed" />
						<Select.Item value="cancelled" label="Cancelled" />
						<Select.Item value="no_show" label="No Show" />
					</Select.Content>
				</Select.Root>
			</div>

			<div class="w-44">
				<Select.Root
					type="single"
					value={filters.approvalStatus}
					onValueChange={(v) => (filters.approvalStatus = v || '')}
				>
					<Select.Trigger class="h-10 rounded-lg border-stone-200 bg-stone-50">
						{filters.approvalStatus
							? filters.approvalStatus.charAt(0).toUpperCase() + filters.approvalStatus.slice(1)
							: 'All Approvals'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="" label="All Approvals" />
						<Select.Item value="pending" label="Pending Approval" />
						<Select.Item value="approved" label="Approved" />
						<Select.Item value="rejected" label="Rejected" />
					</Select.Content>
				</Select.Root>
			</div>
		</div>

		{#if filters.serviceId || filters.status || filters.approvalStatus}
			<button
				class="text-sm text-stone-500 hover:text-stone-700"
				onclick={() => {
					filters.serviceId = '';
					filters.status = '';
					filters.approvalStatus = '';
				}}
			>
				Clear filters
			</button>
		{/if}
	</div>

	<!-- Loading State -->
	{#if loading}
		<div class="flex flex-col items-center justify-center py-24">
			<div class="relative h-12 w-12">
				<div class="absolute inset-0 rounded-full border-2 border-stone-200"></div>
				<div
					class="absolute inset-0 animate-spin rounded-full border-2 border-stone-900 border-t-transparent"
				></div>
			</div>
			<p class="mt-4 text-sm text-stone-500">Loading bookings...</p>
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
			<h3 class="mb-1 text-lg font-semibold text-stone-900">No bookings found</h3>
			<p class="mb-6 text-stone-500">
				{filters.serviceId || filters.status || filters.approvalStatus
					? 'Try adjusting your filters'
					: 'Bookings will appear here once created'}
			</p>
			<Button
				class="h-11 rounded-xl bg-stone-900 px-6 font-medium text-white transition-all hover:bg-stone-800"
				href="/staff/bookings/new"
			>
				Create a booking
			</Button>
		</div>

		<!-- Bookings Table -->
	{:else}
		<BookingTable {bookings} onViewBooking={(b) => (selectedBooking = b)} />
	{/if}
</div>

<!-- Booking Detail Drawer -->
<BookingDetailDrawer
	booking={selectedBooking}
	onClose={() => (selectedBooking = null)}
	onApprove={approveBooking}
	onReject={rejectBooking}
	onCancel={cancelBooking}
	onMarkCompleted={(id) => updateBookingStatus(id, 'completed')}
	onMarkNoShow={(id) => updateBookingStatus(id, 'no_show')}
/>
