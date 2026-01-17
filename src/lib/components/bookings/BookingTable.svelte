<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { ServiceBookingWithDetails } from '$lib/types/service';
	import { format } from '$lib/utils/date';

	interface Props {
		bookings: ServiceBookingWithDetails[];
		onViewBooking?: (booking: ServiceBookingWithDetails) => void;
		showActions?: boolean;
	}

	let { bookings, onViewBooking, showActions = true }: Props = $props();

	const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
		pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
		confirmed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
		cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
		completed: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
		no_show: { bg: 'bg-stone-100', text: 'text-stone-600', dot: 'bg-stone-400' }
	};

	function formatDate(date: Date): string {
		return format(date, 'EEE, MMM d');
	}

	function formatTime(date: Date): string {
		return format(date, 'h:mm a');
	}
</script>

<div class="overflow-hidden rounded-xl border border-stone-200 bg-white">
	<table class="w-full">
		<thead>
			<tr class="border-b border-stone-100 bg-stone-50/80">
				<th
					class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-stone-500 uppercase"
				>
					Service
				</th>
				<th
					class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-stone-500 uppercase"
				>
					Customer
				</th>
				<th
					class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-stone-500 uppercase"
				>
					Date & Time
				</th>
				<th
					class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-stone-500 uppercase"
				>
					Status
				</th>
				<th
					class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-stone-500 uppercase"
				>
					Resources
				</th>
				{#if showActions}
					<th
						class="px-6 py-4 text-right text-xs font-semibold tracking-wider text-stone-500 uppercase"
					>
						Actions
					</th>
				{/if}
			</tr>
		</thead>
		<tbody class="divide-y divide-stone-100">
			{#each bookings as booking}
				<tr class="transition-colors hover:bg-stone-50/50">
					<td class="px-6 py-4">
						<div class="flex items-center gap-3">
							<div
								class="flex h-9 w-9 items-center justify-center rounded-lg"
								style="background-color: {booking.serviceColor}15"
							>
								<div
									class="h-2.5 w-2.5 rounded-full"
									style="background-color: {booking.serviceColor}"
								></div>
							</div>
							<span class="font-medium text-stone-900">{booking.serviceName}</span>
						</div>
					</td>
					<td class="px-6 py-4">
						<div>
							<div class="font-medium text-stone-900">{booking.customerName}</div>
							<div class="text-sm text-stone-500">{booking.customerEmail}</div>
						</div>
					</td>
					<td class="px-6 py-4">
						<div>
							<div class="font-medium text-stone-900">{formatDate(booking.startTime)}</div>
							<div class="text-sm text-stone-500">
								{formatTime(booking.startTime)} – {formatTime(booking.endTime)}
							</div>
						</div>
					</td>
					<td class="px-6 py-4">
						<div class="flex flex-col gap-1.5">
							<span
								class="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium {statusConfig[
									booking.status
								]?.bg} {statusConfig[booking.status]?.text}"
							>
								<span class="h-1.5 w-1.5 rounded-full {statusConfig[booking.status]?.dot}"></span>
								{booking.status.replace('_', ' ')}
							</span>
							{#if booking.approvalStatus === 'pending'}
								<span
									class="inline-flex w-fit items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700"
								>
									<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
										<path
											fill-rule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
											clip-rule="evenodd"
										/>
									</svg>
									Needs approval
								</span>
							{/if}
						</div>
					</td>
					<td class="px-6 py-4">
						{#if booking.assignedResources.length > 0}
							<div class="flex flex-wrap gap-1">
								{#each booking.assignedResources as resource}
									<span
										class="inline-flex rounded-lg px-2 py-1 text-xs font-medium"
										style="background-color: {resource.resourceTypeColor}10; color: {resource.resourceTypeColor}"
									>
										{resource.resourceName}
									</span>
								{/each}
							</div>
						{:else}
							<span class="text-sm text-stone-400">—</span>
						{/if}
					</td>
					{#if showActions}
						<td class="px-6 py-4 text-right">
							<button
								class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
								onclick={() => onViewBooking?.(booking)}
							>
								View
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</button>
						</td>
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
