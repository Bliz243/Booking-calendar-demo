import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from './db/drizzle';
import * as schema from './db/drizzle/schema';

// Get auth secret - in production, BETTER_AUTH_SECRET must be set at runtime
// During build, we use a placeholder since the code won't actually run
const authSecret = process.env.BETTER_AUTH_SECRET;
const isBuildTime =
	process.env.npm_lifecycle_event === 'build' || process.env.VITE_SSR_BUILD === '1';
const finalSecret =
	authSecret ||
	(isBuildTime
		? 'build-time-placeholder-secret-at-least-32-chars'
		: 'development-secret-change-in-production-at-least-32-chars');

export const auth = betterAuth({
	secret: finalSecret,
	database: drizzleAdapter(db, {
		provider: 'sqlite',
		schema: {
			...schema,
			user: schema.users,
			session: schema.sessions,
			account: schema.accounts,
			verification: schema.verifications,
			// Include relations for Better Auth joins
			usersRelations: schema.usersRelations,
			sessionRelations: schema.sessionRelations,
			accountRelations: schema.accountRelations
		}
	}),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		maxPasswordLength: 128,
		requireEmailVerification: false
	},
	user: {
		modelName: 'users',
		additionalFields: {
			role: {
				type: 'string',
				defaultValue: 'admin',
				required: false
			},
			timezone: {
				type: 'string',
				defaultValue: 'UTC',
				required: false
			}
		}
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // Update session every day
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60 // 5 minutes
		}
	},
	trustedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
	experimental: {
		joins: true // 2-3x performance improvement for session fetching
	},
	plugins: [sveltekitCookies(getRequestEvent)] // must be last plugin
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
