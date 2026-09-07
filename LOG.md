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
