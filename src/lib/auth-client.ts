import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient({
	baseURL: import.meta.env.VITE_BETTER_AUTH_URL || 'http://localhost:5173'
});

// Re-export commonly used hooks and functions
export const { signIn, signOut, signUp, useSession, getSession, $Infer } = authClient;

// Type exports
export type Session = typeof $Infer.Session;
