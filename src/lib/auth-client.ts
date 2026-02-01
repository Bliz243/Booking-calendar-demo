import { createAuthClient } from 'better-auth/svelte';

// No baseURL needed when auth server is on the same domain
export const authClient = createAuthClient();

// Re-export commonly used hooks and functions
export const { signIn, signOut, signUp, useSession, getSession, $Infer } = authClient;

// Type exports
export type Session = typeof $Infer.Session;
