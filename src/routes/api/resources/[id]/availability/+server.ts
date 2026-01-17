import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { queryOne, queryAll } from '$lib/server/db/client';
import { getResourceAvailabilityQuerySchema } from '$lib/schemas/resource';
import type { ResourceRow, ResourceAvailabilityRow, EventResourceRow } from '$lib/types/resource';
import { startOfDay, addDays, format, isBefore } from '$lib/utils/date';
import { requireStaff } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';

interface ConflictingEvent {
	eventId: string;
	title: string;
	startTime: string;
	endTime: string;
}

// GET /api/resources/[id]/availability - Check resource availability
export const GET: RequestHandler = async (event) => {
	const user = requireStaff(event);
	const { id } = event.params;

	const queryParams = {
		resourceId: id,
		start: event.url.searchParams.get('start'),
		end: event.url.searchParams.get('end')
	};

	const parsed = getResourceAvailabilityQuerySchema.safeParse(queryParams);

	if (!parsed.success) {
		return errors.validation('Invalid query params', event.locals.requestId, parsed.error.issues);
	}

	const { start, end } = parsed.data;

	// Verify resource exists and belongs to user
	const resource = queryOne<ResourceRow & { user_id: string }>(
		`SELECT r.*, rt.user_id
     FROM resources r
     INNER JOIN resource_types rt ON r.resource_type_id = rt.id
     WHERE r.id = ?`,
		[id]
	);

	if (!resource || resource.user_id !== user.id) {
		return errors.notFound('Resource', event.locals.requestId);
	}

	// Get resource's availability windows
	const availabilityWindows = queryAll<ResourceAvailabilityRow>(
		'SELECT * FROM resource_availability WHERE resource_id = ?',
		[id]
	);

	// Get events that have this resource assigned
	const eventResources = queryAll<EventResourceRow & { event_id: string }>(
		`SELECT er.*, e.title, e.start_time, e.end_time
     FROM event_resources er
     INNER JOIN events e ON er.event_id = e.id
     WHERE er.resource_id = ?
       AND er.status != 'declined'
       AND e.status != 'cancelled'
       AND e.start_time <= ?
       AND e.end_time >= ?`,
		[id, end.toISOString(), start.toISOString()]
	);

	// Build availability data
	const availableTimes: { date: string; windows: { start: string; end: string }[] }[] = [];
	const conflicts: ConflictingEvent[] = [];

	// Iterate through each day in range
	let currentDay = startOfDay(start);
	while (
		isBefore(currentDay, end) ||
		format(currentDay, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')
	) {
		const dayOfWeek = currentDay.getDay();
		const dateStr = format(currentDay, 'yyyy-MM-dd');

		// Get windows for this day of week
		const dayWindows = availabilityWindows
			.filter((w) => w.day_of_week === dayOfWeek)
			.map((w) => ({
				start: w.start_time,
				end: w.end_time
			}));

		if (dayWindows.length > 0) {
			availableTimes.push({
				date: dateStr,
				windows: dayWindows
			});
		}

		currentDay = addDays(currentDay, 1);
	}

	// Build conflicts list
	for (const er of eventResources) {
		const row = er as EventResourceRow & { title: string; start_time: string; end_time: string };
		conflicts.push({
			eventId: row.event_id,
			title: row.title,
			startTime: row.start_time,
			endTime: row.end_time
		});
	}

	return json({
		resource: {
			id: resource.id,
			name: resource.name
		},
		availableTimes,
		conflicts
	});
};
