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
- **the messages the page renders**, at the moment you press ⭳ .md or ⭳ .txt.
  Both chat sites show only part of a long conversation at a time — older
  messages load as you scroll, and some stay collapsed until opened — so an
  export holds what the page was showing when you asked for it. Nothing is
  read at any other time, and nothing is kept between exports. It reads only
  what the page itself has already rendered: nothing is requested from any
  server.
- **the rest of the conversation, if you press ⤓ Get the whole conversation.**
  That scrolls the thread to the top and back down for you, and clicks controls
  that unfold a message — only inside a message, only ones whose label says they
  unfold something, never anything that could send, delete, retry or navigate,
  and never inside a form. It runs only while you watch it, has a Stop, and
  leaves the page where it found it. Still nothing is requested from any server:
  the scrolling makes the site load its own messages, and Assay reads what
  appears.

It reads nothing on any other website, and it does not run anywhere else.

## What Assay writes

- **The fragments you collect and the notes you write**, into your browser's
  local storage on the site itself.
- **Nothing of the conversation itself.** Versions 0.14 to 0.17 kept a copy of
  the thread in local storage so exports could outrun what the page had
  loaded; 0.18.0 removed that, and removes any copy an earlier version left
  behind the next time it runs. The conversation is read only into the file you
  asked for.
- **One attribute on a card the site made editable.** ChatGPT renders documents
  into the middle of a reply as editors, which cannot be selected in; Assay
  marks those cards as not-editable so they read as ordinary text. No words are
  changed, nothing is sent, and **Cards: editable** in the tray undoes it. The
  message box is never touched.
- **The composed prompt**, into that site's own message box, when you press
  ↗ To composer. Nothing is ever sent for you — you review it and press send.
- **A copy of that text to your clipboard**, when you press ⧉ Copy notes on a
  site with no message box, or as a fallback if writing into the box fails.
- **A .md or .txt file to your device**, when you ask for one.

## Where your data lives, and how to remove it

Fragments and notes are stored under keys beginning `assay.` in the local
storage of the site, grouped per conversation — or per file, on GitHub. They
stay on the device that made them: they are not synced, backed up or
transmitted.

To remove them, delete individual fragments with ✕, or use **Clear** in the
tray. Clear keeps one restorable copy of the batch — so an accidental clear
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
