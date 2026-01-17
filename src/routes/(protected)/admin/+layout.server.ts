import { redirect, error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ parent }) => {
	const { user } = await parent();

	// Admin routes require admin role
	if (user.role !== 'admin') {
		error(403, {
			code: 'FORBIDDEN',
			message: 'Access denied. Admin privileges required.'
		});
	}

	return {
		user
	};
};
