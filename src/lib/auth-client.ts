import { createAuthClient } from 'better-auth/svelte';

// Use current origin in browser, or env var for SSR
const getBaseURL = () => {
	if (typeof window !== 'undefined') {
		return window.location.origin;
	}
	return import.meta.env.VITE_BETTER_AUTH_URL || '';
};

export const authClient = createAuthClient({
	baseURL: getBaseURL()
});

// Re-export commonly used hooks and functions
export const { signIn, signOut, signUp, useSession, getSession, $Infer } = authClient;

// Type exports
export type Session = typeof $Infer.Session;
