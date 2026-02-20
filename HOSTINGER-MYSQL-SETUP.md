# Hostinger MySQL Deployment Guide

Your Navodita ERP is now configured to work with both PostgreSQL (local) and MySQL (Hostinger production).

## Part 1: Create MySQL Database on Hostinger

### Step 1: Access Database Management

1. In your Hostinger dashboard, you're already on the **Management** page
2. You should see: **"Create a New MySQL Database And Database User"**

### Step 2: Create Database

Fill in the form:

- **MySQL database name**: Type `navodita_erp` (the prefix `u751581894_` will be added automatically)
- **MySQL username**: Type `navodita_user` (the prefix will be added)
- **Password**: Click the eye icon and **SAVE THIS PASSWORD SOMEWHERE SAFE!**

Click **"Create"** button

### Step 3: Save Your Database Credentials

After clicking Create, you'll see your database details. **WRITE THESE DOWN:**

```
Database Name: u751581894_navodita_erp
Username: u751581894_navodita_user
Password: [the password you just created]
Host: localhost
Port: 3306
```

---

## Part 2: Upload Your Application Files

### Option A: File Manager Upload (Recommended for beginners)

1. In the left sidebar, click **"Files"** → **"File Manager"**
2. Navigate to `/public_html` folder
3. Create a new folder called `erp-backend`
4. Go into the `erp-backend` folder
5. Click **"Upload"** button
6. Upload the ZIP file I'll create for you (see Step 2A below)

### Step 2A: Create Deployment ZIP

Let me create a clean ZIP file for you to upload:

**On your Mac, open Terminal and run:**

```bash
cd ~/Desktop/navodita-erp-web

# Create a clean ZIP without node_modules and uploads
zip -r navodita-backend-hostinger.zip backend \
  -x "backend/node_modules/*" \
  -x "backend/.env" \
  -x "backend/uploads/*" \
  -x "backend/.DS_Store"
```

This creates `navodita-backend-hostinger.zip` on your Desktop.

### Option B: SSH Upload (Advanced)

If you prefer SSH, I'll give you those commands later.

---

## Part 3: Configure Environment Variables

### Step 3A: Go Back to Hostinger File Manager

1. Navigate to `/public_html/erp-backend/backend/`
2. Find the file `.env.production`
3. Click on it → **"Edit"**

### Step 3B: Update Database Credentials

Replace the placeholder values with YOUR actual database credentials from Step 3:

```env
# Database Configuration
DB_CLIENT=mysql2
DB_HOST=localhost
DB_PORT=3306
DB_NAME=u751581894_navodita_erp
DB_USER=u751581894_navodita_user
DB_PASSWORD=your_actual_password_from_step3

# Server Configuration
PORT=5001
NODE_ENV=production

# JWT Configuration (Generate random 32+ character strings)
JWT_SECRET=change-this-to-random-32-chars-min-use-password-generator
JWT_EXPIRES_IN=7d

# CORS Configuration
FRONTEND_URL=https://navoditaapparel.com

# Session Secret (Another random 32+ character string)
SESSION_SECRET=another-random-32-chars-different-from-jwt

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Application
APP_NAME=Navodita ERP
COMPANY_NAME=Navodita Apparel

# Timezone
TZ=Asia/Kolkata
```

**IMPORTANT**: Generate strong random secrets for `JWT_SECRET` and `SESSION_SECRET`!
You can use: https://www.random.org/strings/?num=2&len=40&digits=on&upperalpha=on&loweralpha=on&unique=on&format=html&rnd=new

Save the file.

### Step 3C: Rename .env.production to .env

1. Right-click on `.env.production`
2. Click **"Rename"**
3. Rename it to: `.env`

---

## Part 4: Install Dependencies via SSH

You'll need SSH access to install Node.js packages and run migrations.

### Step 4A: Enable SSH Access

1. In Hostinger sidebar, click **"Advanced"**
2. Click **"SSH Access"**
3. If disabled, click **"Enable SSH"**
4. Note down:
   - **SSH Hostname**: (something like `srv123.hostinger.com`)
   - **SSH Port**: Usually `65002` for Hostinger
   - **Username**: Your Hostinger username (e.g., `u751581894`)
   - **Password**: Your Hostinger account password

