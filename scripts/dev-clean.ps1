param(
  [int[]] $Ports = @(3000, 3001, 3002),
  [switch] $Turbo
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

Write-Host "Clearing dev ports: $($Ports -join ', ')"

$currentPid = $PID
$processIds = [System.Collections.Generic.HashSet[int]]::new()

foreach ($port in $Ports) {
  $connections = Get-NetTCPConnection `
    -LocalPort $port `
    -State Listen `
    -ErrorAction SilentlyContinue

  foreach ($connection in $connections) {
    $owningProcess = [int] $connection.OwningProcess

    if ($owningProcess -gt 0 -and $owningProcess -ne $currentPid) {
      [void] $processIds.Add($owningProcess)
    }
  }
}

foreach ($processId in $processIds) {
  try {
    $process = Get-Process -Id $processId -ErrorAction Stop
    Write-Host "Stopping PID $processId ($($process.ProcessName))"
    Stop-Process -Id $processId -Force -ErrorAction Stop
  } catch {
    Write-Warning "Could not stop PID ${processId}: $($_.Exception.Message)"
  }
}

if ($processIds.Count -eq 0) {
  Write-Host "No dev port conflicts found."
}

$nextArgs = @("exec", "next", "dev", "-p", "3000")

if ($Turbo) {
  $nextArgs += "--turbo"
} else {
  $nextArgs += "--webpack"
}

Write-Host "Starting Next.js on http://localhost:3000"
& pnpm.cmd @nextArgs
exit $LASTEXITCODE
