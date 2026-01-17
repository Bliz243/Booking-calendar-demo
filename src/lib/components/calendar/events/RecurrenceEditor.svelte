<script lang="ts">
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { ToggleGroup, ToggleGroupItem } from '$lib/components/ui/toggle-group';

	type Frequency = 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly';
	type EndType = 'never' | 'on' | 'after';

	interface Props {
		rrule?: string;
		startDate: Date;
		onChange: (rrule: string | null) => void;
	}

	let { rrule, startDate, onChange }: Props = $props();

	// Parse existing rrule or use defaults
	let frequency = $state<Frequency>('never');
	let interval = $state(1);
	let weekdays = $state<number[]>([]);
	let monthlyType = $state<'day' | 'weekday'>('day');
	let endType = $state<EndType>('never');
	let endDate = $state('');
	let endCount = $state(10);

	const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
	const weekdayMap = [6, 0, 1, 2, 3, 4, 5]; // Convert Sun-Sat to rrule Mon-Sun

	// Initialize from existing rrule
	$effect(() => {
		if (rrule) {
			// Parse the rrule - simplified parsing
			if (rrule.includes('FREQ=DAILY')) frequency = 'daily';
			else if (rrule.includes('FREQ=WEEKLY')) frequency = 'weekly';
			else if (rrule.includes('FREQ=MONTHLY')) frequency = 'monthly';
			else if (rrule.includes('FREQ=YEARLY')) frequency = 'yearly';

			const intervalMatch = rrule.match(/INTERVAL=(\d+)/);
			if (intervalMatch) interval = parseInt(intervalMatch[1]);

			const bydayMatch = rrule.match(/BYDAY=([A-Z,]+)/);
			if (bydayMatch) {
				const dayMap: Record<string, number> = {
					SU: 0,
					MO: 1,
					TU: 2,
					WE: 3,
					TH: 4,
					FR: 5,
					SA: 6
				};
				weekdays = bydayMatch[1].split(',').map((d) => dayMap[d] ?? 0);
			}

			const untilMatch = rrule.match(/UNTIL=(\d{8})/);
			if (untilMatch) {
				endType = 'on';
				const dateStr = untilMatch[1];
				endDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
			}

			const countMatch = rrule.match(/COUNT=(\d+)/);
			if (countMatch) {
				endType = 'after';
				endCount = parseInt(countMatch[1]);
			}
		}
	});

	// Build rrule when options change
	function buildRRule(): string | null {
		if (frequency === 'never') return null;

		const parts: string[] = [];

		// Frequency
		const freqMap: Record<Frequency, string> = {
			never: '',
			daily: 'DAILY',
			weekly: 'WEEKLY',
			monthly: 'MONTHLY',
			yearly: 'YEARLY'
		};
		parts.push(`FREQ=${freqMap[frequency]}`);

		// Interval
		if (interval > 1) {
			parts.push(`INTERVAL=${interval}`);
		}

		// By weekday (for weekly)
		if (frequency === 'weekly' && weekdays.length > 0) {
			const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
			const days = weekdays.map((d) => dayNames[d]).join(',');
			parts.push(`BYDAY=${days}`);
		}

		// End conditions
		if (endType === 'on' && endDate) {
			const untilStr = endDate.replace(/-/g, '') + 'T235959Z';
			parts.push(`UNTIL=${untilStr}`);
		} else if (endType === 'after' && endCount > 0) {
			parts.push(`COUNT=${endCount}`);
		}

		return `RRULE:${parts.join(';')}`;
	}

	function handleChange() {
		onChange(buildRRule());
	}

	function toggleWeekday(day: number) {
		if (weekdays.includes(day)) {
			weekdays = weekdays.filter((d) => d !== day);
		} else {
			weekdays = [...weekdays, day];
		}
		handleChange();
	}

	function handleFrequencyChange(value: string | undefined) {
		if (value) {
			frequency = value as Frequency;
			// Set default weekday when switching to weekly
			if (frequency === 'weekly' && weekdays.length === 0) {
				weekdays = [startDate.getDay()];
			}
			handleChange();
		}
	}

	function handleEndTypeChange(value: string | undefined) {
		if (value) {
			endType = value as EndType;
			handleChange();
		}
	}
</script>

<div class="space-y-4">
	<!-- Frequency -->
	<div class="space-y-2">
		<Label>Repeat</Label>
		<Select.Root type="single" value={frequency} onValueChange={handleFrequencyChange}>
			<Select.Trigger class="w-full">
				<span class="capitalize">{frequency === 'never' ? 'Does not repeat' : frequency}</span>
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="never">Does not repeat</Select.Item>
				<Select.Item value="daily">Daily</Select.Item>
				<Select.Item value="weekly">Weekly</Select.Item>
				<Select.Item value="monthly">Monthly</Select.Item>
				<Select.Item value="yearly">Yearly</Select.Item>
			</Select.Content>
		</Select.Root>
	</div>

	{#if frequency !== 'never'}
		<!-- Interval -->
		<div class="flex items-center gap-2">
			<Label>Every</Label>
			<Input
				type="number"
				min="1"
				max="99"
				class="w-20"
				bind:value={interval}
				onchange={handleChange}
			/>
			<span class="text-sm text-muted-foreground">
				{frequency === 'daily' ? (interval === 1 ? 'day' : 'days') : ''}
				{frequency === 'weekly' ? (interval === 1 ? 'week' : 'weeks') : ''}
				{frequency === 'monthly' ? (interval === 1 ? 'month' : 'months') : ''}
				{frequency === 'yearly' ? (interval === 1 ? 'year' : 'years') : ''}
			</span>
		</div>

		<!-- Weekday selection for weekly -->
		{#if frequency === 'weekly'}
			<div class="space-y-2">
				<Label>On days</Label>
				<div class="flex gap-1">
					{#each dayLabels as label, index}
						<Button
							variant={weekdays.includes(index) ? 'default' : 'outline'}
							size="sm"
							class="h-8 w-8 p-0"
							onclick={() => toggleWeekday(index)}
						>
							{label}
						</Button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- End condition -->
		<div class="space-y-2">
			<Label>Ends</Label>
			<Select.Root type="single" value={endType} onValueChange={handleEndTypeChange}>
				<Select.Trigger class="w-full">
					<span class="capitalize"
						>{endType === 'never' ? 'Never' : endType === 'on' ? 'On date' : 'After'}</span
					>
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="never">Never</Select.Item>
					<Select.Item value="on">On date</Select.Item>
					<Select.Item value="after">After occurrences</Select.Item>
				</Select.Content>
			</Select.Root>

			{#if endType === 'on'}
				<Input type="date" bind:value={endDate} onchange={handleChange} />
			{:else if endType === 'after'}
				<div class="flex items-center gap-2">
					<Input
						type="number"
						min="1"
						max="999"
						class="w-20"
						bind:value={endCount}
						onchange={handleChange}
					/>
					<span class="text-sm text-muted-foreground">occurrences</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
