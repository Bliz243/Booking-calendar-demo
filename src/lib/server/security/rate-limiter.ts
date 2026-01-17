import { LRUCache } from 'lru-cache';

interface RateLimitEntry {
	count: number;
	resetTime: number;
}

interface RateLimiterConfig {
	/** Maximum number of requests per window */
	max: number;
	/** Window size in milliseconds */
	windowMs: number;
	/** Optional key prefix for namespacing */
	keyPrefix?: string;
}

const DEFAULT_CONFIG: RateLimiterConfig = {
	max: parseInt(process.env.RATE_LIMIT_DEFAULT || '100', 10),
	windowMs: 60 * 1000 // 1 minute
};

/**
 * Whether to trust proxy headers (X-Forwarded-For, X-Real-IP).
 * Only enable this when running behind a trusted reverse proxy (nginx, cloudflare, etc).
 * When false, rate limiting falls back to a shared bucket which is less effective
 * but prevents IP spoofing attacks.
 */
const TRUST_PROXY = process.env.TRUST_PROXY === 'true';

// Global cache for rate limiting
const cache = new LRUCache<string, RateLimitEntry>({
	max: 10000,
	ttl: 60 * 60 * 1000 // 1 hour max
});

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetTime: number;
}

/**
 * Checks if a request is rate limited.
 */
export function checkRateLimit(
	key: string,
	config: Partial<RateLimiterConfig> = {}
): RateLimitResult {
	const { max, windowMs, keyPrefix } = { ...DEFAULT_CONFIG, ...config };
	const fullKey = keyPrefix ? `${keyPrefix}:${key}` : key;
	const now = Date.now();

	let entry = cache.get(fullKey);

	// If no entry or window has passed, create new entry
	if (!entry || entry.resetTime <= now) {
		entry = {
			count: 1,
			resetTime: now + windowMs
		};
		cache.set(fullKey, entry, { ttl: windowMs });

		return {
			allowed: true,
			remaining: max - 1,
			resetTime: entry.resetTime
		};
	}

	// Increment count
	entry.count++;
	cache.set(fullKey, entry);

	// Check if over limit
	if (entry.count > max) {
		return {
			allowed: false,
			remaining: 0,
			resetTime: entry.resetTime
		};
	}

	return {
		allowed: true,
		remaining: max - entry.count,
		resetTime: entry.resetTime
	};
}

/**
 * Gets the rate limit headers to include in responses.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
	return {
		'X-RateLimit-Remaining': result.remaining.toString(),
		'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString()
	};
}

/**
 * Extracts client identifier for rate limiting.
 *
 * SECURITY NOTE: Only trusts proxy headers when TRUST_PROXY=true.
 * Without proxy trust, falls back to 'anonymous' which creates a shared
 * rate limit bucket - less effective but prevents IP spoofing attacks.
 */
export function getClientIdentifier(request: Request): string {
	// Only trust proxy headers if explicitly configured
	if (TRUST_PROXY) {
		const forwardedFor = request.headers.get('x-forwarded-for');
		if (forwardedFor) {
			// Take only the first IP (client IP) from the chain
			return `ip:${forwardedFor.split(',')[0].trim()}`;
		}

		const realIp = request.headers.get('x-real-ip');
		if (realIp) {
			return `ip:${realIp}`;
		}
	}

	// Without trusted proxy, use a user-agent based identifier as a weak fallback
	// This is less effective but prevents IP spoofing attacks
	const userAgent = request.headers.get('user-agent');
	if (userAgent) {
		// Hash the user agent for a more consistent identifier
		return `ua:${hashString(userAgent)}`;
	}

	// Final fallback - shared bucket for anonymous requests
	return 'anonymous';
}

/**
 * Simple string hash for creating consistent identifiers.
 */
function hashString(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return Math.abs(hash).toString(36);
}

// Rate limit configurations for different endpoints
export const rateLimitConfigs = {
	// Auth endpoints - stricter limits
	auth: {
		max: 10,
		windowMs: 60 * 1000, // 1 minute
		keyPrefix: 'auth'
	},

	// API endpoints - standard limits
	api: {
		max: 100,
		windowMs: 60 * 1000, // 1 minute
		keyPrefix: 'api'
	},

	// Public endpoints - more generous
	public: {
		max: 200,
		windowMs: 60 * 1000, // 1 minute
		keyPrefix: 'public'
	}
};
