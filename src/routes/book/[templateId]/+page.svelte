<script lang="ts">
	import { BookingSlotPicker, BookingForm, BookingConfirmation } from '$lib/components/booking';
	import type { TimeSlot, Booking, CreateBookingInput } from '$lib/types/booking';
	import { addDays } from '$lib/utils/date';
	import { onMount } from 'svelte';

	let { data } = $props();

	type Step = 'select' | 'form' | 'confirmation';

	let step = $state<Step>('select');
	let slots = $state<TimeSlot[]>([]);
	let selectedSlot = $state<TimeSlot | null>(null);
	let booking = $state<Booking | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function loadSlots() {
		loading = true;
		error = null;

		try {
			const start = new Date();
			const end = addDays(start, 30); // Load 30 days

			const response = await fetch(
				`/api/availability?templateId=${data.templateId}&start=${start.toISOString()}&end=${end.toISOString()}`
			);

			if (!response.ok) {
				throw new Error('Failed to load availability');
			}

			const result = await response.json();
			slots = result.slots.map((s: { startTime: string; endTime: string; available: boolean }) => ({
				startTime: new Date(s.startTime),
				endTime: new Date(s.endTime),
				available: s.available
			}));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load availability';
		} finally {
			loading = false;
		}
	}

	function handleSlotSelect(slot: TimeSlot) {
		selectedSlot = slot;
		step = 'form';
	}

	async function handleSubmit(input: CreateBookingInput) {
		const response = await fetch('/api/bookings', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...input,
				startTime: input.startTime.toISOString(),
				endTime: input.endTime.toISOString()
			})
		});

		if (!response.ok) {
			const result = await response.json();
			throw new Error(result.error || 'Failed to create booking');
		}

		const result = await response.json();
		booking = {
			...result.booking,
			startTime: new Date(result.booking.startTime),
			endTime: new Date(result.booking.endTime),
			createdAt: new Date(result.booking.createdAt)
		};
		step = 'confirmation';
	}

	function handleBack() {
		step = 'select';
	}

	onMount(() => {
		loadSlots();
	});
</script>

<svelte:head>
	<title>Book Appointment - {data.templateName}</title>
</svelte:head>

<div class="mx-auto min-h-screen max-w-4xl p-6">
	<header class="mb-8 text-center">
		<h1 class="text-3xl font-bold">{data.templateName}</h1>
		<p class="mt-2 text-muted-foreground">
			{data.slotDuration} minute appointment
		</p>
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
			<button class="mt-2 text-primary underline" onclick={loadSlots}> Try again </button>
		</div>
	{:else if step === 'select'}
		<BookingSlotPicker
			{slots}
			{selectedSlot}
			onSelect={handleSlotSelect}
			timezone={data.timezone}
		/>
	{:else if step === 'form' && selectedSlot}
		<BookingForm
			slot={selectedSlot}
			templateId={data.templateId}
			onSubmit={handleSubmit}
			onBack={handleBack}
		/>
	{:else if step === 'confirmation' && booking}
		<BookingConfirmation {booking} templateName={data.templateName} />
	{/if}
</div>
