<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { AlertCircle, Building2, Users } from '@lucide/svelte';
	import type { ResourceWithType, ResourceConflict } from '$lib/types/resource';

	interface Props {
		resources: ResourceWithType[];
		selectedIds: string[];
		conflicts?: Map<string, ResourceConflict[]>;
		onToggle: (resourceId: string) => void;
	}

	let { resources, selectedIds, conflicts = new Map(), onToggle }: Props = $props();

	// Group resources by type
	const groupedResources = $derived.by(() => {
		const groups = new Map<
			string,
			{ name: string; color: string; resources: ResourceWithType[] }
		>();

		for (const resource of resources) {
			if (!groups.has(resource.resourceTypeId)) {
				groups.set(resource.resourceTypeId, {
					name: resource.typeName,
					color: resource.typeColor,
					resources: []
				});
			}
			groups.get(resource.resourceTypeId)!.resources.push(resource);
		}

		return groups;
	});

	function isSelected(resourceId: string): boolean {
		return selectedIds.includes(resourceId);
	}

	function hasConflict(resourceId: string): boolean {
		const resourceConflicts = conflicts.get(resourceId);
		return !!resourceConflicts && resourceConflicts.length > 0;
	}

	function getConflictMessage(resourceId: string): string {
		const resourceConflicts = conflicts.get(resourceId);
		if (!resourceConflicts || resourceConflicts.length === 0) return '';

		return resourceConflicts.map((c) => c.conflictingEventTitle).join(', ');
	}
</script>

<div class="space-y-4">
	{#each [...groupedResources] as [typeId, group]}
		<div>
			<div class="mb-2 flex items-center gap-2">
				<div class="h-3 w-3 rounded-full" style="background-color: {group.color}"></div>
				<span class="text-sm font-medium">{group.name}</span>
			</div>

			<div class="space-y-1">
				{#each group.resources as resource (resource.id)}
					{@const selected = isSelected(resource.id)}
					{@const conflict = hasConflict(resource.id)}

					<div
						class="flex items-center justify-between rounded-md border p-2 {selected
							? 'border-primary bg-primary/5'
							: 'border-border'}"
					>
						<label class="flex flex-1 cursor-pointer items-center gap-3">
							<Checkbox checked={selected} onCheckedChange={() => onToggle(resource.id)} />

							<div class="flex flex-col">
								<span class="text-sm font-medium">{resource.name}</span>
								{#if resource.location || resource.capacity}
									<span class="text-xs text-muted-foreground">
										{#if resource.location}
											<Building2 class="mr-1 inline h-3 w-3" />
											{resource.location}
										{/if}
										{#if resource.capacity}
											<Users class="mr-1 ml-2 inline h-3 w-3" />
											{resource.capacity}
										{/if}
									</span>
								{/if}
							</div>
						</label>

						{#if conflict}
							<Tooltip.Root>
								<Tooltip.Trigger>
									<Badge variant="destructive" class="gap-1">
										<AlertCircle class="h-3 w-3" />
										Conflict
									</Badge>
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p class="max-w-xs text-sm">
										Already booked for: {getConflictMessage(resource.id)}
									</p>
								</Tooltip.Content>
							</Tooltip.Root>
						{:else if !resource.isActive}
							<Badge variant="secondary">Inactive</Badge>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/each}

	{#if resources.length === 0}
		<p class="text-center text-sm text-muted-foreground">No resources available</p>
	{/if}
</div>
