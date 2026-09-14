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
- **2026-09-12** — typing had become expensive, and the reason was that
  Assay treated a keystroke as news. Every character typed into the message
  box mutated the page, the observer counted that as the conversation
  changing, and every couple of seconds it ran a full scan — synchronously,
  inside the very handler that noticed the keystroke, and the scan asks each
  visible message for its innerText, which forces the browser to lay the page
  out. So the cost landed in the middle of a keypress on the longest thread.
  Three changes. A change inside any box being written in is no longer a
  reason to scan at all. A scan is never run by the handler that noticed the
  change: it waits for the browser to have an idle moment (or a second, if it
  never does). And innerText is asked for only when an element's own text has
  changed, which textContent answers without any layout — so a scan of a
  window already known touches nothing. Nodes arriving or leaving still scans
  promptly, since that is the conversation loading more of itself, and
  streaming text waits, since it will still be there when it stops. Typing
  120 characters into a 120-message thread now causes no scan whatsoever.
- **2026-09-11** — the measurements were right and the thing was still unusable:
  no scan ran while typing, and selections still visibly lagged behind a
  finger. Two rounds of making continuous capture cheap had both failed, so the
  premise went instead. Nothing is attached to the page any more — no mutation
  observer, no scroll handler, no interval — and the thread is read at three
  moments you can point to: opening the tray, pressing ⭳, and scrolling with
  the export picker open, which is the one time watching the page is the thing
  you asked for. Two things turned up once the picker became the hot path: it
  rebuilt all of its rows on every scan, and each row carried the *entire* text
  of its message in a hidden `<pre>` it would probably never show. Rows are now
  built once and updated in place, and a message's text is fetched only for the
  row you open. On a 200-message thread: 101ms per update to 1ms when nothing
  changed, 82ms to 11ms when something did. Scrolling with highlights painted
  holds 60fps, p95 16.9ms. The lesson is about the benchmark, not the code — a
  mocked page with no compositor, no real text shaping and a synthetic scroller
  cannot tell you what a phone feels, so "0 scans" was true and meaningless.
  What a phone feels is whether anything of ours is attached at all.
- **2026-09-12** — the lag was never in the scanning. Highlights were drawn as
  boxes positioned over the words and repositioned on every scroll event, and on
  a phone scrolling belongs to the compositor: the content moves, and boxes
  computed on the main thread arrive a frame or more later. "The highlight stays
  where it was" was a literal description of the mechanism, and three rounds of
  making the redraw cheaper could not touch it, because the redraw was never
  the thing that was late. Highlights are now painted by the browser into the
  text itself — CSS custom highlights — so they move with the glyphs they sit
  on and scrolling stops involving us at all. Positioned boxes remain for
  browsers without the API, where they are the only option.
  The thread memory went with it, as asked. It was the second time; it had cost
  three releases; and what it bought — an export outrunning what the page had
  loaded — was never worth a selection that lags. Export is what the page is
  showing when you press the button. 499 lines deleted, 129 added.
  The measurement that matters turned out not to be how long anything takes but
  whether we are attached at all: scrolling 1600px past three highlights,
  typing 120 characters, and a reply streaming in now each ask Assay for zero
  frames of work. Zero is a number a mock can measure honestly; milliseconds
  on a synthetic scroller are not.
- **2026-09-12** — Claude exported nothing, and the reason was a design fault,
  not a stale selector. The strategies were tried in order and the first one to
  match anything won. Claude renamed `font-claude-message` to
  `font-claude-response`; the selector naming it alongside `user-message` still
  matched — the human's half of the conversation — so the finder did not fail,
  it succeeded at finding half a thread, and nothing said so. A strategy that
  matches one side of a conversation is worse than one that matches nothing.
  Candidates are now scored, and seeing both sides beats seeing more turns of
  one side. Added to that: every spelling either site has used, matched on a
  substring; and a finder that uses no names at all — the conversation is the
  run of sibling elements whose own children hold the most text, which a nav or
  a sidebar never is. It competes with the named strategies rather than waiting
  for all of them to come back empty, and it costs its page walk only when what
  we have is partial. Who spoke is read from a label anywhere inside the turn,
  and only falls back to alternating when the page says nothing — alternating is
  wrong the moment someone sends two messages in a row. `__assay._find()`
  reports what each strategy saw and, when nothing is found, the page's actual
  shape, so the next rename is diagnosed rather than guessed at. Six Claude
  shapes are now tested, including two renames we have not had yet.
  Worth noting for later: the best-maintained Claude exporter gave up on the
  DOM entirely and reads the site's own conversation API, which would also fix
  the window problem. It would mean a request to a server, which the privacy
  note currently promises never happens, so it is a decision and not a patch.
