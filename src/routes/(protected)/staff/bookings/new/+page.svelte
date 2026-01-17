<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Select from '$lib/components/ui/select';
	import type { ServiceWithRequirements, AvailableSlot } from '$lib/types/service';
	import { addDays, format, startOfDay, isSameDay } from '$lib/utils/date';

	let services = $state<ServiceWithRequirements[]>([]);
	let slots = $state<AvailableSlot[]>([]);
	let loading = $state(true);
	let loadingSlots = $state(false);
	let submitting = $state(false);
	let error = $state<string | null>(null);

	let selectedServiceId = $state('');
	let selectedDate = $state<Date>(startOfDay(new Date()));
	let selectedSlot = $state<AvailableSlot | null>(null);
	let manualTime = $state({
		date: format(new Date(), 'yyyy-MM-dd'),
		startTime: '09:00',
		endTime: '10:00'
	});

	let useManualTime = $state(false);

	let formData = $state({
		customerName: '',
		customerEmail: '',
		customerPhone: '',
		customerNotes: ''
	});

	let overrides = $state({
		overrideMinNotice: false,
		overrideOperatingHours: false
	});

	async function loadServices() {
		loading = true;
		error = null;

		try {
			const response = await fetch('/api/admin/services');
			if (!response.ok) throw new Error('Failed to load services');

			const data = await response.json();
			services = data.services.filter((s: ServiceWithRequirements) => s.isActive);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load services';
		} finally {
			loading = false;
		}
	}

	async function loadSlots() {
		if (!selectedServiceId) {
			slots = [];
			return;
		}

		loadingSlots = true;
		error = null;

		try {
			const start = new Date();
			const end = addDays(start, 30);

			const response = await fetch(
				`/api/services/${selectedServiceId}/slots?start=${start.toISOString()}&end=${end.toISOString()}`
			);

			if (!response.ok) throw new Error('Failed to load availability');

			const data = await response.json();
			slots = data.slots.map(
				(s: { startTime: string; endTime: string; availableResources?: unknown[] }) => ({
					startTime: new Date(s.startTime),
					endTime: new Date(s.endTime),
					availableResources: s.availableResources || []
				})
			);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load availability';
		} finally {
			loadingSlots = false;
		}
	}

	async function submitBooking() {
		if (!selectedServiceId) return;

		submitting = true;
		error = null;

		try {
			let startTime: string;
			let endTime: string;

			if (useManualTime) {
				startTime = new Date(`${manualTime.date}T${manualTime.startTime}`).toISOString();
				endTime = new Date(`${manualTime.date}T${manualTime.endTime}`).toISOString();
			} else if (selectedSlot) {
				startTime = selectedSlot.startTime.toISOString();
				endTime = selectedSlot.endTime.toISOString();
			} else {
				throw new Error('Please select a time slot or use manual time entry');
			}

			const response = await fetch('/api/admin/bookings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					serviceId: selectedServiceId,
					startTime,
					endTime,
					customerName: formData.customerName,
					customerEmail: formData.customerEmail,
					customerPhone: formData.customerPhone || undefined,
					customerNotes: formData.customerNotes || undefined,
					overrideMinNotice: overrides.overrideMinNotice,
					overrideOperatingHours: overrides.overrideOperatingHours
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to create booking');
			}

			goto('/staff');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create booking';
		} finally {
			submitting = false;
		}
	}

	function getDatesWithSlots(): Date[] {
		const dates = new Set<string>();
		for (const slot of slots) {
			dates.add(format(slot.startTime, 'yyyy-MM-dd'));
		}
		return Array.from(dates)
			.map((d) => new Date(d))
			.sort((a, b) => a.getTime() - b.getTime());
	}

	function getSlotsForDate(date: Date): AvailableSlot[] {
		return slots.filter((slot) => isSameDay(slot.startTime, date));
	}

	function formatTime(date: Date): string {
		return format(date, 'h:mm a');
	}

	$effect(() => {
		if (selectedServiceId) {
			loadSlots();
			selectedSlot = null;
		}
	});

	$effect(() => {
		const datesWithSlots = getDatesWithSlots();
		if (datesWithSlots.length > 0 && !datesWithSlots.some((d) => isSameDay(d, selectedDate))) {
			selectedDate = datesWithSlots[0];
		}
	});

	onMount(() => {
		loadServices();
	});

	let selectedService = $derived(services.find((s) => s.id === selectedServiceId));
