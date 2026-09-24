param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectPath
$baseUrl = 'http://localhost:3100'
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -TimeoutSec 3
    if ($health.app -eq 'adspace-uz') { Write-Host "AdSpace UZ already running: $baseUrl"; if (-not $NoBrowser) { Start-Process $baseUrl }; exit 0 }
    throw 'Port 3100 is occupied by another application.'
} catch {
    if ($_.Exception.Message -like '*occupied*') { throw }
}
$nodePath = (Get-Command node -ErrorAction Stop).Source
if (-not (Test-Path -LiteralPath 'node_modules/vinext/dist/cli.js')) { & npm.cmd ci; if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' } }
$cliPath = Join-Path $projectPath 'node_modules/vinext/dist/cli.js'
& $nodePath $cliPath build
if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
New-Item -ItemType Directory -Force -Path '.local' | Out-Null
$env:WRANGLER_WRITE_LOGS = 'false'
$env:WRANGLER_LOG_PATH = '.wrangler/logs'
# Only the local demonstration database is initialized here. Production uses immutable migrations.
$sql = (Get-Content -Raw -LiteralPath 'drizzle/0000_zippy_grandmaster.sql').Replace('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ')
[IO.File]::WriteAllText((Join-Path $projectPath '.local/init.sql'), $sql)
& $nodePath 'node_modules/wrangler/bin/wrangler.js' d1 execute DB --config dist/server/wrangler.json --local --file .local/init.sql --persist-to .wrangler/state
if ($LASTEXITCODE -ne 0) { throw 'Local database initialization failed.' }
$process = Start-Process -FilePath $nodePath -ArgumentList @('"' + $cliPath + '"', 'dev', '--port', '3100') -WorkingDirectory $projectPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectPath '.local/server.log') -RedirectStandardError (Join-Path $projectPath '.local/server-error.log') -PassThru
$process.Id | Set-Content -LiteralPath '.local/server.pid'
for ($attempt = 0; $attempt -lt 45; $attempt++) {
    Start-Sleep -Seconds 2
    try { $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -TimeoutSec 2; if ($health.app -eq 'adspace-uz') { Write-Host "AdSpace UZ: $baseUrl"; if (-not $NoBrowser) { Start-Process $baseUrl }; exit 0 } } catch {}
    if ($process.HasExited) { throw 'Server stopped. See .local/server-error.log.' }
}
throw 'Server did not become ready. See .local/server-error.log.'
