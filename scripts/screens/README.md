# Re-shooting the feature tour

1. Restore a database with demo data (e.g. `backups/klu_hostel-before-demo-delete-1504.dump` from the data repo) into `klu_hostel_shots`.
2. API on 4101 against it, allowing the 5181 origin:
   `API_PORT=4101 DATABASE_URL=postgres://localhost/klu_hostel_shots CORS_ORIGINS=http://localhost:5181 node --enable-source-maps dist/main.js` (in apps/api)
3. Web on 5181 without the dev profiler: `REACT_SCAN=0 VITE_API_URL=http://localhost:4101 pnpm exec vite --port 5181` (in apps/web-vite)
4. `cd scripts/screens && pnpm add playwright-core@1.49.1 && node capture.mjs` (uses the installed Google Chrome, 1440x900, full page) → `docs/screens/*.jpg`
5. `python3 build_tour.py` → `docs/feature-tour.html`; `--embed` → single-file `docs/feature-tour-single.html`.

`plan.json` lists logins and the screens each one captures (path, section, caption, optional `click` for a tab).
