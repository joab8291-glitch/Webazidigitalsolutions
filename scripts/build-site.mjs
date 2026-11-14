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

const enquiryStyles = `<style id="webazi-request-cta-styles">
/* Repair uneven desktop card rows and prevent text overflow */
#page-services .grid-4{grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch;gap:22px;}
#page-services .grid-4>.card{height:100%;min-width:0;}
.vgrid{grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch;gap:2px;}
.vc{height:100%;min-width:0;overflow-wrap:anywhere;}
.vc h3,.card h3,.price-card h3{line-height:1.35;overflow-wrap:break-word;text-wrap:pretty;}
.vc p,.card p,.price-card p,.plist li{line-height:1.65;overflow-wrap:break-word;word-break:normal;}
.card,.price-card{min-width:0;}
.card-icon,.vc-icon{flex:0 0 auto;}
@media(min-width:761px) and (max-width:1100px){
  #page-services .grid-4{grid-template-columns:repeat(2,minmax(0,1fr));}
  .vgrid{grid-template-columns:repeat(2,minmax(0,1fr));}
}
@media(max-width:760px){
  #page-services .grid-4,.vgrid{grid-template-columns:minmax(0,1fr);gap:14px;}
  .vc{padding:24px 20px;}
  .vc h3,.card h3{font-size:1rem;}
  .vc p,.card p{font-size:.88rem;line-height:1.7;}
}
body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
/* Consistent request CTA and message-icon alignment */
.wa-btn,.call-btn,.btn-buy,.btn-p,.wa-popup a{
  display:inline-flex;align-items:center;justify-content:center;gap:.65rem;
  text-align:center;line-height:1.35;vertical-align:middle;white-space:normal;
}
.wa-btn,.call-btn{width:100%;min-height:50px;padding:14px 18px;}
.btn-buy{width:100%;min-height:44px;padding:12px 14px;}
.btn-p{min-height:46px;padding:13px 22px;}
.wa-btn i,.call-btn i,.btn-buy i,.btn-p i,.wa-popup a i{
  display:inline-block;flex:0 0 auto;line-height:1;font-size:1.05em;
}
.tb-soc,.fsoc,.ci-icon,.wa-float{
  display:inline-flex;align-items:center;justify-content:center;line-height:1;
}
.tb-soc i,.fsoc i,.ci-icon i,.wa-float i{display:block;line-height:1;}
.mcb-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;line-height:1.25;text-align:center;}
.mcb-btn i{display:block;line-height:1;font-size:1.15rem;}
.cm-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;line-height:1.35;}
.cm-btn i{display:block;line-height:1;font-size:1.35rem;}
.ci-item{display:flex;align-items:center;gap:14px;min-width:0;}
.ci-item>div:last-child{min-width:0;}
.wa-popup a{min-height:42px;padding:10px 14px;text-decoration:none;}
@media(max-width:600px){
  .wa-btn,.call-btn,.btn-buy,.btn-p,.wa-popup a{gap:9px;font-size:14px;}
  .wa-float{width:54px;height:54px;right:16px;bottom:82px;}
  .wa-popup{right:16px;bottom:145px;max-width:min(280px,calc(100vw - 32px));}
}
</style>
`;

// Route website enquiry and quote CTAs into the no-login request form instead of WhatsApp.
for (const entry of await readdir(siteDist, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
  const filePath = join(siteDist, entry.name);
  const html = await readFile(filePath, 'utf8');
  const updated = html
    .replace('</head>', enquiryStyles + '\n</head>')
    // Route every public WhatsApp destination to the shared Webazi request form.
    .replace(/https?:\/\/(?:api\.)?whatsapp\.com\/send\?[^\s"'`<>]*/gi, '/request')
    .replace(/https?:\/\/wa\.me\/[^\s"'`<>]*/gi, '/request')
    .replace(/whatsapp:\/\/send\?[^\s"'`<>]*/gi, '/request')
    .replaceAll('fab fa-whatsapp', 'fas fa-comment-dots')
    .replaceAll('fa-whatsapp', 'fa-comment-dots')
    .replaceAll('fab fa-comment-dots', 'fas fa-comment-dots')
    .replaceAll('Open WhatsApp Chat', 'Send Request')
    .replaceAll('WhatsApp Us', 'Send a Request')
    .replaceAll('Chat Now', 'Send a Request')
    .replaceAll('aria-label="WhatsApp"', 'aria-label="Send a request"')
    .replaceAll('Order via WhatsApp', 'Send Enquiry')
    .replaceAll('Get This Quote on WhatsApp', 'Request This Quote')
    .replaceAll('Confirm Booking via WhatsApp', 'Confirm Booking')
    .replaceAll('Request Call Back via WhatsApp', 'Request a Call Back');
  if (updated !== html) await writeFile(filePath, updated, 'utf8');
}
console.log('Webazi static website and private /admin app assembled in site-dist.');
