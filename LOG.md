# LOG

Append only. Never edit an entry after the fact.

- **2026-09-02** — built in one evening as "DeepDive", a Tampermonkey userscript
  for Firefox Android: select text in a ChatGPT reply, collect fragments, send
  them back as one prompt. Copied into the phone by hand from a hosted page.
- **2026-09-02** — first real use on the phone. The composer stole focus while
  typing a note: ChatGPT's type-anywhere handler could not see our shadow-DOM
  inputs. Fixed by declaring the host editable and stopping key events at
  window-capture.
- **2026-09-03** — tap replaced text selection: a word, widened to sentence and
  paragraph, grown across paragraphs by tapping toward other words. Six
  rotating highlight colors. Per-conversation lists. Exports became the whole
  conversation, fragments appended.
- **2026-09-04** — renamed three times in one day. DigBoard collided with a
  scuba company; Winnow turned out to be a live Chrome extension; Pickaxe is an
  AI-agent platform. Assay screened clean on both stores. The lesson: search
  the stores before naming, which is now written into the contract.
- **2026-09-04** — release pipeline live: merge to master builds a reproducible
  package and mints a GitHub Release; v0.8.0 and v0.8.1 exist. Firefox's new
  data-collection declaration added (`required: ["none"]`) after the first AMO
  submission attempt rejected the manifest.
- **2026-09-07** — the verb palette, unparked. Keep · Push · Fix · Challenge ·
  Cut sat under Add/Note; one tap collects a passage classified, and the verb
  renders as a plain-English clause in the prompt. Prompted by writing on a
  gym bike: typing is expensive there, judgment is not. A "next pass" button
  was considered and dropped — it is To composer under another name.
- **2026-09-07** — first day of real use on the bike: "Fix" was too vague, the
  hand kept reaching for two different things, so it split into Tweak and
  Reword. And the action bar moved above the selection: it used to sit on
  the very lines you tap next to grow a selection downward, which made
  bottom-to-top selection a learned workaround rather than an ergonomic one.
- **2026-09-07** — the bar now keeps a line of clearance on whichever side of
  the selection it sits, so the neighbouring line above and below both stay
  tappable and a selection grows up or down without a learned direction.
- **2026-09-07** — highlights now survive a refresh. Fragments always did, but
  their tinted marks hung off live DOM nodes, so a reload left the tray full
  and the page blank; each orphaned fragment's text is now found in the
  conversation again and re-marked. The same pass taught the selection flow
  about ChatGPT's in-chat edit box: tapping into one keeps what you had
  selected instead of clearing it, and a long-press selection inside one —
  textarea or contenteditable — can be collected like any other passage.
- **2026-09-07** — taps now work inside the cards ChatGPT renders in the
  conversation. The rule used to be "skip anything editable", which was aimed
  at the composer but also excluded the canvas card — the place a draft is
  actually read. It is now "skip the composer", and everything else editable
  reads like the conversation. Three things had to follow: a block anchor that
  falls back to the nearest block-level ancestor for cards that lay out lines
  as divs, handing the caret straight back on touch so the keyboard never
  opens, and ignoring the word the browser selects by itself on a repeat tap
  in an editable, which was hijacking the scope cycle.
- **2026-09-07** — GitHub joins the sites Assay reads: a file's rendered
  markdown, or its code view, where each line is a paragraph and keeps its
  indentation, and the line-number column stays out of the selection. Every
  file keeps its own list, ⭳ .md exports the file with the fragments
  appended, and since a file has no message box the primary action becomes
  ⧉ Copy notes — which keeps the fragments rather than spending them, because
  what you paste them into is somewhere else and a clipboard write can fail
  quietly on a phone.
