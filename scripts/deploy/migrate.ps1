<#
  Applies the migrations the database does not have yet, each once and in order, recording them in public.klu_migration
  (the same table scripts/mac/migrate.sh uses). Stops at the first error and says which file.
  .\scripts\deploy\migrate.ps1 -DatabaseUrl "postgresql://klu_app:...@localhost:5432/klu_hostel" -Root C:\klu-hostel\releases\<sha>
#>
param(
  [Parameter(Mandatory = $true)] [string] $DatabaseUrl,
  [Parameter(Mandatory = $true)] [string] $Root,
  [string] $Psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
)
$ErrorActionPreference = "Stop"
& $Psql $DatabaseUrl -q -c "create table if not exists public.klu_migration (file text primary key, applied_at timestamptz not null default now())"
if ($LASTEXITCODE -ne 0) { throw "Cannot reach the database" }
$done = @(& $Psql $DatabaseUrl -Atc "select file from public.klu_migration")
$n = 0
foreach ($m in Get-ChildItem (Join-Path $Root "db\migrations") -Filter *.sql | Sort-Object Name) {
  if ($done -contains $m.Name) { continue }
  Write-Host "applying $($m.Name)"
  & $Psql $DatabaseUrl -q -v ON_ERROR_STOP=1 -f $m.FullName
  if ($LASTEXITCODE -ne 0) { throw "Migration failed: $($m.Name)" }
  & $Psql $DatabaseUrl -q -c "insert into public.klu_migration (file) values ('$($m.Name)')"
  $n++
}
Write-Host "$n migration(s) applied."
