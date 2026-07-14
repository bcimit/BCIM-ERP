@echo off
REM ============================================================
REM  BCIM ESSL Attendance Sync Agent
REM  Runs every 5 minutes via Windows Task Scheduler.
REM
REM  Task Scheduler setup:
REM    Trigger  : Daily (any time) → Repeat every 5 minutes
REM               Duration: Indefinitely
REM    Action   : Start a program
REM    Program  : D:\OFFICE PROJECTS\CONSTRUCT-ERP\construct-erp\essl-agent\run-sync.bat
REM    Start in : D:\OFFICE PROJECTS\CONSTRUCT-ERP\construct-erp\essl-agent
REM ============================================================

cd /d "%~dp0"

REM ── Daily log file (resets each day, stays small) ──────────────────────────
set LOGFILE=logs\sync-%DATE:~-4%-%DATE:~3,2%-%DATE:~0,2%.log
if not exist logs mkdir logs

REM ── Lock file: skip if a previous run is still in progress ─────────────────
set LOCKFILE=sync.lock
if exist "%LOCKFILE%" (
  echo [%TIME%] Skipping — previous sync still running >> "%LOGFILE%"
  exit /b 0
)

echo %DATE% %TIME% > "%LOCKFILE%"

echo [%TIME%] Starting ESSL sync... >> "%LOGFILE%"

node sync.js --days 1 >> "%LOGFILE%" 2>&1

if %ERRORLEVEL% NEQ 0 (
  echo [%TIME%] ERROR: sync failed with code %ERRORLEVEL% >> "%LOGFILE%"
  del "%LOCKFILE%"
  exit /b %ERRORLEVEL%
)

echo [%TIME%] Sync complete. >> "%LOGFILE%"

del "%LOCKFILE%"
