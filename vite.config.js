import { defineConfig } from 'vite';

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
  },
});
