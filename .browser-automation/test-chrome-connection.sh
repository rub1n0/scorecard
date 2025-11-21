#!/bin/bash
# test-chrome-connection.sh
# Test if Chrome remote debugging is accessible from WSL2

echo "========================================"
echo "Testing Chrome Remote Debugging Connection"
echo "========================================"
echo ""

echo "Testing connection to localhost:9222..."
echo ""

# Test if port 9222 is accessible
if curl -s http://localhost:9222/json/version > /dev/null 2>&1; then
    echo "✓ SUCCESS: Chrome remote debugging is accessible!"
    echo ""
    echo "Chrome version info:"
    curl -s http://localhost:9222/json/version | jq '.' 2>/dev/null || curl -s http://localhost:9222/json/version
    echo ""
    echo "Browser automation should now work!"
else
    echo "✗ FAILED: Cannot connect to Chrome on port 9222"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Make sure chrome-debug.bat is running on Windows"
    echo "2. Make sure setup-wsl-port-forward.ps1 has been run as Administrator"
    echo "3. Check if port 9222 is listening on Windows:"
    echo "   Run in PowerShell: netstat -an | findstr :9222"
    echo "4. Check port forwarding rules:"
    echo "   Run in PowerShell (as Admin): netsh interface portproxy show v4tov4"
    echo ""
fi
