# Assay — Privacy Policy

**Effective 4 September 2026.** Assay is a browser extension published by
Project Nothing. This is the source text; it is published at
<https://www.projectnothing.ai/assay/privacy>.

**Assay collects nothing.** It has no server, no account system, no analytics,
no telemetry and no cookies, and it makes no network requests of its own.
There is no data for us to see, sell, share or lose, because none of it ever
reaches us.

## What Assay reads

Assay runs only on the pages it supports — chatgpt.com, chat.openai.com,
claude.ai, github.com and gist.github.com, where it reads files the way it
reads a reply.
On those pages it reads:

- **the passage you tap or select**, so it can highlight and collect it;
- **the messages the page renders**, when you ask for them. Both chat sites
  show only part of a long conversation at a time — older messages load as you
  scroll, and some stay collapsed until opened — so Assay keeps a copy of what
  it has been shown (see below), and an export is then the conversation rather
  than the part of it on screen at that moment. It reads the thread when you
  open the tray, when you press ⭳, and while the export picker is open; with
  the picker closed it does not read the page at all. It reads only what the
  page itself has already rendered: nothing is requested from any server.

It reads nothing on any other website, and it does not run anywhere else.

## What Assay writes

- **The fragments you collect and the notes you write**, into your browser's
  local storage on the site itself.
- **A copy of the conversation as the page has shown it to you**, into that
  same local storage, so ⭳ .md and ⭳ .txt can export more than the handful of
  messages still on screen. This is written only when Assay reads the thread —
  on export, on opening the tray, or while the export picker is open. You
  can see exactly what is held, message by message, in the picker that opens
  when you export — tap a message's size to read it. It is capped, and the
  least recently opened conversations are dropped first. Messages the
  conversation no longer contains — edited, regenerated or deleted away — are
  dropped as soon as the page shows that they are gone.
- **The composed prompt**, into that site's own message box, when you press
  ↗ To composer. Nothing is ever sent for you — you review it and press send.
- **A copy of that text to your clipboard**, when you press ⧉ Copy notes on a
  site with no message box, or as a fallback if writing into the box fails.
- **A .md or .txt file to your device**, when you ask for one.

## Where your data lives, and how to remove it

Fragments, notes and the remembered conversation are stored under keys
beginning `assay.` in the local storage of the site, grouped per conversation
— or per file, on GitHub. They stay on the device that made them: they are
not synced, backed up or transmitted.

To remove them, delete individual fragments with ✕, or use **Clear** in the
tray. Clearing the site's storage (below) also forgets the remembered
conversations. Clear keeps one restorable copy of the batch — so an accidental clear
is undoable — until the next clear or send replaces it.

**Uninstalling the extension does not by itself erase this data**, because it
belongs to the site's storage rather than to the extension. To erase it
completely, clear site data for chatgpt.com, claude.ai, github.com and
gist.github.com in your browser
settings.

## Third parties

None. Assay adds no third party to your browsing. Your conversations with
ChatGPT and Claude remain governed by OpenAI's and Anthropic's own privacy
policies; Assay does not change what those services receive, and the only
message it helps you compose is one you send yourself.

## Children

Assay is a general-audience tool. It is not directed at children, and it
collects no information from anyone.

## Changes

Material changes are published with a new effective date. The extension is
open source, so every revision of this policy is visible in the repository's
history: <https://github.com/puj/Assay>.

## Contact

hello@projectnothing.ai
