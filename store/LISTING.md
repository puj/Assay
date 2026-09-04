# Assay — store listing copy

Paste-ready. One source for both stores. The title carries no third-party
trademark (store policy); "ChatGPT" and "Claude" appear in the descriptions,
where a nominative compatibility statement is accepted, together with the
non-affiliation line.

## Names

- **Product name:** Assay
- **Chrome Web Store title:** `Assay: Deep Dive for AI Chats`
- **Firefox AMO name:** `Assay: Deep Dive for AI Chats`
- **AMO URL slug:** `assay`

## Short description — Chrome (126/132 chars)

> Tap passages in ChatGPT and Claude answers, annotate them, and send them
> back as one deep-dive prompt. 100% local, no account.

## Summary — AMO (231/250 chars)

> Reading an AI answer is easy; thinking with it is the hard part. Tap the
> passages that matter, annotate them in a few words, and send them back as
> one deep-dive prompt — or export the whole conversation. Nothing leaves
> your device.

## Full description (both stores)

> **Reading an AI answer is easy. Thinking with it is the hard part.**
>
> Every AI chat interface is built around one verb: prompt. But when you
> actually think with a model, most of the work is editorial — reading a long
> answer and deciding which three sentences deserve a second look. That step
> has no interface. It is copy, paste, retype.
>
> Assay gives it one. While you read, tap any word to highlight it. Tap the
> highlight to widen it — word, sentence, whole paragraph. Tap other words in
> the same reply to grow the selection toward them, across paragraphs. Collect
> as many passages as you like, add a few words of annotation to each, and
> send the whole set back as one prompt. No boilerplate is added: your
> selection is the signal, and your notes carry the intent.
>
> **What you get**
> - Tap a word in a reply → it highlights, with a small action bar
> - Tap the highlight to widen: word → sentence → paragraph → back
> - Tap nearby words to grow the selection, across paragraph breaks
> - ＋ Add collects it; ✎ Note annotates it, before or after the quote
> - Six rotating highlight colours, so you can see what you already took
> - A tray holding everything you kept, while the chat stays scrollable
> - ↗ To composer writes your fragments and notes into the message box
> - ⭳ Export the whole conversation as Markdown or plain text, your fragments
>   and notes appended — a verbatim local record, named after the chat
> - Every conversation keeps its own list
>
> **Private by design**
> No account. No server. No analytics. No API keys — your existing ChatGPT or
> Claude subscription does all the inference. Fragments live in your browser,
> on your device. The only thing that ever leaves it is the message you choose
> to send. Open source under MIT: github.com/puj/Assay
>
> Works with ChatGPT (chatgpt.com) and Claude (claude.ai). On Android, run it
> in Firefox. A Project Nothing experiment — this is an experiment, and it
> might be gone next month.
>
> Assay is not affiliated with OpenAI or Anthropic.

## Keywords (AMO tags; worked into the descriptions)

highlight, annotate, deep dive, AI chat, prompt builder, collect quotes,
margin notes, export markdown, research, reading tool, note taking,
ChatGPT companion, Claude companion

## Categories

- Chrome Web Store: **Productivity → Tools** (alt: Workflow & Planning)
- AMO: **Productivity** (secondary: Search Tools)

## Chrome privacy tab answers

- **Single purpose:** Collect, annotate and recombine passages from AI chat
  conversations into a follow-up prompt, locally in the user's browser.
- **Host permission justification (chatgpt.com, chat.openai.com,
  claude.ai):** The content script must run on these chat pages to do the
  only thing the extension does. It reads the passage the user taps or
  selects so it can highlight and collect it, and reads the visible
  conversation at the moment the user presses the export button so it can
  build the requested .md/.txt file. It writes the composed text into the
  page's own message box on request. Nothing is transmitted anywhere: the
  extension makes no network requests, and all state is kept in the site's
  local storage on the user's device.
- **Remote code:** No. All code ships in the package; nothing is fetched or
  evaluated at runtime.
- **Data collection:** None. Select "Does not collect or use user data" and
  certify all three: not sold to third parties, not used or transferred for
  purposes unrelated to the single purpose, not used or transferred to
  determine creditworthiness or for lending.
- **Privacy policy URL:** https://www.projectnothing.ai/assay/privacy
  (source: `PRIVACY.md`; the studio domain outlives the experiment's own
  subdomain, and assay.projectnothing.ai/privacy redirects to it).

## AMO fields

- **License:** MIT (matches the repo `LICENSE`).
- **Homepage:** https://assay.projectnothing.ai
- **Support site:** https://github.com/puj/Assay/issues
- **Privacy policy:** https://www.projectnothing.ai/assay/privacy
- **Data collection:** the manifest declares
  `data_collection_permissions.required: ["none"]`, which is what the
  listing must agree with.

## Assets checklist

| Asset | File | Store requirement |
| --- | --- | --- |
| Icon 128 | `extension/icons/icon128.png` | CWS store icon + manifest |
| Icons 16/32/48 | `extension/icons/` | manifest |
| Screenshots ×3 | `store/screenshot-1..3.png` | CWS: 1280×800, ≥1 required; AMO: optional |
| Small promo tile | `store/promo-tile.png` | CWS: 440×280 |
| Demo video | `marketing/assay-demo-landscape.mp4` | optional; CWS takes a YouTube URL |
| Privacy policy | `PRIVACY.md` → projectnothing.ai/assay/privacy | both |
