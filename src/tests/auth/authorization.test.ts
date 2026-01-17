import { describe, it, expect, vi } from 'vitest';
import {
	requireAuth,
	requireRole,
	requireAdmin,
	requireStaff,
	getAuthUser,
	isAuthenticated,
	hasRole,
	isAdmin,
	isStaff,
	ownsResource,
	requireOwnership
} from '$lib/server/auth-guards';
import type { RequestEvent } from '@sveltejs/kit';

// Helper to create a mock RequestEvent with user
function createMockEvent(user: Record<string, unknown> | null): RequestEvent {
	return {
		locals: { user }
	} as unknown as RequestEvent;
}

describe('Auth Guards', () => {
	describe('requireAuth', () => {
		it('should return user when authenticated', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'test@example.com',
				name: 'Test User',
				role: 'customer',
				timezone: 'America/New_York'
			});

			const user = requireAuth(event);

			expect(user.id).toBe('user-1');
			expect(user.email).toBe('test@example.com');
			expect(user.role).toBe('customer');
		});

		it('should throw 401 when not authenticated', () => {
			const event = createMockEvent(null);

			expect(() => requireAuth(event)).toThrow();
		});

		it('should default role to customer if not set', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'test@example.com',
				name: 'Test User'
			});

			const user = requireAuth(event);
			expect(user.role).toBe('customer');
		});

		it('should default timezone to UTC if not set', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'test@example.com',
				name: 'Test User'
			});

			const user = requireAuth(event);
			expect(user.timezone).toBe('UTC');
		});
	});

	describe('requireRole', () => {
		it('should pass when user has required role', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'admin@example.com',
				name: 'Admin User',
				role: 'admin'
			});

			const user = requireRole(event, 'admin');
			expect(user.role).toBe('admin');
		});

		it('should pass when user has one of multiple allowed roles', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'staff@example.com',
				name: 'Staff User',
				role: 'staff'
			});

			const user = requireRole(event, 'admin', 'staff');
			expect(user.role).toBe('staff');
		});

		it('should throw 403 when user does not have required role', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'customer@example.com',
				name: 'Customer',
				role: 'customer'
			});

			expect(() => requireRole(event, 'admin')).toThrow();
		});

		it('should throw 401 when not authenticated', () => {
			const event = createMockEvent(null);

			expect(() => requireRole(event, 'admin')).toThrow();
		});
	});

	describe('requireAdmin', () => {
		it('should pass for admin users', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'admin@example.com',
				name: 'Admin',
				role: 'admin'
			});

			const user = requireAdmin(event);
			expect(user.role).toBe('admin');
		});

		it('should throw 403 for non-admin users', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'staff@example.com',
				name: 'Staff',
				role: 'staff'
			});

			expect(() => requireAdmin(event)).toThrow();
		});
	});

	describe('requireStaff', () => {
		it('should pass for admin users', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'admin@example.com',
				name: 'Admin',
				role: 'admin'
			});

			const user = requireStaff(event);
			expect(user.role).toBe('admin');
		});

		it('should pass for staff users', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'staff@example.com',
				name: 'Staff',
				role: 'staff'
			});

			const user = requireStaff(event);
			expect(user.role).toBe('staff');
		});

		it('should throw 403 for customer users', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'customer@example.com',
				name: 'Customer',
				role: 'customer'
			});

			expect(() => requireStaff(event)).toThrow();
		});
	});

	describe('getAuthUser', () => {
		it('should return user when authenticated', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'test@example.com',
				name: 'Test User',
				role: 'customer'
			});

			const user = getAuthUser(event);

			expect(user).not.toBeNull();
			expect(user?.id).toBe('user-1');
		});

		it('should return null when not authenticated', () => {
			const event = createMockEvent(null);

			const user = getAuthUser(event);
			expect(user).toBeNull();
		});
	});

	describe('isAuthenticated', () => {
		it('should return true when authenticated', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'test@example.com',
				name: 'Test User'
			});

			expect(isAuthenticated(event)).toBe(true);
		});

		it('should return false when not authenticated', () => {
			const event = createMockEvent(null);

			expect(isAuthenticated(event)).toBe(false);
		});
	});

	describe('hasRole', () => {
		it('should return true when user has role', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'admin@example.com',
				name: 'Admin',
				role: 'admin'
			});

			expect(hasRole(event, 'admin')).toBe(true);
		});

		it('should return true when user has one of multiple roles', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'staff@example.com',
				name: 'Staff',
				role: 'staff'
			});

			expect(hasRole(event, 'admin', 'staff')).toBe(true);
		});

		it('should return false when user does not have role', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'customer@example.com',
				name: 'Customer',
				role: 'customer'
			});

			expect(hasRole(event, 'admin')).toBe(false);
		});

		it('should return false when not authenticated', () => {
			const event = createMockEvent(null);

			expect(hasRole(event, 'admin')).toBe(false);
		});
	});

	describe('isAdmin', () => {
		it('should return true for admin', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'admin@example.com',
				name: 'Admin',
				role: 'admin'
			});

			expect(isAdmin(event)).toBe(true);
		});

		it('should return false for non-admin', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'staff@example.com',
				name: 'Staff',
				role: 'staff'
			});

			expect(isAdmin(event)).toBe(false);
		});
	});

	describe('isStaff', () => {
		it('should return true for admin', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'admin@example.com',
				name: 'Admin',
				role: 'admin'
			});

			expect(isStaff(event)).toBe(true);
		});

		it('should return true for staff', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'staff@example.com',
				name: 'Staff',
				role: 'staff'
			});

			expect(isStaff(event)).toBe(true);
		});

		it('should return false for customer', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'customer@example.com',
				name: 'Customer',
				role: 'customer'
			});

			expect(isStaff(event)).toBe(false);
		});
	});

	describe('ownsResource', () => {
		it('should return true when user owns resource', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'test@example.com',
				name: 'Test User',
				role: 'customer'
			});

			expect(ownsResource(event, 'user-1')).toBe(true);
		});

		it('should return true when user is admin', () => {
			const event = createMockEvent({
				id: 'admin-1',
				email: 'admin@example.com',
				name: 'Admin',
				role: 'admin'
			});

			expect(ownsResource(event, 'other-user')).toBe(true);
		});

		it('should return false when user does not own and is not admin', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'test@example.com',
				name: 'Test User',
				role: 'customer'
			});

			expect(ownsResource(event, 'other-user')).toBe(false);
		});

		it('should return false when not authenticated', () => {
			const event = createMockEvent(null);

			expect(ownsResource(event, 'user-1')).toBe(false);
		});
	});

	describe('requireOwnership', () => {
		it('should pass when user owns resource', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'test@example.com',
				name: 'Test User',
				role: 'customer'
			});

			const user = requireOwnership(event, 'user-1');
			expect(user.id).toBe('user-1');
		});

		it('should pass when user is admin', () => {
			const event = createMockEvent({
				id: 'admin-1',
				email: 'admin@example.com',
				name: 'Admin',
				role: 'admin'
			});

			const user = requireOwnership(event, 'other-user');
			expect(user.role).toBe('admin');
		});

		it('should throw 403 when user does not own and is not admin', () => {
			const event = createMockEvent({
				id: 'user-1',
				email: 'test@example.com',
				name: 'Test User',
				role: 'customer'
			});

			expect(() => requireOwnership(event, 'other-user')).toThrow();
		});

		it('should throw 401 when not authenticated', () => {
			const event = createMockEvent(null);

			expect(() => requireOwnership(event, 'user-1')).toThrow();
		});
	});
});