- **2026-09-12** — two reports, one root. Typing stopped working in Claude's
  message box, and ChatGPT's canvas cards could not be selected in.
  The message box first, because it is the worse of the two: an editable Assay
  could not recognise as the composer was treated as a passage. That default is
  the wrong way up. Recognising a composer means knowing the names a site
  currently uses, and Claude had just changed them — so every tap in the message
  box was read as a selection. A site can rename whatever it likes; what it
  cannot do is put its composer inside one of the conversation's own turns. So
  the question is now asked the other way: an editable is a passage only if it
  sits in the thread, and one we cannot place is left alone. The worst case
  became a card you cannot select in rather than a chat you cannot type in.
  I could not reproduce the reported symptom in a mock — typing worked there on
  the broken version, with a mouse and with a touch tap both — so the inversion
  is a safety fix, not a verified one. Which is why the tray now has ⓘ Copy
  diagnosis: there is no console on a phone, and everything I was guessing at
  is a string the user can paste.
  Then the cards. ChatGPT renders a document into the middle of a reply as an
  editor, and an editor fights a tap: caret, keyboard, the browser's own word
  selection. A card inside the conversation is now marked not-editable, which
  changes no words and moves nothing, and it reads like the prose around it.
  Reversible from the tray, never applied to the message box, to an editable we
  cannot place, or to one being typed in. Its text lands in exports too — a
  textarea keeps its words in .value, where innerText has never looked, so those
  cards had been exporting as holes.
  Three bugs fell out of writing it down: `[contenteditable]` matches
  `contenteditable="false"`, so the flattened card still read as an edit box and
  a tap bounced off it; and both `findBlock` and `findContainer` still named
  `.font-claude-message`, which since the rename meant a selection in a Claude
  reply could not grow past one paragraph. Nobody had reported that one.
- **2026-09-12** — the export learned to go and get the conversation. Neither
  site keeps a long thread in the page: older messages are built only when you
  scroll to them, long ones stay folded until asked, so what an export can see
  is a window. 0.14–0.17 answered that by remembering messages as they went
  past, in storage, all the time — and that cost selection its responsiveness,
  so it came out. This is the other answer and the honest one: ⤓ in the picker
  walks the thread to the top, unfolds what is folded, reads each screenful on
  the way back down and stitches the windows by finding the run where one ends
  the way the next begins. It blocks, counts as it goes, has a Stop, restores
  the scroll position, and leaves nothing running and nothing stored. Picking
  which messages to include still works, and a choice made before the walk
  survives it.
  Three bugs on the way, two of them old. Picker rows were keyed by their text,
  so a thread with "Yes." in it twice rendered one row and exported one message
  — the harvest returned both and the list threw one away. Two key schemes
  disagreed, so every tick was forgotten the moment the walk finished. And the
  guard meant to keep the unfolder away from anything that submits was
  `b.type === 'submit'`, which a bare <button> reports whether or not it is in
  a form — it rejected every "Show more" there is, which is to say the unfolder
  had never once unfolded anything.
- **2026-09-12** — the walk button was unreadable: `.btn` carries no background
  of its own, so a full-width one inherited the sheet's and came out dark text
  on a dark ground, sitting in the place the eye looks for the primary action.
  It is now a small amber-outlined button, right-aligned, plainly secondary to
  Download — coloured like something that does something to the page, because
  it does: it takes the page over for several seconds, so it asks first, in a
  strip that replaces itself with the progress line once you agree. Two arrows
  live in that sheet now, so the hint stopped naming either by its shape.
  Cards: text and Copy diagnosis were loose in the tray with nothing to group
  them; they sit behind a ⚙ now, which is the settings control we did not have.
