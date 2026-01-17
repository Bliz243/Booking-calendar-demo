import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { resolve } from 'path';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'node',
		setupFiles: ['src/tests/setup.ts'],
		// Run tests sequentially for database consistency
		isolate: false,
		sequence: {
			concurrent: false
		},
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules/**', 'src/tests/**', '**/*.d.ts', '**/*.config.*', '.svelte-kit/**']
		},
		// Alias resolution for SvelteKit
		alias: {
			$lib: resolve(__dirname, './src/lib')
		}
	}
});
