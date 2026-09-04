# Assay — store listing copy

One source for both stores. Titles avoid third-party trademarks (store
policy); "works with ChatGPT and Claude" appears only in descriptions,
where nominative compatibility statements are accepted.

## Names

- **Product name:** Assay
- **Chrome Web Store title (45-char guideline):** `Assay: Deep Dive for AI Chats`
- **Firefox AMO name:** `Assay: Deep Dive for AI Chats`
- **AMO URL slug:** `assay`
- Riskier high-keyword variant (some reviewers allow "for X" nominative use,
  some reject it — only try if the safe title underperforms):
  `Assay: Highlight & Deep Dive for ChatGPT`

## Short description

Chrome (132-char limit) / AMO summary:

> Tap to collect, highlight and annotate passages in AI chats, then send
> them back as one deep-dive prompt. 100% local, no account.

## Full description (both stores)

> **Reading an AI answer is easy. Thinking with it is the hard part.**
>
> Assay turns AI conversations into a selectable thinking surface. While
> you read, tap any word to highlight it — tap again to widen to the
> sentence or the whole paragraph, or tap nearby words to grow the
> selection. Collect several passages, add a short annotation to each, and
> send them back as one combined deep-dive prompt. Your selection is the
> signal; no boilerplate is added.
>
> **How it works**
> - Tap a word in a reply → it highlights with a small action bar
> - Tap the highlight to widen: word → sentence → paragraph
> - ＋ Add collects it; ✎ Note annotates it (before or after the quote)
> - Each fragment gets its own highlight color and stays marked on the page
> - The Deep dive tray shows your collection — reorder your thinking,
>   annotate later, then send everything to the composer with one tap
> - Export the entire conversation as Markdown or plain text, with your
>   fragments and notes appended — a verbatim local record
> - Every conversation keeps its own fragment list
>
> **Private by design**
> Everything stays in your browser. No account, no server, no analytics, no
> API keys — your existing AI subscription does all the inference. The only
> thing that ever leaves your device is the message you choose to send.
>
> Works with ChatGPT (chatgpt.com) and Claude (claude.ai). On Android, use
> Firefox to run it on mobile. A Project Nothing experiment.
> Assay is not affiliated with OpenAI or Anthropic.

## Keywords (AMO tags / worked into descriptions)

highlight, annotate, deep dive, AI chat, prompt builder, collect quotes,
margin notes, research, summarize, ChatGPT companion, Claude companion,
reading tool, note taking

## Categories

- Chrome Web Store: **Productivity → Tools** (alt: Workflow & Planning)
- AMO: **Productivity** (secondary: Search Tools)

## Chrome privacy tab answers

- **Single purpose:** Collect, annotate and recombine passages from AI chat
  conversations into a follow-up prompt, locally in the user's browser.
- **Host permission justification (chatgpt.com, chat.openai.com,
  claude.ai):** The content script must run on these chat pages to let the
  user select passages in the conversation and insert the composed prompt
  into the page's own message box. No data is read beyond what the user
  explicitly selects, and nothing is transmitted anywhere.
- **Remote code:** None. **Data collection:** None — all state is in
  localStorage on the user's device. Select "Does not collect or use user
  data"; certify the disclosures.
- **Privacy policy URL:** https://assay.projectnothing.ai/privacy (served from `site/privacy.html`).
- **License (AMO field):** MIT. Homepage: https://assay.projectnothing.ai. Support: https://github.com/puj/Assay/issues.

## Assets checklist

| Asset | File | Store requirement |
| --- | --- | --- |
| Icon 128 | `extension/icons/icon128.png` | CWS store icon + manifest |
| Icons 16/32/48 | `extension/icons/` | manifest |
| Screenshots ×3 | `store/screenshot-1..3.png` | CWS: 1280×800, ≥1 required; AMO: optional but listed |
| Small promo tile | `store/promo-tile.png` | CWS: 440×280, required field |
| Privacy policy | `site/privacy.html` → assay.projectnothing.ai/privacy | both |
