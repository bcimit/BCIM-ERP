$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

pm2 stop ecosystem.config.cjs
pm2 save
pm2 status
