# KPI Scorecard - Quick Setup Reference

## 🚀 One-Command Setup

### Ubuntu Server
```bash
curl -o- https://raw.githubusercontent.com/<your-repo>/main/setup-ubuntu.sh | bash
```
Or locally:
```bash
bash setup-ubuntu.sh
```

### Windows 11
```powershell
# Run PowerShell as Administrator
.\setup-windows.ps1
```

---

## 📝 What Gets Installed

| Component | Ubuntu | Windows |
|-----------|--------|---------|
| Node.js LTS | ✓ (via nvm) | ✓ (via Chocolatey) |
| npm | ✓ (with Node) | ✓ (with Node) |
| Git | ✓ | ✓ |
| Project Dependencies | ✓ | ✓ |
| Build Tools | ✓ | ✓ |

---

## ⚡ Quick Commands

### Start Development Server
```bash
npm run dev
```
Access at: http://localhost:3000

### Build for Production
```bash
npm run build
npm start
```

### Run Tests
```bash
node test-kpi-features.js
```

---

## 🔧 Service Management

### Ubuntu (systemd)
```bash
sudo systemctl start kpi-scorecard    # Start
sudo systemctl stop kpi-scorecard     # Stop
sudo systemctl restart kpi-scorecard  # Restart
sudo systemctl status kpi-scorecard   # Status
```

### Windows (NSSM)
```powershell
nssm start KPIScorecard     # Start
nssm stop KPIScorecard      # Stop
nssm restart KPIScorecard   # Restart
nssm status KPIScorecard    # Status
```

---

## 📂 Project Structure

```
kpi-scorecard/
├── src/
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   ├── context/          # Context providers
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── data/                 # Database (lowdb JSON files)
├── public/               # Static assets
├── setup-ubuntu.sh       # Ubuntu setup script
├── setup-windows.ps1     # Windows setup script
├── SETUP.md              # Full setup documentation
└── package.json          # Dependencies
```

---

## 🐛 Common Issues

### Port Already in Use
```bash
# Ubuntu
sudo lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Permission Issues (Ubuntu)
```bash
# Don't use sudo with npm
# If you did, fix with:
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER node_modules
```

### Script Execution Policy (Windows)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 🌐 Network Access

### Allow External Access

**Ubuntu:**
```bash
sudo ufw allow 3000/tcp
```

**Windows:**
```powershell
New-NetFirewallRule -DisplayName "KPI Scorecard" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

### Access from LAN
- Find your IP: `ip addr` (Ubuntu) or `ipconfig` (Windows)
- Access at: `http://<your-ip>:3000`

---

## 📊 Features

- ✅ Create and manage scorecards
- ✅ Add KPIs with values, trends, and charts
- ✅ Organize KPIs into sections
- ✅ Import data via CSV
- ✅ Assign KPIs to users
- ✅ Token-based update links
- ✅ Bulk assignment management
- ✅ Real-time updates

---

## 📞 Support

For detailed instructions, see [SETUP.md](./SETUP.md)

For issues, check the Troubleshooting section or create a GitHub issue.
