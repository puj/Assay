#!/usr/bin/env node
// One payload, three delivery formats. From src/assay.core.js this builds:
//   assay.user.js       — userscript (metadata header + core)
//   extension/assay.js  — WebExtension content script (verbatim core)
//   install.html           — install page with the userscript embedded
//                            (the page derives the bookmarklet from it)
//   assay-extension.zip — extension package, if `zip` is available
// Run after editing src/assay.core.js or install.template.html: node build.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dir = __dirname;
const core = fs.readFileSync(path.join(dir, 'src', 'assay.core.js'), 'utf8');

const versionMatch = core.match(/VERSION = '([^']+)'/);
const version = versionMatch ? versionMatch[1] : '0.0.0';

if (core.includes('</script')) {
  console.error('core must not contain "</script" — it is embedded in a <script> tag.');
  process.exit(1);
}

// Two userscripts, one core. The plain one keeps `@grant none`, which is what
// lets it run in the page itself — every existing install stays exactly as it
// is. The voice one asks for the three grants dictation needs and is a separate
// install, because a grant moves the script into the manager's sandbox and that
// is not a change to make on everybody's behalf for a feature most never use.
const meta = (voice) => [
  '// ==UserScript==',
  '// @name         Assay' + (voice ? ' + voice' : '') + ' — deep dive for AI chats',
  '// @namespace    https://projectnothing.ai/assay',
  '// @version      ' + version,
  '// @description  Tap to collect, highlight and annotate passages in AI chats, then send them back as one deep-dive payload. 100% local, no API. Export .md/.txt built in. A Project Nothing experiment.',
  '// @author       puj',
  '// @homepageURL  https://assay.projectnothing.ai',
  '// @supportURL   https://github.com/puj/Assay/issues',
  '// @updateURL    https://assay.projectnothing.ai/assay' + (voice ? '-voice' : '') + '.user.js',
  '// @downloadURL  https://assay.projectnothing.ai/assay' + (voice ? '-voice' : '') + '.user.js',
  '// @icon         https://assay.projectnothing.ai/icon.png',
  '// @match        https://chatgpt.com/*',
  '// @match        https://chat.openai.com/*',
  '// @match        https://claude.ai/*',
  '// @match        https://github.com/*',
  '// @match        https://gist.github.com/*',
].concat(voice ? [
  // The manager fetches these, not the page — which is the whole point: a
  // chat page's connect-src will not let a script inside it reach our host.
  '// @resource     vosk https://assay.projectnothing.ai/voice/vosk.js',
  '// @connect      assay.projectnothing.ai',
  '// @grant        GM_xmlhttpRequest',
  '// @grant        GM_getResourceText',
  '// @grant        GM_getResourceURL',
  '// @grant        unsafeWindow'
] : [
  '// @grant        none'
]).concat([
  '// @run-at       document-idle',
  '// ==/UserScript==',
  '',
  ''
]).join('\n');

const userscript = meta(false) + core;
const voiceScript = meta(true) + core;
fs.writeFileSync(path.join(dir, 'assay.user.js'), userscript);
fs.writeFileSync(path.join(dir, 'assay-voice.user.js'), voiceScript);
fs.writeFileSync(path.join(dir, 'extension', 'assay.js'), core);

const manifestPath = path.join(dir, 'extension', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.version !== version) {
  manifest.version = version;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

const tpl = fs.readFileSync(path.join(dir, 'install.template.html'), 'utf8');
if (!tpl.includes('__USERSCRIPT_SOURCE__')) {
  console.error('install.template.html is missing the __USERSCRIPT_SOURCE__ placeholder.');
  process.exit(1);
}
const out = tpl.replace('__USERSCRIPT_SOURCE__', () => '\n' + userscript);
fs.writeFileSync(path.join(dir, 'install.html'), out);

// The public site ships the install page, the raw userscript (Tampermonkey
// installs and auto-updates from its URL), and the icon.
const site = path.join(dir, 'site');
fs.mkdirSync(site, { recursive: true });
fs.writeFileSync(path.join(site, 'install.html'), out);
fs.writeFileSync(path.join(site, 'assay.user.js'), userscript);
fs.writeFileSync(path.join(site, 'assay-voice.user.js'), voiceScript);
fs.copyFileSync(path.join(dir, 'extension', 'icons', 'icon128.png'), path.join(site, 'icon.png'));
fs.copyFileSync(path.join(dir, 'extension', 'icons', 'icon256.png'), path.join(site, 'icon-256.png'));

// Reproducible package: the zip is built from a staging copy whose file
// times are pinned, so rebuilding any tagged commit yields a byte-identical
// zip — the checksum on a GitHub Release can be verified by anyone.
let zipNote = 'zip tool not found — skipped extension zip';
try {
  const stage = fs.mkdtempSync(path.join(require('os').tmpdir(), 'assay-pkg-'));
  fs.cpSync(path.join(dir, 'extension'), stage, { recursive: true });
  const pin = new Date('2026-01-01T00:00:00Z');
  const walk = (p) => { fs.utimesSync(p, pin, pin); if (fs.statSync(p).isDirectory()) fs.readdirSync(p).forEach(n => walk(path.join(p, n))); };
  walk(stage);
  execSync('cd "' + stage + '" && rm -f "' + path.join(dir, 'assay-extension.zip') + '" && zip -q -X -r -D "' + path.join(dir, 'assay-extension.zip') + '" manifest.json assay.js vosk.js icons', { stdio: 'pipe' });
  fs.rmSync(stage, { recursive: true, force: true });
  zipNote = 'assay-extension.zip';
} catch (e) {}

console.log('v' + version + ': assay.user.js, assay-voice.user.js, extension/assay.js, site/, install.html (' +
  (out.length / 1024).toFixed(1) + ' KB), ' + zipNote);
