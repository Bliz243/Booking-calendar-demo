import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { queryOne } from '$lib/server/db/client';
import type { AvailabilityTemplateRow } from '$lib/types/booking';

export const load: PageServerLoad = async ({ params }) => {
	const template = queryOne<AvailabilityTemplateRow>(
		'SELECT * FROM availability_templates WHERE id = ? AND is_active = 1',
		[params.templateId]
	);

	if (!template) {
		throw error(404, {
			code: 'NOT_FOUND',
			message: 'Booking page not found'
		});
	}

	return {
		templateId: template.id,
		templateName: template.name,
		timezone: template.timezone,
		slotDuration: template.slot_duration
	};
};
