# DeepDive — select → collect → synthesize

Editorial selection over AI conversations, on your phone. While reading a
ChatGPT (or Claude) response in a mobile browser, select a passage and tap
**＋ Collect**. Repeat across replies and conversations. Then open the
**Deep dive** pill, annotate any fragment with a few words, and tap
**↗ Explore together** — the synthesized prompt is written straight into the
composer for you to review and send.

No API keys, no backend, no account: it's a userscript running inside the
ChatGPT/Claude web pages, and your existing subscription does all the
inference. Fragments live in the browser's `localStorage`, per site.

## Files

| File | Purpose |
| --- | --- |
| `deepdive.user.js` | The userscript (Tampermonkey/Violentmonkey). Also the source of the bookmarklet. |
| `install.template.html` | Mobile install page, with a `__USERSCRIPT_SOURCE__` placeholder. |
| `install.html` | Built install page with the script embedded — open this on your phone. |
| `build.js` | Regenerates `install.html` from the other two: `node build.js`. |

## Install on Android

**Recommended — Firefox + Tampermonkey** (one-time, then automatic):

1. Install Firefox from the Play Store.
2. Firefox menu → Add-ons → search **Tampermonkey** → Add (Violentmonkey also works).
3. Open `install.html` (or the published copy of it) and tap **Copy the userscript**.
4. Tampermonkey → Dashboard → **+** → paste → save.
5. Open chatgpt.com in Firefox. Select a sentence in a reply; the Collect chip appears.

**Fallback — Chrome bookmarklet** (tap once per visit):

The install page generates a `javascript:` bookmarklet from the same source.
Save it as a bookmark named `dive`; on chatgpt.com type `dive` in the address
bar and tap it.

## How it works

- `selectionchange` (debounced) shows a floating **＋ Collect** chip near any
  text selection outside editable fields; tapping it stores the fragment.
- A count pill opens a bottom sheet: per-fragment notes, delete, expand,
  clear (restorable), and **Explore together**.
- The composed prompt is inserted into the site's ProseMirror composer via a
  synthetic paste event (with `execCommand('insertText')` and clipboard-copy
  fallbacks). Nothing is auto-sent — you always review before sending.
- All UI lives in a shadow root appended to `<body>`, re-attached on SPA
  navigation, so site CSS and the script's UI can't interfere with each other.

## Roadmap sketches

- Per-conversation grouping and a fragment archive across sessions.
- Editable synthesis instruction ("develop these together…") presets.
- Claude-specific selector hardening; desktop Chrome extension packaging.
