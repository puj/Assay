#!/usr/bin/env node
// One payload, three delivery formats. From src/winnow.core.js this builds:
//   winnow.user.js       — userscript (metadata header + core)
//   extension/winnow.js  — WebExtension content script (verbatim core)
//   install.html           — install page with the userscript embedded
//                            (the page derives the bookmarklet from it)
//   winnow-extension.zip — extension package, if `zip` is available
// Run after editing src/winnow.core.js or install.template.html: node build.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dir = __dirname;
const core = fs.readFileSync(path.join(dir, 'src', 'winnow.core.js'), 'utf8');

const versionMatch = core.match(/VERSION = '([^']+)'/);
const version = versionMatch ? versionMatch[1] : '0.0.0';

if (core.includes('</script')) {
  console.error('core must not contain "</script" — it is embedded in a <script> tag.');
  process.exit(1);
}

const header = [
  '// ==UserScript==',
  '// @name         Winnow — deep dive for AI chats',
  '// @namespace    https://projectnothing.ai/winnow',
  '// @version      ' + version,
  '// @description  Tap to collect, highlight and annotate passages in AI chats, then send them back as one deep-dive payload. 100% local, no API. Export .md/.txt built in. A Project Nothing experiment.',
  '// @author       puj',
  '// @match        https://chatgpt.com/*',
  '// @match        https://chat.openai.com/*',
  '// @match        https://claude.ai/*',
  '// @grant        none',
  '// @run-at       document-idle',
  '// ==/UserScript==',
  '',
  ''
].join('\n');

const userscript = header + core;
fs.writeFileSync(path.join(dir, 'winnow.user.js'), userscript);
fs.writeFileSync(path.join(dir, 'extension', 'winnow.js'), core);

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

let zipNote = 'zip tool not found — skipped extension zip';
try {
  execSync('cd "' + path.join(dir, 'extension') + '" && rm -f ../winnow-extension.zip && zip -q -X -r ../winnow-extension.zip manifest.json winnow.js icons', { stdio: 'pipe' });
  zipNote = 'winnow-extension.zip';
} catch (e) {}

console.log('v' + version + ': winnow.user.js, extension/winnow.js, install.html (' +
  (out.length / 1024).toFixed(1) + ' KB), ' + zipNote);
