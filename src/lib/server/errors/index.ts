import { json } from '@sveltejs/kit';

export type ErrorCode =
	| 'VALIDATION_ERROR'
	| 'AUTHENTICATION_REQUIRED'
	| 'AUTHORIZATION_DENIED'
	| 'NOT_FOUND'
	| 'CONFLICT'
	| 'RATE_LIMITED'
	| 'INTERNAL_ERROR'
	| 'BAD_REQUEST';

export interface AppError {
	code: ErrorCode;
	message: string;
	details?: unknown;
	requestId?: string;
}

/**
 * Creates a standardized error response.
 * IMPORTANT: Never expose internal error details to clients.
 */
export function createErrorResponse(
	code: ErrorCode,
	message: string,
	status: number,
	requestId?: string,
	details?: unknown
) {
	const error: AppError = {
		code,
		message,
		requestId
	};

	// Only include details in development
	if (details && process.env.NODE_ENV === 'development') {
		error.details = details;
	}

	return json({ error }, { status });
}

/**
 * Safe error serialization - never exposes stack traces or internal details.
 */
export function safeSerializeError(err: unknown): string {
	if (err instanceof Error) {
		return err.message;
	}
	if (typeof err === 'string') {
		return err;
	}
	return 'An unexpected error occurred';
}

// Pre-built error responses
export const errors = {
	validation: (message: string, requestId?: string, details?: unknown) =>
		createErrorResponse('VALIDATION_ERROR', message, 400, requestId, details),

	unauthorized: (requestId?: string) =>
		createErrorResponse('AUTHENTICATION_REQUIRED', 'Authentication required', 401, requestId),

	forbidden: (message = 'Access denied', requestId?: string) =>
		createErrorResponse('AUTHORIZATION_DENIED', message, 403, requestId),

	notFound: (resource = 'Resource', requestId?: string) =>
		createErrorResponse('NOT_FOUND', `${resource} not found`, 404, requestId),

	conflict: (message: string, requestId?: string) =>
		createErrorResponse('CONFLICT', message, 409, requestId),

	rateLimited: (requestId?: string) =>
		createErrorResponse(
			'RATE_LIMITED',
			'Too many requests. Please try again later.',
			429,
			requestId
		),

	internal: (requestId?: string) =>
		createErrorResponse(
			'INTERNAL_ERROR',
			'An internal error occurred. Please try again later.',
			500,
			requestId
		),

	badRequest: (message: string, requestId?: string) =>
		createErrorResponse('BAD_REQUEST', message, 400, requestId)
};

/**
 * Type guard to check if an error is a known app error
 */
export function isAppError(err: unknown): err is AppError {
	return (
		typeof err === 'object' &&
		err !== null &&
		'code' in err &&
		'message' in err &&
		typeof (err as AppError).code === 'string' &&
		typeof (err as AppError).message === 'string'
	);
}
