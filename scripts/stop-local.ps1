$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectPath '.local/server.pid'
if (-not (Test-Path -LiteralPath $pidFile)) { Write-Host 'No launcher-owned server found.'; exit 0 }
$serverProcessId = [int](Get-Content -LiteralPath $pidFile)
$process = Get-CimInstance Win32_Process -Filter "ProcessId=$serverProcessId"
if (-not $process) { Write-Host 'Server is already stopped.'; exit 0 }
$expectedCli = Join-Path $projectPath 'node_modules/vinext/dist/cli.js'
if (-not $process.CommandLine.Contains($expectedCli)) { throw 'PID belongs to another process. Nothing was stopped.' }
function Stop-OwnedChildren([int]$parentProcessId) {
    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$parentProcessId"
    foreach ($child in $children) { Stop-OwnedChildren $child.ProcessId; try { [System.Diagnostics.Process]::GetProcessById([int]$child.ProcessId).Kill() } catch {} }
}
Stop-OwnedChildren $serverProcessId
try { [System.Diagnostics.Process]::GetProcessById($serverProcessId).Kill() } catch {}
Remove-Item -LiteralPath $pidFile
Write-Host 'AdSpace UZ stopped.'

