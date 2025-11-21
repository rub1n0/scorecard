# Quick Start Guide - Browser Automation Setup

## TL;DR - 3 Steps to Enable Browser Automation

### 1️⃣ Set Up Port Forwarding (Once per Windows restart)

**On Windows** - Run as Administrator:
```
\\wsl.localhost\Ubuntu\home\rub0t\scorecard\.browser-automation\setup-wsl-port-forward.ps1
```

Right-click → "Run with PowerShell" or "Run as Administrator"

---

### 2️⃣ Start Chrome Debug Instance (Every testing session)

**On Windows** - Double-click:
```
\\wsl.localhost\Ubuntu\home\rub0t\scorecard\.browser-automation\chrome-debug.bat
```

Leave the Chrome window open while testing.

---

### 3️⃣ Verify Connection (Optional but recommended)

**In WSL2 terminal**:
```bash
cd /home/rub0t/scorecard/.browser-automation
./test-chrome-connection.sh
```

Should show: ✓ SUCCESS

---

## That's It!

Browser automation should now work. The browser subagent can connect to Chrome and run automated tests.

---

## Files Location

From Windows File Explorer:
```
\\wsl$\Ubuntu\home\rub0t\scorecard\.browser-automation\
```

Or:
```
\\wsl.localhost\Ubuntu\home\rub0t\scorecard\.browser-automation\
```

---

## Troubleshooting

If connection fails, see the full [README.md](README.md) for detailed troubleshooting steps.
