$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

pm2 restart ecosystem.config.cjs --update-env
pm2 save
pm2 status
