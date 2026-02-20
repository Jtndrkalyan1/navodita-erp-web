# 🚀 Quick Start - Hostinger Deployment

This is a simplified checklist for deploying to Hostinger. For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## ✅ Pre-Deployment Checklist

- [ ] Hostinger Node.js hosting plan purchased
- [ ] Domain name configured
- [ ] SSH access credentials received
- [ ] GitHub account ready
- [ ] PostgreSQL database access

## 📋 Step-by-Step Deployment

### 1️⃣ Create GitHub Repository (5 minutes)

Since the current repository has access issues, create a new one:

```bash
# On GitHub.com
1. Click + → New repository
2. Name: navodita-erp-web
3. Private repository
4. Create repository

# On your local machine:
cd /Users/kaliraman/Desktop/navodita-erp-web

# Remove old remote and add new
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/navodita-erp-web.git

# Push code
git branch -M main
git push -u origin main
```

### 2️⃣ Setup Hostinger Database (10 minutes)

1. Login to **hpanel.hostinger.com**
2. Go to **Databases** → **PostgreSQL**
3. Click **Create Database**
   - Name: `navodita_erp_prod`
   - Save username and password shown!
4. Note connection details:
   ```
   Host: _______________
   Port: 5432
   Database: navodita_erp_prod
   Username: _______________
   Password: _______________
   ```

### 3️⃣ Deploy Backend (20 minutes)

```bash
# SSH into Hostinger
ssh your-username@your-domain.com

# Clone repository
git clone https://github.com/YOUR_USERNAME/navodita-erp-web.git
cd navodita-erp-web/backend

# Install dependencies
npm install --production

# Create .env file
nano .env
```

**Paste this and update with YOUR credentials:**

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=navodita_erp_prod
DB_USER=YOUR_DB_USERNAME
DB_PASSWORD=YOUR_DB_PASSWORD

PORT=5001
NODE_ENV=production

JWT_SECRET=your-random-secret-min-32-characters-change-this
SESSION_SECRET=another-random-secret-min-32-chars-change-this

FRONTEND_URL=https://your-domain.com
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

```bash
# Run migrations
npm run migrate

# Create admin user
node scripts/create-admin.js

# Install PM2
npm install -g pm2

# Update ecosystem.config.js
nano ecosystem.config.js
# Change: cwd: '/home/YOUR_USERNAME/navodita-erp-web/backend'

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the command it shows

# Verify it's running
pm2 status
pm2 logs navodita-erp-backend
```

### 4️⃣ Build and Deploy Frontend (15 minutes)

**On your local machine:**

```bash
cd /Users/kaliraman/Desktop/navodita-erp-web/frontend

# Create production environment file
echo "VITE_API_URL=https://your-domain.com/api" > .env.production

# Build
npm run build
```

**Upload to Hostinger:**

**Option A - FileZilla/FTP:**
1. Connect to your Hostinger via FTP
2. Navigate to `public_html`
3. Delete any existing files
4. Upload all files from `dist/` folder

**Option B - SCP (faster):**
```bash
scp -r dist/* your-username@your-domain.com:~/public_html/
```

### 5️⃣ Configure Web Server (10 minutes)

```bash
# SSH to Hostinger
ssh your-username@your-domain.com

# Create .htaccess in public_html
cd ~/public_html
nano .htaccess
```

**Paste this:**

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Force HTTPS
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

  # API proxy to backend
  RewriteRule ^api/(.*)$ http://localhost:5001/$1 [P,L]

  # React Router
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

### 6️⃣ Enable SSL Certificate (5 minutes)

1. Go to Hostinger Panel → **SSL**
2. Select your domain
3. Click **Install SSL** (free Let's Encrypt)
4. Wait 5-10 minutes for activation

### 7️⃣ Test Your Application ✅

1. **Open**: `https://your-domain.com`
2. **Login with:**
   - Username: `admin`
   - Password: `Admin@123`
3. **Test features:**
   - Create a customer
   - Create an invoice
   - View reports
4. **Change admin password immediately!**
   - Settings → Users → Change Password

## 🔧 Troubleshooting

### Backend not responding

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs navodita-erp-backend --lines 50

# Restart if needed
pm2 restart navodita-erp-backend
```

### Frontend shows blank page

1. Check browser console (F12)
2. Verify API URL in `.env.production`
3. Check `.htaccess` is present
4. Clear browser cache

### Database connection error

```bash
# Verify credentials
cat ~/navodita-erp-web/backend/.env

# Test database connection
psql -h localhost -U your_db_user -d navodita_erp_prod
```

### Can't login

1. Ensure admin user was created: `node scripts/create-admin.js`
2. Check backend logs: `pm2 logs navodita-erp-backend`
3. Verify JWT_SECRET is set in `.env`

## 📝 Post-Deployment Tasks

### Immediately After Deployment

- [ ] Login and change admin password
- [ ] Create additional user accounts
- [ ] Setup company profile
- [ ] Configure invoice number settings
- [ ] Add chart of accounts
- [ ] Setup GST settings

### Within 24 Hours

- [ ] Setup database backup cron job
- [ ] Test all major features
- [ ] Configure email settings (if needed)
- [ ] Setup monitoring (UptimeRobot)
- [ ] Document any custom configurations

### Within First Week

- [ ] Train users on the system
- [ ] Import existing data (customers, vendors, items)
- [ ] Test reporting functionality
- [ ] Setup regular backup verification
- [ ] Create user manual/documentation

## 🔄 Updating the Application

When you have new code to deploy:

```bash
# On Hostinger via SSH
cd ~/navodita-erp-web
git pull origin main

# Update backend
cd backend
npm install --production
npm run migrate  # Run any new migrations
pm2 restart navodita-erp-backend

# Update frontend (build locally first)
# Then upload new dist/ folder to public_html
```

## 📞 Get Help

### Common Issues & Solutions

| Problem | Solution |
|---------|----------|
| Port 5001 already in use | Change PORT in .env, restart PM2 |
| Database connection fails | Verify .env credentials match Hostinger DB |
| Frontend 404 errors | Check .htaccess, ensure mod_rewrite enabled |
| API CORS errors | Verify FRONTEND_URL in backend .env |
| SSL not working | Wait 10 mins, regenerate in Hostinger panel |

### Useful Commands

```bash
# View backend logs
pm2 logs navodita-erp-backend

# Monitor resources
pm2 monit

# Restart backend
pm2 restart navodita-erp-backend

# Check database
psql -h localhost -U db_user -d navodita_erp_prod

# View Apache error logs
tail -f ~/logs/error_log
```

## 🎯 Success Metrics

Your deployment is successful when:

✅ Application loads at `https://your-domain.com`
✅ Can login with admin credentials
✅ Can create customers, vendors, items
✅ Can create invoices and bills
✅ Reports load without errors
✅ PDF generation works
✅ Data persists after browser refresh
✅ SSL certificate shows green padlock
✅ Backend stays running (check after 24 hours)

## 📚 Next Steps

After successful deployment:

1. Read the full [DEPLOYMENT.md](./DEPLOYMENT.md) for advanced configuration
2. Setup automated backups
3. Configure monitoring and alerts
4. Document any custom configurations
5. Train users on the system

---

**Estimated Total Time**: 60-90 minutes

**Difficulty**: Intermediate

**Support**: Check logs first, then review DEPLOYMENT.md troubleshooting section

**Version**: 1.0.0 Enterprise Edition
