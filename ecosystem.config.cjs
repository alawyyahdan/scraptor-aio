/**
 * PM2: backend dan frontend terpisah.
 * Wajib set env sebelum `pm2 start` (lihat deploy.env yang dibuat vps-pm2-setup.sh):
 *   SCRAPTOR_BACKEND_PORT  — port Express
 *   SCRAPTOR_FRONTEND_PORT — port `vite preview`
 *
 * Contoh:
 *   set -a && source ./deploy.env && set +a && pm2 start ecosystem.config.cjs
 */
const path = require('path');

const root = __dirname;
const backendPort = String(
  process.env.SCRAPTOR_BACKEND_PORT || process.env.PORT || '5001'
).trim();
const frontendPort = String(
  process.env.SCRAPTOR_FRONTEND_PORT || '4173'
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
