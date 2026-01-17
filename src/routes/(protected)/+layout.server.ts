import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Check if user is authenticated
	if (!locals.user || !locals.session) {
		// Redirect to login with return URL
		const returnTo = url.pathname + url.search;
		redirect(302, `/login?returnTo=${encodeURIComponent(returnTo)}`);
	}

	return {
		user: locals.user
	};
};
