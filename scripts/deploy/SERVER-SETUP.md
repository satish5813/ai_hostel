# University server: one-time setup (Windows Server)

The server never accepts incoming connections for deployment. A GitHub runner on it **pulls** each approved version,
runs `scripts/deploy/deploy.ps1`, and reports back. Only the private GitHub repository can change what runs here.

## 1. Software (as Administrator)

| What | Version | Notes |
|---|---|---|
| PostgreSQL | 18 | service `postgresql-x64-18`; database `klu_hostel`; an app role `klu_app` (not `postgres`) |
| Node.js | 22 LTS | `corepack enable` then `corepack prepare pnpm@10.20.0 --activate` |
| Git for Windows | latest | |
| NSSM | 2.24 | runs the API as a Windows service |
| IIS | with **URL Rewrite** and **Application Request Routing** (enable proxy in ARR settings) | serves the web app, passes `/api` to the API |

## 2. Folders

```
C:\klu-hostel\config\api.env     settings (only Administrators and the service account may read it)
C:\klu-hostel\releases\          one folder per version, made by the deploy
C:\klu-hostel\current            junction to the live version, made by the deploy
C:\klu-hostel\backups\           database backup before every deploy (last 30 kept)
C:\klu-hostel\logs\              API output
```

`api.env` (fill in; never committed):

```
DATABASE_URL=postgresql://klu_app:<password>@localhost:5432/klu_hostel
OIDC_ISSUER=https://<university keycloak>/realms/<realm>
OIDC_AUDIENCE=klu-hostel
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
DEMO_LOGIN=0
```

The API refuses to start with `NODE_ENV=production` and no `OIDC_ISSUER`, because without university sign-in a caller
could name itself. For a closed test server only, `ALLOW_HEADER_AUTH=1` (and `DEMO_LOGIN=1`) may be added.

## 3. API service

```powershell
nssm install KLU-Hostel-API "C:\Program Files\nodejs\node.exe" "dist\main.js"
nssm set KLU-Hostel-API AppDirectory C:\klu-hostel\current\apps\api
nssm set KLU-Hostel-API AppStdout C:\klu-hostel\logs\api.out.log
nssm set KLU-Hostel-API AppStderr C:\klu-hostel\logs\api.err.log
nssm set KLU-Hostel-API AppRotateFiles 1
nssm set KLU-Hostel-API AppRotateBytes 10485760
nssm set KLU-Hostel-API Start SERVICE_AUTO_START
```

## 4. IIS site

Site `KLU Hostel`, physical path `C:\klu-hostel\current\apps\web-vite\dist`, HTTPS binding with the university
certificate. `web.config` (in the build) sends `/api` and `/docs` to `http://localhost:4100` and everything else to the app.

## 5. GitHub runner (pulls the jobs)

In GitHub: repository → Settings → Actions → Runners → New self-hosted runner → Windows. On the server:

```powershell
mkdir C:\actions-runner; cd C:\actions-runner
# download and unzip the runner as GitHub shows, then:
.\config.cmd --url https://github.com/<owner>/<repo> --token <token> --labels klu-hostel --runasservice
```

The runner's service account needs: write to `C:\klu-hostel`, read `api.env`, and the right to restart `KLU-Hostel-API`
(`sc sdset` or run the runner as a dedicated local admin account). It needs outgoing HTTPS to github.com only.

## 6. First deploy

1. Restore or create the database and run `scripts\deploy\migrate.ps1` once (or let the first deploy do it).
2. In GitHub → Actions → **Deploy** → Run workflow. Approve it when asked.
3. Open the site; `https://<server>/api/healthz` shows the live version and migration.
