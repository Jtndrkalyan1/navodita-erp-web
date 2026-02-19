/**
 * PM2 Ecosystem Configuration - NavoditaERP
 *
 * Usage:
 *   pm2 start ecosystem.config.js          # Start in production
 *   pm2 start ecosystem.config.js --env development  # Start in dev
 *   pm2 restart navodita-erp               # Restart
 *   pm2 stop navodita-erp                  # Stop
 *   pm2 logs navodita-erp                  # View logs
 *   pm2 monit                              # Monitor dashboard
 *   pm2 save                               # Save process list (auto-restart on reboot)
 *   pm2 startup                            # Enable auto-start on system boot
 */
module.exports = {
  apps: [
    {
      name: 'navodita-erp',
      script: 'backend/src/index.js',
      cwd: __dirname,

      // Environment
      env: {
        NODE_ENV: 'development',
        PORT: 5001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
      },

      // Process management
      instances: 1,           // Single instance (use 'max' for cluster mode)
      exec_mode: 'fork',      // Use 'cluster' with multiple instances
      autorestart: true,
      watch: false,            // Set to true for auto-reload on file changes
      max_memory_restart: '512M',

      // Logs
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      merge_logs: true,

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,

      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
    },
  ],
};
