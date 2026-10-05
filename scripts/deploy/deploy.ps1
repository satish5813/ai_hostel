<#
  Deploys one checked version on the university server. Run by the GitHub runner on the server (deploy.yml), never by hand.
    1. backs up the database              C:\klu-hostel\backups\<time>-<sha>.dump
    2. builds the version in its own folder C:\klu-hostel\releases\<sha>
    3. applies new migrations              (stops here on error: the old version keeps running)
    4. points C:\klu-hostel\current at it and restarts the API service; IIS serves current\apps\web-vite\dist
    5. checks /api/healthz; if it fails, points current back at the previous version and restarts it
  Settings (database, sign-in, keys) live only on the server in C:\klu-hostel\config\api.env, never in git.
#>
param(
  [Parameter(Mandatory = $true)] [string] $Source,          # the checked-out repository (the runner's workspace)
  [Parameter(Mandatory = $true)] [string] $Version,         # git commit sha
  [string] $Home_ = "C:\klu-hostel",
  [string] $Service = "KLU-Hostel-API",
  [string] $PgBin = "C:\Program Files\PostgreSQL\18\bin",
  [int] $Port = 4100,
  [int] $KeepReleases = 5,
  [int] $KeepBackups = 30
)
$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$short = $Version.Substring(0, [Math]::Min(12, $Version.Length))
$config = Join-Path $Home_ "config\api.env"
$releases = Join-Path $Home_ "releases"; $backups = Join-Path $Home_ "backups"; $current = Join-Path $Home_ "current"
New-Item -ItemType Directory -Force -Path $releases, $backups | Out-Null
if (-not (Test-Path $config)) { throw "Missing $config (see scripts/deploy/SERVER-SETUP.md)" }
$cfg = @{}; Get-Content $config | Where-Object { $_ -match '^\s*([A-Z_]+)\s*=\s*(.*)$' } | ForEach-Object { $cfg[$Matches[1]] = $Matches[2] }
$db = $cfg["DATABASE_URL"]; if (-not $db) { throw "DATABASE_URL is not set in $config" }

Write-Host "== 1. backup"
$dump = Join-Path $backups "$stamp-$short.dump"
& (Join-Path $PgBin "pg_dump.exe") --format=custom --file=$dump $db
if ($LASTEXITCODE -ne 0) { throw "Backup failed; nothing was changed" }
Get-ChildItem $backups -Filter *.dump | Sort-Object LastWriteTime -Descending | Select-Object -Skip $KeepBackups | Remove-Item

Write-Host "== 2. build $short"
$rel = Join-Path $releases $short
if (Test-Path $rel) { Remove-Item -Recurse -Force $rel }
robocopy $Source $rel /MIR /XD .git node_modules logs /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Copy failed" }
Copy-Item $config (Join-Path $rel "apps\api\.env")
Add-Content (Join-Path $rel "apps\api\.env") "`nAPP_VERSION=$short`nNODE_ENV=production`nAPI_PORT=$Port"
Push-Location $rel
try {
  pnpm install --frozen-lockfile; if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }
  pnpm --filter @klu/api build; if ($LASTEXITCODE -ne 0) { throw "API build failed" }
  pnpm --filter @klu/web-vite build; if ($LASTEXITCODE -ne 0) { throw "Web build failed" }
} finally { Pop-Location }

Write-Host "== 3. migrations"
& (Join-Path $rel "scripts\deploy\migrate.ps1") -DatabaseUrl $db -Root $rel -Psql (Join-Path $PgBin "psql.exe")

Write-Host "== 4. switch"
$previous = if (Test-Path $current) { (Get-Item $current).Target } else { $null }
if (Test-Path $current) { cmd /c rmdir $current | Out-Null }
New-Item -ItemType Junction -Path $current -Target $rel | Out-Null
Restart-Service $Service

Write-Host "== 5. health"
$ok = $false
foreach ($i in 1..30) {
  Start-Sleep -Seconds 2
  try { $h = Invoke-RestMethod "http://localhost:$Port/api/healthz" -TimeoutSec 5; if ($h.ok -and $h.version -eq $short) { $ok = $true; break } } catch { }
}
if (-not $ok) {
  Write-Host "Health check failed: going back to the previous version"
  if ($previous) { cmd /c rmdir $current | Out-Null; New-Item -ItemType Junction -Path $current -Target $previous | Out-Null; Restart-Service $Service }
  throw "Deploy of $short failed and was rolled back (code only; database backup: $dump)"
}
Write-Host "Live: $short (migration $($h.migration)); backup $dump"
Get-ChildItem $releases -Directory | Sort-Object LastWriteTime -Descending | Select-Object -Skip $KeepReleases |
  Where-Object { $_.FullName -ne (Get-Item $current).Target } | Remove-Item -Recurse -Force
