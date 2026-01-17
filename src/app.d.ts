// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Error {
			code: string;
			message: string;
			requestId?: string;
		}

		interface Locals {
			requestId: string;
			startTime: number;
			user: {
				id: string;
				email: string;
				name: string;
				role: 'admin' | 'staff' | 'customer';
				timezone: string;
				emailVerified: boolean;
			} | null;
			session: {
				id: string;
				expiresAt: Date;
				userId: string;
			} | null;
		}

		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
