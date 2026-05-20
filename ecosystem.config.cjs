/** PM2 — chạy từ thư mục gốc repo: `pm2 start ecosystem.config.cjs` */
module.exports = {
  apps: [
    {
      name: 'core-api',
      cwd: './apps/core-api',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'worker',
      cwd: './apps/worker',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
