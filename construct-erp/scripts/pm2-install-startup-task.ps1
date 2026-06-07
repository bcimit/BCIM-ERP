$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$TaskName = 'BCIM ConstructERP PM2'
$Pm2 = (Get-Command pm2).Source
$User = "$env:USERDOMAIN\$env:USERNAME"

$Action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"& '$Pm2' resurrect`""

$Trigger = New-ScheduledTaskTrigger -AtStartup
$Principal = New-ScheduledTaskPrincipal -UserId $User -LogonType Interactive -RunLevel Highest
$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)

try {
  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Principal $Principal `
    -Settings $Settings `
    -Force | Out-Null

  Write-Host "Installed startup task: $TaskName"
  Write-Host "Saved PM2 process list will be restored on Windows startup with: pm2 resurrect"
} catch {
  Write-Warning "Scheduled Task install failed: $($_.Exception.Message)"
  Write-Host "Installing user-login startup fallback instead..."

  $StartupDir = [Environment]::GetFolderPath('Startup')
  $BatPath = Join-Path $StartupDir 'BCIM-ConstructERP-PM2.bat'
  $Bat = @"
@echo off
cd /d "$Root"
pm2 resurrect
"@
  Set-Content -LiteralPath $BatPath -Value $Bat -Encoding ASCII
  Write-Host "Installed startup fallback: $BatPath"
  Write-Host "Saved PM2 process list will be restored when the BCIMIT user logs in."
}
