@echo off
REM Chrome Remote Debugging Launcher for WSL Browser Automation
REM This script launches Chrome with remote debugging enabled on port 9222

echo ========================================
echo Chrome Remote Debugging Launcher
echo ========================================
echo.

REM Close any existing Chrome debug instances
echo Closing any existing Chrome debug instances...
taskkill /F /IM chrome.exe /FI "WINDOWTITLE eq Chrome Debug" 2>nul
timeout /t 2 /nobreak >nul

REM Launch Chrome with remote debugging on port 9222
echo Starting Chrome with remote debugging on port 9222...
echo.

"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="%TEMP%\chrome-debug-profile" ^
  --no-first-run ^
  --no-default-browser-check ^
  --window-name="Chrome Debug" ^
  about:blank

echo.
echo Chrome debug instance has been closed.
pause
