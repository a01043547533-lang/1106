import { backupSnapshots } from './repo/index.js';
try { console.log('[backup]', JSON.stringify(await backupSnapshots())); }
catch (error) { console.error('[backup]', error.message); process.exitCode = 1; }
