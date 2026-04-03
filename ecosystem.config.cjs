/**
 * PM2: backend (Express) + frontend (`vite preview`).
 * Default sama dengan dev lokal: backend 3008, frontend 3009 (lihat vite.config.js proxy).
 * Override: SCRAPTOR_BACKEND_PORT, SCRAPTOR_FRONTEND_PORT
 *
 *   set -a && source ./deploy.env && set +a && pm2 start ecosystem.config.cjs
 */
const path = require('path');

const root = __dirname;
const backendPort = String(
  process.env.SCRAPTOR_BACKEND_PORT || process.env.PORT || '3008'
).trim();
const frontendPort = String(
  process.env.SCRAPTOR_FRONTEND_PORT || '3009'
).trim();

module.exports = {
  apps: [
    {
      name: 'scraptor-backend',
      cwd: path.join(root, 'backend'),
      script: 'index.js',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: backendPort,
      },
    },
    {
      name: 'scraptor-frontend',
      cwd: path.join(root, 'frontend'),
      script: 'npm',
      args: [
        'run',
        'preview',
        '--',
        '--host',
        '0.0.0.0',
        '--port',
        frontendPort,
      ],
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
