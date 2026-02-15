import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

execSync(`bunx pkgroll --env.PKG_VERSION=${pkg.version}`, {
    stdio: 'inherit',
    cwd: join(__dirname, '..'),
});
