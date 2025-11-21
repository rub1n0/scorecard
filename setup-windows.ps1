###############################################################################
# KPI Scorecard - Windows Setup Script
# This script sets up the application on a bare-bones Windows 11 machine
# Run in PowerShell as Administrator
###############################################################################

# Set strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "KPI Scorecard - Windows Setup Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "✗ This script must be run as Administrator" -ForegroundColor Red
    Write-Host "  Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

function Print-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Print-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Print-Info {
    param([string]$Message)
    Write-Host "➜ $Message" -ForegroundColor Yellow
}

# Step 1: Check for and install Chocolatey (Windows package manager)
Print-Info "Checking for Chocolatey package manager..."

if (Get-Command choco -ErrorAction SilentlyContinue) {
    Print-Info "Chocolatey is already installed"
} else {
    Print-Info "Installing Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    try {
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        Print-Success "Chocolatey installed"
    } catch {
        Print-Error "Failed to install Chocolatey"
        exit 1
    }
}

# Refresh environment variables
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Step 2: Install Git
Print-Info "Checking for Git..."

if (Get-Command git -ErrorAction SilentlyContinue) {
    Print-Info "Git is already installed: $(git --version)"
} else {
    Print-Info "Installing Git..."
    choco install git -y
    Print-Success "Git installed"
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# Step 3: Install Node.js
Print-Info "Checking for Node.js..."

if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Print-Info "Node.js is already installed: $nodeVersion"
    
    # Check if version is acceptable (v20+)
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($versionNumber -lt 20) {
        Print-Info "Node.js version is too old. Installing latest LTS..."
        choco upgrade nodejs-lts -y
        Print-Success "Node.js upgraded"
    }
} else {
    Print-Info "Installing Node.js LTS..."
    choco install nodejs-lts -y
    Print-Success "Node.js installed"
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# Verify Node.js and npm installation
Print-Info "Verifying installation..."
try {
    $nodeVer = node --version
    $npmVer = npm --version
    Print-Success "Node.js $nodeVer installed"
    Print-Success "npm $npmVer installed"
} catch {
    Print-Error "Failed to verify Node.js/npm installation"
    Print-Info "Please restart PowerShell and run this script again"
    exit 1
}

# Step 4: Navigate to project directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir
Print-Info "Working in directory: $ScriptDir"

# Step 5: Install project dependencies
Print-Info "Installing project dependencies..."
try {
    npm install
    Print-Success "Dependencies installed"
} catch {
    Print-Error "Failed to install dependencies"
    exit 1
}

# Step 6: Create data directory if it doesn't exist
Print-Info "Creating data directory..."
if (-not (Test-Path "data")) {
    New-Item -ItemType Directory -Path "data" | Out-Null
}
Print-Success "Data directory ready"

# Step 7: Build the application (optional, for production)
Write-Host ""
$buildChoice = Read-Host "Do you want to build for production? (y/N)"

if ($buildChoice -eq 'y' -or $buildChoice -eq 'Y') {
    Print-Info "Building production bundle..."
    try {
        npm run build
        Print-Success "Production build complete"
    } catch {
        Print-Error "Build failed"
        exit 1
    }
    
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "Setup Complete!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "To start the production server:" -ForegroundColor Cyan
    Write-Host "  npm start" -ForegroundColor White
    Write-Host ""
    Write-Host "The application will be available at:" -ForegroundColor Cyan
    Write-Host "  http://localhost:3000" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "Setup Complete!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "To start the development server:" -ForegroundColor Cyan
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "The application will be available at:" -ForegroundColor Cyan
    Write-Host "  http://localhost:3000" -ForegroundColor White
    Write-Host ""
}

# Step 8: Optional - Create Windows Service
Write-Host ""
$serviceChoice = Read-Host "Do you want to set up a Windows Service for auto-start? (y/N)"

if ($serviceChoice -eq 'y' -or $serviceChoice -eq 'Y') {
    Print-Info "Setting up Windows Service..."
    
    # Check if NSSM is installed
    if (-not (Get-Command nssm -ErrorAction SilentlyContinue)) {
        Print-Info "Installing NSSM (Non-Sucking Service Manager)..."
        choco install nssm -y
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
    
    # Get paths
    $npmPath = (Get-Command npm).Source
    $serviceName = "KPIScorecard"
    
    # Remove existing service if it exists
    $existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($existingService) {
        Print-Info "Removing existing service..."
        nssm stop $serviceName
        nssm remove $serviceName confirm
    }
    
    # Install service
    Print-Info "Creating service..."
    nssm install $serviceName $npmPath "start"
    nssm set $serviceName AppDirectory $ScriptDir
    nssm set $serviceName DisplayName "KPI Scorecard Application"
    nssm set $serviceName Description "Next.js KPI Scorecard Application"
    nssm set $serviceName Start SERVICE_AUTO_START
    
    Print-Success "Windows Service created: $serviceName"
    Write-Host ""
    Write-Host "Service commands:" -ForegroundColor Cyan
    Write-Host "  Start:   nssm start $serviceName" -ForegroundColor White
    Write-Host "  Stop:    nssm stop $serviceName" -ForegroundColor White
    Write-Host "  Restart: nssm restart $serviceName" -ForegroundColor White
    Write-Host "  Status:  nssm status $serviceName" -ForegroundColor White
    Write-Host "  Or use Services.msc GUI" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Print-Success "All done! 🚀"
Write-Host ""
Write-Host "Quick Start Commands:" -ForegroundColor Cyan
Write-Host "  Development: npm run dev" -ForegroundColor White
Write-Host "  Production:  npm run build && npm start" -ForegroundColor White
Write-Host ""
