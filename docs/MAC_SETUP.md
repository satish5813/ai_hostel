# Running KL Hostel ERP on a Mac

The project moves as one archive: the code, the database backup (with all demo data) and the scripts. Packages are
installed fresh on the Mac (the Windows `node_modules` are not copied: several tools ship machine-specific binaries).

## What the Mac needs

| Tool | Version | Install |
|---|---|---|
| Node.js | 22 (20 or newer works) | `brew install node@22` |
| pnpm | 10 | comes with Node: `corepack enable` (the setup script does it) |
| PostgreSQL | 18 recommended (16 or 17 work with the plain backup) | already installed; with Homebrew: `brew services start postgresql@18` |
| VS Code (optional) | latest | for the debugger set-up in `.vscode/` |

## Steps

1. Copy `klu-hostel-for-mac.tar.gz` to the Mac and unpack it:
   ```bash
   mkdir -p ~/Projects && tar -xzf ~/Downloads/klu-hostel-for-mac.tar.gz -C ~/Projects
   ```
2. Run the set-up from the project folder. It asks for the PostgreSQL user and password, creates `klu_hostel`,
   restores the backup, writes `apps/api/.env`, installs every package and builds the API:
   ```bash
   cd ~/Projects/hostel_automation && bash scripts/mac/setup.sh
   ```
   For an empty database built from the migrations instead of the backup: `bash scripts/mac/setup.sh --fresh`.
3. Start it:
   ```bash
   bash scripts/mac/start.sh
   ```
   The web app opens at http://localhost:5173. The sign-in page lists the demo accounts; click one to sign in.

## Which backup is used

- `db/klu_hostel.dump`: PostgreSQL 18 format, used when the Mac's server and `psql` are version 18.
- `db/klu_hostel.sql.gz`: plain SQL, used for PostgreSQL 16 or 17. A few PostgreSQL 18 settings lines may print
  errors on an older server; the set-up checks the table count afterwards.

Both hold the database as of 4 Oct 2026: 253 tables, migrations 000 to 105, 35 hostel students and the demo data.

## Debugging

| What | How |
|---|---|
| API breakpoints | `bash scripts/mac/start.sh --debug`, then VS Code > Run and Debug > **Attach to API** (or Chrome: `chrome://inspect`) |
| API from VS Code | **Launch API** (builds first) |
| API auto-rebuild | `bash scripts/mac/start.sh --watch` |
| React breakpoints | `pnpm web`, then **Debug web in Chrome** |
| Slow renders | React Scan is built into the dev server (the toolbar at the bottom right); `REACT_SCAN=0 pnpm web` turns it off |
| React components | install the React Developer Tools extension in Chrome or Safari |
| API calls | Swagger at http://localhost:4000/docs; the browser's Network tab |
| Database | `psql klu_hostel`, or the Admin > Database screen in the app |
| Logs | `logs/api.log`, `logs/web.log` |
| API tests | `pnpm --filter @klu/api test` |

## Day to day

| Task | Command |
|---|---|
| Start | `bash scripts/mac/start.sh` |
| Apply new migrations | `bash scripts/mac/migrate.sh` |
| Back up the database | `bash scripts/mac/backup.sh` (saved in `backups/`) |
| Rebuild the API | `pnpm --filter @klu/api build` |
| Recreate the demo data on an empty database | start the app, then `PYTHONHASHSEED=0 python3 scripts/demo-rich.py` and `psql klu_hostel -f db/seed/demo_logins.sql` |

`apps/api/.env` holds the database password and is never copied or committed; the set-up writes it on the Mac.
