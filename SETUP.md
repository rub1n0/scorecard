# KPI Scorecard - Setup Guide

This guide provides instructions for setting up the KPI Scorecard application on Ubuntu Server and Windows 11 systems from scratch, including all prerequisites.

---

## 📋 Table of Contents

- [Ubuntu Server Setup](#ubuntu-server-setup)
- [Windows 11 Setup](#windows-11-setup)
- [Manual Setup](#manual-setup)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## 🐧 Ubuntu Server Setup

### Automated Setup (Recommended)

The automated setup script will install all dependencies and configure the application.

```bash
# 1. Download or clone the project
git clone <your-repo-url> kpi-scorecard
cd kpi-scorecard

# 2. Run the setup script (DO NOT use sudo)
bash setup-ubuntu.sh
```

**What the script does:**
- Updates system packages
- Installs curl, git, and build-essential
- Installs Node.js via nvm (Node Version Manager)
- Installs all project dependencies
- Creates the data directory
- Optionally builds for production
- Optionally creates a systemd service for auto-start

### Post-Setup Commands

**Development Mode:**
```bash
npm run dev
# Access at: http://localhost:3000
```

**Production Mode:**
```bash
npm run build
npm start
# Access at: http://localhost:3000
```

**Using Systemd Service:**
```bash
# Start the service
sudo systemctl start kpi-scorecard

# Stop the service
sudo systemctl stop kpi-scorecard

# Restart the service
sudo systemctl restart kpi-scorecard

# Check status
sudo systemctl status kpi-scorecard

# View logs
sudo journalctl -u kpi-scorecard -f
```

---

## 🪟 Windows 11 Setup

### Automated Setup (Recommended)

The automated setup script will install all dependencies using Chocolatey.

```powershell
# 1. Open PowerShell as Administrator
#    Right-click PowerShell → "Run as Administrator"

# 2. Navigate to the project directory
cd C:\path\to\kpi-scorecard

# 3. Allow script execution (one-time setup)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 4. Run the setup script
.\setup-windows.ps1
```

**What the script does:**
- Installs Chocolatey (Windows package manager)
- Installs Git
- Installs Node.js LTS
- Installs all project dependencies
- Creates the data directory
- Optionally builds for production
- Optionally creates a Windows service using NSSM

### Post-Setup Commands

**Development Mode:**
```powershell
npm run dev
# Access at: http://localhost:3000
```

**Production Mode:**
```powershell
npm run build
npm start
# Access at: http://localhost:3000
```

**Using Windows Service:**
```powershell
# Start the service
nssm start KPIScorecard

# Stop the service
nssm stop KPIScorecard

# Restart the service
nssm restart KPIScorecard

# Check status
nssm status KPIScorecard

# Or use the Services GUI
services.msc
```

---

## 🔧 Manual Setup

If you prefer to set up manually or the automated scripts don't work:

### Prerequisites

- **Node.js**: v20.x or later (LTS recommended)
- **npm**: v10.x or later (comes with Node.js)
- **Git**: Latest version

### Installation Steps

**1. Install Node.js**

**Ubuntu:**
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts
```

**Windows:**
- Download from: https://nodejs.org/
- Install the LTS version
- Verify: `node --version` and `npm --version`

**2. Clone the Repository**

```bash
git clone <your-repo-url> kpi-scorecard
cd kpi-scorecard
```

**3. Install Dependencies**

```bash
npm install
```

**4. Create Data Directory**

```bash
mkdir data
```

**5. Run the Application**

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

---

## ⚙️ Configuration

### Environment Variables (Optional)

Create a `.env.local` file in the project root for custom configuration:

```env
# Port (default: 3000)
PORT=3000

# Host (default: localhost)
HOST=0.0.0.0

# Data directory (default: ./data)
DATA_DIR=./data
```

### Firewall Configuration

If you want to access the application from other machines on your network:

**Ubuntu:**
```bash
# Allow port 3000
sudo ufw allow 3000/tcp
sudo ufw reload
```

**Windows:**
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "KPI Scorecard" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

### Reverse Proxy (Production)

For production deployments, consider using a reverse proxy:

**Nginx (Ubuntu):**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔍 Troubleshooting

### Common Issues

**Issue: "Port 3000 is already in use"**

**Solution:**
```bash
# Ubuntu - Find and kill the process
sudo lsof -ti:3000 | xargs kill -9

# Windows - Find and kill the process
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Issue: "npm: command not found" after installation**

**Solution:**
```bash
# Ubuntu - Reload shell configuration
source ~/.bashrc
# or
source ~/.nvm/nvm.sh

# Windows - Restart PowerShell
# Close and reopen PowerShell as Administrator
```

**Issue: Permission errors on Ubuntu**

**Solution:**
```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

**Issue: Windows script execution policy error**

**Solution:**
```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Issue: Build fails with memory error**

**Solution:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Getting Help

If you encounter issues not covered here:

1. Check the application logs
2. Verify all prerequisites are installed correctly
3. Ensure you have the latest version of Node.js LTS
4. Check GitHub issues or create a new one

---

## 📦 System Requirements

### Minimum Requirements

- **CPU**: 1 core
- **RAM**: 512 MB
- **Disk**: 500 MB free space
- **OS**: Ubuntu 20.04+ or Windows 11

### Recommended Requirements

- **CPU**: 2+ cores
- **RAM**: 2 GB
- **Disk**: 2 GB free space
- **OS**: Ubuntu 22.04+ or Windows 11

---

## 🚀 Quick Start Summary

**Ubuntu:**
```bash
bash setup-ubuntu.sh
npm run dev
```

**Windows:**
```powershell
.\setup-windows.ps1
npm run dev
```

Access the application at: **http://localhost:3000**

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Node.js Official Site](https://nodejs.org/)
- [npm Documentation](https://docs.npmjs.com/)
- [Project README](./README.md)

---

**Last Updated:** 2025-11-21
