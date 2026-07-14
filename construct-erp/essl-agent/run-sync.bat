@echo off
REM ============================================================
REM  BCIM ESSL Attendance Sync Agent
REM  Runs every 5 minutes via Windows Task Scheduler.
REM
REM  Task Scheduler setup:
REM    Trigger  : Daily (any time) -> Repeat every 5 minutes
REM               Duration: Indefinitely
REM    Action   : Start a program
REM    Program  : D:\OFFICE PROJECTS\CONSTRUCT-ERP\construct-erp\essl-agent\run-sync.bat
REM    Start in : D:\OFFICE PROJECTS\CONSTRUCT-ERP\construct-erp\essl-agent
REM ============================================================

cd /d "%~dp0"

REM ── Create logs folder if missing ──────────────────────────────────────────
if not exist logs mkdir logs

REM ── Daily log file ─────────────────────────────────────────────────────────
set LOGFILE=logs\sync-%DATE:~-4%-%DATE:~3,2%-%DATE:~0,2%.log

REM ── Check node_modules ─────────────────────────────────────────────────────
if not exist node_modules (
  echo [%TIME%] node_modules missing - running npm install... >> "%LOGFILE%"
  echo [%TIME%] node_modules missing - running npm install...
  npm install >> "%LOGFILE%" 2>&1
  if %ERRORLEVEL% NEQ 0 (
    echo [%TIME%] ERROR: npm install failed >> "%LOGFILE%"
    echo [%TIME%] ERROR: npm install failed
    exit /b 1
  )
  echo [%TIME%] npm install complete >> "%LOGFILE%"
)

REM ── Check config.json ──────────────────────────────────────────────────────
if not exist config.json (
  echo [%TIME%] ERROR: config.json not found. Copy config.example.json to config.json and fill in ESSL DB password and ERP api_key. >> "%LOGFILE%"
  echo.
  echo  ERROR: config.json not found!
  echo  Copy config.example.json to config.json and fill in:
  echo    - essl.password  (your SQL Server sa password)
  echo    - erp.api_key    (from ERP: HR Admin - ESSL Sync - Agent Setup)
  echo.
  exit /b 1
)

REM ── Lock file: skip if a previous run is still in progress ─────────────────
set LOCKFILE=sync.lock
if exist "%LOCKFILE%" (
  echo [%TIME%] Skipping - previous sync still running >> "%LOGFILE%"
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
