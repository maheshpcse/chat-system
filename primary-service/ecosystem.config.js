/**
 * PM2 process file — production process manager for primary-service
 * Usage (on VPS after git pull + npm ci --omit=dev):
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save && pm2 startup
 *
 * Rollback: pm2 reload ecosystem.config.js --update-env
 * Zero-downtime: exec_mode cluster + instances max
 */
module.exports = {
  apps: [
    {
      name: "chat-primary-service",
      script: "src/server.js",
      cwd: __dirname,
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "512M",
      kill_timeout: 10000,
      listen_timeout: 10000,
      exp_backoff_restart_delay: 200,
      merge_logs: true,
      time: true,
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      env: {
        NODE_ENV: "development",
        APP_ENV: "development",
        APP_PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        APP_ENV: "production",
        APP_PORT: 3000,
        // Prefer loading secrets from OS env / systemd / Docker, not this file
      },
    },
  ],
};
