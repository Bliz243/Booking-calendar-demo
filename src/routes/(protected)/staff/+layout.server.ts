import { redirect, error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ parent }) => {
	const { user } = await parent();

	// Staff routes require admin or staff role
	if (user.role !== 'admin' && user.role !== 'staff') {
		error(403, {
			code: 'FORBIDDEN',
			message: 'Access denied. Staff privileges required.'
		});
	}

	return {
		user
	};
};
