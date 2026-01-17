import type { Handle, HandleServerError } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { applySecurityHeaders } from '$lib/server/security/headers';
import {
	checkRateLimit,
	getClientIdentifier,
	getRateLimitHeaders,
	rateLimitConfigs
} from '$lib/server/security/rate-limiter';
import { handlePreflight, applyCorsHeaders } from '$lib/server/security/cors';
import { logger } from '$lib/server/logging';
import { errors } from '$lib/server/errors';

/**
 * Main request handler hook.
 * Order of operations:
 * 1. Generate request ID & start timing
 * 2. Rate limiting
 * 3. CORS (API routes only)
 * 4. Authentication (via Better Auth svelteKitHandler)
 * 5. Security headers
 * 6. Request logging
 */
export const handle: Handle = async ({ event, resolve }) => {
	// 1. Generate request ID and start timing
	const requestId = crypto.randomUUID();
	const startTime = performance.now();

	event.locals.requestId = requestId;
	event.locals.startTime = startTime;

	const { pathname } = event.url;
	const isApiRoute = pathname.startsWith('/api/');

	// 2. Rate limiting for API routes
	if (isApiRoute) {
		const clientId = getClientIdentifier(event.request);

		// Use stricter rate limits for auth endpoints
		const config = pathname.startsWith('/api/auth/')
			? rateLimitConfigs.auth
			: pathname.startsWith('/api/services/') && !pathname.includes('/admin/')
				? rateLimitConfigs.public
				: rateLimitConfigs.api;

		const rateLimitResult = checkRateLimit(clientId, config);

		if (!rateLimitResult.allowed) {
			logger.security('Rate limit exceeded', {
				clientId,
				path: pathname,
				requestId
			});

			const response = errors.rateLimited(requestId);
			const headers = new Headers(response.headers);

			for (const [key, value] of Object.entries(getRateLimitHeaders(rateLimitResult))) {
				headers.set(key, value);
			}

			return new Response(response.body, {
				status: response.status,
				headers
			});
		}
	}

	// 3. CORS preflight handling for API routes
	if (isApiRoute) {
		const preflightResponse = handlePreflight(event.request);
		if (preflightResponse) {
			return preflightResponse;
		}
	}

	// 4. Authentication - Get session for populating event.locals
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	if (session?.session) {
		event.locals.session = {
			id: session.session.id,
			expiresAt: session.session.expiresAt,
			userId: session.session.userId
		};
	} else {
		event.locals.session = null;
	}

	if (session?.user) {
		const userRole = session.user.role as 'admin' | 'staff' | 'customer' | null | undefined;
		event.locals.user = {
			id: session.user.id,
			email: session.user.email,
			name: session.user.name,
			role: userRole === 'admin' || userRole === 'staff' ? userRole : 'customer',
			timezone: session.user.timezone || 'UTC',
			emailVerified: session.user.emailVerified
		};
	} else {
		event.locals.user = null;
	}

	// 5. Use Better Auth's svelteKitHandler to handle auth routes
	return svelteKitHandler({
		event,
		resolve: async (event) => {
			// Process the request
			let response = await resolve(event);

			// 6. Apply security headers (with CSP for page routes)
			response = applySecurityHeaders(response, { isPage: !isApiRoute });

			// 7. Apply CORS headers for API routes
			if (isApiRoute) {
				response = applyCorsHeaders(response, event.request);
			}

			// 8. Log the request
			const durationMs = Math.round(performance.now() - startTime);

			logger.request({
				requestId,
				method: event.request.method,
				path: pathname,
				status: response.status,
				durationMs,
				userId: event.locals.user?.id,
				userAgent: event.request.headers.get('user-agent') || undefined,
				ip: getClientIdentifier(event.request)
			});

			return response;
		},
		auth,
		building
	});
};

/**
 * Error handler - ensures internal errors are not exposed.
 */
export const handleError: HandleServerError = async ({ error, event }) => {
	const requestId = event.locals.requestId || crypto.randomUUID();

	// Log the full error internally
	logger.error('Unhandled error', {
		requestId,
		error: error instanceof Error ? error.message : String(error),
		stack: error instanceof Error ? error.stack : undefined,
		path: event.url.pathname
	});

	// Return safe error to client
	return {
		code: 'INTERNAL_ERROR',
		message: 'An internal error occurred. Please try again later.',
		requestId
	};
};
