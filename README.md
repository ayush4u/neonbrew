
# NEONBREW — Cyberpunk Coffee (three.js)

NeonBrew is a creative Three.js demo: a cyberpunk, neon-lit cafe scene with interactive walk/orbit controls and mobile-friendly joystick support.

Features
- Immersive 3D cafe scene with shaders (wet street, sky, neon)
- Walk mode (WASD + pointer lock) and orbit exploration
- Mobile virtual joystick + look controls
- Animated neon billboards and holograms
- Post-processing (bloom, grain)

Quick start

Requirements: Node.js 18+ and npm

Install:

```bash
cd neonbrew
npm install
```

Run locally:

```bash
npm run dev
# open http://localhost:5173
```

Build production:

```bash
npm run build
```

Deploy to GitHub Pages (recommended)

1. Create a GitHub repository for this project.
2. In your local repo (this folder) run:

```bash
git init
git add .
git commit -m "chore: initial commit"
git branch -M main
git remote add origin <YOUR_GIT_REMOTE_URL>
git push -u origin main
```

3. The repository includes a GitHub Actions workflow that will build and deploy the `dist/` output to the `gh-pages` branch automatically on pushes to `main`.

Notes and tips
- If the site needs a custom `base` for GitHub Pages (e.g. if hosted at `https://<user>.github.io/<repo>/`), set `base` in `vite.config.js` or set the `VITE_BASE` env in the workflow.
- If you prefer to use `gh-pages` npm package or another host (Netlify/Vercel), adjust the workflow or deploy method accordingly.

Want me to push the initial commit and enable the workflow for you? If you give me the repository URL (or grant GH CLI access), I can push and create the first release.

Enjoy — walk around and tweak the shaders!
