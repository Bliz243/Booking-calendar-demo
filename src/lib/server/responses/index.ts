import { json } from '@sveltejs/kit';
import { errors, safeSerializeError } from '$lib/server/errors';

/**
 * Creates a standardized success response.
 */
export function successResponse<T>(data: T, status = 200) {
	return json(data, { status });
}

/**
 * Creates a standardized created response.
 */
export function createdResponse<T>(data: T) {
	return json(data, { status: 201 });
}

/**
 * Creates a no content response.
 */
export function noContentResponse() {
	return new Response(null, { status: 204 });
}

/**
 * Safely parses JSON body from request.
 * Returns null if body is empty or invalid.
 */
export async function parseJsonBody<T>(request: Request): Promise<T | null> {
	try {
		const text = await request.text();
		if (!text) return null;
		return JSON.parse(text) as T;
	} catch {
		return null;
	}
}

/**
 * Safely parses JSON body with validation.
 * Throws an error response if body is invalid or missing when required.
 */
export async function requireJsonBody<T>(request: Request, requestId?: string): Promise<T> {
	const body = await parseJsonBody<T>(request);

	if (body === null) {
		throw errors.badRequest('Invalid or missing request body', requestId);
	}

	return body;
}

/**
 * Handles errors in API endpoints consistently.
 * Use this in catch blocks to ensure safe error handling.
 */
export function handleApiError(err: unknown, requestId?: string): Response {
	// Log the error (in production, use proper logging)
	console.error(`[${requestId}] API Error:`, err);

	// Don't expose internal error details
	return errors.internal(requestId);
}

/**
 * Wraps an async handler to catch and handle errors consistently.
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<Response>>(
	handler: T,
	getRequestId: (...args: Parameters<T>) => string | undefined
): T {
	return (async (...args: Parameters<T>) => {
		try {
			return await handler(...args);
		} catch (err) {
			const requestId = getRequestId(...args);

			// Re-throw SvelteKit redirect/error responses
			if (err instanceof Response) {
				throw err;
			}

			return handleApiError(err, requestId);
		}
	}) as T;
}
