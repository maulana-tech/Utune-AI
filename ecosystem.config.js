/**
 * PM2 on the VPS: NestJS API + BullMQ worker (+ optional camofox).
 * apps/web runs on Vercel and is not here.
 *
 * Both apps run their tsc output with the tsx loader (`node --import tsx`), because
 * @repo/ai and @repo/shared export raw .ts — plain `node dist/...` cannot load them.
 * .env is read from the repo root.
 */
const path = require('path');
const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'api',
      cwd: root,
      script: 'apps/api/dist/main.js',
      interpreter: 'node',
      node_args: '--import tsx -r dotenv/config',
      env: { NODE_ENV: 'production', PORT: 3001, DOTENV_CONFIG_PATH: path.join(root, '.env') },
    },
    {
      name: 'workers',
      cwd: root,
      script: 'apps/workers/dist/index.js',
      interpreter: 'node',
      node_args: '--import tsx -r dotenv/config',
      env: { NODE_ENV: 'production', DOTENV_CONFIG_PATH: path.join(root, '.env') },
    },
    // Optional: free JS-rendering layer for contact enrichment. Uncomment, then set
    // CAMOFOX_URL="http://localhost:9377" in .env. Needs ~60MB idle, a few hundred MB per open tab.
    // {
    //   name: 'camofox',
    //   cwd: root,
    //   script: 'npx',
    //   args: '@askjo/camofox-browser',
    //   interpreter: 'none',
    //   env: { NODE_ENV: 'production' },
    // },
  ],
};
