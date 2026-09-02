# DigBoard — tap → collect → deep dive (formerly DeepDive)

Editorial selection over AI conversations, on your phone. While reading a
ChatGPT (or Claude) response in a mobile browser, **tap a word** — it
highlights with a small action bar. Tap the highlight to widen the scope
(word → sentence → paragraph → back to the word); tap words outside the
highlight to grow the selection in that direction, word by word; long-press
selection still works for arbitrary spans. **＋ Add** collects; **✎ Note**
annotates now, with the note placed *before* or *after* the quote; the sheet
lets you annotate later. Each fragment takes the next of six rotating
highlight colors and its mark stays tinted on the page for the session. The
fragment sheet is non-modal — the pill toggles it while the conversation
stays scrollable, and taps keep collecting. **↗ To composer** writes just
the fragments and annotations into the site's composer — no wrapper prompt,
the annotations carry the intent — for you to review and send.
**⭳ .md / ⭳ .txt** download the entire current conversation — roles, text,
code blocks — with the collected fragments appended, all locally (verbatim
export captures what's loaded on the page, so scroll up first on very long
threads). Note controls and the sheet track `visualViewport`, so the
on-screen keyboard never covers them.

No API keys, no backend, no account. One core payload, three delivery
formats. Fragments live in the browser's `localStorage`, scoped **per
conversation** (keyed by the `/c/<id>` or `/chat/<id>` URL; a batch started
in a brand-new chat follows it once the id appears). The keying leaves room
for a shared cross-conversation list later.

## Layout

| File | Purpose |
| --- | --- |
| `src/deepdive.core.js` | The single source of truth — all logic and UI. |
| `deepdive.user.js` | Generated: userscript header + core (Tampermonkey/Violentmonkey). |
| `extension/` | Generated content script + `manifest.json` (MV3, Chrome + Firefox). |
| `digboard-extension.zip` | Generated extension package for store submission / sideload. |
| `install.template.html` | Mobile install page with a `__USERSCRIPT_SOURCE__` placeholder. |
| `install.html` | Generated install page; it also derives the bookmarklet from the embedded source. |
| `build.js` | Regenerates all of the above: `node build.js`. |

## The three delivery options

1. **Userscript** (Firefox Android + Tampermonkey/Violentmonkey) — auto-loads
   on every visit. Copy it from the install page into the manager.
2. **Bookmarklet** (any browser, incl. Chrome Android) — zero install, tap
   once per visit. Generated on the install page from the same source.
3. **WebExtension** — for distribution. Load `extension/` unpacked in desktop
   Chrome/Edge, or submit `digboard-extension.zip` to Firefox Add-ons (free
   signing; then it installs normally on Firefox Android) and the
   Chrome/Edge stores.

## Payload format

No boilerplate. Numbered only when there are multiple fragments:

```
1. connect to the garbage collector:
“The garbage collector becomes the allocator of life.”

2. “Creators rarely bear the cost of rejection.”
→ formalize this
```

A `pre` note renders as a leading clause; a `post` note renders as a `→`
line after the quote. `.txt` export is exactly this payload; `.md` export is
a dated document with blockquotes.

## How it works

- Tap handling uses `caretPositionFromPoint`/`caretRangeFromPoint` +
  `Intl.Segmenter` (regex fallback) to find the tapped sentence inside the
  tapped block, restricted to assistant messages (with a length-gated
  fallback for unknown DOM). Highlights are overlay rectangles from
  `Range.getClientRects()` — the site's DOM is never mutated, so React
  re-renders can't break it.
- All UI lives in a shadow root appended to `<body>`, re-attached on SPA
  navigation.
- Composer injection: synthetic paste event into the ProseMirror editor,
  with `execCommand('insertText')` and clipboard fallbacks. Nothing is
  auto-sent — you always review before sending.
- Exports are `Blob` + `<a download>`; nothing ever leaves the device except
  the message you choose to send.

## Saved for later: the editing verb palette

The same tap surface should eventually work *while editing the book*, with a
verb palette per fragment instead of just add/annotate:

> tap → **keep** · **annotate** · **slide confidence** · **reword** · …

The action bar is the natural extension point: today it's Add / Note / ¶ /
cancel; the book-editing mode swaps in a different verb set operating on the
same tap-to-sentence engine, and the collected items gain typed operations
(`{verb, confidence, replacement, …}`) rather than a single note. Parked
deliberately — the reading/deep-dive loop needs to prove itself first.

## Other roadmap sketches

- Per-conversation grouping and a fragment archive across sessions.
- Editable payload templates.
- Claude-specific selector hardening; store submission for one-tap installs.
