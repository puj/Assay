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
- **2026-09-07** — a collected passage is now editable where it lies. Tapping
  one used to start a fresh selection over it; it opens that fragment instead,
  with the same bar wearing a second face — its number in its own colour, the
  verb it is filed under shown as selected, Note prefilled with what it says,
  and Remove. The list in the tray was the only place to change your mind
  before, which meant leaving the page you were reading.
- **2026-09-07** — the Chrome listing had been sitting on the version uploaded
  by hand: its publish job has skipped every release since the pipeline was
  built, because no CWS secrets exist, and a skip exited green and silent. It
  now warns and writes what each store actually received into the run summary,
  so a green run can no longer read as a shipped one. Firefox is unaffected —
  the two legs are independent, and AMO has had every version since v0.9.0.
  An Edge leg joins them, inert until its secrets land.
- **2026-09-08** — the export learned to take part of a conversation. Thirty
  messages and wanting the last six was a download-then-delete job; ⭳ .md and
  ⭳ .txt now open a picker listing every message with who spoke and enough of
  it to recognise, opening at the recent end, with All / None / Last 2 /
  Last 6 and — the one that matters — ↓ on a message to take it and everything
  after. The file says what it holds, "messages 19–30 of 30", so a partial
  export can't be mistaken for the whole thread later.
- **2026-09-08** — v0.12.1 exists to carry v0.12.0 to the Chrome Web Store:
  the first release after the CWS secrets landed, and a workflow dispatch
  cannot be fired from the build session. The same build; only the number
  moved.
- **2026-09-08** — v0.12.2: the retry of the Chrome upload after the OAuth
  client behind the first attempt turned out to have been deleted. Same build
  again; a release is still the only way this session can make the pipeline
  run.
- **2026-09-08** — the Chrome Web Store leg finally ran: "Publish successful"
  on v0.12.3. It took three attempts and three number-only releases, each
  refused differently — a deleted OAuth client, then a 403 on the upload from
  a refresh token still bound to it. Every store now updates itself on merge
  except Edge, which has no listing yet.
- **2026-09-09** — Gist joins GitHub: gist.github.com reads files the same
  way, tap grammar and all. Confirmed against a live gist's actual markup
  (fetched and inspected directly) rather than guessing — its classic
  table-based code view turned out to already match the selectors the newer
  github.com blob view needed, so no new selector was required, just the
  hostname check. A multi-file gist now exports each file as its own labeled
  section (by its gist filename) and offers the picker to choose among them,
  which also fixed a latent bug: exporting only ever took the first file on
  a page with more than one match. Along the way, found and fixed a real
  defect the gist markup exposed: a classic code table's line-number cell,
  though empty, was leaking a tab character into every exported code line
  via `innerText`'s cross-cell join — code exports now read each row's own
  cell instead.
- **2026-09-11** — exports stopped being limited to what the page happened to
  be rendering. Both sites show only a window of a long conversation: older
  messages load as you scroll, some sections stay collapsed until opened, and
  ⭳ .md could only ever see the rendered few. Assay now remembers each message
  as the page shows it — keyed by ChatGPT's message id where there is one,
  otherwise by the opening of its text, which streaming appends to but never
  rewrites — and merges each freshly seen window into what it already holds.
  Where the site numbers its turns that number settles the order; where it
  does not, a window sharing nothing with what we hold is placed by which way
  the scroller moved. Exports read from that memory, falling back to the live
  element whenever a message is still on the page. The picker now shows, per
  message, how much was captured and whether it came from the page or from
  memory, and tapping that size opens the captured text to check it.
- **2026-09-11** — the remembered thread now defers to the page. Accumulating
  was the easy half; the other half is that what we hold can be fiction —
  editing a message regenerates everything after it, and the copy kept from
  before that describes a conversation which no longer exists. So the window
  the page renders is treated as the whole truth for the span it covers:
  between the first and last message of it we recognise, the log becomes
  exactly what was just seen, which fixes the order and drops what has gone.
  Where a site numbers its turns, a number reused for a different message
  retires the one held under it. And at the end of the thread — where nothing
  can lie beyond the last message on screen — anything still held past it is
  cut, though only when the scan overlapped what we already had, so a
  misjudged window can never erase a conversation. Away from the bottom
  nothing is trimmed: the page may simply not have loaded the rest yet, and
  losing remembered messages would be the worse failure.
- **2026-09-11** — v0.14.1 reached neither store, for two reasons that were
  nothing to do with the build. Chrome refuses an upload while the version
  before it is still in review (0.14.0, hours old): ITEM_NOT_UPDATABLE, which
  the run now explains in those words, with the dispatch to re-send once the
  queue clears. AMO returned a bare 502, so the Firefox leg now retries three
  times — treating "version already exists" as the success it is, since a
  retry after the upload actually landed is not a failure.
- **2026-09-11** — the memory was losing the conversation it was meant to
  keep, and the cause was mine: a scroller we could not identify fell back to
  the document, which on a page that scrolls an inner pane does not scroll at
  all — so "are we at the end of the thread?" answered yes on every scan, and
  every scan cut everything after the last message on screen. Scrolling back
  through a thread therefore held six messages no matter how far you went.
  Not finding a scroller now means knowing nothing, which is never read as
  standing at the end. Two more of the same family: a shorter view of a
  message no longer replaces a fuller one we already hold — collapsed,
  truncated behind Show more, or still streaming are narrower views of a
  message, not newer versions of it — and that rule applies at export too,
  where being on screen had been mistaken for being the better copy. And a
  message we hold but did not just see is no longer dropped for being absent;
  only a reused turn number or the visible end of the thread is evidence
  enough, because losing a real message is worse than keeping a stale one.
- **2026-09-12** — the export still shrank when you jumped around a thread,
  and the reasons were worth the dig. Messages are now identified by their
  text rather than anything the site happens to label them with: a hash of
  the whole message, an opening of 200 characters to recognise it while it
  grows, and a site id only as a hint. Two messages that read the same —
  "Yes." twice — stay two messages, told apart by their neighbours, and a
  text too short to be distinctive is never trusted as an anchor.
  Order turned out to be the hard half. A window that shares nothing with
  what we hold says nothing about where it goes, so it is kept as its own
  run, and the first later window that overlaps two runs proves they are
  adjacent and in what order, and stitches them. Which was written, and then
  thrown away every time: a merge that only reorders changes neither the
  count nor a word of the text, and the code only kept a merge when one of
  those changed. Nothing is deleted any more at all; ↻ in the picker forgets
  a conversation and reads the page again, which is the honest way to handle
  a thread edited elsewhere. Claude had nothing to export because its markup
  had moved on, so message-finding now tries several shapes and falls back to
  anything in main that looks like a message. Scrolling is throttled rather
  than debounced — a fast scroll used to outrun the scan entirely — and a
  scan of a window we already know costs under a millisecond on a
  200-message thread. The picker follows the page while it is open. The pill
  says Assay.
