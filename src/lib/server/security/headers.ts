/**
 * Security headers for API responses.
 */
export function getSecurityHeaders(): Record<string, string> {
	return {
		// Prevent MIME type sniffing
		'X-Content-Type-Options': 'nosniff',

		// Prevent clickjacking
		'X-Frame-Options': 'DENY',

		// Enable XSS filter
		'X-XSS-Protection': '1; mode=block',

		// Referrer policy
		'Referrer-Policy': 'strict-origin-when-cross-origin',

		// Permissions policy
		'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
	};
}

/**
 * Content Security Policy for pages.
 */
export function getCSP(): string {
	const directives = [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline'", // Note: unsafe-inline needed for Svelte
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: https:",
		"font-src 'self'",
		"connect-src 'self'",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'"
	];

	return directives.join('; ');
}

/**
 * Applies security headers to a response.
 */
export function applySecurityHeaders(response: Response, options?: { isPage?: boolean }): Response {
	const headers = new Headers(response.headers);

	// Apply base security headers
	for (const [key, value] of Object.entries(getSecurityHeaders())) {
		headers.set(key, value);
	}

	// Apply CSP for page responses (not API routes)
	if (options?.isPage) {
		headers.set('Content-Security-Policy', getCSP());
	}

	// Apply HSTS in production
	if (process.env.NODE_ENV === 'production') {
		headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}
