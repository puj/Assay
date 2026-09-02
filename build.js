#!/usr/bin/env node
// Builds install.html by embedding deepdive.user.js into install.template.html.
// Run after editing either file: node build.js
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const src = fs.readFileSync(path.join(dir, 'deepdive.user.js'), 'utf8');
const tpl = fs.readFileSync(path.join(dir, 'install.template.html'), 'utf8');

if (src.includes('</script')) {
  console.error('deepdive.user.js must not contain "</script" — it is embedded in a <script> tag.');
  process.exit(1);
}
if (!tpl.includes('__USERSCRIPT_SOURCE__')) {
  console.error('install.template.html is missing the __USERSCRIPT_SOURCE__ placeholder.');
  process.exit(1);
}

const out = tpl.replace('__USERSCRIPT_SOURCE__', () => '\n' + src);
fs.writeFileSync(path.join(dir, 'install.html'), out);
console.log('Wrote install.html (' + (out.length / 1024).toFixed(1) + ' KB)');