- **2026-09-13** — a walk of a 58-message thread produced 421 entries: seven
  copies of everything, out of order. Two faults, and the second is the one
  worth remembering.
  The first was method. Windows were joined by looking for the longest run where
  what we held ended the way the next window began, and when no such run was
  found the whole window was appended. A method whose failure mode is "append it
  all again" is the wrong method however well it does when it works. Each message
  is now taken once, the first time it is met; since the walk only goes
  downward, first-met is conversation order. A key seen twice inside one window
  is allowed twice, which is what keeps two messages that read alike apart.
  The second was why the join was never found. A list that builds only what is
  on screen recycles its rows, so their order in the document is whatever the
  page last did with them and has nothing to do with the conversation. The
  windows were internally scrambled — which broke the match on every step and
  was also, exactly, the "out of order" in the report. Turns are sorted by where
  they sit on the page now, in the walk and in the picker both.
  Two smaller things came out of it. Identity was taken from innerText, which is
  what the page *renders*, so for a message that has not been laid out it reads
  differently or not at all — it comes from textContent now, which is in the
  document whether or not anything has been drawn. And it included the message's
  length, so unfolding one changed what it was: the fuller reading arrived as a
  second entry instead of replacing the folded one. It is the opening alone now.
  The mock that finally reproduced this had to recycle its rows out of order. My
  first two attempts passed on the broken version, which is the tell that a mock
  is modelling what I assumed rather than what happens.
- **2026-09-13** — voice. A mic in the note box, which grows while you dictate
  so the words are visible as they land, and a near-fullscreen scratchpad in the
  tray you can talk into. The scratchpad selects the way the page does — tap a
  word, tap again for the sentence — and then Say it again replaces just that
  part, which is the thing dictation normally cannot do. Insertion is the point
  of the whole thing: ↗ To composer sends the scratchpad, or only the selected
  passage, into the chat's message box; ＋ Collect makes a fragment of it.
  The decision that mattered was refusing to fall back. A browser will happily
  recognise speech by sending your microphone to a server and that is the
  default, so before listening starts it is asked whether it can do this
  language locally, and if it can only do it remotely Assay declines and says
  why. A language pack is asked for before it is fetched, and the browser
  fetches it — not us.
  Which leaves a hole worth naming: Firefox has no speech recognition at all, on
  Android or anywhere, and Firefox Android is where this thing is actually used.
  The honest refusal is implemented and tested; whether to close the hole with a
  bundled recogniser is a question, not a patch.
  Two things the tests could not have caught and a screenshot did: a refusal
  with nothing to download still offered a Download button, and the scratchpad's
  taps landed nowhere because the page's caret lookup does not reach into a
  shadow root — it measures characters now.
- **2026-09-13** — the Firefox hole is closed, by a second engine rather than a
  compromise. Where a browser has no local recognition of its own, Assay offers
  to fetch one: about 6MB of recogniser and 40MB of language model, asked about
  by size before anything is fetched, kept in the browser's cache, and after
  that dictation needs no network at all. Nothing about this is packaged —
  build.js puts manifest.json, assay.js and icons in the zip and nothing else,
  so the size is paid only by people who ask for it.
  It is offered only where fetched code may actually run. An extension may not,
  and should not: MV3 forbids running code it did not ship. So the extensions
  get the browser's own on-device recogniser or an explanation, and the
  userscript — which is what runs on Firefox Android, the platform that started
  this — gets both.
  Two things only the test could have found, both real rather than test detail.
  The engine is fetched cross-origin, so the site must send
  Access-Control-Allow-Origin or the browser refuses before it starts; and the
  artifacts are staged by `npm run fetch-voice` into a gitignored site/voice/,
  because 46MB does not belong in a repository any more than in a package.
