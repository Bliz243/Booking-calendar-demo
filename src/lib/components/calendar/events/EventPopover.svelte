<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Button } from '$lib/components/ui/button';
	import { Pencil, Trash2, MapPin, Clock } from '@lucide/svelte';
	import type { EventInstance } from '$lib/types/calendar';
	import { format, formatDateRange } from '$lib/utils/date';

	interface Props {
		event: EventInstance;
		onEdit?: () => void;
		onDelete?: () => void;
		children: import('svelte').Snippet;
	}

	let { event, onEdit, onDelete, children }: Props = $props();
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		{@render children()}
	</Tooltip.Trigger>
	<Tooltip.Content class="w-72 p-0" side="right" align="start">
		<div class="flex flex-col">
			<!-- Header with color -->
			<div class="rounded-t-md px-3 py-2" style="background-color: {event.color}">
				<h3 class="text-sm font-semibold text-white">
					{event.title}
				</h3>
			</div>

			<!-- Content -->
			<div class="space-y-2 p-3">
				<!-- Time -->
				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<Clock class="h-4 w-4" />
					{#if event.isAllDay}
						<span>{format(event.startTime, 'EEEE, MMMM d')}</span>
					{:else}
						<span>{formatDateRange(event.startTime, event.endTime)}</span>
					{/if}
				</div>

				<!-- Location -->
				{#if event.location}
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<MapPin class="h-4 w-4" />
						<span class="truncate">{event.location}</span>
					</div>
				{/if}

				<!-- Description preview -->
				{#if event.description}
					<p class="line-clamp-2 text-sm text-muted-foreground">
						{event.description}
					</p>
				{/if}
			</div>

			<!-- Actions -->
			{#if onEdit || onDelete}
				<div class="flex justify-end gap-2 border-t border-border px-3 py-2">
					{#if onEdit}
						<Button variant="ghost" size="sm" onclick={onEdit}>
							<Pencil class="mr-1 h-3 w-3" />
							Edit
						</Button>
					{/if}
					{#if onDelete}
						<Button variant="ghost" size="sm" onclick={onDelete}>
							<Trash2 class="mr-1 h-3 w-3" />
							Delete
						</Button>
					{/if}
				</div>
			{/if}
		</div>
	</Tooltip.Content>
</Tooltip.Root>
