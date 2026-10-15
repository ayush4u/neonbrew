import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  // Ensure assets resolve correctly when hosted under /<repo>/ on GitHub Pages.
  base: isGithubActions && repository ? `/${repository}/` : '/',
  server: {
    host: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        lookPreview: resolve(__dirname, 'look-preview.html'),
      },
    },
  },
});
