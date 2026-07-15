@echo off
REM ============================================================
REM  BCIM ESSL Attendance Sync Agent — Continuous Loop Mode
REM  Syncs every 5 minutes automatically (no Task Scheduler needed).
REM
REM  USAGE:
REM    Double-click this file, OR run from command prompt:
REM      run-sync.bat
REM
REM  To run as a background service on startup, add this .bat
REM  to Task Scheduler with trigger: At startup, run once.
REM  (The script loops internally every 5 min — no repeat needed.)
REM ============================================================

cd /d "%~dp0"

if not exist logs mkdir logs
set LOGFILE=logs\sync-%DATE:~-4%-%DATE:~3,2%-%DATE:~0,2%.log

echo [%DATE% %TIME%] ESSL Agent starting in loop mode... >> "%LOGFILE%"
echo [%DATE% %TIME%] ESSL Agent starting in loop mode...

node sync.js --loop >> "%LOGFILE%" 2>&1

echo [%DATE% %TIME%] ESSL Agent stopped (exit code %ERRORLEVEL%). >> "%LOGFILE%"
pause
