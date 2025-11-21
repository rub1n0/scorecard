# setup-wsl-port-forward.ps1
# Run this script as Administrator on Windows to enable browser automation from WSL2
# This forwards Chrome's remote debugging port (9222) to be accessible from WSL2

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "WSL2 Browser Automation Port Forwarding" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "Configuring port forwarding for Chrome remote debugging..." -ForegroundColor Green
Write-Host ""

# Remove any existing port forwarding rules for port 9222
Write-Host "Removing existing port forwarding rules..." -ForegroundColor Yellow
netsh interface portproxy delete v4tov4 listenport=9222 listenaddress=0.0.0.0 2>$null

# Get WSL2 IP address
Write-Host "Getting WSL2 IP address..." -ForegroundColor Yellow
$wslIp = (wsl hostname -I).Trim()

if ([string]::IsNullOrWhiteSpace($wslIp)) {
    Write-Host "ERROR: Could not get WSL2 IP address. Is WSL2 running?" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "WSL2 IP Address: $wslIp" -ForegroundColor Cyan
Write-Host ""

# Forward port 9222 (Chrome CDP) from Windows to WSL2
Write-Host "Setting up port forwarding: Windows:9222 -> WSL2:$wslIp:9222" -ForegroundColor Yellow
netsh interface portproxy add v4tov4 listenport=9222 listenaddress=0.0.0.0 connectport=9222 connectaddress=$wslIp

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS: Port forwarding configured!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current port forwarding rules:" -ForegroundColor Cyan
    netsh interface portproxy show v4tov4
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Run chrome-debug.bat to start Chrome with remote debugging" -ForegroundColor White
    Write-Host "2. Browser automation from WSL2 should now work!" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "ERROR: Failed to configure port forwarding" -ForegroundColor Red
}

Write-Host ""
pause