### Step 4B: Connect via SSH

**On your Mac, open Terminal:**

```bash
ssh -p 65002 your_username@your_hostname
```

Replace:
- `your_username` with your actual Hostinger username
- `your_hostname` with your SSH hostname
- `65002` might be different - check your Hostinger SSH page

Enter your password when prompted.

### Step 4C: Navigate to Your Backend Directory

```bash
cd public_html/erp-backend/backend
```

### Step 4D: Install Node.js Packages

```bash
npm install --production
```

This will take 3-5 minutes.

---

## Part 5: Run Database Migrations

Still in SSH terminal:

### Step 5A: Run Migrations

```bash
npm run migrate
```

You should see:
```
Batch 1 run: 28 migrations
```

### Step 5B: Check Migration Status

```bash
npm run migrate:status
```

You should see all migrations listed as "completed".

### Step 5C: Create Admin User

```bash
node scripts/create-admin.js
```

You should see:
```
✅ Admin user created successfully!
═══════════════════════════════════════
  Username: admin
  Password: Admin@123
  Email:    admin@navodita.com
  Role:     Admin
═══════════════════════════════════════
```

**SAVE THESE CREDENTIALS!**

---

## Part 6: Start the Application with PM2

### Step 6A: Install PM2 Globally

```bash
npm install -g pm2
```

### Step 6B: Update ecosystem.config.js

First, find your current working directory:

```bash
pwd
```

This will show something like: `/home/u751581894/public_html/erp-backend/backend`

Now edit the ecosystem file:

```bash
nano ecosystem.config.js
```

Find the line with `cwd:` and update it to your actual path from above.

Press `Ctrl+O` to save, `Enter` to confirm, `Ctrl+X` to exit.

### Step 6C: Start with PM2

```bash
pm2 start ecosystem.config.js
```

### Step 6D: Save PM2 Configuration

```bash
pm2 save
pm2 startup
```

The last command will show you a command to run - **copy and paste it**, then run it.

### Step 6E: Check if Backend is Running

```bash
pm2 status
```

You should see:
```
│ name                  │ status │
│ navodita-erp-backend │ online │
```

Check the logs:
```bash
pm2 logs navodita-erp-backend --lines 20
```

You should see: `Server running on port 5001`

---

## Part 7: Test Your Backend API

Still in SSH, test if the API is responding:

```bash
curl http://localhost:5001/health
```

You should see:
```json
{"status":"ok"}
```

**Success!** Your backend is now running! 🎉

---

## Part 8: Next Steps - Frontend Deployment

Now you need to deploy the frontend to access your ERP. Two options:

### Option A: Build Frontend Locally and Upload

1. On your Mac, build the frontend:
   ```bash
   cd ~/Desktop/navodita-erp-web/frontend
   npm run build
   ```

2. Upload the `dist/` folder contents to `/public_html` on Hostinger

3. Configure your domain to point to `/public_html`

### Option B: Use a Subdomain for Backend

1. Create subdomain: `api.navoditaapparel.com`
2. Point it to `/public_html/erp-backend/backend`
3. Access backend at: `https://api.navoditaapparel.com:5001`

---

## Troubleshooting

### Backend won't start

```bash
pm2 logs navodita-erp-backend --lines 50
```

Check for error messages.

### Database connection failed

1. Verify credentials in `.env` file
2. Check database exists in Hostinger > Databases > Management
3. Test connection:
   ```bash
   mysql -h localhost -u u751581894_navodita_user -p u751581894_navodita_erp
   ```

### Port 5001 already in use

Edit `.env` and change `PORT=5001` to `PORT=5002`, then restart:
```bash
pm2 restart navodita-erp-backend
```

---

## Useful PM2 Commands

```bash
# Restart backend
pm2 restart navodita-erp-backend

# Stop backend
pm2 stop navodita-erp-backend

# View logs
pm2 logs navodita-erp-backend

# Monitor resources
pm2 monit
```

---

**You're almost there! Follow these steps carefully and your ERP will be live!** 🚀
