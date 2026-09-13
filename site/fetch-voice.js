#!/usr/bin/env node
// Stages the offline recogniser for the site to serve. Nothing here is part of
// the extension — the package is manifest.json, assay.js and icons, and that is
// checked by build.js — and nothing here is in git either. Assay fetches these
// two files the first time somebody asks to dictate in a browser that cannot do
// it on its own, and keeps them in the browser's cache from then on.
//
//   npm run fetch-voice          (locally)
//
// It is also the site's build command, so Vercel stages these at deploy time
// and nothing large is ever committed. vercel.json serves /voice/ with
// `Access-Control-Allow-Origin: *`, which is not optional: the chat page is a
// different origin, and without that header the browser refuses the fetch
// before it starts.
//
// This must never fail the deploy. If a file cannot be fetched the site goes
// out without it and dictation says so on the browsers that needed it — which
// is a far better outcome than assay.projectnothing.ai being down.
const fs = require('fs');
const path = require('path');
const https = require('https');

const OUT = path.join(__dirname, 'voice');
const FILES = [
  { name: 'vosk.js',
    url: 'https://cdn.jsdelivr.net/npm/vosk-browser@0.0.8/dist/vosk.js',
    note: 'the recogniser (WASM, inlined)' },
  { name: 'model-en.zip',
    url: 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip',
    // Named by the primary subtag, so en-GB and en-AU reach it too.
    note: 'the small English model' }
];

function get(url, file, cb, redirects) {
  https.get(url, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      if ((redirects || 0) > 5) return cb(new Error('too many redirects'));
      res.resume();
      return get(res.headers.location, file, cb, (redirects || 0) + 1);
    }
    if (res.statusCode !== 200) { res.resume(); return cb(new Error('HTTP ' + res.statusCode)); }
    const total = +(res.headers['content-length'] || 0);
    let got = 0, last = -1;
    const out = fs.createWriteStream(file + '.part');
    res.on('data', (c) => {
      got += c.length;
      if (!total) return;
      const pct = Math.floor((got / total) * 100 / 5) * 5;
      if (pct !== last) { last = pct; process.stdout.write('\r  ' + pct + '%   '); }
    });
    res.pipe(out);
    out.on('finish', () => { out.close(() => { fs.renameSync(file + '.part', file); cb(null, got); }); });
  }).on('error', cb);
}

fs.mkdirSync(OUT, { recursive: true });
(function next(i) {
  if (i >= FILES.length) {
    console.log('\nStaged in site/voice/. Serve it with Access-Control-Allow-Origin: *');
    return;
  }
  const f = FILES[i];
  const dest = path.join(OUT, f.name);
  if (fs.existsSync(dest)) {
    console.log(f.name + ' — already here (' + (fs.statSync(dest).size / 1048576).toFixed(1) + ' MB)');
    return next(i + 1);
  }
  process.stdout.write(f.name + ' — ' + f.note + '\n');
  get(f.url, dest, (err, bytes) => {
    if (err) {
      console.error('\n  FAILED: ' + err.message + '\n  voice will be unavailable for browsers that need it;' +
        ' fetch it by hand from ' + f.url);
      return next(i + 1);   // deliberately not fatal — see the note at the top
    }
    console.log('\r  ' + (bytes / 1048576).toFixed(1) + ' MB');
    next(i + 1);
  });
})(0);
