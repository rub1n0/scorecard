# KPI Scorecard

A modern, self-hosted KPI (Key Performance Indicator) dashboard application built with Next.js. Track metrics, visualize data, manage assignments, and collaborate on performance tracking with an industrial-themed UI.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.0-black)
![React](https://img.shields.io/badge/React-19.2-blue)

---

## 📋 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Deployment](#deployment)
- [Usage Guide](#usage-guide)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## ✨ Features

### Core Functionality
- 📊 **Multiple Scorecards** - Create and manage unlimited scorecards
- 📈 **KPI Tracking** - Track metrics with values, trends, and targets
- 🎨 **Rich Visualizations** - Pie charts, bar charts, line graphs, and sparklines
- 📁 **Section Management** - Organize KPIs into custom sections with colors and reordering
- 🔄 **Real-time Updates** - Automatic UI updates when data changes

### Collaboration Features
- 👥 **User Assignments** - Assign KPIs to team members
- 🔗 **Secure Update Links** - Token-based links for external updates
- 📮 **Assignment Manager** - Centralized hub to view, assign, and manage all metrics
- 🔐 **No Login Required** - Token-based access for assigned users
- ⚡ **Bulk Operations** - Assign multiple metrics or entire sections at once

### User Experience
- 🎨 **Industrial Dark Theme** - Modern, professional interface
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- ⚡ **Fast Performance** - Optimized with Next.js and Turbopack
- 💾 **File-based Storage** - No database setup required (uses LowDB)
- 🛠️ **Customizable Charts** - Toggle legends, grid lines, and data labels

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20.x or later (LTS recommended)
- **npm** 10.x or later

### One-Command Setup

**Ubuntu/Linux:**
```bash
bash scripts/setup.sh
npm run dev
```

Access the application at: **http://localhost:3000**

> For detailed setup instructions, see [SETUP.md](./SETUP.md)

---

## 📦 Installation

### Manual Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/kpi-scorecard.git
cd kpi-scorecard
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create data directory:**
```bash
mkdir data
```

4. **Run development server:**
```bash
npm run dev
```

5. **Build for production:**
```bash
npm run build
npm start
```

---

## 🌐 Deployment

### Development Server
Best for local development and testing:
```bash
npm run dev
```
- Hot reload enabled
- Runs on `http://localhost:3000`
- Source maps enabled

### Production Build
Optimized for performance:
```bash
npm run build
npm start
```
- Optimized bundle size
- Production mode
- Better performance

### Deployment Options

#### 1. Ubuntu/Linux Server (Systemd Service)

The setup script can create a systemd service for automatic startup:

```bash
bash scripts/setup-ubuntu.sh
# Select "Yes" when asked about systemd service
```

Manual service management:
```bash
sudo systemctl start kpi-scorecard    # Start
sudo systemctl stop kpi-scorecard     # Stop
sudo systemctl restart kpi-scorecard  # Restart
sudo systemctl status kpi-scorecard   # Check status
```

#### 3. Docker (Optional)

Create a `Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t kpi-scorecard .
docker run -p 3000:3000 -v $(pwd)/data:/app/data kpi-scorecard
```

#### 4. Reverse Proxy (Nginx)

For production deployments with HTTPS:

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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Add SSL with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### 5. Cloud Platforms

**Vercel:**
```bash
npm i -g vercel
vercel
```

**Netlify:**
```bash
npm i -g netlify-cli
netlify deploy
```

**Heroku:**
```bash
heroku create kpi-scorecard
git push heroku main
```

---

## 📖 Usage Guide

### Creating Your First Scorecard

1. **Access the Application**
   - Navigate to `http://localhost:3000`
   - You'll see the dashboard with no scorecards

2. **Create a Scorecard**
   - Click **"Create New Scorecard"**
   - Enter a name (e.g., "Q4 2024 Metrics")
   - Add an optional description
   - Click **"Create"**

### Managing KPIs

#### Adding a Single KPI

1. Open your scorecard
2. Click **"Manage Scorecard"** → **"Add Metric"**
3. Fill in the KPI details:
   - **Name**: Metric name (e.g., "Monthly Revenue")
   - **Subtitle**: Additional context (optional)
   - **Value**: Current value (automatically calculated for Number type)
   - **Visualization Type**: Number with Trend, Chart, or Text
   - **Chart Settings**: Customize colors, legends, and labels
   - **Reverse Trend**: Option to mark downward trends as "Good" (Green)
4. Click **"Save"**

### Organizing with Sections

1. Click **"Manage Scorecard"** → **"Sections"**
2. Click **"Add Section"**
3. Configure:
   - **Name**: Section name
   - **Color**: Choose from palette
   - **Opacity**: Adjust transparency
4. Use **Up/Down Arrows** to reorder sections
5. Drag KPIs to assign them to sections in the main view

### Assignment Management

#### Bulk Assignment Manager

1. Click **"Manage Scorecard"** → **"Assignments"**
2. **Select Metrics**:
   - Check individual boxes
   - Click **"Select Section"** to select all metrics in a group
   - Use the search bar to find specific metrics
3. **Assign**:
   - Enter an email address
   - Click **"Assign Metrics"**
4. **Share**:
   - Find the user in the "Assigned Metrics" list
   - Click **"Copy Link"** to get their unique update URL

#### Assignee Update Workflow

1. Assignee receives update link (e.g., `http://app.com/update/user/token123`)
2. Opens link (no login required)
3. Sees all assigned KPIs
4. Updates values, trends, and notes
5. Changes save automatically
6. Scorecard owner sees real-time updates

### Editing and Managing Data

- **Edit KPI**: Click the edit icon on any KPI tile
- **Delete KPI**: Click the delete icon (confirmation required)
- **Edit Section**: Click edit in Section Management
- **Reorder Sections**: Use arrows in Section Management
- **Delete Section**: Removes section but keeps KPIs (moved to General)

---

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0

# Data Storage
DATA_DIR=./data

# Application Settings
NODE_ENV=production
```

### Network Access

### Network Access

**Allow External Access (Ubuntu):**
```bash
sudo ufw allow 3000/tcp
sudo ufw reload
```

### Performance Tuning

**Increase Node.js Memory (for large datasets):**
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

**Enable PM2 for Process Management (Linux):**
```bash
npm install -g pm2
pm2 start npm --name "kpi-scorecard" -- start
pm2 save
pm2 startup
```

---

## 🏗️ Architecture

### Technology Stack

- **Framework**: Next.js 16.0 (React 19.2)
- **Styling**: Tailwind CSS 4.1
- **Charts**: ApexCharts
- **Icons**: Lucide React
- **Database**: LowDB (file-based JSON)
- **Language**: TypeScript

### Project Structure

```
kpi-scorecard/
├── src/
│   ├── app/                      # Next.js app directory
│   │   ├── api/                  # API routes
│   │   │   └── scorecards/       # Scorecard CRUD endpoints
│   │   ├── scorecard/[id]/       # Individual scorecard page
│   │   ├── update/[token]/       # Single KPI update page
│   │   └── update/user/[token]/  # Bulk assignee update page
│   ├── components/               # React components
│   │   ├── AssignmentManager.tsx # Assignment management modal
│   │   ├── Dashboard.tsx         # Main dashboard
│   │   ├── KPIForm.tsx           # KPI creation/edit form
│   │   ├── KPITile.tsx           # KPI display card
│   │   ├── KPIUpdateForm.tsx     # External update form
│   │   ├── ScorecardCard.tsx     # Scorecard list item
│   │   ├── ScorecardForm.tsx     # Scorecard creation form
│   │   ├── ScorecardView.tsx     # Scorecard detail view
│   │   └── SectionManagementModal.tsx # Section manager
│   ├── context/
│   │   └── ScorecardContext.tsx  # Global state management
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   └── utils/
│       └── tokenUtils.ts         # Token generation/validation
├── data/                         # Database storage (JSON files)
├── public/                       # Static assets
├── scripts/                      # Utility scripts
│   └── setup.sh                  # Installation script
├── SETUP.md                      # Detailed setup guide
└── package.json                  # Dependencies
```

### Data Models

**Scorecard:**
```typescript
{
  id: string;
  name: string;
  description?: string;
  kpis: KPI[];
  sections?: Section[];
  assignees?: Record<string, string>; // email -> token
  createdAt: string;
  updatedAt: string;
}
```

**KPI:**
```typescript
{
  id: string;
  name: string;
  subtitle?: string;
  value: string;
  target?: string;
  trendValue?: string;
  notes?: string;
  date: string;
  category?: string;
  chartType?: 'pie' | 'bar' | 'line';
  dataPoints?: DataPoint[];
  sectionId?: string;
  order?: number;
  assignee?: string;
  updateToken?: string;
  lastUpdatedBy?: string;
  reverseTrend?: boolean; // Down is Good
  chartSettings?: ChartSettings;
}
```

---

## 🔌 API Reference

### Scorecards

**List all scorecards:**
```http
GET /api/scorecards
```

**Get single scorecard:**
```http
GET /api/scorecards/:id
```

**Create scorecard:**
```http
POST /api/scorecards
Content-Type: application/json

{
  "name": "Q4 2024",
  "description": "Fourth quarter metrics"
}
```

**Update scorecard:**
```http
PUT /api/scorecards/:id
Content-Type: application/json

{
  "kpis": [...],
  "sections": [...]
}
```

**Delete scorecard:**
```http
DELETE /api/scorecards/:id
```

---

## 🔧 Troubleshooting

### Common Issues

**Port Already in Use:**
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9  # Linux/Mac
netstat -ano | findstr :3000   # Windows
```

**Data Not Persisting:**
- Ensure `data/` directory exists
- Check file permissions
- Verify disk space

**Slow Performance:**
- Build for production: `npm run build`
- Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"`
- Clear `.next/` cache: `rm -rf .next`

**Assignment Links Not Working:**
- Verify token generation in database
- Check network/firewall settings
- Ensure assignee email is set correctly

### Debug Mode

Enable verbose logging:
```bash
DEBUG=* npm run dev
```

### Getting Help

1. Check [SETUP.md](./SETUP.md) for detailed setup instructions
2. Review [Troubleshooting section](#troubleshooting)
3. Check existing GitHub issues
4. Create a new issue with:
   - Node.js version (`node --version`)
   - npm version (`npm --version`)
   - Operating system
   - Error logs
   - Steps to reproduce

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Setup

```bash
git clone https://github.com/yourusername/kpi-scorecard.git
cd kpi-scorecard
npm install
npm run dev
```

### Code Style

- Use TypeScript for all new code
- Follow existing code formatting
- Add comments for complex logic
- Update documentation for new features

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Charts by [ApexCharts](https://apexcharts.com/)
- Icons by [Lucide](https://lucide.dev/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)

---

## 📞 Support

For questions or support:
- 📧 Email: support@example.com
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/kpi-scorecard/discussions)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/kpi-scorecard/issues)

---

**Built with ❤️ using Next.js**
