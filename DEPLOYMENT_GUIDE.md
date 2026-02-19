# NavoditaERP - Deployment Guide

Complete guide to run NavoditaERP on every platform: Web (Online), macOS, Windows, Linux, Android, and iPhone/iPad.

NavoditaERP is built as a **web application** (React frontend + Node.js backend + PostgreSQL). It can run on any platform through the following approaches:

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Run Online (Web Server / Cloud)](#2-run-online-web-server--cloud)
3. [Run on macOS (Desktop App)](#3-run-on-macos-desktop-app)
4. [Run on Windows (Desktop App)](#4-run-on-windows-desktop-app)
5. [Run on Linux (Desktop App)](#5-run-on-linux-desktop-app)
6. [Run on Android](#6-run-on-android)
7. [Run on iPhone / iPad (iOS)](#7-run-on-iphone--ipad-ios)
8. [Environment Configuration](#8-environment-configuration)
9. [Database Setup](#9-database-setup)
10. [PM2 Process Management](#10-pm2-process-management)

---

## 1. Prerequisites

All platforms need these installed on the **server/machine** running the backend:

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18+ (LTS recommended) | Backend runtime |
| PostgreSQL | 14+ | Database |
| npm | 9+ | Package manager (comes with Node.js) |
| Git | 2+ | Clone repository |

**Install Node.js:** https://nodejs.org/en/download
**Install PostgreSQL:** https://www.postgresql.org/download

---

## 2. Run Online (Web Server / Cloud)

This is the primary deployment method. Once running on a server, all devices (phone, tablet, laptop) access it via browser.

### Option A: VPS / Dedicated Server (Recommended for Business)

Works with: DigitalOcean, AWS EC2, Hetzner, Linode, Vultr, or any VPS provider.

**Step 1: Server Setup (Ubuntu/Debian)**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx
```

**Step 2: Setup PostgreSQL**

```bash
sudo -u postgres psql

# Inside psql:
CREATE USER navodita WITH PASSWORD 'your-strong-password-here';
CREATE DATABASE navodita_erp OWNER navodita;
GRANT ALL PRIVILEGES ON DATABASE navodita_erp TO navodita;
\q
```

**Step 3: Clone and Setup Application**

```bash
# Clone your repository
cd /var/www
git clone <your-repo-url> navodita-erp-web
cd navodita-erp-web

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env
```

Edit `.env` with your production values:
```
DATABASE_URL=postgresql://navodita:your-strong-password-here@localhost:5432/navodita_erp
DB_HOST=localhost
DB_PORT=5432
DB_NAME=navodita_erp
DB_USER=navodita
DB_PASSWORD=your-strong-password-here
PORT=5001
NODE_ENV=production
JWT_SECRET=generate-a-64-char-random-string-here
JWT_EXPIRES_IN=7d
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

**Step 4: Build and Migrate**

```bash
# Run database migrations
npm run db:migrate

# Seed default data (chart of accounts, admin user)
npm run db:seed

# Build frontend
npm run build
```

**Step 5: Start with PM2**

```bash
# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 process list (survives reboot)
pm2 save

# Enable auto-start on boot
pm2 startup
# Follow the command it outputs (copy-paste the sudo command)
```

**Step 6: Configure Nginx Reverse Proxy**

```bash
sudo nano /etc/nginx/sites-available/navodita-erp
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/navodita-erp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Step 7: SSL Certificate (HTTPS)**

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get free SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

Your app is now live at `https://your-domain.com`

### Option B: Railway / Render (Easiest - No Server Management)

**Railway (https://railway.app):**
1. Push code to GitHub
2. Go to Railway, click "New Project" > "Deploy from GitHub"
3. Add PostgreSQL plugin
4. Set environment variables (same as `.env` above)
5. Railway auto-detects Node.js, runs `npm run production`
6. Get your URL: `https://your-app.up.railway.app`

**Render (https://render.com):**
1. Push code to GitHub
2. Create a "Web Service" pointing to your repo
3. Build command: `npm install && npm run build && npm run db:migrate`
4. Start command: `npm start`
5. Add a PostgreSQL database from Render dashboard
6. Set environment variables

### Option C: Local Network (Office LAN)

Run on one machine, access from all office computers:

```bash
cd navodita-erp-web
npm install
npm run db:migrate && npm run db:seed
npm run production
```

Access from other computers: `http://<server-ip>:5001`
Find server IP: `ifconfig` (Mac/Linux) or `ipconfig` (Windows)

---

## 3. Run on macOS (Desktop App)

### Option A: Electron (Recommended - Full Native Desktop App)

Wraps NavoditaERP in a native macOS window with dock icon, menu bar, etc.

**Step 1: Install Electron**

```bash
cd navodita-erp-web
npm install --save-dev electron electron-builder
```

**Step 2: Create `electron/main.js`**

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function startServer() {
  serverProcess = spawn('node', ['backend/src/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'production', PORT: '5001' },
  });
  serverProcess.stdout.on('data', (data) => console.log(`Server: ${data}`));
  serverProcess.stderr.on('data', (data) => console.error(`Server: ${data}`));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    title: 'NavoditaERP',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  // Wait for server to start, then load
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:5001');
  }, 3000);

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  app.quit();
});
```

**Step 3: Update `package.json`**

Add to root `package.json`:
```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron": "npm run build && electron .",
    "electron:build": "npm run build && electron-builder --mac"
  },
  "build": {
    "appId": "com.navodita.erp",
    "productName": "NavoditaERP",
    "mac": {
      "target": ["dmg", "zip"],
      "category": "public.app-category.business"
    },
    "files": [
      "backend/**/*",
      "frontend/dist/**/*",
      "electron/**/*",
      "node_modules/**/*",
      ".env"
    ]
  }
}
```

**Step 4: Build macOS App**

```bash
# Run in development
npm run electron

# Build .dmg installer
npm run electron:build
# Output: dist/NavoditaERP-1.0.0.dmg
```

### Option B: Tauri (Smaller, Faster Alternative)

Tauri uses the system WebView instead of bundling Chromium (app size ~10MB vs ~150MB with Electron).

```bash
# Install Rust (required for Tauri)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI
npm install --save-dev @tauri-apps/cli @tauri-apps/api

# Initialize Tauri
npx tauri init
# Set dev URL: http://localhost:5001
# Set build URL: http://localhost:5001

# Build macOS app
npx tauri build
# Output: src-tauri/target/release/bundle/dmg/NavoditaERP.dmg
```

### Option C: Direct Run (Simplest - No Packaging)

```bash
cd navodita-erp-web
npm install
npm run production
# Open browser to http://localhost:5001
```

---

## 4. Run on Windows (Desktop App)

### Option A: Electron (Recommended)

Same setup as macOS, but build for Windows:

```bash
# On Windows machine (or cross-compile from Mac with Wine)
npm run build
npx electron-builder --win

# Output: dist/NavoditaERP Setup 1.0.0.exe (NSIS installer)
# Also:  dist/NavoditaERP-1.0.0-portable.exe (portable)
```

Add to `package.json` build config:
```json
{
  "build": {
    "win": {
      "target": ["nsis", "portable"],
      "icon": "assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "installerIcon": "assets/icon.ico"
    }
  }
}
```

### Option B: Direct Run on Windows

```bash
# Install Node.js from https://nodejs.org
# Install PostgreSQL from https://www.postgresql.org/download/windows/

cd navodita-erp-web
npm install
npm run db:migrate
npm run db:seed
npm run production

# Open browser to http://localhost:5001
```

### Option C: Windows Service (Auto-Start)

```bash
# Install PM2 globally
npm install -g pm2
npm install -g pm2-windows-startup

# Start app
pm2 start ecosystem.config.js --env production
pm2 save
pm2-startup install
```

---

## 5. Run on Linux (Desktop App)

### Option A: Electron

```bash
# Build for Linux
npx electron-builder --linux

# Output formats:
# dist/NavoditaERP-1.0.0.AppImage  (universal, no install needed)
# dist/NavoditaERP-1.0.0.deb       (Ubuntu/Debian)
# dist/NavoditaERP-1.0.0.rpm       (Fedora/CentOS)
```

Add to `package.json` build config:
```json
{
  "build": {
    "linux": {
      "target": ["AppImage", "deb", "rpm"],
      "category": "Office",
      "icon": "assets/icons"
    }
  }
}
```

### Option B: Direct Run (Server or Desktop)

```bash
# Ubuntu/Debian
sudo apt install -y nodejs npm postgresql

# Fedora/CentOS
sudo dnf install -y nodejs npm postgresql-server

# Setup
cd navodita-erp-web
npm install
npm run db:migrate && npm run db:seed
npm run production
```

### Option C: Docker (Any Linux)

Create `Dockerfile`:
```dockerfile
FROM node:20-slim

# Install PostgreSQL client for migrations
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN npm install

COPY . .
RUN cd frontend && npm run build

EXPOSE 5001

CMD ["node", "backend/src/index.js"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5001:5001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://navodita:password@db:5432/navodita_erp
      - JWT_SECRET=your-secret-here
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: navodita
      POSTGRES_PASSWORD: password
      POSTGRES_DB: navodita_erp
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  pgdata:
```

```bash
# Run with Docker
docker-compose up -d

# Access at http://localhost:5001
```

---

## 6. Run on Android

### Option A: PWA - Progressive Web App (Recommended - Easiest)

NavoditaERP works as a PWA on Android, installable from the browser like a native app.

**Requirements:** App must be deployed online (see Section 2) with HTTPS.

**Install on Android:**
1. Open Chrome on your Android phone
2. Go to `https://your-domain.com`
3. Chrome shows "Add to Home Screen" banner (or tap menu > "Add to Home Screen")
4. Tap "Install"
5. App appears on your home screen with its own icon

To enable PWA, add to `frontend/public/manifest.json`:
```json
{
  "name": "NavoditaERP",
  "short_name": "NavoditaERP",
  "description": "ERP for Navodita Apparel Pvt. Ltd.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1a56db",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Option B: Capacitor (Native Android App - Play Store)

Capacitor wraps your web app in a native Android container.

```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init NavoditaERP com.navodita.erp

# Build frontend
cd frontend && npm run build && cd ..

# Add Android platform
npx cap add android

# Configure server URL in capacitor.config.ts:
# server: { url: 'https://your-domain.com' }

# Open in Android Studio
npx cap open android

# Build APK from Android Studio:
# Build > Build Bundle(s) / APK(s) > Build APK(s)
```

**Requirements for Play Store:**
- Android Studio installed
- Google Play Developer account ($25 one-time fee)
- Signed APK/AAB

### Option C: Browser Access (Simplest)

Just open `https://your-domain.com` in Chrome/Firefox on Android. The responsive Tailwind CSS layout adapts to mobile screens.

---

## 7. Run on iPhone / iPad (iOS)

### Option A: PWA (Recommended)

**Install on iPhone/iPad:**
1. Open Safari (must be Safari, not Chrome)
2. Go to `https://your-domain.com`
3. Tap the Share button (box with arrow)
4. Tap "Add to Home Screen"
5. Tap "Add"
6. App appears on your home screen

Same `manifest.json` as Android section above.

### Option B: Capacitor (Native iOS App - App Store)

```bash
# Install Capacitor (if not already)
npm install @capacitor/core @capacitor/cli
npx cap init NavoditaERP com.navodita.erp

# Build frontend
cd frontend && npm run build && cd ..

# Add iOS platform
npx cap add ios

# Configure server URL in capacitor.config.ts:
# server: { url: 'https://your-domain.com' }

# Open in Xcode
npx cap open ios

# Build and run from Xcode
# Select your device/simulator and hit Run
```

**Requirements for App Store:**
- macOS with Xcode installed
- Apple Developer account ($99/year)
- Valid provisioning profile and certificates

### Option C: Browser Access (Simplest)

Open `https://your-domain.com` in Safari or Chrome on iPhone/iPad.

---

## 8. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Full PostgreSQL connection string | `postgresql://user:pass@localhost:5432/navodita_erp` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `navodita_erp` |
| `DB_USER` | Database user | `navodita` |
| `DB_PASSWORD` | Database password | `your-password` |
| `PORT` | Server port | `5001` |
| `NODE_ENV` | Environment | `production` or `development` |
| `JWT_SECRET` | Secret for auth tokens | Random 64+ char string |
| `JWT_EXPIRES_IN` | Token expiry | `7d` |
| `UPLOAD_DIR` | File upload directory | `./uploads` |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `10485760` (10MB) |

**Generate a secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 9. Database Setup

```bash
# Create database
sudo -u postgres createdb navodita_erp

# Or via psql
sudo -u postgres psql -c "CREATE DATABASE navodita_erp;"

# Run migrations (creates all 58 tables)
npm run db:migrate

# Seed default data (chart of accounts, admin user, settings)
npm run db:seed

# Reset database (WARNING: deletes all data)
npm run db:reset
```

**Default admin login after seeding:**
- Username: `admin`
- Password: `admin123`
- **Change this immediately in production!**

---

## 10. PM2 Process Management

PM2 keeps your app running 24/7, auto-restarts on crash, and provides monitoring.

```bash
# Install PM2
npm install -g pm2

# Start with ecosystem config
pm2 start ecosystem.config.js --env production

# Common commands
pm2 status                  # View running processes
pm2 logs navodita-erp       # View logs (live)
pm2 logs navodita-erp --lines 100  # Last 100 log lines
pm2 restart navodita-erp    # Restart
pm2 stop navodita-erp       # Stop
pm2 delete navodita-erp     # Remove from PM2

# Auto-start on system boot
pm2 startup                 # Generates startup script
pm2 save                    # Save current process list

# Monitoring dashboard
pm2 monit                   # Terminal dashboard
pm2 plus                    # Web dashboard (pm2.io)

# Zero-downtime restart (for updates)
pm2 reload navodita-erp
```

**Updating the application:**
```bash
cd navodita-erp-web
git pull
npm install
npm run db:migrate      # Run any new migrations
npm run build           # Rebuild frontend
pm2 reload navodita-erp # Zero-downtime restart
```

---

## Quick Reference

| Platform | Easiest Method | Native App Method |
|----------|---------------|-------------------|
| **Web (Online)** | VPS + PM2 + Nginx | - |
| **macOS** | `npm run production` + browser | Electron `.dmg` |
| **Windows** | `npm run production` + browser | Electron `.exe` |
| **Linux** | `npm run production` + browser | Electron `.AppImage` |
| **Android** | PWA (Add to Home Screen) | Capacitor APK |
| **iPhone/iPad** | PWA (Add to Home Screen) | Capacitor via Xcode |
| **Docker** | `docker-compose up -d` | - |

**Minimum recommended for production:** VPS with 1 CPU, 2GB RAM, 20GB SSD ($5-10/month from any cloud provider).
