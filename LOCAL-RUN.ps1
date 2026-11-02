# Personal AI Task Store — start API + Expo for LAN phone testing
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Get-LanIPv4 {
  $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike "127.*" -and
      $_.PrefixOrigin -ne "WellKnown" -and
      $_.InterfaceAlias -notmatch "Loopback|vEthernet|WSL|Hyper-V"
    } |
    Sort-Object -Property InterfaceMetric |
    Select-Object -First 1 -ExpandProperty IPAddress
  if (-not $ip) {
    Write-Host "LAN IP: run 'ipconfig' and use your Wi-Fi/Ethernet IPv4 (e.g. 192.168.1.42)" -ForegroundColor Yellow
    return "192.168.1.XXX"
  }
  Write-Host "LAN IP for Expo Go on your phone: $ip" -ForegroundColor Cyan
  return $ip
}

$lanIp = Get-LanIPv4
$apiUrl = "http://${lanIp}:3001"
Write-Host "EXPO_PUBLIC_API_URL=$apiUrl" -ForegroundColor Green

$serverJob = Start-Job -ScriptBlock {
  Set-Location $using:PSScriptRoot
  npm run server
}

Start-Sleep -Seconds 2
$env:EXPO_PUBLIC_API_URL = $apiUrl
Write-Host "Starting Expo (scan QR in Expo Go)..." -ForegroundColor Green
try {
  npm run mobile
} finally {
  Stop-Job $serverJob -ErrorAction SilentlyContinue
  Remove-Job $serverJob -Force -ErrorAction SilentlyContinue
}
