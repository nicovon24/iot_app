const { spawnSync } = require('node:child_process');

require('dotenv').config();

const runtimeUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL || runtimeUrl;

if (!runtimeUrl || !directUrl) {
  console.error('DATABASE_URL is required to deploy Prisma migrations');
  process.exit(1);
}

let runtime;
let direct;
try {
  runtime = new URL(runtimeUrl);
  direct = new URL(directUrl);
} catch {
  console.error('DATABASE_URL and DIRECT_URL must be valid PostgreSQL URLs');
  process.exit(1);
}

if (
  !['postgres:', 'postgresql:'].includes(direct.protocol) ||
  !['postgres:', 'postgresql:'].includes(runtime.protocol) ||
  direct.hostname.includes('-pooler') ||
  (runtime.hostname.includes('-pooler') && !process.env.DIRECT_URL) ||
  runtime.hostname.replace('-pooler.', '.') !== direct.hostname ||
  runtime.port !== direct.port ||
  runtime.pathname !== direct.pathname ||
  runtime.username !== direct.username
) {
  console.error('Use a direct PostgreSQL URL for migrations to the same database and user');
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
  {
    cwd: require('node:path').resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: directUrl },
    stdio: 'inherit',
  },
);

if (result.error) {
  console.error(`Prisma migration process failed: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
