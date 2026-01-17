const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
	.split(',')
	.map((origin) => origin.trim());

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
const ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'X-Request-ID'];
const MAX_AGE = 86400; // 24 hours

/**
 * Checks if the origin is allowed.
 */
export function isOriginAllowed(origin: string | null): boolean {
	if (!origin) return false;
	return ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*');
}

/**
 * Gets CORS headers for a request.
 */
export function getCorsHeaders(request: Request): Record<string, string> {
	const origin = request.headers.get('origin');

	if (!isOriginAllowed(origin)) {
		return {};
	}

	return {
		'Access-Control-Allow-Origin': origin!,
		'Access-Control-Allow-Methods': ALLOWED_METHODS.join(', '),
		'Access-Control-Allow-Headers': ALLOWED_HEADERS.join(', '),
		'Access-Control-Max-Age': MAX_AGE.toString(),
		'Access-Control-Allow-Credentials': 'true'
	};
}

/**
 * Handles preflight OPTIONS request.
 */
export function handlePreflight(request: Request): Response | null {
	if (request.method !== 'OPTIONS') {
		return null;
	}

	const origin = request.headers.get('origin');
	if (!isOriginAllowed(origin)) {
		return new Response(null, { status: 403 });
	}

	return new Response(null, {
		status: 204,
		headers: getCorsHeaders(request)
	});
}

/**
 * Applies CORS headers to a response.
 */
export function applyCorsHeaders(response: Response, request: Request): Response {
	const corsHeaders = getCorsHeaders(request);

	if (Object.keys(corsHeaders).length === 0) {
		return response;
	}

	const headers = new Headers(response.headers);

	for (const [key, value] of Object.entries(corsHeaders)) {
		headers.set(key, value);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}
