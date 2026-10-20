$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
Write-Host 'Открываю клуб. Чтобы закончить, закройте это окно.'
& node (Join-Path $PSScriptRoot 'tools/serve.mjs') --open