</script>

<svelte:head>
	<title>New Booking - Staff</title>
</svelte:head>

<div class="mx-auto max-w-5xl">
	<!-- Page Header -->
	<header class="mb-10 border-b border-stone-200 pb-6">
		<div class="flex items-center gap-4">
			<a
				href="/staff"
				class="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
			</a>
			<div>
				<h1 class="text-2xl font-semibold tracking-tight text-stone-900">Create Booking</h1>
				<p class="mt-1 text-stone-500">Book an appointment for a customer</p>
			</div>
		</div>
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

	<!-- Loading State -->
	{#if loading}
		<div class="flex flex-col items-center justify-center py-24">
			<div class="relative h-12 w-12">
				<div class="absolute inset-0 rounded-full border-2 border-stone-200"></div>
				<div
					class="absolute inset-0 animate-spin rounded-full border-2 border-stone-900 border-t-transparent"
				></div>
			</div>
			<p class="mt-4 text-sm text-stone-500">Loading services...</p>
		</div>
	{:else}
		<div class="grid gap-8 lg:grid-cols-2">
			<!-- Left Column: Service & Time -->
			<div class="space-y-6">
				<!-- Service Selection -->
				<div class="overflow-hidden rounded-xl border border-stone-200 bg-white">
					<div class="border-b border-stone-100 bg-stone-50/80 px-6 py-4">
						<div class="flex items-center gap-3">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
									/>
								</svg>
							</div>
							<h2 class="text-lg font-semibold text-stone-900">Select Service</h2>
						</div>
					</div>
					<div class="p-6">
						<Select.Root
							type="single"
							value={selectedServiceId}
							onValueChange={(v) => (selectedServiceId = v || '')}
						>
							<Select.Trigger class="h-12 w-full rounded-xl border-stone-200 bg-white text-base">
								{#if selectedService}
									<div class="flex items-center gap-3">
										<div
											class="h-3 w-3 rounded-full"
											style="background-color: {selectedService.color}"
										></div>
										<span>{selectedService.name}</span>
										<span class="text-stone-400">({selectedService.durationMinutes} min)</span>
									</div>
								{:else}
									<span class="text-stone-400">Choose a service...</span>
								{/if}
							</Select.Trigger>
							<Select.Content>
								{#each services as service}
									<Select.Item value={service.id}>
										<div class="flex items-center gap-3">
											<div
												class="h-3 w-3 rounded-full"
												style="background-color: {service.color}"
											></div>
											<span>{service.name}</span>
											<span class="text-stone-400">({service.durationMinutes} min)</span>
										</div>
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>

						{#if selectedService}
							<div class="mt-4 rounded-xl bg-stone-50 p-4">
								<div class="flex items-center gap-3">
									<div
										class="flex h-10 w-10 items-center justify-center rounded-xl"
										style="background-color: {selectedService.color}15"
									>
										<div
											class="h-3 w-3 rounded-full"
											style="background-color: {selectedService.color}"
										></div>
									</div>
									<div>
										<p class="font-medium text-stone-900">{selectedService.name}</p>
										<p class="text-sm text-stone-500">
											{selectedService.durationMinutes} min •
											{selectedService.priceCents
												? new Intl.NumberFormat('en-US', {
														style: 'currency',
														currency: 'USD'
													}).format(selectedService.priceCents / 100)
												: 'Free'}
										</p>
									</div>
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Time Selection -->
				{#if selectedServiceId}
					<div class="overflow-hidden rounded-xl border border-stone-200 bg-white">
						<div class="border-b border-stone-100 bg-stone-50/80 px-6 py-4">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div
										class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
									</div>
									<h2 class="text-lg font-semibold text-stone-900">Select Time</h2>
								</div>
								<label class="flex cursor-pointer items-center gap-2">
									<Checkbox
										id="manual-time"
										checked={useManualTime}
										onCheckedChange={(checked) => (useManualTime = !!checked)}
									/>
									<span class="text-sm text-stone-600">Manual entry</span>
								</label>
							</div>
						</div>
						<div class="p-6">
							{#if useManualTime}
								<div class="space-y-4">
									<div>
										<Label for="manual-date" class="mb-2 block text-sm font-medium text-stone-700"
											>Date</Label
										>
										<Input
											id="manual-date"
											type="date"
											class="h-12 rounded-xl border-stone-200"
											bind:value={manualTime.date}
										/>
									</div>
									<div class="grid grid-cols-2 gap-4">
										<div>
											<Label
												for="manual-start"
												class="mb-2 block text-sm font-medium text-stone-700">Start Time</Label
											>
											<Input
												id="manual-start"
												type="time"
												class="h-12 rounded-xl border-stone-200"
												bind:value={manualTime.startTime}
											/>
										</div>
										<div>
											<Label for="manual-end" class="mb-2 block text-sm font-medium text-stone-700"
												>End Time</Label
											>
											<Input
												id="manual-end"
												type="time"
												class="h-12 rounded-xl border-stone-200"
												bind:value={manualTime.endTime}
											/>
										</div>
									</div>
									<div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
										<div class="flex items-start gap-3">
											<svg
												class="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600"
												fill="currentColor"
												viewBox="0 0 20 20"
											>
												<path
													fill-rule="evenodd"
													d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
													clip-rule="evenodd"
												/>
											</svg>
											<div>
												<p class="font-medium text-amber-800">Manual Override</p>
												<p class="mt-0.5 text-sm text-amber-700">
													This bypasses availability checks and scheduling rules.
												</p>
											</div>
										</div>
									</div>
								</div>
							{:else if loadingSlots}
								<div class="flex items-center justify-center py-12">
									<div class="relative h-10 w-10">
										<div class="absolute inset-0 rounded-full border-2 border-stone-200"></div>
										<div
											class="absolute inset-0 animate-spin rounded-full border-2 border-stone-900 border-t-transparent"
										></div>
									</div>
								</div>
							{:else if slots.length === 0}
								<div class="py-8 text-center">
									<div
										class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-stone-400"
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
									<p class="font-medium text-stone-900">No available slots</p>
									<p class="mt-1 text-sm text-stone-500">
										Enable manual entry to override scheduling rules.
									</p>
								</div>
							{:else}
								<div class="space-y-5">
									<!-- Date Selection -->
									<div>
										<Label class="mb-3 block text-sm font-medium text-stone-700">Select Date</Label>
										<div class="flex flex-wrap gap-2">
											{#each getDatesWithSlots().slice(0, 7) as date}
												<button
													class="rounded-xl border px-4 py-3 text-center transition-all {isSameDay(
														date,
														selectedDate
													)
														? 'border-stone-900 bg-stone-900 text-white shadow-sm'
														: 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'}"
													onclick={() => {
														selectedDate = date;
														selectedSlot = null;
													}}
												>
													<div class="text-sm font-semibold">{format(date, 'EEE')}</div>
													<div
														class="mt-0.5 text-xs {isSameDay(date, selectedDate)
															? 'text-stone-300'
															: 'text-stone-500'}"
													>
														{format(date, 'MMM d')}
													</div>
												</button>
											{/each}
										</div>
									</div>

									<!-- Time Slots -->
									<div>
										<Label class="mb-3 block text-sm font-medium text-stone-700">Select Time</Label>
										{#if getSlotsForDate(selectedDate).length === 0}
											<p class="py-4 text-center text-sm text-stone-500">
												No slots available for this date
											</p>
										{:else}
											<div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
												{#each getSlotsForDate(selectedDate) as slot}
													<button
														class="rounded-xl border py-3 text-center text-sm font-medium transition-all {selectedSlot ===
														slot
															? 'border-stone-900 bg-stone-900 text-white shadow-sm'
															: 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'}"
														onclick={() => (selectedSlot = slot)}
													>
														{formatTime(slot.startTime)}
													</button>
												{/each}
											</div>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- Right Column: Customer Info & Actions -->
			<div class="space-y-6">
				<!-- Customer Information -->
				<div class="overflow-hidden rounded-xl border border-stone-200 bg-white">
					<div class="border-b border-stone-100 bg-stone-50/80 px-6 py-4">
						<div class="flex items-center gap-3">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
									/>
								</svg>
							</div>
							<h2 class="text-lg font-semibold text-stone-900">Customer Information</h2>
						</div>
					</div>
					<div class="space-y-4 p-6">
						<div>
							<Label for="customer-name" class="mb-2 block text-sm font-medium text-stone-700">
								Name <span class="text-red-500">*</span>
							</Label>
							<Input
								id="customer-name"
								required
								placeholder="Customer name"
								class="h-12 rounded-xl border-stone-200"
								bind:value={formData.customerName}
							/>
						</div>

						<div>
							<Label for="customer-email" class="mb-2 block text-sm font-medium text-stone-700">
								Email <span class="text-red-500">*</span>
							</Label>
							<Input
								id="customer-email"
								type="email"
								required
								placeholder="customer@example.com"
								class="h-12 rounded-xl border-stone-200"
								bind:value={formData.customerEmail}
							/>
						</div>

						<div>
							<Label for="customer-phone" class="mb-2 block text-sm font-medium text-stone-700"
								>Phone</Label
							>
							<Input
								id="customer-phone"
								type="tel"
								placeholder="(555) 123-4567"
								class="h-12 rounded-xl border-stone-200"
								bind:value={formData.customerPhone}
							/>
						</div>

						<div>
							<Label for="customer-notes" class="mb-2 block text-sm font-medium text-stone-700"
								>Notes</Label
							>
							<Input
								id="customer-notes"
								placeholder="Additional notes..."
								class="h-12 rounded-xl border-stone-200"
								bind:value={formData.customerNotes}
							/>
						</div>
					</div>
				</div>

				<!-- Staff Overrides -->
				<div class="overflow-hidden rounded-xl border border-stone-200 bg-white">
					<div class="border-b border-stone-100 bg-stone-50/80 px-6 py-4">
						<div class="flex items-center gap-3">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
									/>
								</svg>
							</div>
							<h2 class="text-lg font-semibold text-stone-900">Staff Overrides</h2>
						</div>
					</div>
					<div class="space-y-4 p-6">
						<label
							class="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 p-4 transition-colors hover:bg-stone-50"
						>
							<Checkbox
								id="override-notice"
								checked={overrides.overrideMinNotice}
								onCheckedChange={(checked) => (overrides.overrideMinNotice = !!checked)}
							/>
							<div>
								<span class="font-medium text-stone-900">Override minimum notice</span>
								<p class="mt-0.5 text-sm text-stone-500">Bypass the advance booking requirement</p>
							</div>
						</label>
						<label
							class="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 p-4 transition-colors hover:bg-stone-50"
						>
							<Checkbox
								id="override-hours"
								checked={overrides.overrideOperatingHours}
								onCheckedChange={(checked) => (overrides.overrideOperatingHours = !!checked)}
							/>
							<div>
								<span class="font-medium text-stone-900">Override operating hours</span>
								<p class="mt-0.5 text-sm text-stone-500">Book outside normal business hours</p>
							</div>
						</label>
					</div>
				</div>

				<!-- Submit Actions -->
				<div class="flex gap-3">
					<Button variant="outline" class="h-12 rounded-xl px-6" href="/staff">Cancel</Button>
					<Button
						class="h-12 flex-1 rounded-xl bg-stone-900 px-6 text-base font-medium text-white hover:bg-stone-800"
						disabled={submitting ||
							!selectedServiceId ||
							!formData.customerName ||
							!formData.customerEmail ||
							(!useManualTime && !selectedSlot)}
						onclick={submitBooking}
					>
						{#if submitting}
							<span
								class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
							></span>
						{/if}
						Create Booking
					</Button>
				</div>
			</div>
		</div>
	{/if}
</div>
