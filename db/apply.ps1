<#
.SYNOPSIS
  Apply the KL Hostel ERP migrations to a PostgreSQL server.
.EXAMPLE
  .\db\apply.ps1 -ConnectionString "postgresql://postgres:secret@localhost:5432/postgres" -Database klu_hostel -Test
.PARAMETER ConnectionString  libpq URI to a maintenance database (postgres) on the target server
.PARAMETER Database          database to create (if missing) and migrate; default klu_hostel
.PARAMETER Test              also run db/tests/smoke_a_to_f.sql (runs in a transaction and rolls back)
.PARAMETER Dictionary        regenerate docs/data-dictionary.md from the migrated database
.PARAMETER PsqlPath          path to psql.exe; default: PostgreSQL 18 install
#>
param(
  [Parameter(Mandatory = $true)] [string] $ConnectionString,
  [string] $Database = "klu_hostel",
  [switch] $Test,
  [switch] $Dictionary,
  [string] $PsqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$migrations = Get-ChildItem (Join-Path $PSScriptRoot "migrations") -Filter *.sql | Sort-Object Name

$exists = & $PsqlPath $ConnectionString -Atc "select 1 from pg_database where datname = '$Database'"
if ($exists -ne "1") {
  Write-Host "Creating database $Database"
  & $PsqlPath $ConnectionString -Atc "create database $Database"
}
$dbUri = [regex]::Replace($ConnectionString, "/[^/?]*(\?|$)", "/$Database`$1")

foreach ($m in $migrations) {
  Write-Host ("applying {0}" -f $m.Name)
  & $PsqlPath $dbUri -v ON_ERROR_STOP=1 -q -f $m.FullName
  if ($LASTEXITCODE -ne 0) { throw "Migration failed: $($m.Name)" }
}
Write-Host "All migrations applied to $Database"

if ($Test) {
  Write-Host "Running smoke test (rolls back)"
  & $PsqlPath $dbUri -v ON_ERROR_STOP=1 -q -f (Join-Path $PSScriptRoot "tests\smoke_a_to_f.sql")
  if ($LASTEXITCODE -ne 0) { throw "Smoke test failed" }
}
if ($Dictionary) {
  Write-Host "docs/data-dictionary.md: regenerate with the query in db/tools/dictionary.sql (see README)"
}
