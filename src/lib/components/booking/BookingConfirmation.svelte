<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { CheckCircle, Calendar, Clock } from '@lucide/svelte';
	import { format, formatDateRange } from '$lib/utils/date';
	import type { Booking } from '$lib/types/booking';

	interface Props {
		booking: Booking;
		templateName: string;
		onClose?: () => void;
	}

	let { booking, templateName, onClose }: Props = $props();
</script>

<div class="mx-auto max-w-md text-center">
	<div class="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
		<CheckCircle class="h-8 w-8 text-primary" />
	</div>

	<h2 class="mb-2 text-2xl font-bold">Booking Confirmed!</h2>
	<p class="mb-6 text-muted-foreground">
		Your appointment has been scheduled. A confirmation has been sent to {booking.bookerEmail}.
	</p>

	<div class="mb-6 rounded-lg bg-muted p-6 text-left">
		<h3 class="mb-4 font-semibold">{templateName}</h3>

		<div class="space-y-3">
			<div class="flex items-start gap-3">
				<Calendar class="mt-0.5 h-5 w-5 text-muted-foreground" />
				<div>
					<p class="font-medium">
						{format(booking.startTime, 'EEEE, MMMM d, yyyy')}
					</p>
					<p class="text-sm text-muted-foreground">
						{formatDateRange(booking.startTime, booking.endTime)}
					</p>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<Clock class="h-5 w-5 text-muted-foreground" />
				<span class="text-sm">
					{Math.round((booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60))} minutes
				</span>
			</div>
		</div>
	</div>

	<div class="mb-6 rounded-lg bg-muted/50 p-4 text-left">
		<h4 class="mb-2 text-sm font-medium">Your Information</h4>
		<p class="text-sm">{booking.bookerName}</p>
		<p class="text-sm text-muted-foreground">{booking.bookerEmail}</p>
		{#if booking.bookerPhone}
			<p class="text-sm text-muted-foreground">{booking.bookerPhone}</p>
		{/if}
	</div>

	{#if onClose}
		<Button onclick={onClose} class="w-full">Done</Button>
	{/if}

	<p class="mt-4 text-xs text-muted-foreground">
		Confirmation ID: {booking.id.slice(0, 8).toUpperCase()}
	</p>
</div>
