# Navodita ERP - Hostinger Deployment Guide

This guide will help you deploy your Navodita ERP application to Hostinger with Node.js hosting.

## Prerequisites

1. **Hostinger Account** with Node.js hosting plan
2. **GitHub Repository** (we'll set this up)
3. **PostgreSQL Database** on Hostinger
4. **SSH Access** to your Hostinger server

## Step 1: Create GitHub Repository

Since the current repository has access issues, let's create a new one:

1. Go to [GitHub](https://github.com) and sign in
2. Click the **+** icon → **New repository**
3. Repository name: `navodita-erp-web`
4. Description: `Navodita ERP - Node.js + React + PostgreSQL`
5. Select **Private** (recommended for business apps)
6. Click **Create repository**

### Push Code to New Repository

```bash
cd /Users/kaliraman/Desktop/navodita-erp-web

# Remove old remote (if exists)
git remote remove origin

# Add new repository (replace with your actual URL)
git remote add origin https://github.com/YOUR_USERNAME/navodita-erp-web.git

# Push all changes
git push -u origin main
```

## Step 2: Setup Hostinger PostgreSQL Database

1. **Login to Hostinger Panel** (hpanel.hostinger.com)
2. Go to **Databases** → **PostgreSQL**
3. **Create New Database:**
   - Database name: `navodita_erp_prod`
   - Username: (will be auto-created)
   - Password: (save this securely!)
4. **Note down the credentials:**
   ```
   Host: localhost (or specific host)
   Port: 5432
   Database: navodita_erp_prod
   Username: your_db_user
   Password: your_db_password
   ```

## Step 3: Setup Node.js Application on Hostinger

### 3.1 Access SSH

```bash
# SSH into your Hostinger server
ssh username@your-domain.com
# Enter your SSH password
```

### 3.2 Clone Repository

```bash
# Navigate to home directory
cd ~

# Clone your repository
git clone https://github.com/YOUR_USERNAME/navodita-erp-web.git
cd navodita-erp-web
```

### 3.3 Setup Backend

```bash
cd backend

# Install dependencies
npm install --production

# Copy environment file
cp ../.env.production .env

# Edit environment variables with your actual credentials
nano .env
```

**Update `.env` with your Hostinger database credentials:**

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=navodita_erp_prod
DB_USER=your_actual_db_user
DB_PASSWORD=your_actual_db_password

PORT=5001
NODE_ENV=production

JWT_SECRET=change-this-to-a-random-32-character-string
JWT_EXPIRES_IN=7d

FRONTEND_URL=https://your-domain.com

SESSION_SECRET=change-this-to-another-random-32-character-string
```

Press `Ctrl+O` to save, `Enter`, then `Ctrl+X` to exit.

### 3.4 Run Database Migrations

```bash
# Run all migrations to create database tables
npm run migrate

# Verify migrations
npm run migrate:status
```

### 3.5 Create Admin User

```bash
# Start Node.js console
node

# Run this code to create admin user:
```

```javascript
const db = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  await db('app_users').insert({
    username: 'admin',
    email: 'admin@navodita.com',
    password_hash: hashedPassword,
    full_name: 'System Administrator',
    role: 'Admin',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  });

  console.log('Admin user created successfully!');
  console.log('Username: admin');
  console.log('Password: Admin@123');
  console.log('CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!');

  process.exit(0);
}

createAdmin().catch(console.error);
```

Press `Ctrl+D` to exit Node console.

### 3.6 Setup PM2 Process Manager

```bash
# Install PM2 globally (if not already installed)
npm install -g pm2

# Create logs directory
mkdir -p logs

# Update ecosystem.config.js with your actual path
nano ecosystem.config.js
# Change: cwd: '/home/YOUR_USERNAME/navodita-erp-web/backend'

# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on server reboot
pm2 startup
# Follow the command it gives you

# Check application status
pm2 status
pm2 logs navodita-erp-backend

# Monitor application
pm2 monit
```

## Step 4: Setup Frontend (React Build)

### 4.1 Build Frontend Locally

On your local machine:

```bash
cd /Users/kaliraman/Desktop/navodita-erp-web/frontend

# Update API URL in .env
echo "VITE_API_URL=https://your-domain.com/api" > .env.production

# Build production version
npm run build
```

This creates a `dist` folder with optimized static files.

### 4.2 Upload Frontend to Hostinger

**Option A: Using FileZilla/FTP:**
1. Connect to Hostinger via FTP
2. Navigate to `public_html` (or your domain's root)
3. Upload entire `dist` folder contents

**Option B: Using SCP:**
```bash
# From your local machine
cd /Users/kaliraman/Desktop/navodita-erp-web/frontend
scp -r dist/* username@your-domain.com:~/public_html/
```

### 4.3 Configure Web Server (Apache/Nginx)

**For Apache (Hostinger default):**

Create `.htaccess` in `public_html`:

```bash
ssh username@your-domain.com
cd ~/public_html
nano .htaccess
```

Add this content:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # API proxy to backend
  RewriteRule ^api/(.*)$ http://localhost:5001/$1 [P,L]

  # React Router - redirect all to index.html
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Security headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Gzip compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json
</IfModule>
```

## Step 5: Configure Domain & SSL

1. **Point Domain to Hostinger:**
   - In your domain registrar, update nameservers to Hostinger's
   - Wait 24-48 hours for DNS propagation

2. **Enable SSL Certificate:**
   - In Hostinger panel → **SSL**
   - Select your domain
   - Click **Install SSL** (free Let's Encrypt)

3. **Force HTTPS:**
   - Add to `.htaccess`:
   ```apache
   RewriteEngine On
   RewriteCond %{HTTPS} off
   RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   ```

## Step 6: Testing

1. **Backend API Test:**
   ```bash
   curl https://your-domain.com/api/health
   ```

2. **Frontend Test:**
   - Open `https://your-domain.com` in browser
   - You should see the login page
   - Login with admin credentials

3. **Database Test:**
   - Try creating an invoice, customer, vendor
   - Verify data is saved

## Step 7: Post-Deployment

### 7.1 Change Default Passwords

```bash
# Login to application
# Go to Settings → Users
# Change admin password immediately
```

### 7.2 Setup Backups

**Database Backup Script:**

```bash
# Create backup directory
mkdir -p ~/backups

# Create backup script
nano ~/backup-db.sh
```

Add:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=~/backups
DB_NAME=navodita_erp_prod
DB_USER=your_db_user

# Create backup
PGPASSWORD=your_db_password pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql"
```

```bash
# Make executable
chmod +x ~/backup-db.sh

# Test backup
./backup-db.sh

# Setup daily cron job
crontab -e
# Add this line:
0 2 * * * /home/YOUR_USERNAME/backup-db.sh
```

### 7.3 Setup Monitoring

```bash
# Monitor PM2 processes
pm2 monit

# View logs
pm2 logs navodita-erp-backend --lines 100

# Check errors
pm2 logs navodita-erp-backend --err
```

### 7.4 Setup Log Rotation

```bash
# Install PM2 log rotate
pm2 install pm2-logrotate

# Configure (optional)
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## Useful PM2 Commands

```bash
# Restart application
pm2 restart navodita-erp-backend

# Stop application
pm2 stop navodita-erp-backend

# View logs
pm2 logs navodita-erp-backend

# Monitor resources
pm2 monit

# Update code and restart
cd ~/navodita-erp-web
git pull origin main
cd backend
npm install --production
pm2 restart navodita-erp-backend
```

## Troubleshooting

### Backend won't start

```bash
# Check logs
pm2 logs navodita-erp-backend --err

# Common issues:
# 1. Database connection - verify .env credentials
# 2. Port already in use - change PORT in .env
# 3. Missing dependencies - run npm install
```

### Frontend shows blank page

```bash
# Check browser console for errors
# Common issues:
# 1. API URL wrong - check .env.production
# 2. CORS errors - verify FRONTEND_URL in backend .env
# 3. Missing .htaccess - verify Apache rewrite rules
```

### Database connection errors

```bash
# Test database connection
psql -h localhost -U your_db_user -d navodita_erp_prod

# Check PostgreSQL is running
systemctl status postgresql

# Verify credentials in .env match database
```

### SSL Certificate issues

```bash
# Check SSL status in Hostinger panel
# Force regenerate if needed
# Clear browser cache and test
```

## Security Checklist

- [ ] Change default admin password
- [ ] Update JWT_SECRET and SESSION_SECRET
- [ ] Enable HTTPS and force redirect
- [ ] Setup database backups
- [ ] Configure firewall rules
- [ ] Enable fail2ban (if available)
- [ ] Regular dependency updates
- [ ] Monitor error logs daily
- [ ] Setup uptime monitoring (e.g., UptimeRobot)

## Maintenance

**Weekly:**
- Check application logs
- Verify backups are running
- Monitor disk space

**Monthly:**
- Update npm dependencies
- Review and analyze error logs
- Test backup restoration

**Quarterly:**
- Security audit
- Performance optimization
- Database optimization (VACUUM, ANALYZE)

## Support

For issues:
1. Check PM2 logs: `pm2 logs navodita-erp-backend`
2. Check database logs
3. Review browser console errors
4. Contact Hostinger support for hosting issues

## Updates

To deploy new updates:

```bash
# Pull latest code
cd ~/navodita-erp-web
git pull origin main

# Update backend
cd backend
npm install --production
npm run migrate  # Run any new migrations
pm2 restart navodita-erp-backend

# Update frontend (build locally, upload dist)
# Or setup CI/CD for automated deployments
```

---

**Deployment Date:** $(date +%Y-%m-%d)

**Deployed By:** Kali Raman

**Application Version:** 1.0.0 (Enterprise Edition)
