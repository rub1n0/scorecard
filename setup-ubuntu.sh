#!/bin/bash

###############################################################################
# KPI Scorecard - Ubuntu Setup Script
# This script sets up the application on a bare-bones Ubuntu server
###############################################################################

set -e  # Exit on error

echo "================================================"
echo "KPI Scorecard - Ubuntu Setup Script"
echo "================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}➜ $1${NC}"
}

# Check if running as root (not recommended)
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root or with sudo"
    exit 1
fi

# Step 1: Update system packages
print_info "Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y
print_success "System packages updated"

# Step 2: Install required system dependencies
print_info "Installing system dependencies (curl, git, build-essential)..."
sudo apt-get install -y curl git build-essential
print_success "System dependencies installed"

# Step 3: Install Node.js using nvm (Node Version Manager)
print_info "Installing Node.js via nvm..."

# Check if nvm is already installed
if [ -d "$HOME/.nvm" ]; then
    print_info "nvm is already installed"
else
    # Install nvm
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
    
    # Load nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    
    print_success "nvm installed"
fi

# Ensure nvm is loaded
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js LTS
print_info "Installing Node.js LTS..."
nvm install --lts
nvm use --lts
nvm alias default 'lts/*'
print_success "Node.js $(node --version) installed"
print_success "npm $(npm --version) installed"

# Step 4: Navigate to project directory or clone if needed
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

print_info "Working in directory: $SCRIPT_DIR"

# Step 5: Install project dependencies
print_info "Installing project dependencies..."
npm install
print_success "Dependencies installed"

# Step 6: Create data directory if it doesn't exist
print_info "Creating data directory..."
mkdir -p data
print_success "Data directory ready"

# Step 7: Build the application (optional, for production)
read -p "Do you want to build for production? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Building production bundle..."
    npm run build
    print_success "Production build complete"
    
    echo ""
    echo "================================================"
    echo -e "${GREEN}Setup Complete!${NC}"
    echo "================================================"
    echo ""
    echo "To start the production server:"
    echo "  npm start"
    echo ""
    echo "The application will be available at:"
    echo "  http://localhost:3000"
    echo ""
else
    echo ""
    echo "================================================"
    echo -e "${GREEN}Setup Complete!${NC}"
    echo "================================================"
    echo ""
    echo "To start the development server:"
    echo "  npm run dev"
    echo ""
    echo "The application will be available at:"
    echo "  http://localhost:3000"
    echo ""
fi

# Step 8: Optional - Set up systemd service for production
read -p "Do you want to set up a systemd service for auto-start? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Creating systemd service..."
    
    SERVICE_FILE="/tmp/kpi-scorecard.service"
    
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=KPI Scorecard Application
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$SCRIPT_DIR
Environment="PATH=/home/$USER/.nvm/versions/node/$(node --version | sed 's/v//')/bin:/usr/bin:/bin"
ExecStart=/home/$USER/.nvm/versions/node/$(node --version | sed 's/v//')/bin/npm start
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=kpi-scorecard

[Install]
WantedBy=multi-user.target
EOF

    sudo mv "$SERVICE_FILE" /etc/systemd/system/kpi-scorecard.service
    sudo systemctl daemon-reload
    sudo systemctl enable kpi-scorecard.service
    
    print_success "Systemd service created and enabled"
    echo ""
    echo "Service commands:"
    echo "  Start:   sudo systemctl start kpi-scorecard"
    echo "  Stop:    sudo systemctl stop kpi-scorecard"
    echo "  Restart: sudo systemctl restart kpi-scorecard"
    echo "  Status:  sudo systemctl status kpi-scorecard"
    echo "  Logs:    sudo journalctl -u kpi-scorecard -f"
    echo ""
fi

print_success "All done! 🚀"
