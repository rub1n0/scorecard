# Browser Automation Setup

This directory contains scripts to enable automated browser testing from WSL2 with Chrome running on Windows 11.

## Quick Start

### 1. Set Up Port Forwarding (Once per Windows restart)

From Windows, run as Administrator:
```
\\wsl.localhost\Ubuntu\home\rub0t\scorecard\.browser-automation\setup-wsl-port-forward.ps1
```

### 2. Start Chrome Debug Instance (Every testing session)

From Windows, double-click:
```
\\wsl.localhost\Ubuntu\home\rub0t\scorecard\.browser-automation\chrome-debug.bat
```

### 3. Verify Connection

From WSL2:
```bash
cd /home/rub0t/scorecard/.browser-automation
./test-chrome-connection.sh
```

## Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - 3-step quick reference
- **[README.md](README.md)** - Complete setup guide with troubleshooting
- **[Walkthrough](file:///home/rub0t/.gemini/antigravity/brain/3bc8abe0-f3a8-42c8-a0a9-bfc3cfc36502/walkthrough.md)** - Detailed implementation walkthrough

## Files

- `chrome-debug.bat` - Launch Chrome with remote debugging
- `setup-wsl-port-forward.ps1` - Configure port forwarding (requires Admin)
- `test-chrome-connection.sh` - Test connection from WSL2

## Access from Windows

Navigate to:
```
\\wsl.localhost\Ubuntu\home\rub0t\scorecard\.browser-automation\
```

Or:
```
\\wsl$\Ubuntu\home\rub0t\scorecard\.browser-automation\
```
