import type { PageServerLoad } from './$types';
import { queryAll } from '$lib/server/db/client';
import type { CalendarRow } from '$lib/types/calendar';
import { rowToCalendar } from '$lib/types/calendar';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	// User should be set by hooks.server.ts for protected routes
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	// Load calendars for the authenticated user
	const calendarRows = queryAll<CalendarRow>(
		'SELECT * FROM calendars WHERE user_id = ? ORDER BY sort_order, name',
		[locals.user.id]
	);

	return {
		calendars: calendarRows.map(rowToCalendar)
	};
};
