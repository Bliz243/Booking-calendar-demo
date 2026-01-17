<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { format, formatDateRange } from '$lib/utils/date';
	import type { TimeSlot, CreateBookingInput } from '$lib/types/booking';

	interface Props {
		slot: TimeSlot;
		templateId: string;
		onSubmit: (input: CreateBookingInput) => Promise<void>;
		onBack: () => void;
	}

	let { slot, templateId, onSubmit, onBack }: Props = $props();

	let name = $state('');
	let email = $state('');
	let phone = $state('');
	let notes = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();

		if (!name.trim() || !email.trim()) {
			error = 'Name and email are required';
			return;
		}

		submitting = true;
		error = null;

		try {
			await onSubmit({
				templateId,
				bookerName: name.trim(),
				bookerEmail: email.trim(),
				bookerPhone: phone.trim() || undefined,
				bookerNotes: notes.trim() || undefined,
				startTime: slot.startTime,
				endTime: slot.endTime
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to book appointment';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="mx-auto max-w-md">
	<!-- Selected time summary -->
	<div class="mb-6 rounded-lg bg-muted p-4">
		<h3 class="font-medium">Selected time</h3>
		<p class="text-sm text-muted-foreground">
			{format(slot.startTime, 'EEEE, MMMM d, yyyy')}
		</p>
		<p class="text-lg font-semibold">
			{formatDateRange(slot.startTime, slot.endTime)}
		</p>
		<Button variant="link" size="sm" class="h-auto p-0" onclick={onBack}>Change time</Button>
	</div>

	<!-- Booking form -->
	<form class="space-y-4" onsubmit={handleSubmit}>
		<div class="space-y-2">
			<Label for="name">Name *</Label>
			<Input id="name" bind:value={name} placeholder="Your name" required disabled={submitting} />
		</div>

		<div class="space-y-2">
			<Label for="email">Email *</Label>
			<Input
				id="email"
				type="email"
				bind:value={email}
				placeholder="your@email.com"
				required
				disabled={submitting}
			/>
		</div>

		<div class="space-y-2">
			<Label for="phone">Phone (optional)</Label>
			<Input
				id="phone"
				type="tel"
				bind:value={phone}
				placeholder="Your phone number"
				disabled={submitting}
			/>
		</div>

		<div class="space-y-2">
			<Label for="notes">Notes (optional)</Label>
			<textarea
				id="notes"
				bind:value={notes}
				placeholder="Any additional information"
				rows="3"
				disabled={submitting}
				class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
			></textarea>
		</div>

		{#if error}
			<p class="text-sm text-destructive">{error}</p>
		{/if}

		<Button type="submit" class="w-full" disabled={submitting}>
			{submitting ? 'Booking...' : 'Confirm Booking'}
		</Button>
	</form>
</div>
