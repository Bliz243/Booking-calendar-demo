<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Drawer from '$lib/components/ui/drawer';
	import type { ResourceType, ResourceWithType } from '$lib/types/resource';

	let resourceTypes = $state<ResourceType[]>([]);
	let resources = $state<ResourceWithType[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let selectedTypeId = $state<string | null>(null);
	let createTypeDialogOpen = $state(false);
	let createResourceDialogOpen = $state(false);

	let newResourceType = $state({ name: '', color: '#6366f1' });
	let newResource = $state({
		name: '',
		description: '',
		capacity: undefined as number | undefined,
		location: ''
	});

	const filteredResources = $derived(
		selectedTypeId ? resources.filter((r) => r.resourceTypeId === selectedTypeId) : resources
	);

	async function loadData() {
		loading = true;
		error = null;

		try {
			const [typesRes, resourcesRes] = await Promise.all([
				fetch('/api/resource-types'),
				fetch('/api/resources')
			]);

			if (!typesRes.ok) throw new Error('Failed to load resource types');
			if (!resourcesRes.ok) throw new Error('Failed to load resources');

			const typesData = await typesRes.json();
			const resourcesData = await resourcesRes.json();

			resourceTypes = typesData.resourceTypes;
			resources = resourcesData.resources;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load data';
		} finally {
			loading = false;
		}
	}

	async function createResourceType() {
		try {
			const response = await fetch('/api/resource-types', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newResourceType)
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to create resource type');
			}

			createTypeDialogOpen = false;
			newResourceType = { name: '', color: '#6366f1' };
			await loadData();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create resource type';
		}
	}

	async function deleteResourceType(id: string) {
		if (!confirm('Delete this resource type? All resources of this type will also be deleted.'))
			return;

		try {
			const response = await fetch(`/api/resource-types/${id}`, { method: 'DELETE' });

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to delete resource type');
			}

			if (selectedTypeId === id) selectedTypeId = null;
			await loadData();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete resource type';
		}
	}

	async function createResource() {
		if (!selectedTypeId) return;

		try {
			const response = await fetch('/api/resources', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					resourceTypeId: selectedTypeId,
					...newResource,
					capacity: newResource.capacity || undefined
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to create resource');
			}

			createResourceDialogOpen = false;
			newResource = { name: '', description: '', capacity: undefined, location: '' };
			await loadData();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create resource';
		}
	}

	async function toggleResourceActive(resource: ResourceWithType) {
		try {
			const response = await fetch(`/api/resources/${resource.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: !resource.isActive })
			});

			if (!response.ok) throw new Error('Failed to update resource');
			await loadData();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update resource';
		}
	}

	async function deleteResource(id: string) {
		if (!confirm('Delete this resource?')) return;

		try {
			const response = await fetch(`/api/resources/${id}`, { method: 'DELETE' });

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to delete resource');
			}

			await loadData();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete resource';
		}
	}

	onMount(() => {
		loadData();
	});
</script>

<svelte:head>
	<title>Resources - Admin</title>
</svelte:head>

<div>
	<header class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Resources</h1>
			<p class="mt-1 text-muted-foreground">Manage resource types and individual resources</p>
		</div>
		<Button onclick={() => (createTypeDialogOpen = true)}>
			<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Add Resource Type
		</Button>
	</header>

	{#if error}
		<div class="mb-4 rounded-lg border border-destructive bg-destructive/10 p-4">
			<p class="text-destructive">{error}</p>
			<button class="mt-2 text-sm underline" onclick={() => (error = null)}>Dismiss</button>
		</div>
	{/if}

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div
				class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
			></div>
		</div>
	{:else}
		<div class="grid gap-6 lg:grid-cols-[300px,1fr]">
			<!-- Resource Types List -->
			<div class="rounded-lg border bg-card">
				<div class="border-b p-4">
					<h2 class="font-semibold">Resource Types</h2>
				</div>
				<div class="p-2">
					{#if resourceTypes.length === 0}
						<p class="px-2 py-4 text-center text-sm text-muted-foreground">
							No resource types yet. Create one to get started.
						</p>
					{:else}
						<button
							class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted {selectedTypeId ===
							null
								? 'bg-muted'
								: ''}"
							onclick={() => (selectedTypeId = null)}
						>
							<span class="font-medium">All Resources</span>
							<span class="ml-auto text-muted-foreground">{resources.length}</span>
						</button>
						{#each resourceTypes as type}
							<div class="group flex items-center gap-2">
								<button
									class="flex flex-1 items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted {selectedTypeId ===
									type.id
										? 'bg-muted'
										: ''}"
									onclick={() => (selectedTypeId = type.id)}
								>
									<div class="h-3 w-3 rounded-full" style="background-color: {type.color}"></div>
									<span>{type.name}</span>
									<span class="ml-auto text-muted-foreground">
										{resources.filter((r) => r.resourceTypeId === type.id).length}
									</span>
								</button>
								<button
									class="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
									onclick={() => deleteResourceType(type.id)}
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
										/>
									</svg>
								</button>
							</div>
						{/each}
					{/if}
				</div>
			</div>

			<!-- Resources List -->
			<div class="rounded-lg border bg-card">
				<div class="flex items-center justify-between border-b p-4">
					<h2 class="font-semibold">
						{selectedTypeId
							? resourceTypes.find((t) => t.id === selectedTypeId)?.name || 'Resources'
							: 'All Resources'}
					</h2>
					{#if selectedTypeId}
						<Button size="sm" onclick={() => (createResourceDialogOpen = true)}>
							Add Resource
						</Button>
					{/if}
				</div>

				{#if filteredResources.length === 0}
					<div class="flex flex-col items-center justify-center py-12">
						<p class="text-muted-foreground">
							{selectedTypeId ? 'No resources in this category' : 'No resources yet'}
						</p>
						{#if selectedTypeId}
							<Button class="mt-4" onclick={() => (createResourceDialogOpen = true)}>
								Add a resource
							</Button>
						{/if}
					</div>
				{:else}
					<div class="divide-y">
						{#each filteredResources as resource}
							<div class="flex items-center gap-4 p-4">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-lg font-semibold text-white"
									style="background-color: {resource.typeColor}"
								>
									{resource.name.charAt(0).toUpperCase()}
								</div>
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<span class="font-medium">{resource.name}</span>
										{#if !resource.isActive}
											<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
												Inactive
											</span>
										{/if}
									</div>
									<div class="text-sm text-muted-foreground">
										{resource.typeName}
										{#if resource.location}
											<span class="mx-1">•</span> {resource.location}
										{/if}
										{#if resource.capacity}
											<span class="mx-1">•</span> Capacity: {resource.capacity}
										{/if}
									</div>
								</div>
								<div class="flex items-center gap-1">
									<Button variant="ghost" size="sm" onclick={() => toggleResourceActive(resource)}>
										{resource.isActive ? 'Deactivate' : 'Activate'}
									</Button>
									<Button
										variant="ghost"
										size="sm"
										class="text-destructive"
										onclick={() => deleteResource(resource.id)}
									>
										Delete
									</Button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Create Resource Type Drawer -->
<Drawer.Root bind:open={createTypeDialogOpen} direction="right">
	<Drawer.Portal>
		<Drawer.Overlay class="fixed inset-0 z-50 bg-black/50" />
		<Drawer.Content
			class="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l bg-background"
		>
			<Drawer.Header class="border-b px-6 py-4">
				<Drawer.Title class="text-xl font-semibold">Create Resource Type</Drawer.Title>
				<Drawer.Description class="text-sm text-muted-foreground">
					Resource types help organize your resources (e.g., Staff, Rooms, Equipment)
				</Drawer.Description>
			</Drawer.Header>

			<div class="flex-1 overflow-y-auto p-6">
				<div class="space-y-4">
					<div>
						<Label for="type-name">Name</Label>
						<Input
							id="type-name"
							placeholder="e.g., Staff, Rooms, Equipment"
							class="mt-1"
							bind:value={newResourceType.name}
						/>
					</div>
					<div>
						<Label for="type-color">Color</Label>
						<div class="mt-1 flex items-center gap-3">
							<div
								class="h-10 w-10 rounded border"
								style="background-color: {newResourceType.color}"
							></div>
							<Input
								id="type-color"
								type="color"
								class="h-10 w-16 cursor-pointer p-1"
								bind:value={newResourceType.color}
							/>
						</div>
					</div>
				</div>
			</div>

			<Drawer.Footer class="border-t px-6 py-4">
				<div class="flex justify-end gap-2">
					<Button variant="outline" onclick={() => (createTypeDialogOpen = false)}>Cancel</Button>
					<Button onclick={createResourceType} disabled={!newResourceType.name}>Create</Button>
				</div>
			</Drawer.Footer>
		</Drawer.Content>
	</Drawer.Portal>
</Drawer.Root>

<!-- Create Resource Drawer -->
<Drawer.Root bind:open={createResourceDialogOpen} direction="right">
	<Drawer.Portal>
		<Drawer.Overlay class="fixed inset-0 z-50 bg-black/50" />
		<Drawer.Content
			class="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l bg-background"
		>
			<Drawer.Header class="border-b px-6 py-4">
				<Drawer.Title class="text-xl font-semibold">Add Resource</Drawer.Title>
				<Drawer.Description class="text-sm text-muted-foreground">
					Add a new {resourceTypes.find((t) => t.id === selectedTypeId)?.name || 'resource'}
				</Drawer.Description>
			</Drawer.Header>

			<div class="flex-1 overflow-y-auto p-6">
				<div class="space-y-4">
					<div>
						<Label for="resource-name">Name</Label>
						<Input
							id="resource-name"
							placeholder="e.g., Room A, John Smith"
							class="mt-1"
							bind:value={newResource.name}
						/>
					</div>
					<div>
						<Label for="resource-description">Description</Label>
						<Input
							id="resource-description"
							placeholder="Optional description"
							class="mt-1"
							bind:value={newResource.description}
						/>
					</div>
					<div>
						<Label for="resource-location">Location</Label>
						<Input
							id="resource-location"
							placeholder="e.g., Building A, Floor 2"
							class="mt-1"
							bind:value={newResource.location}
						/>
					</div>
					<div>
						<Label for="resource-capacity">Capacity</Label>
						<Input
							id="resource-capacity"
							type="number"
							min="1"
							placeholder="Optional"
							class="mt-1"
							bind:value={newResource.capacity}
						/>
					</div>
				</div>
			</div>

			<Drawer.Footer class="border-t px-6 py-4">
				<div class="flex justify-end gap-2">
					<Button variant="outline" onclick={() => (createResourceDialogOpen = false)}
						>Cancel</Button
					>
					<Button onclick={createResource} disabled={!newResource.name}>Add Resource</Button>
				</div>
			</Drawer.Footer>
		</Drawer.Content>
	</Drawer.Portal>
</Drawer.Root>
