module.exports = {
  apps: [
    {
      name: 'backend',
      script: './backend/dist/index.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      // ヘルスチェック設定
      max_memory_restart: '1G',
      listen_timeout: 10000,
      kill_timeout: 5000,
      // 自動再起動設定
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      // ログ設定
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      // 監視設定
      instance_var: 'INSTANCE_ID',
      merge_logs: true
    },
    {
      name: 'frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // ヘルスチェック設定
      max_memory_restart: '512M',
      listen_timeout: 10000,
      kill_timeout: 5000,
      // 自動再起動設定
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      // ログ設定
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      // 監視設定
      instance_var: 'INSTANCE_ID',
      merge_logs: true
    }
  ],

  // デプロイ設定
  deploy: {
    production: {
      user: 'deploy',
      host: process.env.DEPLOY_HOST,
      ref: 'origin/main',
      repo: process.env.GIT_REPO,
      path: '/opt/transcription-system',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    },
    staging: {
      user: 'deploy',
      host: process.env.STAGING_HOST,
      ref: 'origin/develop',
      repo: process.env.GIT_REPO,
      path: '/opt/transcription-system-staging',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': ''
    }
  }
};