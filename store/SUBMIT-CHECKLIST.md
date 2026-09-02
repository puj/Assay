# Store submission checklist

Everything in the repo is ready; the steps below need a human (accounts,
payments, forms). Budget ~1 hour of clicking total.

## 0. One-time prep (both stores)

- [ ] Host `store/privacy.html` at a public URL (e.g.
      projectnothing.ai/digboard/privacy). The contact email in it is
      currently hello@projectnothing.ai — swap for an alias if you don't want it
      public; stores also display your developer contact email.
- [ ] Decide trader status (EU DSA question both stores ask). Monetizing →
      "trader", and your contact details become publicly visible on the
      listing.
- [ ] `node build.js` for a fresh `digboard-extension.zip`.

## 1. Firefox AMO — do this one first (free, covers desktop AND Android)

- [ ] Create the account: https://addons.mozilla.org/developers/ (free).
- [ ] Submit a new add-on → upload `digboard-extension.zip` → channel:
      **Listed**.
- [ ] It's plain unminified JS, so no source-code archive is needed.
- [ ] Paste name/summary/description/tags/categories from `LISTING.md`;
      slug `digboard`; upload `extension/icons/icon128.png` and the
      screenshots from `store/`.
- [ ] License: pick one (MIT keeps it simple and matches the open-core
      plan). Privacy policy: paste the hosted URL.
- [ ] Android compatibility is declared in the manifest
      (`gecko_android`) — confirm the "Firefox for Android" checkbox is on.
- [ ] Expect automated approval in minutes–hours; occasional human
      follow-up takes days. Discoverability: leave visibility **Visible**
      (public search) — that's the "maximally discoverable" setting;
      Invisible is only for private links.

## 2. Chrome Web Store (desktop Chrome/Edge users)

- [ ] Register: https://chrome.google.com/webstore/devconsole — one-time
      $5, requires 2FA on the Google account.
- [ ] New item → upload the same `digboard-extension.zip` (Chrome ignores
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

## 4. Discoverability after listing

- [ ] AMO + CWS listing URLs onto projectnothing.ai (a /digboard page that
      also hosts the privacy policy and links the install page for the
      userscript/bookmarklet paths).
- [ ] Make the GitHub repo public (or split DigBoard into its own public
      repo) — "open source, local-only" is the trust signal this category
      lives on, and the store listings can link it.
- [ ] Post the Project Nothing experiment write-up ("LLM Margin Notes")
      linking both stores — store ranking feeds on external clicks and
      installs in the first weeks.
- [ ] Seed 3–5 honest reviews from real users (never fake/incentivized —
      both stores delist for it).
- [ ] Keywords live in title + short description (done in `LISTING.md`);
      revisit after a few weeks of store search-term data.
