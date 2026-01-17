import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	// Clear the session cookie
	cookies.delete('better-auth.session_token', { path: '/' });

	// Redirect to login
	throw redirect(302, '/login');
};
