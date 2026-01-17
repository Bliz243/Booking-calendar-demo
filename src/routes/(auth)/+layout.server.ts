import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// If user is already logged in, redirect them away from auth pages
	if (locals.user && locals.session) {
		const returnTo = url.searchParams.get('returnTo') || '/calendar';
		redirect(302, returnTo);
	}

	return {};
};
