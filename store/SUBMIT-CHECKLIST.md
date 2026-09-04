# Store submission checklist

Everything in the repo is ready; the steps below need a human (accounts,
payments, forms). Budget ~1 hour of clicking total.

## 0. One-time prep (both stores)

- [ ] Deploy the site: Vercel → Add New Project → import **puj/Winnow** →
      Root Directory `site`, Framework "Other", no build command → add
      domain **winnow.projectnothing.ai** (CNAME to cname.vercel-dns.com
      in the projectnothing.ai DNS). That publishes the landing page,
      /install, /privacy and the auto-updating /winnow.user.js.
- [ ] In the ProjectNothing repo, redirect `/winnow` →
      https://winnow.projectnothing.ai (vercel.json `redirects`, or the
      framework's redirect config) and add Winnow to the experiments index.
- [ ] The contact email in `site/privacy.html` is currently
      vango85@gmail.com — swap for an alias if you don't want it public;
      stores also display your developer contact email.
- [ ] Decide trader status (EU DSA question both stores ask). Monetizing →
      "trader", and your contact details become publicly visible on the
      listing.
- [ ] `node build.js` for a fresh `winnow-extension.zip`.

## 1. Firefox AMO — do this one first (free, covers desktop AND Android)

- [ ] Create the account: https://addons.mozilla.org/developers/ (free).
- [ ] Submit a new add-on → upload `winnow-extension.zip` → channel:
      **Listed**.
- [ ] It's plain unminified JS, so no source-code archive is needed.
- [ ] Paste name/summary/description/tags/categories from `LISTING.md`;
      slug `winnow`; upload `extension/icons/icon128.png` and the
      screenshots from `store/`.
- [ ] License: MIT (matches the repo `LICENSE`). Privacy policy URL:
      https://winnow.projectnothing.ai/privacy.
- [ ] Android compatibility is declared in the manifest
      (`gecko_android`) — confirm the "Firefox for Android" checkbox is on.
- [ ] Expect automated approval in minutes–hours; occasional human
      follow-up takes days. Discoverability: leave visibility **Visible**
      (public search) — that's the "maximally discoverable" setting;
      Invisible is only for private links.

## 2. Chrome Web Store (desktop Chrome/Edge users)

- [ ] Register: https://chrome.google.com/webstore/devconsole — one-time
      $5, requires 2FA on the Google account.
- [ ] New item → upload the same `winnow-extension.zip` (Chrome ignores
      the gecko keys; the console may show a harmless warning about them).
- [ ] Store listing tab: title, short + full description from `LISTING.md`,
      category Productivity/Tools, icon, `store/screenshot-1..3.png`
      (1280×800), `store/promo-tile.png` (440×280).
- [ ] Privacy tab: single-purpose statement + host-permission justification
      from `LISTING.md`; "no remote code"; data collection: none; privacy
      policy URL.
- [ ] Distribution tab: all regions, public.
- [ ] Submit — simple MV3 extensions with no sensitive permissions usually
      clear within a day or three.

## 3. Edge Add-ons (optional, free, ~10 min)

Microsoft Partner Center accepts the same zip; Edge desktop and Edge
Android both read from it. Free registration. Same listing copy. Worth it
for near-zero effort once the CWS listing text exists.

## 4. After the first manual listing: turn on auto-publish

`.github/workflows/release.yml` ships every merge to master that touches
the extension, once these repo secrets exist (Settings → Secrets →
Actions):

- [ ] `AMO_JWT_ISSUER` + `AMO_JWT_SECRET` — addons.mozilla.org → Tools →
      Manage API Keys.
- [ ] `CWS_CLIENT_ID` + `CWS_CLIENT_SECRET` + `CWS_REFRESH_TOKEN` +
      `CWS_EXTENSION_ID` — Chrome Web Store API OAuth
      (developer.chrome.com/docs/webstore/using-api); the extension id
      comes from the dashboard after the first manual upload.
- [ ] Each release needs a VERSION bump in `src/winnow.core.js` — stores
      reject duplicate versions, so an unbumped merge fails the publish
      step harmlessly.
- [ ] Users then auto-update: Chrome polls for extension updates every few
      hours, Firefox about daily, once the store approves the version.
- [ ] When the repo goes public, add `@updateURL`/`@downloadURL` (raw
      GitHub URL of winnow.user.js) to the userscript header so
      Tampermonkey installs auto-update too. Store installs need nothing —
      and switching a phone from the userscript to the store extension
      keeps all fragments, since they live in the site's localStorage, not
      in the extension.

## 5. Discoverability after listing

- [ ] AMO + CWS listing URLs onto projectnothing.ai (a /winnow page that
      also hosts the privacy policy and links the install page for the
      userscript/bookmarklet paths).
- [ ] Make github.com/puj/Winnow public once the first listing is up —
      "open source, local-only" is the trust signal this category lives on.
      LICENSE (MIT) and the README trademark notice are already in place.
- [ ] Post the Project Nothing experiment write-up ("LLM Margin Notes")
      linking both stores — store ranking feeds on external clicks and
      installs in the first weeks.
- [ ] Seed 3–5 honest reviews from real users (never fake/incentivized —
      both stores delist for it).
- [ ] Keywords live in title + short description (done in `LISTING.md`);
      revisit after a few weeks of store search-term data.
