/**
 * PM2 Ecosystem Configuration for Hostinger Deployment
 * This file configures PM2 process manager for production
 */

module.exports = {
  apps: [
    {
      name: 'navodita-erp-backend',
      script: './src/index.js',
      cwd: '/home/your-username/navodita-erp-web/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
    },
  ],
};
