# Browser Automation Setup for WSL + Windows 11

This directory contains scripts to enable automated browser testing from WSL2 using Chrome running on Windows 11.

## Problem

The browser subagent cannot connect to Chrome because:
- Development server runs in WSL2 (Ubuntu)
- Browser runs on Windows 11 host
- Chrome DevTools Protocol (CDP) port 9222 is not accessible from WSL2

## Solution

Launch Chrome on Windows with remote debugging enabled and configure port forwarding so WSL2 can access it.

---

## Setup Instructions

### Step 1: Copy Scripts to Windows

The scripts are located in this directory. You can access them from Windows at:
```
\\wsl.localhost\Ubuntu\home\rub0t\scorecard\.browser-automation\
```

Or from Windows File Explorer, navigate to:
```
\\wsl$\Ubuntu\home\rub0t\scorecard\.browser-automation\
```

**Recommended**: Copy both scripts to your Windows desktop or `C:\Users\antho\` for easy access.

---

### Step 2: Set Up Port Forwarding (One-time setup)

1. **Right-click** on `setup-wsl-port-forward.ps1`
2. Select **"Run with PowerShell"** or **"Run as Administrator"**
3. If prompted, allow the script to run
4. You should see: "SUCCESS: Port forwarding configured!"

> **Note**: This needs to be run **once** after each Windows restart, as port forwarding rules don't persist across reboots.

**Alternative**: Run manually in PowerShell (as Administrator):
```powershell
cd \\wsl.localhost\Ubuntu\home\rub0t\scorecard\.browser-automation\
.\setup-wsl-port-forward.ps1
```

---

### Step 3: Launch Chrome with Remote Debugging

**Every time you want to use browser automation:**

1. Double-click `chrome-debug.bat` on Windows
2. A Chrome window will open with "Chrome is being controlled by automated test software"
3. Leave this window open while running automated tests

**Alternative**: Run from Command Prompt:
```batch
cd \\wsl.localhost\Ubuntu\home\rub0t\scorecard\.browser-automation\
chrome-debug.bat
```

> **Note**: This is a separate Chrome instance with its own profile. It won't interfere with your normal Chrome browsing.

---

### Step 4: Verify Connection from WSL2

From your WSL2 terminal, run:

```bash
cd /home/rub0t/scorecard/.browser-automation
./test-chrome-connection.sh
```

You should see:
```
✓ SUCCESS: Chrome remote debugging is accessible!
```

---

## Usage

Once setup is complete:

1. **Start Chrome debug instance** (run `chrome-debug.bat` on Windows)
2. **Run your automated tests** from WSL2
3. The browser subagent will now be able to connect and control Chrome

---

## Troubleshooting

### "Cannot connect to Chrome on port 9222"

**Check 1**: Is Chrome debug instance running?
- Look for a Chrome window with "Chrome is being controlled by automated test software"
- If not, run `chrome-debug.bat`

**Check 2**: Is port forwarding configured?
- Run in PowerShell (as Admin):
  ```powershell
  netsh interface portproxy show v4tov4
  ```
- You should see a rule for port 9222
- If not, run `setup-wsl-port-forward.ps1` again

**Check 3**: Is Chrome listening on port 9222?
- Run in PowerShell:
  ```powershell
  netstat -an | findstr :9222
  ```
- You should see: `TCP    0.0.0.0:9222    0.0.0.0:0    LISTENING`

**Check 4**: Test from WSL2
```bash
curl http://localhost:9222/json/version
```
- Should return Chrome version info in JSON format

---

## Automation on Windows Startup (Optional)

To automatically set up port forwarding on Windows startup:

1. Press `Win + R`, type `shell:startup`, press Enter
2. Create a shortcut to `setup-wsl-port-forward.ps1`
3. Right-click the shortcut → Properties
4. In "Target", add `powershell.exe -ExecutionPolicy Bypass -File ` before the path
5. Click "Advanced" → Check "Run as administrator"

---

## Files in This Directory

- **`chrome-debug.bat`** - Windows batch script to launch Chrome with remote debugging
- **`setup-wsl-port-forward.ps1`** - PowerShell script to configure port forwarding (requires Admin)
- **`test-chrome-connection.sh`** - Bash script to test connection from WSL2
- **`README.md`** - This file

---

## How It Works

1. **Chrome** runs on Windows with `--remote-debugging-port=9222`
2. **Port forwarding** makes Windows port 9222 accessible from WSL2
3. **Browser subagent** in WSL2 connects to `localhost:9222` (which forwards to Windows Chrome)
4. **Automation** works seamlessly across the WSL/Windows boundary

---

## Security Note

- Port 9222 is only accessible locally (not from the network)
- The Chrome debug instance uses a separate profile
- You can close Chrome debug instance when not testing

---

## Need Help?

If you encounter issues:
1. Run `./test-chrome-connection.sh` to diagnose
2. Check the troubleshooting section above
3. Verify both scripts have been run correctly