- **2026-09-13** — the voice artifacts had nowhere to go. site/ is its own Vercel
  project deployed from this repository, so putting site/voice/ in .gitignore
  meant Vercel would never see the files and every fetch would have been a 404 —
  a gap I made and did not notice, because "hosted at assay.projectnothing.ai"
  was an assumption rather than a thing I had checked. The site has a build
  command now (`node fetch-voice.js`, which moved into site/), so the artifacts
  are staged at deploy time and still never committed; the fetch is deliberately
  non-fatal, because a CDN hiccup must not take the site down.
  GitHub Releases were the obvious alternative and are not usable: an asset URL
  redirects to a signed, expiring S3 link and the redirect carries no
  Access-Control-Allow-Origin, so a browser fetch fails the CORS check on the
  hop. Worth writing down so nobody tries it again.
  Two more that would each have been a silent 404. vercel.json sent no CORS
  header at all, so the fetch would have been refused even with the files in
  place — I had written the requirement into a comment and then not configured
  it. And the model was requested by the whole locale, so a browser saying
  en-GB asked for model-en-gb.zip; it is the primary subtag now, and one
  English model serves every variant of it.
- **2026-09-13** — "The recogniser could not be fetched" turned out to be three
  different problems wearing one coat: the file is not on the server, the server
  will not let this page read it, or the page refused to make the request at
  all. They have different fixes and only one of them is mine, so the message
  now says which — a 404 names the file and says it has not been deployed; a
  request that never left names the page's own policy, points at github.com
  being strict about it, and says to try the same thing on a chat page, because
  if it works there that was the answer.
  The diagnosis says whether Assay is running as an extension or a userscript
  too. That one line decides which voice path is even supposed to run, and I had
  been reasoning about a report without it.
- **2026-09-13** — the artifacts went up and dictation still failed, on
  github.com. Three things, and only the last is the interesting one.
  The model was deployed as model-en-us.zip and the code had just been changed
  to ask for model-en.zip — my rename, landing between the staging and the
  upload. It looks for both now, because making somebody re-upload 40MB over a
  filename would be absurd.
  The recogniser ships as a UMD bundle, which picks CommonJS whenever the page
  has `module`/`exports` defined — and plenty of pages do — and then sets
  nothing on window. All three names are shadowed when it is run, so it takes
  the browser-global branch every time.
  And the site is a plain static deploy again. The build command made sense
  while the artifacts were fetched at deploy time; they are committed now, and a
  build step on a site that does not need one is only a way for
  assay.projectnothing.ai to go down for no gain.
  What none of this settles is whether the fetch on github.com was refused by
  the page rather than the server. The message says which now, and the copied
  diagnosis says whether Assay is running as an extension or a userscript, which
  is the fact I have been missing the whole time.
- **2026-09-13** — it failed on chatgpt.com too, so not a GitHub quirk. The
  message had been guessing between two quite different problems and naming the
  wrong host while it did it. It does not guess now: when the fetch never comes
  back, the same URL is tried again with mode 'no-cors'. The browser will make
  that request if the page's policy allows requests to this host at all and
  refuse it if not — so if the probe goes through, the page was content and the
  server did not send the header that lets the page read the answer; if it does
  not, the page stopped the request itself. Two different fixes, and now the
  right one is named, along with the host it actually happened on and whether
  Assay is running as an extension or a userscript.
  A mock cannot settle this: route interception does not enforce CORS, so the
  two fetch modes are driven directly. Worth remembering — a network mock that
  answers every request cannot reproduce a browser refusing to read an answer.
- **2026-09-13** — the engine is packaged, because the download route was never
  going to work. A chat page's own connect-src policy will not let a script
  running inside it fetch anything from another origin, which is what defeated
  it on chatgpt.com and github.com alike; no header on our side fixes that. A
  content script is not bound by the page's policy, so the extension can carry
  the engine and fetch the model, and the userscript cannot do either — there,
  voice is whatever the browser itself offers, and it says so.
  Two things that mattered more than the decision. It is not a content script:
  5.8MB parsed on every chat page you open, forever, for a feature most people
  never touch, is exactly the cost this thing spent four versions learning not
  to impose. It is a web-accessible resource, imported the first time somebody
  presses Dictate, and there is a test that opening a page loads none of it.
  And the bundle assigns to globalThis, which in a content script is not window
  — so it is looked for in all three places rather than the one that happens to
  work in a page.
  No host permission was added. The model is served with
  Access-Control-Allow-Origin: *, so an ordinary cross-origin fetch reaches it,
  and declaring a permission would re-prompt every existing user on update and
  widen the store review for nothing. The zip is 2.4MB compressed; VOSK-SOURCE.md
  records what the file is, its hash, and the two commands that reproduce it
  from the registry, because a reviewer is going to ask.
