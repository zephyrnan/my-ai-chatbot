@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

set PORTS=3000 3001 3002

echo Clearing dev ports: %PORTS%

for %%P in (%PORTS%) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do (
    if not "%%A"=="0" (
      echo Stopping PID %%A on port %%P
      taskkill /PID %%A /F >nul 2>nul
    )
  )
)

echo Starting this project on http://localhost:3000
pnpm.cmd exec next dev --webpack -p 3000

endlocal
