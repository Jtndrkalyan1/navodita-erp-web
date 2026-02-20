# Hostinger Manual Deployment Commands

## STEP 1: SSH into Hostinger

Replace `your-username` and `your-domain.com` with your actual Hostinger credentials:

```bash
ssh your-username@your-domain.com
```

Enter your SSH password when prompted.

---

## STEP 2: Clone Repository

```bash
# Navigate to home directory
cd ~

# Clone your GitHub repository
git clone https://github.com/Jtndrkalyan1/navodita-erp-web.git

# Go to backend directory
cd navodita-erp-web/backend
```

---

## STEP 3: Install Dependencies

```bash
# Install all Node.js packages
npm install --production
```

This will take 2-3 minutes.

---

## STEP 4: Create Environment File

```bash
# Create .env file
nano .env
```

**Paste this and UPDATE with YOUR actual database credentials:**

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=navodita_erp_prod
DB_USER=YOUR_ACTUAL_DB_USERNAME
DB_PASSWORD=YOUR_ACTUAL_DB_PASSWORD

PORT=5001
NODE_ENV=production

JWT_SECRET=your-random-secret-min-32-characters-change-this
SESSION_SECRET=another-random-secret-min-32-chars-change-this

FRONTEND_URL=https://navodita.erp.com
```

**To save the file:**
- Press `Ctrl+O` (that's the letter O, not zero)
- Press `Enter`
- Press `Ctrl+X` to exit

---

## STEP 5: Run Database Migrations

```bash
# Create all database tables
npm run migrate

# Verify migrations worked
npm run migrate:status
```

You should see a list of completed migrations.

---

## STEP 6: Create Admin User

```bash
# Run the admin creation script
node scripts/create-admin.js
```

You should see:
```
✅ Admin user created successfully!
Username: admin
Password: Admin@123
```

---

## STEP 7: Install and Start PM2

```bash
# Install PM2 globally
npm install -g pm2

# Update ecosystem.config.js with your actual username
nano ecosystem.config.js
```

**Find this line:**
```javascript
cwd: '/home/YOUR_USERNAME/navodita-erp-web/backend',
```

**Change YOUR_USERNAME to your actual Hostinger username** (the one you used for SSH).

Save with `Ctrl+O`, `Enter`, `Ctrl+X`.

**Start the application:**

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Make PM2 start on server reboot
pm2 startup
```

The last command will show you a command to run - **copy and run it**.

**Verify it's running:**

```bash
# Check status
pm2 status

# View logs
pm2 logs navodita-erp-backend --lines 20
```

You should see "Server running on port 5001" in the logs.

---

## STEP 8: Test Backend API

```bash
# Test if backend is responding
curl http://localhost:5001/health
```

You should see: `{"status":"ok"}`

---

## NEXT STEPS:

1. **Build Frontend** (on your local Mac)
2. **Upload to public_html**
3. **Configure domain and SSL**

See QUICK-START.md for detailed frontend deployment steps.

---

## Troubleshooting

### If backend won't start:

```bash
# Check logs for errors
pm2 logs navodita-erp-backend --lines 50

# Common issues:
# 1. Database credentials wrong - edit .env and fix them
# 2. Port 5001 in use - change PORT in .env to 5002
# 3. Missing dependencies - run: npm install --production
```

### If migrations fail:

```bash
# Check database connection
psql -h localhost -U your_db_user -d navodita_erp_prod

# If it connects, your credentials are correct
# Type \q to exit
```

---

**Need help?** Check the error message in `pm2 logs` and refer to DEPLOYMENT.md troubleshooting section.
