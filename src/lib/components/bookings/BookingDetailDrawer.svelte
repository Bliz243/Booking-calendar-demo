<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Drawer from '$lib/components/ui/drawer';
	import type { ServiceBookingWithDetails } from '$lib/types/service';
	import { format } from '$lib/utils/date';

	interface Props {
		booking: ServiceBookingWithDetails | null;
		onClose: () => void;
		onApprove?: (bookingId: string) => void;
		onReject?: (bookingId: string) => void;
		onCancel?: (bookingId: string) => void;
		onMarkCompleted?: (bookingId: string) => void;
		onMarkNoShow?: (bookingId: string) => void;
		showApprovalActions?: boolean;
	}

	let {
		booking,
		onClose,
		onApprove,
		onReject,
		onCancel,
		onMarkCompleted,
		onMarkNoShow,
		showApprovalActions = true
	}: Props = $props();

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

{#if booking}
	<Drawer.Root open={true} onOpenChange={() => onClose()} direction="right">
		<Drawer.Portal>
			<Drawer.Overlay class="fixed inset-0 z-50 bg-black/50" />
			<Drawer.Content
				class="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-stone-200 bg-white shadow-2xl"
			>
				<!-- Header with Service Color -->
				<Drawer.Header
					class="relative border-b border-stone-100 px-8 pt-8 pb-6"
					style="background: linear-gradient(135deg, {booking.serviceColor}15 0%, {booking.serviceColor}05 100%)"
				>
					<div
						class="absolute inset-x-0 top-0 h-1"
						style="background-color: {booking.serviceColor}"
					></div>

					<Drawer.Title class="flex items-center gap-3">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-xl"
							style="background-color: {booking.serviceColor}20"
						>
							<div
								class="h-4 w-4 rounded-full"
								style="background-color: {booking.serviceColor}"
							></div>
						</div>
						<div>
							<h2 class="text-xl font-semibold text-stone-900">{booking.serviceName}</h2>
							<p class="text-sm text-stone-500">Booking Details</p>
						</div>
					</Drawer.Title>
				</Drawer.Header>

				<!-- Content -->
				<div class="flex-1 space-y-6 overflow-y-auto px-8 py-6">
					<!-- Customer Info -->
					<div class="rounded-xl bg-stone-50 p-5">
						<h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900">
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
									d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
								/>
							</svg>
							Customer
						</h3>
						<div class="space-y-2 text-sm">
							<div class="flex justify-between">
								<span class="text-stone-500">Name</span>
								<span class="font-medium text-stone-900">{booking.customerName}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-stone-500">Email</span>
								<span class="font-medium text-stone-900">{booking.customerEmail}</span>
							</div>
							{#if booking.customerPhone}
								<div class="flex justify-between">
									<span class="text-stone-500">Phone</span>
									<span class="font-medium text-stone-900">{booking.customerPhone}</span>
								</div>
							{/if}
							{#if booking.customerNotes}
								<div class="pt-2">
									<span class="text-stone-500">Notes</span>
									<p class="mt-1 font-medium text-stone-900">{booking.customerNotes}</p>
								</div>
							{/if}
						</div>
					</div>

					<!-- Date & Time -->
					<div class="rounded-xl bg-stone-50 p-5">
						<h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900">
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
									d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
							Schedule
						</h3>
						<div class="space-y-2 text-sm">
							<div class="flex justify-between">
								<span class="text-stone-500">Date</span>
								<span class="font-medium text-stone-900">{formatDate(booking.startTime)}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-stone-500">Time</span>
								<span class="font-medium text-stone-900">
									{formatTime(booking.startTime)} – {formatTime(booking.endTime)}
								</span>
							</div>
						</div>
					</div>

					<!-- Status -->
					<div class="rounded-xl bg-stone-50 p-5">
						<h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900">
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
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							Status
						</h3>
						<div class="flex flex-wrap gap-2">
							<span
								class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium {statusConfig[
									booking.status
								]?.bg} {statusConfig[booking.status]?.text}"
							>
								<span class="h-2 w-2 rounded-full {statusConfig[booking.status]?.dot}"></span>
								{booking.status.replace('_', ' ')}
							</span>
							{#if booking.approvalStatus}
								<span
									class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium {booking.approvalStatus ===
									'pending'
										? 'bg-orange-50 text-orange-700'
										: booking.approvalStatus === 'approved'
											? 'bg-emerald-50 text-emerald-700'
											: 'bg-red-50 text-red-700'}"
								>
									{booking.approvalStatus}
								</span>
							{/if}
						</div>
						{#if booking.cancellationReason}
							<div class="mt-3 text-sm">
								<span class="text-stone-500">Cancellation reason:</span>
								<p class="mt-1 font-medium text-stone-900">{booking.cancellationReason}</p>
							</div>
						{/if}
					</div>

					<!-- Resources -->
					{#if booking.assignedResources.length > 0}
						<div class="rounded-xl bg-stone-50 p-5">
							<h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900">
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
										d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
									/>
								</svg>
								Assigned Resources
							</h3>
							<div class="space-y-2">
								{#each booking.assignedResources as resource}
									<div class="flex items-center gap-3">
										<div
											class="h-2 w-2 rounded-full"
											style="background-color: {resource.resourceTypeColor}"
										></div>
										<span class="font-medium text-stone-900">{resource.resourceName}</span>
										<span class="text-sm text-stone-500">({resource.resourceTypeName})</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Actions Footer -->
				<Drawer.Footer
					class="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50 px-8 py-5"
				>
					<div class="flex gap-2">
						{#if showApprovalActions && booking.approvalStatus === 'pending'}
							<Button
								class="h-10 rounded-xl bg-emerald-600 px-5 font-medium text-white hover:bg-emerald-700"
								onclick={() => onApprove?.(booking.id)}
							>
								<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									/>
								</svg>
								Approve
							</Button>
							<Button
								variant="outline"
								class="h-10 rounded-xl px-5 text-red-600 hover:bg-red-50 hover:text-red-700"
								onclick={() => onReject?.(booking.id)}
							>
								Reject
							</Button>
						{/if}

						{#if booking.status === 'confirmed'}
							<Button
								variant="outline"
								class="h-10 rounded-xl px-5"
								onclick={() => onMarkCompleted?.(booking.id)}
							>
								<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									/>
								</svg>
								Mark Completed
							</Button>
							<Button
								variant="outline"
								class="h-10 rounded-xl px-5"
								onclick={() => onMarkNoShow?.(booking.id)}
							>
								No-Show
							</Button>
						{/if}
					</div>

					<div class="flex gap-2">
						{#if booking.status !== 'cancelled' && booking.status !== 'completed'}
							<Button
								variant="outline"
								class="h-10 rounded-xl px-5 text-red-600 hover:bg-red-50 hover:text-red-700"
								onclick={() => onCancel?.(booking.id)}
							>
								Cancel Booking
							</Button>
						{/if}
						<Button variant="outline" class="h-10 rounded-xl px-5" onclick={onClose}>Close</Button>
					</div>
				</Drawer.Footer>
			</Drawer.Content>
		</Drawer.Portal>
	</Drawer.Root>
{/if}
