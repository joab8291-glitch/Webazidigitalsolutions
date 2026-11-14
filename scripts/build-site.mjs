import { cp, mkdir, readdir, rm, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const adminDir = join(root, 'admin-dashboard');
const adminDist = join(adminDir, 'dist');
const siteDist = join(root, 'site-dist');
const excluded = new Set([
  '.git', '.github', '.vercel', 'node_modules', 'admin-dashboard', 'site-dist',
  'supabase', 'scripts', 'package.json', 'package-lock.json',
  '.gitignore', '.vercelignore', 'README.md', 'SECURITY.md', 'vercel.json'
]);

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
execFileSync(npm, ['install', '--no-audit', '--no-fund'], { cwd: adminDir, stdio: 'inherit' });
execFileSync(npm, ['run', 'build'], { cwd: adminDir, stdio: 'inherit' });

await rm(siteDist, { recursive: true, force: true });
await mkdir(siteDist, { recursive: true });
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (excluded.has(entry.name) || entry.name.startsWith('.env')) continue;
  await cp(join(root, entry.name), join(siteDist, entry.name), { recursive: true, force: true });
}
await cp(adminDist, join(siteDist, 'admin'), { recursive: true });

// Route website enquiry and quote CTAs into the no-login request form instead of WhatsApp.
for (const entry of await readdir(siteDist, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
  const filePath = join(siteDist, entry.name);
  const html = await readFile(filePath, 'utf8');
  const updated = html.replaceAll('https://wa.me/254729914983', 'https://webazi.co.ke/request')
    .replaceAll('fa-whatsapp', 'fa-comment-dots')
    .replaceAll('Open WhatsApp Chat', 'Send Request')
    .replaceAll('WhatsApp Us', 'Send a Request')
    .replaceAll('Chat Now', 'Send a Request')
    .replaceAll('aria-label=\"WhatsApp\"', 'aria-label=\"Send a request\"');
  if (updated !== html) await writeFile(filePath, updated, 'utf8');
}
console.log('Webazi static website and private /admin app assembled in site-dist.');
