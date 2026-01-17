<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Calendar } from '$lib/components/ui/calendar';
	import { page } from '$app/stores';
	import { addDays, format, startOfDay, isSameDay } from '$lib/utils/date';
	import type { AvailableSlot } from '$lib/types/service';
	import {
		CalendarDate,
		getLocalTimeZone,
		today,
		isEqualDay,
		type DateValue
	} from '@internationalized/date';

	type Step = 'select' | 'form' | 'confirmation';

	let step = $state<Step>('select');
	let loading = $state(true);
	let loadingSlots = $state(false);
	let error = $state<string | null>(null);
	let submitting = $state(false);

	let service = $state<{
		id: string;
		name: string;
		description: string | null;
		color: string;
		priceCents: number | null;
		durationMinutes: number;
		minDurationMinutes: number | null;
		maxDurationMinutes: number | null;
		cancellationHours: number;
		requiresApproval: boolean;
		capacity: number;
	} | null>(null);

	interface SlotWithCapacity extends AvailableSlot {
		remainingCapacity?: number;
	}

	let slots = $state<SlotWithCapacity[]>([]);
	let selectedDate = $state<CalendarDate>(today(getLocalTimeZone()));
	let selectedSlot = $state<AvailableSlot | null>(null);
	let selectedDuration = $state<number | null>(null);

	// Convert CalendarDate to JS Date for slot filtering
	function calendarDateToDate(cd: CalendarDate): Date {
		return cd.toDate(getLocalTimeZone());
	}

	// Check if a CalendarDate has available slots
	function dateHasSlots(date: DateValue): boolean {
		const jsDate = date.toDate(getLocalTimeZone());
		return slots.some((slot) => isSameDay(slot.startTime, jsDate));
	}

	// Dates that should be disabled (no slots available)
	function isDateUnavailable(date: DateValue): boolean {
		return !dateHasSlots(date);
	}

	let booking = $state<{
		id: string;
		serviceName: string;
		startTime: Date;
		endTime: Date;
		status: string;
		requiresApproval: boolean;
	} | null>(null);

	let formData = $state({
		name: '',
		email: '',
		phone: '',
		notes: ''
	});

	const serviceId = $page.params.serviceId;

	// Check if service has variable duration
	const hasVariableDuration = $derived(
		service &&
			service.minDurationMinutes !== null &&
			service.maxDurationMinutes !== null &&
			service.minDurationMinutes !== service.maxDurationMinutes
	);

	// Generate duration options
	const durationOptions = $derived.by(() => {
		if (!service || !hasVariableDuration) return [];
		const min = service.minDurationMinutes!;
		const max = service.maxDurationMinutes!;
		const options: number[] = [];
		// Generate options in 15-minute increments
		for (let d = min; d <= max; d += 15) {
			options.push(d);
		}
		// Ensure max is included if not already
		if (options[options.length - 1] !== max) {
			options.push(max);
		}
		return options;
	});

	// Effective duration for display
	const effectiveDuration = $derived(selectedDuration ?? service?.durationMinutes ?? 0);

	async function loadSlots(isInitial = true) {
		if (isInitial) {
			loading = true;
		} else {
			if (!service) return;
			loadingSlots = true;
			selectedSlot = null;
		}
		error = null;

		try {
			const start = new Date();
			const end = addDays(start, 30);

			let url = `/api/services/${serviceId}/slots?start=${start.toISOString()}&end=${end.toISOString()}`;
			if (selectedDuration) {
				url += `&duration=${selectedDuration}`;
			}

			const response = await fetch(url);

			if (!response.ok) {
				if (response.status === 404) {
					throw new Error('Service not found or not available');
				}
				throw new Error('Failed to load availability');
			}

			const data = await response.json();
			if (isInitial) {
				service = data.service;
				// Set default duration if variable duration service
				if (!selectedDuration && data.service.minDurationMinutes) {
					selectedDuration = data.service.durationMinutes;
				}
			}
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
			if (isInitial) {
				loading = false;
			} else {
				loadingSlots = false;
			}
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

	function getSlotsForDate(date: CalendarDate): SlotWithCapacity[] {
		const jsDate = calendarDateToDate(date);
		return slots.filter((slot) => isSameDay(slot.startTime, jsDate));
	}

	// Check if this is a class-type service with capacity
	const isClassService = $derived(service && service.capacity > 1);

	function selectDate(date: CalendarDate) {
		selectedDate = date;
		selectedSlot = null;
	}

	function handleCalendarChange(newDate: DateValue | undefined) {
		if (newDate && dateHasSlots(newDate)) {
			// Convert DateValue to CalendarDate
			const calDate = new CalendarDate(newDate.year, newDate.month, newDate.day);
			selectDate(calDate);
		}
	}

	function selectSlot(slot: AvailableSlot) {
		selectedSlot = slot;
		step = 'form';
	}

	async function submitBooking() {
		if (!selectedSlot || !service) return;

		submitting = true;
		error = null;

		try {
			const response = await fetch(`/api/services/${serviceId}/book`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					startTime: selectedSlot.startTime.toISOString(),
					endTime: selectedSlot.endTime.toISOString(),
					customerName: formData.name,
					customerEmail: formData.email,
					customerPhone: formData.phone || undefined,
					customerNotes: formData.notes || undefined
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to create booking');
			}

			const data = await response.json();
			booking = {
				...data.booking,
				startTime: new Date(data.booking.startTime),
				endTime: new Date(data.booking.endTime)
			};
			step = 'confirmation';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create booking';
		} finally {
			submitting = false;
		}
	}

	function goBack() {
		step = 'select';
		error = null;
	}

	function formatPrice(cents: number | null): string {
		if (!cents) return 'Free';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(cents / 100);
	}

	function formatTime(date: Date): string {
		return format(date, 'h:mm a');
	}

	function formatDateFull(date: Date): string {
		return format(date, 'EEEE, MMMM d, yyyy');
	}

	function formatDuration(minutes: number): string {
		if (minutes < 60) return `${minutes} min`;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (mins === 0) return `${hours} hr`;
		return `${hours} hr ${mins} min`;
	}

	onMount(() => {
		loadSlots();
	});

	$effect(() => {
		// Auto-select first available date if current has no slots
		const datesWithSlots = getDatesWithSlots();
		if (datesWithSlots.length > 0) {
			const jsSelectedDate = calendarDateToDate(selectedDate);
			const hasSlots = datesWithSlots.some((d) => isSameDay(d, jsSelectedDate));
			if (!hasSlots) {
				const firstDate = datesWithSlots[0];
				selectedDate = new CalendarDate(
					firstDate.getFullYear(),
					firstDate.getMonth() + 1,
					firstDate.getDate()
				);
			}
		}
	});
</script>

<svelte:head>
	<title>{service?.name || 'Book'} - Booking</title>
</svelte:head>

<div class="min-h-screen bg-stone-50">
	<div class="mx-auto max-w-4xl px-6 py-12">
		{#if loading}
			<!-- Loading State -->
			<div class="flex flex-col items-center justify-center py-32">
				<div
					class="h-10 w-10 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900"
				></div>
				<p class="mt-4 text-stone-500">Loading availability...</p>
			</div>
		{:else if error && step === 'select'}
			<!-- Error State -->
			<div class="flex flex-col items-center justify-center py-32">
				<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
					<svg class="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<h2 class="mb-2 text-xl font-semibold text-stone-900">Something went wrong</h2>
				<p class="mb-6 text-stone-500">{error}</p>
				<Button onclick={() => loadSlots()}>Try Again</Button>
			</div>
		{:else if service}
			<!-- Service Header -->
			<header class="mb-8 text-center">
				<div
					class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl"
					style="background-color: {service.color}20"
				>
					<div class="h-5 w-5 rounded-lg" style="background-color: {service.color}"></div>
				</div>
				<h1 class="text-3xl font-bold text-stone-900">{service.name}</h1>
				{#if service.description}
					<p class="mx-auto mt-2 max-w-lg text-stone-500">{service.description}</p>
				{/if}
				<div class="mt-4 flex flex-wrap items-center justify-center gap-2">
					<span
						class="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-700"
					>
						<svg
							class="h-4 w-4 text-stone-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						{#if hasVariableDuration}
							{formatDuration(service.minDurationMinutes!)} - {formatDuration(
								service.maxDurationMinutes!
							)}
						{:else}
							{formatDuration(service.durationMinutes)}
						{/if}
					</span>
					<span
						class="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-700"
					>
						<svg
							class="h-4 w-4 text-stone-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						{formatPrice(service.priceCents)}
					</span>
					{#if isClassService}
						<span
							class="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700"
						>
							<svg
								class="h-4 w-4 text-blue-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
								/>
							</svg>
							Up to {service.capacity} people
						</span>
					{/if}
				</div>
			</header>

			{#if step === 'select'}
				<!-- Date & Time Selection -->
				<div class="overflow-hidden rounded-xl border border-stone-200 bg-white">
					<!-- Step Header -->
					<div class="border-b border-stone-100 bg-stone-50 px-6 py-4">
						<div class="flex items-center gap-3">
							<div
								class="flex h-7 w-7 items-center justify-center rounded-full bg-stone-900 text-sm font-semibold text-white"
							>
								1
							</div>
							<h2 class="text-lg font-semibold text-stone-900">Select Date & Time</h2>
						</div>
					</div>

					<!-- Duration Selection (for variable duration services) -->
					{#if hasVariableDuration}
						<div class="border-b border-stone-100 px-6 py-4">
							<Label class="mb-2 block text-sm font-medium text-stone-700">
								How long do you need?
							</Label>
							<div class="flex items-center gap-3">
								<Select.Root
									type="single"
									value={selectedDuration?.toString() || service.durationMinutes.toString()}
									onValueChange={(v) => {
										if (v) {
											selectedDuration = parseInt(v, 10);
											loadSlots(false);
										}
									}}
								>
									<Select.Trigger class="h-10 w-48">
										{formatDuration(selectedDuration || service.durationMinutes)}
									</Select.Trigger>
									<Select.Content>
										{#each durationOptions as duration}
											<Select.Item value={duration.toString()} label={formatDuration(duration)} />
										{/each}
									</Select.Content>
								</Select.Root>
								{#if loadingSlots}
									<span
										class="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900"
									></span>
								{/if}
							</div>
						</div>
					{/if}

					{#if getDatesWithSlots().length === 0 && !loadingSlots}
						<!-- No Availability -->
						<div class="flex flex-col items-center justify-center py-16 text-center">
							<div class="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-stone-100">
								<svg
									class="h-7 w-7 text-stone-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="1.5"
										d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
							</div>
							<h3 class="mb-1 text-lg font-semibold text-stone-900">No Availability</h3>
							<p class="text-stone-500">No available times in the next 30 days</p>
						</div>
					{:else}
						<div class="grid md:grid-cols-2 md:divide-x md:divide-stone-100">
							<!-- Date Selection with Calendar -->
							<div class="flex flex-col items-center p-6">
								<h3 class="mb-3 self-start text-sm font-medium text-stone-500">Choose a Date</h3>
								<Calendar
									type="single"
									bind:value={selectedDate}
									onValueChange={handleCalendarChange}
									{isDateUnavailable}
									minValue={today(getLocalTimeZone())}
									class="rounded-lg border shadow-sm"
								/>
								<p class="mt-3 text-xs text-stone-400">Dates without availability are disabled</p>
							</div>

							<!-- Time Selection -->
							<div class="border-t border-stone-100 p-6 md:border-t-0">
								<h3 class="mb-3 text-sm font-medium text-stone-500">
									Available Times for {format(calendarDateToDate(selectedDate), 'MMM d')}
								</h3>
								{#if getSlotsForDate(selectedDate).length === 0}
									<p class="py-8 text-center text-stone-500">No times available for this date</p>
								{:else}
									<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
										{#each getSlotsForDate(selectedDate) as slot}
											<button
												class="group rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-center transition-colors hover:border-stone-900 hover:bg-stone-900 hover:text-white"
												onclick={() => selectSlot(slot)}
											>
												<span class="text-sm font-medium text-stone-700 group-hover:text-white"
													>{formatTime(slot.startTime)}</span
												>
												{#if isClassService && slot.remainingCapacity !== undefined}
													<span class="block text-xs text-stone-400 group-hover:text-stone-300">
														{slot.remainingCapacity}
														{slot.remainingCapacity === 1 ? 'spot' : 'spots'} left
													</span>
												{/if}
											</button>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			{:else if step === 'form' && selectedSlot}
				<!-- Customer Information Form -->
				<div class="overflow-hidden rounded-xl border border-stone-200 bg-white">
					<!-- Selected Time Summary -->
					<div
						class="border-b border-stone-100 px-6 py-4"
						style="background-color: {service.color}08"
					>
						<div class="flex items-center gap-4">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-lg"
								style="background-color: {service.color}20"
							>
								<svg class="h-5 w-5" fill="none" stroke={service.color} viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
							</div>
							<div class="flex-1">
								<div class="font-medium text-stone-900">
									{formatDateFull(selectedSlot.startTime)}
								</div>
								<div class="text-sm text-stone-500">
									{formatTime(selectedSlot.startTime)} – {formatTime(selectedSlot.endTime)} ({formatDuration(
										effectiveDuration
									)})
								</div>
							</div>
							<button
								class="text-sm font-medium text-stone-500 hover:text-stone-700"
								onclick={goBack}
							>
								Change
							</button>
						</div>
					</div>

					<!-- Step Header -->
					<div class="border-b border-stone-100 bg-stone-50 px-6 py-4">
						<div class="flex items-center gap-3">
							<div
								class="flex h-7 w-7 items-center justify-center rounded-full bg-stone-900 text-sm font-semibold text-white"
							>
								2
							</div>
							<h2 class="text-lg font-semibold text-stone-900">Your Information</h2>
						</div>
					</div>

					<!-- Form -->
					<div class="p-6">
						{#if error}
							<div
								class="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
							>
								<svg class="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
										clip-rule="evenodd"
									/>
								</svg>
								<span class="font-medium">{error}</span>
							</div>
						{/if}

						<form
							class="space-y-4"
							onsubmit={(e) => {
								e.preventDefault();
								submitBooking();
							}}
						>
							<div>
								<Label for="name" class="mb-1.5 block text-sm font-medium text-stone-700"
									>Full Name *</Label
								>
								<Input
									id="name"
									required
									placeholder="John Smith"
									class="h-11"
									bind:value={formData.name}
								/>
							</div>

							<div>
								<Label for="email" class="mb-1.5 block text-sm font-medium text-stone-700"
									>Email Address *</Label
								>
								<Input
									id="email"
									type="email"
									required
									placeholder="john@example.com"
									class="h-11"
									bind:value={formData.email}
								/>
							</div>

							<div>
								<Label for="phone" class="mb-1.5 block text-sm font-medium text-stone-700"
									>Phone Number</Label
								>
								<Input
									id="phone"
									type="tel"
									placeholder="(555) 123-4567"
									class="h-11"
									bind:value={formData.phone}
								/>
							</div>

							<div>
								<Label for="notes" class="mb-1.5 block text-sm font-medium text-stone-700"
									>Additional Notes</Label
								>
								<Input
									id="notes"
									placeholder="Anything we should know?"
									class="h-11"
									bind:value={formData.notes}
								/>
							</div>

							<!-- Approval Notice -->
							{#if service.requiresApproval}
								<div class="flex items-start gap-3 rounded-lg bg-amber-50 p-4 text-amber-800">
									<svg
										class="h-5 w-5 flex-shrink-0 text-amber-500"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fill-rule="evenodd"
											d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
											clip-rule="evenodd"
										/>
									</svg>
									<div class="text-sm">
										<p class="font-medium">Approval Required</p>
										<p class="mt-0.5 text-amber-700">
											This booking requires approval. You'll receive a confirmation email once
											approved.
										</p>
									</div>
								</div>
							{/if}

							<!-- Cancellation Policy -->
							{#if service.cancellationHours > 0}
								<div class="flex items-start gap-3 rounded-lg bg-stone-50 p-4 text-stone-700">
									<svg
										class="h-5 w-5 flex-shrink-0 text-stone-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									<div class="text-sm">
										<p class="font-medium">Cancellation Policy</p>
										<p class="mt-0.5 text-stone-500">
											Free cancellation up to {service.cancellationHours} hours before your appointment.
										</p>
									</div>
								</div>
							{/if}

							<div class="flex gap-3 pt-2">
								<Button
									type="button"
									variant="outline"
									class="h-11 px-6"
									onclick={goBack}
									disabled={submitting}
								>
									Back
								</Button>
								<Button
									type="submit"
									class="h-11 flex-1"
									disabled={submitting || !formData.name || !formData.email}
								>
									{#if submitting}
										<span
											class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
										></span>
									{/if}
									{service.requiresApproval ? 'Request Booking' : 'Confirm Booking'}
								</Button>
							</div>
						</form>
					</div>
				</div>
			{:else if step === 'confirmation' && booking}
				<!-- Success Confirmation -->
				<div class="overflow-hidden rounded-xl border border-stone-200 bg-white">
					<div class="px-8 py-12 text-center">
						<!-- Success Icon -->
						<div
							class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100"
						>
							<svg
								class="h-8 w-8 text-emerald-600"
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
						</div>

						<h2 class="mb-2 text-2xl font-bold text-stone-900">
							{booking.requiresApproval ? 'Booking Requested!' : 'Booking Confirmed!'}
						</h2>

						{#if booking.requiresApproval}
							<p class="mx-auto mb-8 max-w-md text-stone-500">
								Your booking request has been submitted. You'll receive an email at <strong
									class="text-stone-700">{formData.email}</strong
								> once it's approved.
							</p>
						{:else}
							<p class="mx-auto mb-8 max-w-md text-stone-500">
								Your appointment is confirmed. A confirmation email has been sent to <strong
									class="text-stone-700">{formData.email}</strong
								>.
							</p>
						{/if}

						<!-- Booking Details Card -->
						<div class="mx-auto max-w-sm rounded-lg bg-stone-50 p-6 text-left">
							<div class="mb-4 flex items-center gap-3">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-lg"
									style="background-color: {service.color}20"
								>
									<div class="h-3 w-3 rounded-full" style="background-color: {service.color}"></div>
								</div>
								<div>
									<div class="font-semibold text-stone-900">{booking.serviceName}</div>
									<div class="text-sm text-stone-500">{formatDuration(effectiveDuration)}</div>
								</div>
							</div>
							<div class="space-y-2 border-t border-stone-200 pt-4 text-sm">
								<div class="flex justify-between">
									<span class="text-stone-500">Date</span>
									<span class="font-medium text-stone-900">{formatDateFull(booking.startTime)}</span
									>
								</div>
								<div class="flex justify-between">
									<span class="text-stone-500">Time</span>
									<span class="font-medium text-stone-900">
										{formatTime(booking.startTime)} – {formatTime(booking.endTime)}
									</span>
								</div>
							</div>
						</div>

						<div class="mt-8">
							<Button variant="outline" href="/">Back to Home</Button>
						</div>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>
