<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Sheet from '$lib/components/ui/sheet';
	import type { AvailabilityTemplate } from '$lib/types/booking';

	let templates = $state<AvailabilityTemplate[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let createSheetOpen = $state(false);

	let newTemplate = $state({
		name: '',
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		slotDuration: 30
	});

	async function loadTemplates() {
		loading = true;
		error = null;

		try {
			const response = await fetch('/api/availability/templates');
			if (!response.ok) throw new Error('Failed to load templates');
			const data = await response.json();
			templates = data.templates.map((t: any) => ({
				...t,
				createdAt: new Date(t.createdAt)
			}));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load templates';
		} finally {
			loading = false;
		}
	}

	async function createTemplate() {
		try {
			const response = await fetch('/api/availability/templates', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newTemplate)
			});

			if (!response.ok) throw new Error('Failed to create template');

			createSheetOpen = false;
			newTemplate = {
				name: '',
				timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				slotDuration: 30
			};
			await loadTemplates();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create template';
		}
	}

	async function toggleTemplateActive(template: AvailabilityTemplate) {
		try {
			const response = await fetch(`/api/availability/templates/${template.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: !template.isActive })
			});

			if (!response.ok) throw new Error('Failed to update template');
			await loadTemplates();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update template';
		}
	}

	async function deleteTemplate(templateId: string) {
		if (!confirm('Delete this template?')) return;

		try {
			const response = await fetch(`/api/availability/templates/${templateId}`, {
				method: 'DELETE'
			});

			if (!response.ok) throw new Error('Failed to delete template');
			await loadTemplates();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete template';
		}
	}

	function copyBookingLink(templateId: string) {
		const url = `${window.location.origin}/book/${templateId}`;
		navigator.clipboard.writeText(url);
	}

	onMount(() => {
		loadTemplates();
	});
</script>

<svelte:head>
	<title>Availability Settings</title>
</svelte:head>

<div class="container mx-auto max-w-4xl p-6">
	<header class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Availability</h1>
			<p class="mt-1 text-muted-foreground">Manage your booking availability templates</p>
		</div>
		<Button onclick={() => (createSheetOpen = true)}>Create Template</Button>
	</header>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div
				class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
			></div>
		</div>
	{:else if error}
		<div class="rounded-lg border border-destructive bg-destructive/10 p-4">
			<p class="text-destructive">{error}</p>
		</div>
	{:else if templates.length === 0}
		<Card>
			<CardContent class="py-12 text-center">
				<p class="mb-4 text-muted-foreground">No availability templates yet</p>
				<Button onclick={() => (createSheetOpen = true)}>Create your first template</Button>
			</CardContent>
		</Card>
	{:else}
		<div class="space-y-4">
			{#each templates as template}
				<Card>
					<CardHeader class="pb-3">
						<div class="flex items-start justify-between">
							<div>
								<CardTitle class="text-lg">{template.name}</CardTitle>
								<CardDescription>
									{template.slotDuration} min slots | {template.timezone}
								</CardDescription>
							</div>
							<div class="flex items-center gap-2">
								<Checkbox
									checked={template.isActive}
									onCheckedChange={() => toggleTemplateActive(template)}
								/>
								<span class="text-sm">{template.isActive ? 'Active' : 'Inactive'}</span>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div class="flex flex-wrap gap-2">
							<Button variant="outline" size="sm" href={`/availability/${template.id}`}>
								Edit Schedule
							</Button>
							<Button variant="outline" size="sm" onclick={() => copyBookingLink(template.id)}>
								Copy Link
							</Button>
							<Button variant="outline" size="sm" href={`/book/${template.id}`}>Preview</Button>
							<Button
								variant="ghost"
								size="sm"
								class="text-destructive"
								onclick={() => deleteTemplate(template.id)}
							>
								Delete
							</Button>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}
</div>

<Sheet.Root bind:open={createSheetOpen}>
	<Sheet.Content>
		<Sheet.Header>
			<Sheet.Title>Create Availability Template</Sheet.Title>
			<Sheet.Description>Set up a new booking schedule for your availability.</Sheet.Description>
		</Sheet.Header>

		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="name">Name</Label>
				<Input id="name" placeholder="e.g., 30 Min Meeting" bind:value={newTemplate.name} />
			</div>

			<div class="grid gap-2">
				<Label for="duration">Slot Duration (minutes)</Label>
				<Input id="duration" type="number" min="5" step="5" bind:value={newTemplate.slotDuration} />
			</div>
		</div>

		<div class="flex gap-2 pt-4">
			<Button variant="outline" onclick={() => (createSheetOpen = false)}>Cancel</Button>
			<Button onclick={createTemplate} disabled={!newTemplate.name}>Create</Button>
		</div>
	</Sheet.Content>
</Sheet.Root>
