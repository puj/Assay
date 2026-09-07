#!/usr/bin/env node
// Mint the refresh token the release workflow needs to upload to the Chrome
// Web Store. Run it once, on a machine with a browser:
//
//   node scripts/cws-refresh-token.js
//
// It asks for the OAuth client id and secret from your Google Cloud project
// (the one with the Chrome Web Store API enabled), opens a loopback listener,
// prints the URL to authorise, and swaps the code it receives for a refresh
// token. Nothing is stored or sent anywhere but Google.
//
// Zero dependencies; needs Node 18+ for fetch.

const http = require('http');
const readline = require('readline');

const SCOPE = 'https://www.googleapis.com/auth/chromewebstore';
const TOKEN_URL = process.env.CWS_TOKEN_URL || 'https://oauth2.googleapis.com/token';
const AUTH_URL = process.env.CWS_AUTH_URL || 'https://accounts.google.com/o/oauth2/auth';
const PORT = Number(process.env.CWS_PORT || 8818);
const REDIRECT = 'http://localhost:' + PORT;

function ask(question, silent) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  return new Promise((resolve) => {
    if (silent) {
      // Don't echo a secret into the scrollback.
      const write = rl._writeToOutput ? rl._writeToOutput.bind(rl) : null;
      rl._writeToOutput = function (s) { if (write && !/\S/.test(s.replace(question, ''))) write(s); };
    }
    rl.question(question, (answer) => { rl.close(); if (silent) process.stdout.write('\n'); resolve(answer.trim()); });
  });
}

// Serve one request: the browser lands here with ?code=… after you approve.
function waitForCode() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, REDIRECT);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><meta charset="utf-8"><style>body{font:16px/1.6 system-ui;margin:15vh auto;max-width:30em;text-align:center}</style>' +
        (code ? '<h1>Done.</h1><p>Close this tab and go back to the terminal.</p>'
              : '<h1>No code came back.</h1><p>' + (error || 'unknown error') + '</p>'));
      server.close();
      if (code) resolve(code); else reject(new Error(error || 'no code in the callback'));
    });
    server.on('error', reject);
    server.listen(PORT, '127.0.0.1');
  });
}

(async () => {
  const clientId = process.env.CWS_CLIENT_ID || await ask('OAuth client id: ');
  const clientSecret = process.env.CWS_CLIENT_SECRET || await ask('OAuth client secret: ', true);
  if (!clientId || !clientSecret) {
    console.error('Both the client id and the secret are needed. Create them under\n' +
      'APIs & Services → Credentials → Create credentials → OAuth client ID → Desktop app.');
    process.exit(1);
  }

  const authorise = AUTH_URL + '?' + new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT,
    scope: SCOPE,
    // Both are needed, or Google returns an access token with no refresh token.
    access_type: 'offline',
    prompt: 'consent'
  }).toString();

  console.log('\nOpen this in a browser signed in as the Chrome Web Store developer:\n');
  console.log('  ' + authorise + '\n');
  console.log('Waiting for the callback on ' + REDIRECT + ' …');

  const code = await waitForCode();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT
    }).toString()
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.refresh_token) {
    console.error('\nGoogle did not return a refresh token (HTTP ' + res.status + '):');
    console.error(JSON.stringify(body, null, 2));
    if (body.access_token && !body.refresh_token) {
      console.error('\nAn access token came back but no refresh token — this account has already\n' +
        'granted the app. Revoke it at https://myaccount.google.com/permissions and rerun.');
    }
    process.exit(1);
  }

  console.log('\nRefresh token:\n\n  ' + body.refresh_token + '\n');
  console.log('Set these three repo secrets (Settings → Secrets and variables → Actions),');
  console.log('or with the gh CLI:\n');
  console.log('  gh secret set CWS_CLIENT_ID     --repo puj/Assay --body ' + JSON.stringify(clientId));
  console.log('  gh secret set CWS_CLIENT_SECRET --repo puj/Assay --body ' + JSON.stringify(clientSecret));
  console.log('  gh secret set CWS_REFRESH_TOKEN --repo puj/Assay --body ' + JSON.stringify(body.refresh_token));
  console.log('\nIf the OAuth consent screen is still in "Testing", this token stops working\n' +
    'after seven days. Set it to "In production" (Audience → Publish app) to keep it.');
})().catch((err) => { console.error('\n' + (err && err.message ? err.message : err)); process.exit(1); });
