import { error, type RequestEvent } from '@sveltejs/kit';
import type { Session, User } from './auth';

export type UserRole = 'admin' | 'staff' | 'customer';

export interface AuthenticatedUser {
	id: string;
	email: string;
	name: string;
	role: UserRole;
	timezone: string;
}

/**
 * Requires the user to be authenticated.
 * Throws a 401 error if not authenticated.
 */
export function requireAuth(event: RequestEvent): AuthenticatedUser {
	const user = event.locals.user;

	if (!user) {
		throw error(401, {
			code: 'UNAUTHORIZED',
			message: 'Authentication required'
		});
	}

	return {
		id: user.id,
		email: user.email,
		name: user.name,
		role: (user.role as UserRole) || 'customer',
		timezone: user.timezone || 'UTC'
	};
}

/**
 * Requires the user to have one of the specified roles.
 * Throws a 401 error if not authenticated, 403 if not authorized.
 */
export function requireRole(event: RequestEvent, ...allowedRoles: UserRole[]): AuthenticatedUser {
	const user = requireAuth(event);

	if (!allowedRoles.includes(user.role)) {
		throw error(403, {
			code: 'FORBIDDEN',
			message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
		});
	}

	return user;
}

/**
 * Requires admin role.
 */
export function requireAdmin(event: RequestEvent): AuthenticatedUser {
	return requireRole(event, 'admin');
}

/**
 * Requires admin or staff role.
 */
export function requireStaff(event: RequestEvent): AuthenticatedUser {
	return requireRole(event, 'admin', 'staff');
}

/**
 * Gets the authenticated user if present, returns null otherwise.
 * Does not throw an error.
 */
export function getAuthUser(event: RequestEvent): AuthenticatedUser | null {
	const user = event.locals.user;

	if (!user) {
		return null;
	}

	return {
		id: user.id,
		email: user.email,
		name: user.name,
		role: (user.role as UserRole) || 'customer',
		timezone: user.timezone || 'UTC'
	};
}

/**
 * Checks if the request is authenticated.
 */
export function isAuthenticated(event: RequestEvent): boolean {
	return !!event.locals.user;
}

/**
 * Checks if the user has the specified role(s).
 * Returns false if not authenticated.
 */
export function hasRole(event: RequestEvent, ...roles: UserRole[]): boolean {
	const user = getAuthUser(event);
	if (!user) return false;
	return roles.includes(user.role);
}

/**
 * Checks if the user is an admin.
 */
export function isAdmin(event: RequestEvent): boolean {
	return hasRole(event, 'admin');
}

/**
 * Checks if the user is admin or staff.
 */
export function isStaff(event: RequestEvent): boolean {
	return hasRole(event, 'admin', 'staff');
}

/**
 * Checks if the user owns the specified resource.
 * Useful for checking if a user can modify their own data.
 */
export function ownsResource(event: RequestEvent, ownerId: string): boolean {
	const user = getAuthUser(event);
	if (!user) return false;
	return user.id === ownerId || user.role === 'admin';
}

/**
 * Requires the user to own the resource or be an admin.
 * Throws 401 if not authenticated, 403 if not authorized.
 */
export function requireOwnership(event: RequestEvent, ownerId: string): AuthenticatedUser {
	const user = requireAuth(event);

	if (user.id !== ownerId && user.role !== 'admin') {
		throw error(403, {
			code: 'FORBIDDEN',
			message: 'Access denied. You do not own this resource.'
		});
	}

	return user;
}
