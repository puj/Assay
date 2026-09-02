(function () {
  'use strict';

  // Re-running (e.g. via bookmarklet) toggles the sheet instead of double-injecting.
  if (window.__deepdive) { try { window.__deepdive.toggle(); } catch (e) {} return; }

  var VERSION = '0.2.0';
  var STORE_KEY = 'deepdive.fragments.v1';
  var BACKUP_KEY = 'deepdive.lastBatch.v1';
  var MIN_LEN = 4;

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  var fragments = loadJSON(STORE_KEY, []);
  fragments.forEach(function (f) { if (!f.notePos) f.notePos = 'post'; });
  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(fragments)); } catch (e) {}
  }

  var sheetOpen = false;

  // ---------------------------------------------------------------- UI shell
  var host = document.createElement('div');
  host.id = 'deepdive-host';
  host.style.cssText = 'all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483646;';
  var root = host.attachShadow({ mode: 'open' });
  root.innerHTML =
    '<style>' +
    ':host{all:initial}' +
    '*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-tap-highlight-color:transparent}' +
    'button{border:0;cursor:pointer;background:none;padding:0}' +
    '.hl{position:fixed;background:rgba(56,189,248,.32);border-radius:3px;pointer-events:none;z-index:4}' +
    '.bar{position:fixed;display:none;align-items:center;gap:2px;background:#111827;color:#f9fafb;' +
      'padding:5px 8px;border-radius:999px;box-shadow:0 4px 16px rgba(0,0,0,.35);z-index:10;user-select:none}' +
    '.bar.show{display:flex}' +
    '.bar button{color:#f9fafb;font-size:14px;font-weight:600;padding:6px 10px;border-radius:999px;touch-action:manipulation;white-space:nowrap}' +
    '.bar button:active{background:#374151}' +
    '.bar .x{color:#9ca3af}' +
    '.notebox{position:fixed;display:none;flex-direction:column;gap:8px;background:#111827;color:#f9fafb;' +
      'padding:10px 12px;border-radius:14px;box-shadow:0 4px 18px rgba(0,0,0,.4);z-index:11;width:min(320px,92vw)}' +
    '.notebox.show{display:flex}' +
    '.notebox input{border:1px solid #374151;border-radius:8px;background:#1f2937;color:#f9fafb;' +
      'padding:9px 10px;font-size:15px;outline:none}' +
    '.notebox .row{display:flex;gap:8px;align-items:center}' +
    '.posbtn{background:#1f2937;color:#9ca3af;font-size:13px;font-weight:600;border-radius:999px;padding:7px 12px}' +
    '.posbtn.on{background:#38bdf8;color:#0c1220}' +
    '.notebox .add{margin-left:auto;background:#38bdf8;color:#0c1220;font-size:14px;font-weight:700;' +
      'border-radius:999px;padding:8px 16px}' +
    '.chip{position:fixed;display:none;align-items:center;gap:6px;background:#111827;color:#f9fafb;' +
      'padding:10px 16px;border-radius:999px;font-size:15px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,.35);' +
      'z-index:10;user-select:none;touch-action:manipulation}' +
    '.chip.show{display:flex}' +
    '.pill{position:fixed;right:12px;bottom:110px;display:none;align-items:center;gap:8px;' +
      'background:#111827;color:#f9fafb;padding:12px 18px;border-radius:999px;font-size:15px;font-weight:600;' +
      'box-shadow:0 6px 20px rgba(0,0,0,.4);z-index:5;touch-action:manipulation}' +
    '.pill.show{display:flex}' +
    '.pill .n{background:#38bdf8;color:#0c1220;border-radius:999px;min-width:24px;height:24px;display:flex;' +
      'align-items:center;justify-content:center;font-size:13px;padding:0 6px}' +
    '.backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;z-index:20}' +
    '.backdrop.show{display:block}' +
    '.sheet{position:fixed;left:0;right:0;bottom:0;max-height:80vh;display:none;flex-direction:column;' +
      'background:#f8fafc;color:#0f172a;border-radius:18px 18px 0 0;box-shadow:0 -8px 30px rgba(0,0,0,.35);z-index:21}' +
    '.sheet.show{display:flex}' +
    '.sheet header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 8px}' +
    '.sheet header h2{margin:0;font-size:17px;font-weight:700}' +
    '.sheet header .close{font-size:22px;line-height:1;padding:4px 10px;color:#64748b}' +
    '.list{overflow-y:auto;padding:0 14px;flex:1;-webkit-overflow-scrolling:touch}' +
    '.frag{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;margin-bottom:10px}' +
    '.frag .top{display:flex;gap:10px;align-items:flex-start}' +
    '.frag .idx{flex:none;background:#e0f2fe;color:#0369a1;border-radius:999px;min-width:22px;height:22px;' +
      'display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;margin-top:1px}' +
    '.frag .txt{flex:1;font-size:14px;line-height:1.45;color:#1e293b;display:-webkit-box;-webkit-line-clamp:3;' +
      '-webkit-box-orient:vertical;overflow:hidden;white-space:pre-wrap}' +
    '.frag .txt.full{-webkit-line-clamp:unset}' +
    '.frag .del{flex:none;color:#94a3b8;font-size:18px;padding:2px 6px}' +
    '.frag .noterow{display:flex;gap:8px;margin-top:8px;align-items:center}' +
    '.frag input{flex:1;border:1px dashed #cbd5e1;border-radius:8px;padding:8px 10px;' +
      'font-size:14px;background:#f8fafc;color:#0f172a;outline:none;min-width:0}' +
    '.frag input:focus{border-color:#38bdf8;border-style:solid}' +
    '.frag .pos{flex:none;background:#e2e8f0;color:#475569;font-size:12px;font-weight:700;' +
      'border-radius:999px;padding:7px 10px;touch-action:manipulation}' +
    '.empty{padding:26px 10px;text-align:center;color:#64748b;font-size:14px;line-height:1.6}' +
    '.empty .restore{color:#0284c7;font-weight:600;text-decoration:underline;font-size:14px}' +
    '.actions{display:flex;gap:10px;padding:10px 14px 0}' +
    '.actions.last{padding-bottom:calc(14px + env(safe-area-inset-bottom))}' +
    '.btn{flex:1;border-radius:12px;padding:13px 10px;font-size:15px;font-weight:700;touch-action:manipulation}' +
    '.btn.minor{background:#e2e8f0;color:#475569;font-size:14px;padding:11px 8px}' +
    '.btn.go{background:#0284c7;color:#fff;padding:15px 10px}' +
    '.btn:disabled{opacity:.5}' +
    '.manual{margin:10px 14px 0;display:none}' +
    '.manual.show{display:block}' +
    '.manual textarea{width:100%;height:120px;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font-size:13px;background:#fff;color:#0f172a}' +
    '.toast{position:fixed;left:50%;transform:translateX(-50%);bottom:60px;background:#111827;color:#f9fafb;' +
      'padding:10px 18px;border-radius:999px;font-size:14px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,.35);' +
      'opacity:0;transition:opacity .25s;pointer-events:none;z-index:30;max-width:86vw;text-align:center}' +
    '.toast.show{opacity:1}' +
    '@media (prefers-color-scheme: dark){' +
      '.sheet{background:#0f172a;color:#e2e8f0}' +
      '.frag{background:#1e293b;border-color:#334155}' +
      '.frag .txt{color:#e2e8f0}' +
      '.frag input{background:#0f172a;border-color:#475569;color:#e2e8f0}' +
      '.frag .idx{background:#075985;color:#e0f2fe}' +
      '.frag .pos{background:#334155;color:#cbd5e1}' +
      '.btn.minor{background:#334155;color:#cbd5e1}' +
      '.empty{color:#94a3b8}' +
      '.manual textarea{background:#1e293b;border-color:#475569;color:#e2e8f0}' +
    '}' +
    '</style>' +
    '<div id="hlLayer"></div>' +
    '<div class="bar" id="bar">' +
      '<button id="addBtn">&#xFF0B; Add</button>' +
      '<button id="noteBtn">&#x270E; Note</button>' +
      '<button id="paraBtn">&#xB6;</button>' +
      '<button class="x" id="cancelBtn">&#x2715;</button>' +
    '</div>' +
    '<div class="notebox" id="notebox">' +
      '<input id="noteInput" type="text" placeholder="annotation &mdash; e.g. &ldquo;formalize this&rdquo;">' +
      '<div class="row">' +
        '<button class="posbtn" id="posPre">before</button>' +
        '<button class="posbtn on" id="posPost">after</button>' +
        '<button class="add" id="noteAdd">Add</button>' +
      '</div>' +
    '</div>' +
    '<button class="chip" id="chip">&#xFF0B; Collect</button>' +
    '<button class="pill" id="pill"><span>Deep dive</span><span class="n" id="count">0</span></button>' +
    '<div class="backdrop" id="backdrop"></div>' +
    '<div class="sheet" id="sheet">' +
      '<header><h2>Collected fragments</h2><button class="close" id="closeBtn">&#x2715;</button></header>' +
      '<div class="list" id="list"></div>' +
      '<div class="manual" id="manual"><textarea id="manualTxt" readonly></textarea></div>' +
      '<div class="actions">' +
        '<button class="btn minor" id="clearBtn">Clear</button>' +
        '<button class="btn minor" id="mdBtn">&#x2B07; .md</button>' +
        '<button class="btn minor" id="txtBtn">&#x2B07; .txt</button>' +
      '</div>' +
      '<div class="actions last">' +
        '<button class="btn go" id="goBtn">&#x2197; To composer</button>' +
      '</div>' +
    '</div>' +
    '<div class="toast" id="toast"></div>';

  function attach() {
    var parent = document.body || document.documentElement;
    if (parent && !host.isConnected) parent.appendChild(host);
  }
  attach();
  // SPA route changes occasionally rebuild <body>; make sure our UI survives.
  setInterval(attach, 2000);

  var $ = function (id) { return root.getElementById(id); };
  var chip = $('chip'), pill = $('pill'), sheet = $('sheet'), backdrop = $('backdrop');
  var toastEl = $('toast'), listEl = $('list'), manualEl = $('manual');
  var hlLayer = $('hlLayer'), bar = $('bar'), notebox = $('notebox');

  var toastTimer = null;
  function toast(msg, ms) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 1800);
  }

  function updatePill() {
    $('count').textContent = String(fragments.length);
    pill.classList.toggle('show', fragments.length > 0);
  }

  function addFragment(text, note, notePos) {
    fragments.push({
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      text: text,
      note: note || '',
      notePos: notePos || 'post',
      ts: Date.now()
    });
    persist();
    updatePill();
    toast('Collected — ' + fragments.length + ' fragment' + (fragments.length > 1 ? 's' : ''));
  }

  // -------------------------------------------------- tap-to-collect engine
  // Tap a sentence to highlight it; tap inside the highlight to extend by the
  // next sentence; ¶ grabs the whole block. Long-press text selection still
  // works via the Collect chip further down.
  var pending = null; // {block, flat:{nodes,text}, sentences:[{start,end}], i0, i1}

  function segmentSentences(text) {
    var out = [];
    if (window.Intl && Intl.Segmenter) {
      try {
        var seg = new Intl.Segmenter(undefined, { granularity: 'sentence' });
        var it = seg.segment(text);
        var iter = it[Symbol.iterator]();
        var step;
        while (!(step = iter.next()).done) {
          out.push({ start: step.value.index, end: step.value.index + step.value.segment.length });
        }
        if (out.length) return out;
      } catch (e) {}
    }
    var re = /[^.!?…]+[.!?…]*\s*/g, m;
    while ((m = re.exec(text))) out.push({ start: m.index, end: m.index + m[0].length });
    return out.length ? out : [{ start: 0, end: text.length }];
  }

  function flatten(block) {
    var nodes = [], text = '';
    var w = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = w.nextNode())) {
      nodes.push({ node: n, start: text.length, end: text.length + n.nodeValue.length });
      text += n.nodeValue;
    }
    return { nodes: nodes, text: text };
  }

  function caretPoint(x, y) {
    try {
      if (document.caretPositionFromPoint) {
        var p = document.caretPositionFromPoint(x, y);
        if (p) return { node: p.offsetNode, offset: p.offset };
      }
      if (document.caretRangeFromPoint) {
        var r = document.caretRangeFromPoint(x, y);
        if (r) return { node: r.startContainer, offset: r.startOffset };
      }
    } catch (e) {}
    return null;
  }

  function flatOffset(flat, node, offset) {
    for (var i = 0; i < flat.nodes.length; i++) {
      if (flat.nodes[i].node === node) return flat.nodes[i].start + offset;
    }
    return -1;
  }

  function domPoint(flat, off) {
    for (var i = 0; i < flat.nodes.length; i++) {
      var e = flat.nodes[i];
      if (off < e.end || i === flat.nodes.length - 1) {
        return { node: e.node, offset: Math.max(0, Math.min(off - e.start, e.node.nodeValue.length)) };
      }
    }
    return null;
  }

  function pendingRange() {
    var a = domPoint(pending.flat, pending.sentences[pending.i0].start);
    var b = domPoint(pending.flat, pending.sentences[pending.i1].end);
    if (!a || !b) return null;
    var r = document.createRange();
    r.setStart(a.node, a.offset);
    r.setEnd(b.node, b.offset);
    return r;
  }

  function pendingText() {
    return pending.flat.text
      .slice(pending.sentences[pending.i0].start, pending.sentences[pending.i1].end)
      .trim();
  }

  function clearPending() {
    pending = null;
    hlLayer.textContent = '';
    bar.classList.remove('show');
    notebox.classList.remove('show');
  }

  function drawPending() {
    hlLayer.textContent = '';
    if (!pending) return;
    var r = null;
    try { r = pendingRange(); } catch (e) {}
    if (!r) { clearPending(); return; }
    var rects = r.getClientRects();
    if (!rects.length) { clearPending(); return; }
    var last = null;
    for (var i = 0; i < rects.length; i++) {
      var rc = rects[i];
      if (rc.width < 1 || rc.height < 1) continue;
      var d = document.createElement('div');
      d.className = 'hl';
      d.style.left = rc.left + 'px';
      d.style.top = rc.top + 'px';
      d.style.width = rc.width + 'px';
      d.style.height = rc.height + 'px';
      hlLayer.appendChild(d);
      last = rc;
    }
    if (!last) { clearPending(); return; }
    bar.classList.add('show');
    var vw = window.innerWidth, vh = window.innerHeight;
    var bw = bar.offsetWidth || 210, bh = bar.offsetHeight || 40;
    var left = Math.max(8, Math.min(last.left, vw - bw - 8));
    var top = last.bottom + 10;
    if (top + bh > vh - 8) top = rects[0].top - bh - 10;
    bar.style.left = left + 'px';
    bar.style.top = Math.max(8, top) + 'px';
    if (notebox.classList.contains('show')) placeNotebox();
  }

  function placeNotebox() {
    var vw = window.innerWidth;
    var nw = notebox.offsetWidth || 300;
    var barTop = parseFloat(bar.style.top) || 100;
    var barLeft = parseFloat(bar.style.left) || 8;
    notebox.style.left = Math.max(8, Math.min(barLeft, vw - nw - 8)) + 'px';
    notebox.style.top = Math.max(8, barTop) + 'px';
  }

  function findBlock(el) {
    var block = el.closest && el.closest('p,li,blockquote,h1,h2,h3,h4,h5,h6,td,th,dd,dt,pre');
    if (!block) return null;
    if (block.closest('[contenteditable="true"]')) return null;
    if (block.closest('[data-message-author-role="assistant"]')) return block;
    if (block.closest('.font-claude-message')) return block;
    var main = document.querySelector('main');
    if (main && main.contains(block) && (block.textContent || '').trim().length >= 30) return block;
    return null;
  }

  document.addEventListener('click', function (e) {
    if (e.target === host) return;
    var el = e.target && e.target.nodeType === 1 ? e.target : (e.target ? e.target.parentElement : null);
    if (!el || host.contains(el)) return;
    if (sheetOpen) return;
    if (el.closest && el.closest('a,button,input,textarea,select,[contenteditable],[role="button"],svg')) {
      clearPending();
      return;
    }
    var sel = window.getSelection();
    if (sel && !sel.isCollapsed) return; // long-press selection flow owns this
    var block = findBlock(el);
    if (!block) { clearPending(); return; }
    var cp = caretPoint(e.clientX, e.clientY);
    if (!cp) { clearPending(); return; }

    if (pending && pending.block === block) {
      var off = flatOffset(pending.flat, cp.node, cp.offset);
      if (off >= pending.sentences[pending.i0].start && off <= pending.sentences[pending.i1].end) {
        // Tap inside the highlight: extend by the next sentence.
        if (pending.i1 < pending.sentences.length - 1) {
          pending.i1++;
          drawPending();
        } else {
          toast('End of paragraph');
        }
        return;
      }
    }
    var flat = flatten(block);
    var foff = flatOffset(flat, cp.node, cp.offset);
    if (foff < 0) { clearPending(); return; }
    var sentences = segmentSentences(flat.text);
    var idx = -1;
    for (var i = 0; i < sentences.length; i++) {
      if (foff >= sentences[i].start && foff < sentences[i].end) { idx = i; break; }
    }
    if (idx < 0) idx = sentences.length - 1;
    var probe = flat.text.slice(sentences[idx].start, sentences[idx].end).trim();
    if (probe.length < MIN_LEN) { clearPending(); return; }
    hideChip();
    notebox.classList.remove('show');
    pending = { block: block, flat: flat, sentences: sentences, i0: idx, i1: idx };
    drawPending();
  });

  $('addBtn').addEventListener('click', function () {
    if (!pending) return;
    addFragment(pendingText());
    clearPending();
  });
  $('paraBtn').addEventListener('click', function () {
    if (!pending) return;
    pending.i0 = 0;
    pending.i1 = pending.sentences.length - 1;
    drawPending();
  });
  $('cancelBtn').addEventListener('click', clearPending);

  var notePos = 'post';
  function setNotePos(p) {
    notePos = p;
    $('posPre').classList.toggle('on', p === 'pre');
    $('posPost').classList.toggle('on', p === 'post');
  }
  $('posPre').addEventListener('click', function () { setNotePos('pre'); });
  $('posPost').addEventListener('click', function () { setNotePos('post'); });
  $('noteBtn').addEventListener('click', function () {
    if (!pending) return;
    setNotePos('post');
    $('noteInput').value = '';
    notebox.classList.add('show');
    placeNotebox();
    $('noteInput').focus();
  });
  function noteboxAdd() {
    if (!pending) { notebox.classList.remove('show'); return; }
    addFragment(pendingText(), $('noteInput').value.trim(), notePos);
    clearPending();
  }
  $('noteAdd').addEventListener('click', noteboxAdd);
  $('noteInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') noteboxAdd();
  });

  var redrawScheduled = false;
  function scheduleRedraw() {
    if (!pending || redrawScheduled) return;
    redrawScheduled = true;
    requestAnimationFrame(function () {
      redrawScheduled = false;
      drawPending();
    });
  }
  window.addEventListener('scroll', scheduleRedraw, true);
  window.addEventListener('resize', scheduleRedraw);

  // ----------------------------------------- long-press selection (fallback)
  var selPendingText = '';
  function hideChip() { chip.classList.remove('show'); }

  function showChip(rect) {
    chip.classList.add('show');
    var vw = window.innerWidth, vh = window.innerHeight;
    var cw = chip.offsetWidth || 110, ch = chip.offsetHeight || 40;
    var left = 12, top = vh - ch - 90;
    if (rect && rect.width + rect.height > 0) {
      left = rect.left + rect.width / 2 - cw / 2;
      // Below the selection: Android's native text menu appears above it.
      top = rect.bottom + 14;
      if (top + ch > vh - 12) top = rect.top - ch - 14;
    }
    chip.style.left = Math.max(8, Math.min(left, vw - cw - 8)) + 'px';
    chip.style.top = Math.max(8, Math.min(top, vh - ch - 8)) + 'px';
  }

  var selTimer = null;
  document.addEventListener('selectionchange', function () {
    clearTimeout(selTimer);
    selTimer = setTimeout(onSelection, 250);
  });

  function onSelection() {
    if (sheetOpen) return;
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) { hideChip(); return; }
    var text = sel.toString().trim();
    if (text.length < MIN_LEN) { hideChip(); return; }
    var node = sel.anchorNode;
    var el = node ? (node.nodeType === 1 ? node : node.parentElement) : null;
    if (!el || host.contains(el)) return;
    // Don't offer to collect text the user is editing.
    if (el.closest && el.closest('[contenteditable="true"],textarea,input')) { hideChip(); return; }
    clearPending();
    selPendingText = text;
    var rect = null;
    try { rect = sel.getRangeAt(0).getBoundingClientRect(); } catch (e) {}
    showChip(rect);
  }

  window.addEventListener('scroll', hideChip, true);

  chip.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (!selPendingText) return;
    addFragment(selPendingText);
    selPendingText = '';
    hideChip();
    try { window.getSelection().removeAllRanges(); } catch (err) {}
  });

  // ----------------------------------------------------------------- sheet
  function openSheet() {
    sheetOpen = true;
    hideChip();
    clearPending();
    renderList();
    manualEl.classList.remove('show');
    backdrop.classList.add('show');
    sheet.classList.add('show');
  }
  function closeSheet() {
    sheetOpen = false;
    backdrop.classList.remove('show');
    sheet.classList.remove('show');
  }
  function toggleSheet() { sheetOpen ? closeSheet() : openSheet(); }

  pill.addEventListener('click', openSheet);
  $('closeBtn').addEventListener('click', closeSheet);
  backdrop.addEventListener('click', closeSheet);

  function renderList() {
    listEl.textContent = '';
    if (!fragments.length) {
      var empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Nothing collected yet. Tap a sentence in a reply (tap again to extend it), or long-press to select any span.';
      var backup = loadJSON(BACKUP_KEY, null);
      if (backup && backup.length) {
        empty.appendChild(document.createElement('br'));
        var restore = document.createElement('button');
        restore.className = 'restore';
        restore.textContent = 'Restore last batch (' + backup.length + ')';
        restore.addEventListener('click', function () {
          fragments = backup;
          fragments.forEach(function (f) { if (!f.notePos) f.notePos = 'post'; });
          persist(); updatePill(); renderList();
        });
        empty.appendChild(restore);
      }
      listEl.appendChild(empty);
      $('goBtn').disabled = true;
      $('mdBtn').disabled = true;
      $('txtBtn').disabled = true;
      return;
    }
    $('goBtn').disabled = false;
    $('mdBtn').disabled = false;
    $('txtBtn').disabled = false;
    fragments.forEach(function (f, i) {
      var item = document.createElement('div');
      item.className = 'frag';

      var top = document.createElement('div');
      top.className = 'top';

      var idx = document.createElement('span');
      idx.className = 'idx';
      idx.textContent = String(i + 1);

      var txt = document.createElement('div');
      txt.className = 'txt';
      txt.textContent = f.text;
      txt.addEventListener('click', function () { txt.classList.toggle('full'); });

      var del = document.createElement('button');
      del.className = 'del';
      del.textContent = '✕';
      del.addEventListener('click', function () {
        fragments = fragments.filter(function (x) { return x.id !== f.id; });
        persist(); updatePill(); renderList();
      });

      top.appendChild(idx); top.appendChild(txt); top.appendChild(del);

      var row = document.createElement('div');
      row.className = 'noterow';

      var note = document.createElement('input');
      note.type = 'text';
      note.placeholder = 'annotation (now or later)';
      note.value = f.note || '';
      note.addEventListener('input', function () { f.note = note.value; persist(); });

      var pos = document.createElement('button');
      pos.className = 'pos';
      pos.textContent = f.notePos === 'pre' ? 'before' : 'after';
      pos.title = 'Where the annotation sits relative to the quote';
      pos.addEventListener('click', function () {
        f.notePos = f.notePos === 'pre' ? 'post' : 'pre';
        pos.textContent = f.notePos === 'pre' ? 'before' : 'after';
        persist();
      });

      row.appendChild(note); row.appendChild(pos);
      item.appendChild(top);
      item.appendChild(row);
      listEl.appendChild(item);
    });
  }

  $('clearBtn').addEventListener('click', function () {
    if (!fragments.length) { closeSheet(); return; }
    try { localStorage.setItem(BACKUP_KEY, JSON.stringify(fragments)); } catch (e) {}
    fragments = [];
    persist(); updatePill(); renderList();
    toast('Cleared (restorable from the sheet)');
  });

  // ------------------------------------------------------- payload & export
  // No wrapper prompt: the payload is the fragments and their annotations.
  function buildPayload() {
    var many = fragments.length > 1;
    return fragments.map(function (f, i) {
      var head = many ? (i + 1) + '. ' : '';
      var note = (f.note || '').trim();
      var lines = [];
      if (note && f.notePos === 'pre') {
        lines.push(head + note + ':');
        lines.push('“' + f.text.trim() + '”');
      } else {
        lines.push(head + '“' + f.text.trim() + '”');
        if (note) lines.push('→ ' + note);
      }
      return lines.join('\n');
    }).join('\n\n');
  }

  function two(n) { return (n < 10 ? '0' : '') + n; }
  function niceStamp() {
    var d = new Date();
    return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()) +
      ' ' + two(d.getHours()) + ':' + two(d.getMinutes());
  }
  function fileStamp() {
    return niceStamp().replace(' ', '-').replace(':', '');
  }

  function buildMarkdown() {
    var lines = ['# Fragments — ' + location.hostname + ' — ' + niceStamp(), ''];
    fragments.forEach(function (f, i) {
      var note = (f.note || '').trim();
      lines.push('## ' + (i + 1));
      lines.push('');
      if (note && f.notePos === 'pre') {
        lines.push('*' + note + ':*');
        lines.push('');
      }
      f.text.trim().split('\n').forEach(function (l) { lines.push('> ' + l); });
      if (note && f.notePos !== 'pre') {
        lines.push('');
        lines.push('→ *' + note + '*');
      }
      lines.push('');
    });
    return lines.join('\n');
  }

  function download(name, text, mime) {
    try {
      var blob = new Blob([text], { type: mime });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = name;
      (document.body || document.documentElement).appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      return true;
    } catch (e) {
      return false;
    }
  }

  $('mdBtn').addEventListener('click', function () {
    if (!fragments.length) return;
    var ok = download('deepdive-' + fileStamp() + '.md', buildMarkdown(), 'text/markdown');
    toast(ok ? 'Saved .md' : 'Download blocked by the browser');
  });
  $('txtBtn').addEventListener('click', function () {
    if (!fragments.length) return;
    var ok = download('deepdive-' + fileStamp() + '.txt', buildPayload() + '\n', 'text/plain');
    toast(ok ? 'Saved .txt' : 'Download blocked by the browser');
  });

  // ------------------------------------------------------------- composing
  function findComposer() {
    return document.querySelector('#prompt-textarea') ||
      document.querySelector('div[contenteditable="true"].ProseMirror') ||
      document.querySelector('form div[contenteditable="true"]') ||
      document.querySelector('div[contenteditable="true"]') ||
      document.querySelector('form textarea') ||
      document.querySelector('main textarea');
  }

  function insertIntoComposer(text) {
    var el = findComposer();
    if (!el) return false;
    try {
      el.focus();
      if (el.tagName === 'TEXTAREA') {
        var proto = window.HTMLTextAreaElement.prototype;
        var setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(el, el.value ? el.value + '\n\n' + text : text);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return el.value.indexOf(text.slice(0, 30)) !== -1;
      }
      // contenteditable (ProseMirror on both ChatGPT and Claude):
      // a synthetic paste is the most faithful multi-line insert.
      var sel = window.getSelection();
      sel.selectAllChildren(el);
      sel.collapseToEnd();
      try {
        var dt = new DataTransfer();
        dt.setData('text/plain', text);
        el.dispatchEvent(new ClipboardEvent('paste', {
          clipboardData: dt, bubbles: true, cancelable: true
        }));
      } catch (e) {}
      if ((el.innerText || '').indexOf(text.slice(0, 30)) !== -1) return true;
      try { document.execCommand('insertText', false, text); } catch (e) {}
      return (el.innerText || '').indexOf(text.slice(0, 30)) !== -1;
    } catch (e) {
      return false;
    }
  }

  function legacyCopy(t) {
    var ta = document.createElement('textarea');
    ta.value = t;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    return ok;
  }

  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(t).then(
        function () { return true; },
        function () { return legacyCopy(t); }
      );
    }
    return Promise.resolve(legacyCopy(t));
  }

  function finishBatch(msg) {
    try { localStorage.setItem(BACKUP_KEY, JSON.stringify(fragments)); } catch (e) {}
    fragments = [];
    persist(); updatePill(); closeSheet();
    toast(msg, 2600);
  }

  $('goBtn').addEventListener('click', function () {
    if (!fragments.length) return;
    var payload = buildPayload();
    if (insertIntoComposer(payload)) {
      finishBatch('In the composer — review and send');
      return;
    }
    copyText(payload).then(function (copied) {
      if (copied) {
        finishBatch('Copied — paste into the composer');
      } else {
        // Last resort: show the payload for manual copy, keep fragments.
        manualEl.classList.add('show');
        $('manualTxt').value = payload;
        $('manualTxt').select();
        toast('Copy the text below manually', 2600);
      }
    });
  });

  updatePill();
  window.__deepdive = { toggle: toggleSheet, version: VERSION };
})();
