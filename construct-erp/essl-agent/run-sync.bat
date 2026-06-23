@echo off
REM ============================================================
REM  BCIM ESSL Attendance Sync Agent — Daily Run Script
REM  Place this file and the essl-agent folder on the HRADMIN
REM  machine and schedule it in Windows Task Scheduler.
REM ============================================================
REM  Task Scheduler setup:
REM    Trigger  : Daily at 23:00
REM    Action   : Start a program
REM    Program  : C:\essl-agent\run-sync.bat
REM    Start in : C:\essl-agent
REM ============================================================

cd /d "%~dp0"

echo [%DATE% %TIME%] Starting ESSL sync agent...

node sync.js --days 1

if %ERRORLEVEL% NEQ 0 (
  echo [%DATE% %TIME%] ERROR: sync failed with code %ERRORLEVEL%
  exit /b %ERRORLEVEL%
)

echo [%DATE% %TIME%] Sync complete.
