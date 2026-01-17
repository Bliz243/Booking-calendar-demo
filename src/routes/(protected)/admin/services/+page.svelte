<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Select from '$lib/components/ui/select';
	import type { ServiceWithRequirements } from '$lib/types/service';

	let services = $state<ServiceWithRequirements[]>([]);
	let resourceTypes = $state<{ id: string; name: string; color: string }[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let createDialogOpen = $state(false);
	let editingService = $state<ServiceWithRequirements | null>(null);

	let newService = $state({
		name: '',
		description: '',
		color: '#3b82f6',
		priceCents: undefined as number | undefined,
		durationMinutes: 60,
		operatingDays: [1, 2, 3, 4, 5],
		operatingStartTime: '09:00',
		operatingEndTime: '17:00',
		minNoticeHours: 24,
		maxAdvanceDays: 30,
		bufferMinutes: 0,
		cancellationHours: 4,
		requiresApproval: false,
		capacity: 1,
		resourceRequirements: [] as { resourceTypeId: string; quantity: number; isOptional: boolean }[]
	});

	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	async function loadServices() {
		loading = true;
		error = null;

		try {
			const [servicesRes, typesRes] = await Promise.all([
				fetch('/api/admin/services'),
				fetch('/api/resource-types')
			]);

			if (!servicesRes.ok) throw new Error('Failed to load services');
			if (!typesRes.ok) throw new Error('Failed to load resource types');

			const servicesData = await servicesRes.json();
			const typesData = await typesRes.json();

			services = servicesData.services;
			resourceTypes = typesData.resourceTypes;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load data';
		} finally {
			loading = false;
		}
	}

	async function createService() {
		try {
			const response = await fetch('/api/admin/services', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...newService,
					priceCents: newService.priceCents ? Math.round(newService.priceCents * 100) : undefined
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to create service');
			}

			createDialogOpen = false;
			resetNewService();
			await loadServices();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create service';
		}
	}

	async function updateService() {
		if (!editingService) return;

		try {
			const response = await fetch(`/api/admin/services/${editingService.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: editingService.name,
					description: editingService.description,
					color: editingService.color,
					priceCents: editingService.priceCents,
					durationMinutes: editingService.durationMinutes,
					operatingDays: editingService.operatingDays,
					operatingStartTime: editingService.operatingStartTime,
					operatingEndTime: editingService.operatingEndTime,
					minNoticeHours: editingService.minNoticeHours,
					maxAdvanceDays: editingService.maxAdvanceDays,
					bufferMinutes: editingService.bufferMinutes,
					cancellationHours: editingService.cancellationHours,
					requiresApproval: editingService.requiresApproval,
					capacity: editingService.capacity,
					isActive: editingService.isActive
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to update service');
			}

			editingService = null;
			await loadServices();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update service';
		}
	}

	async function deleteService(serviceId: string) {
		if (!confirm('Delete this service? This cannot be undone.')) return;

		try {
			const response = await fetch(`/api/admin/services/${serviceId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to delete service');
			}

			await loadServices();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete service';
		}
	}

	async function toggleServiceActive(service: ServiceWithRequirements) {
		try {
			const response = await fetch(`/api/admin/services/${service.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: !service.isActive })
			});

			if (!response.ok) throw new Error('Failed to update service');
			await loadServices();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update service';
		}
	}

	function resetNewService() {
		newService = {
			name: '',
			description: '',
			color: '#3b82f6',
			priceCents: undefined,
			durationMinutes: 60,
			operatingDays: [1, 2, 3, 4, 5],
			operatingStartTime: '09:00',
			operatingEndTime: '17:00',
			minNoticeHours: 24,
			maxAdvanceDays: 30,
			bufferMinutes: 0,
			cancellationHours: 4,
			requiresApproval: false,
			capacity: 1,
			resourceRequirements: []
		};
	}

	function toggleDay(day: number, service: typeof newService | ServiceWithRequirements) {
		const days = [...service.operatingDays];
		const index = days.indexOf(day);
		if (index >= 0) {
			days.splice(index, 1);
		} else {
			days.push(day);
			days.sort((a, b) => a - b);
		}
		service.operatingDays = days;
	}

	function formatPrice(cents: number | null): string {
		if (!cents) return 'Free';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(cents / 100);
	}

	function copyBookingLink(serviceId: string) {
		const url = `${window.location.origin}/book/${serviceId}`;
		navigator.clipboard.writeText(url);
	}

	onMount(() => {
		loadServices();
	});
</script>

<svelte:head>
	<title>Services - Admin</title>
</svelte:head>

<div>
	<!-- Page Header -->
	<header class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Services</h1>
			<p class="mt-1 text-muted-foreground">Configure bookable services and scheduling rules</p>
		</div>
		<Button onclick={() => (createDialogOpen = true)}>
			<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Add Service
		</Button>
	</header>

	<!-- Error Alert -->
	{#if error}
		<div class="mb-4 rounded-lg border border-destructive bg-destructive/10 p-4">
			<p class="text-destructive">{error}</p>
			<button class="mt-2 text-sm underline" onclick={() => (error = null)}>Dismiss</button>
		</div>
	{/if}

	<!-- Loading State -->
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div
				class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
			></div>
		</div>

		<!-- Empty State -->
	{:else if services.length === 0}
		<div class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12">
			<p class="mb-4 text-muted-foreground">No services yet</p>
			<Button onclick={() => (createDialogOpen = true)}>Create your first service</Button>
		</div>

		<!-- Services Grid -->
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each services as service}
				<div class="overflow-hidden rounded-lg border bg-card">
					<!-- Color Strip -->
					<div class="h-1" style="background-color: {service.color}"></div>

					<div class="p-4">
						<!-- Header -->
						<div class="mb-3 flex items-start justify-between">
							<div class="flex items-center gap-2">
								<div class="h-3 w-3 rounded-full" style="background-color: {service.color}"></div>
								<h3 class="font-semibold">{service.name}</h3>
							</div>
							<button
								class="rounded-full px-2 py-1 text-xs {service.isActive
									? 'bg-green-100 text-green-700'
									: 'bg-gray-100 text-gray-500'}"
								onclick={() => toggleServiceActive(service)}
							>
								{service.isActive ? 'Active' : 'Inactive'}
							</button>
						</div>

						<!-- Details -->
						<div class="mb-3 space-y-1 text-sm text-muted-foreground">
							<p>{service.durationMinutes} min • {formatPrice(service.priceCents)}</p>
							<p>{service.operatingStartTime} – {service.operatingEndTime}</p>
							<p>{service.operatingDays.map((d) => dayNames[d]).join(', ')}</p>
						</div>

						<!-- Tags -->
						<div class="mb-3 flex flex-wrap gap-1">
							{#if service.requiresApproval}
								<span class="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
									Approval required
								</span>
							{/if}
							{#each service.requirements as req}
								<span
									class="rounded px-2 py-0.5 text-xs"
									style="background-color: {req.resourceTypeColor}20; color: {req.resourceTypeColor}"
								>
									{req.quantity}x {req.resourceTypeName}
								</span>
							{/each}
						</div>

						<!-- Actions -->
						<div class="flex items-center justify-between border-t pt-3">
							<div class="flex gap-1">
								<Button variant="ghost" size="sm" onclick={() => (editingService = { ...service })}>
									Edit
								</Button>
								<Button variant="ghost" size="sm" onclick={() => copyBookingLink(service.id)}>
									Copy Link
								</Button>
							</div>
							<Button
								variant="ghost"
								size="sm"
								class="text-destructive"
								onclick={() => deleteService(service.id)}
							>
								Delete
							</Button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Create Service Drawer -->
<Drawer.Root bind:open={createDialogOpen} direction="right">
	<Drawer.Portal>
		<Drawer.Overlay class="fixed inset-0 z-50 bg-black/50" />
		<Drawer.Content
			class="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-2xl flex-col border-l bg-background"
		>
			<Drawer.Header class="border-b px-6 py-4">
				<Drawer.Title class="text-xl font-semibold">Create New Service</Drawer.Title>
				<Drawer.Description class="text-sm text-muted-foreground">
					Configure a new bookable service with scheduling rules.
				</Drawer.Description>
			</Drawer.Header>

			<div class="flex-1 overflow-y-auto p-6">
				<div class="space-y-6">
					<!-- Basic Information -->
					<section>
						<h3 class="mb-4 font-semibold">Basic Information</h3>
						<div class="space-y-4">
							<div>
								<Label for="name">Service Name</Label>
								<Input
									id="name"
									placeholder="e.g., Oil Change, Haircut"
									class="mt-1"
									bind:value={newService.name}
								/>
							</div>
							<div>
								<Label for="description">Description</Label>
								<Input
									id="description"
									placeholder="Brief description..."
									class="mt-1"
									bind:value={newService.description}
								/>
							</div>
							<div class="grid grid-cols-2 gap-4">
								<div>
									<Label for="price">Price ($)</Label>
									<Input
										id="price"
										type="number"
										min="0"
										step="0.01"
										placeholder="0.00"
										class="mt-1"
										bind:value={newService.priceCents}
									/>
								</div>
								<div>
									<Label for="duration">Duration (min)</Label>
									<Input
										id="duration"
										type="number"
										min="5"
										step="5"
										class="mt-1"
										bind:value={newService.durationMinutes}
									/>
								</div>
							</div>
							<div>
								<Label for="color">Color</Label>
								<div class="mt-1 flex items-center gap-3">
									<div
										class="h-10 w-10 rounded border"
										style="background-color: {newService.color}"
									></div>
									<Input
										id="color"
										type="color"
										class="h-10 w-16 cursor-pointer p-1"
										bind:value={newService.color}
									/>
								</div>
							</div>
						</div>
					</section>

					<!-- Operating Hours -->
					<section>
						<h3 class="mb-4 font-semibold">Operating Hours</h3>
						<div class="space-y-4">
							<div>
								<Label>Available Days</Label>
								<div class="mt-2 flex flex-wrap gap-2">
									{#each dayNames as day, index}
										<button
											type="button"
											class="rounded-md px-3 py-1.5 text-sm {newService.operatingDays.includes(
												index
											)
												? 'bg-primary text-primary-foreground'
												: 'border bg-background hover:bg-muted'}"
											onclick={() => toggleDay(index, newService)}
										>
											{day}
										</button>
									{/each}
								</div>
							</div>
							<div class="grid grid-cols-2 gap-4">
								<div>
									<Label for="start-time">Start Time</Label>
									<Input
										id="start-time"
										type="time"
										class="mt-1"
										bind:value={newService.operatingStartTime}
									/>
								</div>
								<div>
									<Label for="end-time">End Time</Label>
									<Input
										id="end-time"
										type="time"
										class="mt-1"
										bind:value={newService.operatingEndTime}
									/>
								</div>
							</div>
						</div>
					</section>

					<!-- Booking Rules -->
					<section>
						<h3 class="mb-4 font-semibold">Booking Rules</h3>
						<div class="space-y-4">
							<div class="grid grid-cols-2 gap-4">
								<div>
									<Label for="buffer">Buffer Time (min)</Label>
									<Input
										id="buffer"
										type="number"
										min="0"
										step="5"
										class="mt-1"
										bind:value={newService.bufferMinutes}
									/>
								</div>
								<div>
									<Label for="capacity">Capacity</Label>
									<Input
										id="capacity"
										type="number"
										min="1"
										class="mt-1"
										bind:value={newService.capacity}
									/>
								</div>
							</div>
							<div class="grid grid-cols-2 gap-4">
								<div>
									<Label for="notice">Min Notice (hours)</Label>
									<Input
										id="notice"
										type="number"
										min="0"
										class="mt-1"
										bind:value={newService.minNoticeHours}
									/>
								</div>
								<div>
									<Label for="advance">Max Advance (days)</Label>
									<Input
										id="advance"
										type="number"
										min="1"
										class="mt-1"
										bind:value={newService.maxAdvanceDays}
									/>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<Checkbox
									id="approval"
									checked={newService.requiresApproval}
									onCheckedChange={(checked) => (newService.requiresApproval = !!checked)}
								/>
								<Label for="approval" class="font-normal">Require manual approval</Label>
							</div>
						</div>
					</section>

					<!-- Resource Requirements -->
					{#if resourceTypes.length > 0}
						<section>
							<h3 class="mb-4 font-semibold">Resource Requirements</h3>
							{#if newService.resourceRequirements.length > 0}
								<div class="mb-4 space-y-2">
									{#each newService.resourceRequirements as req, index}
										<div class="flex items-center gap-2 rounded border p-2">
											<Select.Root type="single">
												<Select.Trigger class="flex-1">
													{resourceTypes.find((rt) => rt.id === req.resourceTypeId)?.name ||
														'Select type'}
												</Select.Trigger>
												<Select.Content>
													{#each resourceTypes as type}
														<Select.Item value={type.id} label={type.name} />
													{/each}
												</Select.Content>
											</Select.Root>
											<Input type="number" min="1" class="w-16" bind:value={req.quantity} />
											<Button
												variant="ghost"
												size="sm"
												onclick={() => {
													newService.resourceRequirements = newService.resourceRequirements.filter(
														(_, i) => i !== index
													);
												}}
											>
												Remove
											</Button>
										</div>
									{/each}
								</div>
							{/if}
							<Button
								variant="outline"
								onclick={() => {
									newService.resourceRequirements = [
										...newService.resourceRequirements,
										{ resourceTypeId: resourceTypes[0]?.id || '', quantity: 1, isOptional: false }
									];
								}}
							>
								Add Resource Requirement
							</Button>
						</section>
					{/if}
				</div>
			</div>

			<Drawer.Footer class="border-t px-6 py-4">
				<div class="flex justify-end gap-2">
					<Button variant="outline" onclick={() => (createDialogOpen = false)}>Cancel</Button>
					<Button onclick={createService} disabled={!newService.name}>Create Service</Button>
				</div>
			</Drawer.Footer>
		</Drawer.Content>
	</Drawer.Portal>
</Drawer.Root>

<!-- Edit Service Drawer -->
{#if editingService}
	<Drawer.Root open={true} onOpenChange={() => (editingService = null)} direction="right">
		<Drawer.Portal>
			<Drawer.Overlay class="fixed inset-0 z-50 bg-black/50" />
			<Drawer.Content
				class="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-2xl flex-col border-l bg-background"
			>
				<Drawer.Header class="border-b px-6 py-4">
					<Drawer.Title class="text-xl font-semibold">Edit Service</Drawer.Title>
					<Drawer.Description class="text-sm text-muted-foreground">
						Update service configuration.
					</Drawer.Description>
				</Drawer.Header>

				<div class="flex-1 overflow-y-auto p-6">
					<div class="space-y-6">
						<!-- Basic Information -->
						<section>
							<h3 class="mb-4 font-semibold">Basic Information</h3>
							<div class="space-y-4">
								<div>
									<Label for="edit-name">Service Name</Label>
									<Input id="edit-name" class="mt-1" bind:value={editingService.name} />
								</div>
								<div>
									<Label for="edit-description">Description</Label>
									<Input
										id="edit-description"
										class="mt-1"
										bind:value={editingService.description}
									/>
								</div>
								<div class="grid grid-cols-2 gap-4">
									<div>
										<Label for="edit-price">Price (cents)</Label>
										<Input
											id="edit-price"
											type="number"
											min="0"
											class="mt-1"
											bind:value={editingService.priceCents}
										/>
									</div>
									<div>
										<Label for="edit-duration">Duration (min)</Label>
										<Input
											id="edit-duration"
											type="number"
											min="5"
											step="5"
											class="mt-1"
											bind:value={editingService.durationMinutes}
										/>
									</div>
								</div>
								<div>
									<Label for="edit-color">Color</Label>
									<div class="mt-1 flex items-center gap-3">
										<div
											class="h-10 w-10 rounded border"
											style="background-color: {editingService.color}"
										></div>
										<Input
											id="edit-color"
											type="color"
											class="h-10 w-16 cursor-pointer p-1"
											bind:value={editingService.color}
										/>
									</div>
								</div>
							</div>
						</section>

						<!-- Operating Hours -->
						<section>
							<h3 class="mb-4 font-semibold">Operating Hours</h3>
							<div class="space-y-4">
								<div>
									<Label>Available Days</Label>
									<div class="mt-2 flex flex-wrap gap-2">
										{#each dayNames as day, index}
											<button
												type="button"
												class="rounded-md px-3 py-1.5 text-sm {editingService.operatingDays.includes(
													index
												)
													? 'bg-primary text-primary-foreground'
													: 'border bg-background hover:bg-muted'}"
												onclick={() => editingService && toggleDay(index, editingService)}
											>
												{day}
											</button>
										{/each}
									</div>
								</div>
								<div class="grid grid-cols-2 gap-4">
									<div>
										<Label for="edit-start-time">Start Time</Label>
										<Input
											id="edit-start-time"
											type="time"
											class="mt-1"
											bind:value={editingService.operatingStartTime}
										/>
									</div>
									<div>
										<Label for="edit-end-time">End Time</Label>
										<Input
											id="edit-end-time"
											type="time"
											class="mt-1"
											bind:value={editingService.operatingEndTime}
										/>
									</div>
								</div>
							</div>
						</section>

						<!-- Booking Rules -->
						<section>
							<h3 class="mb-4 font-semibold">Booking Rules</h3>
							<div class="space-y-4">
								<div class="grid grid-cols-2 gap-4">
									<div>
										<Label for="edit-buffer">Buffer Time (min)</Label>
										<Input
											id="edit-buffer"
											type="number"
											min="0"
											step="5"
											class="mt-1"
											bind:value={editingService.bufferMinutes}
										/>
									</div>
									<div>
										<Label for="edit-capacity">Capacity</Label>
										<Input
											id="edit-capacity"
											type="number"
											min="1"
											class="mt-1"
											bind:value={editingService.capacity}
										/>
									</div>
								</div>
								<div class="grid grid-cols-2 gap-4">
									<div>
										<Label for="edit-notice">Min Notice (hours)</Label>
										<Input
											id="edit-notice"
											type="number"
											min="0"
											class="mt-1"
											bind:value={editingService.minNoticeHours}
										/>
									</div>
									<div>
										<Label for="edit-advance">Max Advance (days)</Label>
										<Input
											id="edit-advance"
											type="number"
											min="1"
											class="mt-1"
											bind:value={editingService.maxAdvanceDays}
										/>
									</div>
								</div>
								<div class="flex items-center gap-2">
									<Checkbox
										id="edit-approval"
										checked={editingService.requiresApproval}
										onCheckedChange={(checked) => {
											if (editingService) editingService.requiresApproval = !!checked;
										}}
									/>
									<Label for="edit-approval" class="font-normal">Require manual approval</Label>
								</div>
							</div>
						</section>
					</div>
				</div>

				<Drawer.Footer class="border-t px-6 py-4">
					<div class="flex justify-end gap-2">
						<Button variant="outline" onclick={() => (editingService = null)}>Cancel</Button>
						<Button onclick={updateService}>Save Changes</Button>
					</div>
				</Drawer.Footer>
			</Drawer.Content>
		</Drawer.Portal>
	</Drawer.Root>
{/if}