- **2026-09-13** — "so no way through Tampermonkey?" — there is, and saying
  otherwise was wrong. GM_xmlhttpRequest runs in the manager's own context
  rather than the page's, so a chat page's connect-src has no say over it, and
  @resource lets the manager hold the engine instead of the page fetching it.
  What made me say no was the grant: asking for one moves the script into the
  manager's sandbox, where `window` is not the page's, and that is a change with
  a blast radius across every feature for people who will never dictate. So
  there are two scripts from the one core now — assay.user.js exactly as it was,
  @grant none, and assay-voice.user.js with the three grants and the engine as a
  resource. Nobody's install changes unless they choose it.
  Neither is read until Dictate is pressed, which the tests check: opening the
  scratchpad touches neither the resource nor the fetch.
- **2026-09-13** — "the packaged recogniser would not start" was the same mistake
  a third time: one message over two unrelated failures. The manager might not
  have downloaded the resource at all, or the page might have refused to let the
  script compile it — Firefox can hold a userscript sandbox to the page's
  script-src, so `new Function` throws there however privileged the manager is.
  Three routes are tried now and each keeps what it said: compile the resource,
  import it by the URL the manager hands back, or import a packaged file. The
  second is what gets past a refusal to compile, because a URL is not source.
  Two things the tests found on the way. The engine's download fallback still
  went through the page's own fetch, which is the thing that cannot work on a
  chat page; every download goes through the manager now when there is one. And
  a voice userscript whose resource never arrived could not reach the code that
  says "reinstall it" — the guard had already sent it down the fetch path, where
  it tried to compile an HTML error page and reported a syntax error.
- **2026-09-14** — "Fetching the language model… 100%", and then nothing, for
  ever. The recogniser does its work in a Web Worker and builds that worker from
  a blob: URL; a chat page's worker-src does not allow that, so the worker is
  never created, nothing throws anywhere we could see, and the promise that was
  going to hand back a model simply never settles. A progress bar that reports
  success right up until the thing stops existing is the worst failure shape
  there is, and it was ours.
  It is asked first now, with a worker of our own that does nothing, and the
  answer comes before the 40MB rather than after it. The model load has a
  timeout as well, because a promise with no way to fail is a bug whatever the
  cause.
  Which settles the userscript route honestly: it cannot work on a chat page,
  and no header, host or grant changes that — worker-src is the page's, and a
  userscript runs in the page. The extension is not bound by it, though its
  content script may be; if it is, the way through is an extension-origin
  document doing the recognising and passing results back, which is a real
  piece of work and not a patch.
- **2026-09-14** — the recogniser is gone, in both forms. Shipping one meant six
  megabytes in the extension and a slower review in every store; fetching one
  meant a request the page would not allow. And underneath both, the thing that
  settled it: an offline recogniser runs in a Web Worker built from a blob: URL,
  and a chat page's worker-src does not allow that either. Two separate page
  policies, each independently fatal, neither reachable from our side. It was
  never going to work on the surface it was built for.
  What stays is everything that never needed a recogniser. The scratchpad is a
  textarea now rather than a rendering of one, which is the whole of "bring your
  own voice": a phone keyboard's microphone types into it like any other
  keyboard, and so does a thumb. Tap a word, tap again for the sentence, again
  for the paragraph — the same cycle, driven by the caret instead of by spans.
  Reword, delete, collect, put it in the message box: all unchanged. Where the
  browser has on-device recognition of its own, the mic buttons use it and Say
  it again still re-dictates a selection; where it does not, that button is
  simply not there.
  Nothing is downloaded or installed any more, including the browser's own
  language pack — a missing pack is now a no rather than a prompt, and the
  answer points at the keyboard. Assay makes no network requests at all again,
  which is the sentence the privacy note wanted back.
  Deleted: extension/vosk.js and its source note, assay-voice.user.js, the
  fetch-voice script, site/voice/ and the CORS rule that served it. The package
  is 8 files and 162KB, as it was before any of this.
