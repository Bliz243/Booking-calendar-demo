import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// If logged in, redirect to calendar
	if (locals.user && locals.session) {
		redirect(302, '/calendar');
	}

	// Otherwise redirect to login
	redirect(302, '/login');
};
