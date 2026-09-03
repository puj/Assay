(function () {
  'use strict';

  // Re-running (e.g. via bookmarklet) toggles the sheet instead of double-injecting.
  if (window.__deepdive) { try { window.__deepdive.toggle(); } catch (e) {} return; }

  var VERSION = '0.5.1';
  var MAP_KEY = 'deepdive.byConvo.v1';
  var BACKUP_MAP_KEY = 'deepdive.backupByConvo.v1';
  var LEGACY_KEY = 'deepdive.fragments.v1';
  var MIN_SEL_LEN = 4;

  // Rotating highlight colors: pending selection previews the color the next
  // fragment will get; collected marks stay on the page in the same hue.
  var PALETTE = [
    { rgb: '56,189,248', badgeBg: '#bae6fd', badgeInk: '#075985' },  // sky
    { rgb: '251,191,36', badgeBg: '#fde68a', badgeInk: '#92400e' },  // amber
    { rgb: '74,222,128', badgeBg: '#bbf7d0', badgeInk: '#166534' },  // green
    { rgb: '244,114,182', badgeBg: '#fbcfe8', badgeInk: '#9d174d' }, // pink
    { rgb: '167,139,250', badgeBg: '#ddd6fe', badgeInk: '#5b21b6' }, // violet
    { rgb: '251,146,60', badgeBg: '#fed7aa', badgeInk: '#9a3412' }   // orange
  ];
  function nextColorIdx() { return fragments.length % PALETTE.length; }

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  // Each conversation keeps its own fragment list, keyed "<host>:<convo id>"
  // ("<host>:draft" before a brand-new chat gets its id — that batch follows
  // the chat once the id appears). A shared cross-conversation list can layer
  // on top of this keying later.
  function convoKey() {
    var m = location.pathname.match(/\/(?:c|chat)\/([A-Za-z0-9-]+)/);
    return location.hostname + ':' + (m ? m[1] : 'draft');
  }
  function normalize(list) {
    list.forEach(function (f, i) {
      if (!f.notePos) f.notePos = 'post';
      if (typeof f.colorIdx !== 'number') f.colorIdx = i % PALETTE.length;
    });
    return list;
  }
  function saveMap(key, map) {
    try { localStorage.setItem(key, JSON.stringify(map)); } catch (e) {}
  }
  var convo = convoKey();
  var byConvo = loadJSON(MAP_KEY, {});
  // One-time migration of the 0.3.x single global list into this conversation.
  var legacy = loadJSON(LEGACY_KEY, null);
  if (legacy && legacy.length) {
    byConvo[convo] = (byConvo[convo] || []).concat(legacy);
    saveMap(MAP_KEY, byConvo);
    try { localStorage.removeItem(LEGACY_KEY); } catch (e) {}
  }
  var fragments = normalize(byConvo[convo] || []);
  function persist() {
    var map = loadJSON(MAP_KEY, {});
    if (fragments.length) map[convo] = fragments; else delete map[convo];
    saveMap(MAP_KEY, map);
  }
  function loadBackup() {
    return loadJSON(BACKUP_MAP_KEY, {})[convo] || null;
  }
  function saveBackup() {
    var map = loadJSON(BACKUP_MAP_KEY, {});
    map[convo] = fragments;
    saveMap(BACKUP_MAP_KEY, map);
  }

  var sheetOpen = false;

  // ---------------------------------------------------------------- UI shell
  var host = document.createElement('div');
  host.id = 'deepdive-host';
  host.style.cssText = 'all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483646;';
  // Key events from inside the shadow root reach the page retargeted to this
  // bare host div, so ChatGPT's "type anywhere to focus the composer" handler
  // doesn't see an editable target and steals focus mid-note. Marking the host
  // contenteditable makes those handlers treat our typing as already-editable.
  host.setAttribute('contenteditable', 'true');
  var root = host.attachShadow({ mode: 'open' });
  root.innerHTML =
    '<style>' +
    ':host{all:initial}' +
    '*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-tap-highlight-color:transparent}' +
    'button{border:0;cursor:pointer;background:none;padding:0}' +
    '.hl{position:fixed;border-radius:3px;pointer-events:none;z-index:4}' +
    '.bar{position:fixed;display:none;align-items:center;gap:2px;background:#111827;color:#f9fafb;' +
      'padding:5px 8px;border-radius:999px;box-shadow:0 4px 16px rgba(0,0,0,.35);z-index:10;user-select:none}' +
    '.bar.show{display:flex}' +
    '.bar button{color:#f9fafb;font-size:14px;font-weight:600;padding:6px 10px;border-radius:999px;touch-action:manipulation;white-space:nowrap}' +
    '.bar button:active{background:#374151}' +
    '.bar .x{color:#9ca3af}' +
    '.notebox{position:fixed;display:none;flex-direction:column;gap:8px;background:#111827;color:#f9fafb;' +
      'padding:10px 12px;border-radius:14px;box-shadow:0 4px 18px rgba(0,0,0,.4);z-index:26;' +
      'width:min(480px,calc(100vw - 16px))}' +
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
      'box-shadow:0 6px 20px rgba(0,0,0,.4);z-index:25;touch-action:manipulation}' +
    '.pill.show{display:flex}' +
    '.pill .n{background:#38bdf8;color:#0c1220;border-radius:999px;min-width:24px;height:24px;display:flex;' +
      'align-items:center;justify-content:center;font-size:13px;padding:0 6px}' +
    '.sheet{position:fixed;left:0;right:0;bottom:0;max-height:70vh;display:none;flex-direction:column;' +
      'background:#f8fafc;color:#0f172a;border-radius:18px 18px 0 0;box-shadow:0 -8px 30px rgba(0,0,0,.35);z-index:21}' +
    '.sheet.show{display:flex}' +
    '.sheet header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 8px}' +
    '.sheet header h2{margin:0;font-size:17px;font-weight:700}' +
    '.sheet header .close{font-size:22px;line-height:1;padding:4px 10px;color:#64748b}' +
    '.list{overflow-y:auto;padding:0 14px;flex:1;-webkit-overflow-scrolling:touch}' +
    '.frag{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;margin-bottom:10px}' +
    '.frag .top{display:flex;gap:10px;align-items:flex-start}' +
    '.frag .idx{flex:none;border-radius:999px;min-width:22px;height:22px;' +
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
    '<button class="pill" id="pill"><span id="pillLabel">Deep dive</span><span class="n" id="count">0</span></button>' +
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
    if (parent && !host.isConnected) {
      var ae = root.activeElement;
      parent.appendChild(host);
      // Re-appending the host drops focus inside the shadow root; restore it.
      if (ae && ae.focus) { try { ae.focus(); } catch (e) {} }
    }
  }
  attach();
  // SPA route changes occasionally rebuild <body>; make sure our UI survives.
  setInterval(attach, 2000);

  // SPA navigation between conversations never reloads the page, so watch the
  // URL and swap in the right fragment list when it changes.
  function checkRoute() {
    var k = convoKey();
    if (k === convo) return;
    var prev = convo;
    convo = k;
    clearPending();
    marks = [];
    hideChip();
    var map = loadJSON(MAP_KEY, {});
    var list = map[k] || [];
    // A batch collected in a fresh chat follows it once it gets a real id.
    if (!list.length && prev === location.hostname + ':draft' && map[prev] && map[prev].length) {
      list = map[prev];
      delete map[prev];
      map[k] = list;
      saveMap(MAP_KEY, map);
    }
    fragments = normalize(list);
    updatePill();
    redraw();
    if (sheetOpen) renderList();
  }
  setInterval(checkRoute, 800);

  var $ = function (id) { return root.getElementById(id); };
  var chip = $('chip'), pill = $('pill'), sheet = $('sheet');
  var toastEl = $('toast'), listEl = $('list'), manualEl = $('manual');
  var hlLayer = $('hlLayer'), bar = $('bar'), notebox = $('notebox');

  // Focus guard for our text fields. Three layers:
  // 1. Key events targeted at our UI are stopped at window-capture, before
  //    the page's own capture- or bubble-phase hotkey handlers can see them.
  // 2. Pointer tracking distinguishes "the user tapped somewhere else" (a
  //    legitimate focus move) from "the page stole focus mid-typing" — a tap
  //    on the guarded field itself never counts as leaving it.
  // 3. On a steal, focus and the caret position are restored.
  var lastPointer = { ts: 0, target: null, inHost: false };
  document.addEventListener('pointerdown', function (e) {
    lastPointer = { ts: Date.now(), target: null, inHost: e.target === host };
  }, true);
  root.addEventListener('pointerdown', function (e) {
    lastPointer = { ts: Date.now(), target: e.target, inHost: true };
  }, true);
  ['keydown', 'keypress', 'keyup'].forEach(function (t) {
    window.addEventListener(t, function (e) {
      if (e.target !== host) return;
      e.stopPropagation();
      // Target-phase listeners never fire once propagation stops, so the
      // notebox's Enter-to-add is handled here.
      if (t === 'keydown' && e.key === 'Enter' && root.activeElement === $('noteInput')) {
        noteboxAdd();
      }
    }, true);
  });
  var refocusLog = [];
  function pointerExplainsBlur(el) {
    if (Date.now() - lastPointer.ts >= 600) return false;
    // A fresh tap on this very field is how it GOT focus, not a reason to
    // give it up; any other recent tap is the user moving on.
    return !(lastPointer.inHost && lastPointer.target === el);
  }
  function guardInput(el) {
    ['keydown', 'keyup', 'keypress'].forEach(function (t) {
      el.addEventListener(t, function (e) { e.stopPropagation(); });
    });
    el.addEventListener('blur', function () {
      if (pointerExplainsBlur(el)) return;
      var now = Date.now();
      refocusLog = refocusLog.filter(function (ts) { return now - ts < 2000; });
      if (refocusLog.length >= 6) return; // don't fight a persistent page forever
      refocusLog.push(now);
      var caret = null;
      try { caret = el.selectionStart; } catch (e) {}
      setTimeout(function () {
        if (!el.isConnected || el.offsetParent === null) return;
        if (pointerExplainsBlur(el)) return;
        try {
          el.focus();
          if (typeof caret === 'number') el.setSelectionRange(caret, caret);
        } catch (e) {}
      }, 0);
    });
  }

  var toastTimer = null;
  function toast(msg, ms) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 1800);
  }

  function updatePill() {
    $('count').textContent = String(fragments.length);
    pill.classList.toggle('show', fragments.length > 0 || sheetOpen);
    positionPill();
  }

  // Lift bottom-anchored UI above the on-screen keyboard, and dock popovers to
  // the visible part of the viewport (the keyboard shrinks visualViewport, not
  // the layout viewport, so fixed elements otherwise slide under it).
  function viewportInsets() {
    var vv = window.visualViewport;
    if (!vv) return { top: 0, left: 0, bottom: 0, height: window.innerHeight };
    return {
      top: vv.offsetTop,
      left: vv.offsetLeft,
      bottom: Math.max(0, window.innerHeight - vv.height - vv.offsetTop),
      height: vv.height
    };
  }
  function syncViewport() {
    var ins = viewportInsets();
    sheet.style.bottom = ins.bottom + 'px';
    sheet.style.maxHeight = Math.round(ins.height * 0.7) + 'px';
    if (notebox.classList.contains('show')) placeNotebox();
    positionPill();
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncViewport);
    window.visualViewport.addEventListener('scroll', syncViewport);
  }

  function positionPill() {
    var ins = viewportInsets();
    if (sheetOpen && sheet.classList.contains('show')) {
      pill.style.bottom = (ins.bottom + sheet.offsetHeight + 12) + 'px';
    } else {
      pill.style.bottom = (ins.bottom + 110) + 'px';
    }
  }

  function addFragment(text, note, notePos) {
    var colorIdx = nextColorIdx();
    fragments.push({
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      text: text,
      note: note || '',
      notePos: notePos || 'post',
      colorIdx: colorIdx,
      ts: Date.now()
    });
    persist();
    updatePill();
    if (sheetOpen) {
      // Append rather than rebuild: a full re-render would drop focus from a
      // note input the user is typing in.
      if (listEl.querySelector('.frag')) {
        listEl.appendChild(buildFragItem(fragments[fragments.length - 1], fragments.length - 1));
        $('goBtn').disabled = false;
        positionPill();
      } else {
        renderList();
      }
    }
    toast('Collected — ' + fragments.length + ' fragment' + (fragments.length > 1 ? 's' : ''));
    return colorIdx;
  }

  // -------------------------------------------------- tap-to-collect engine
  // Tap a word to select it. Tap inside the highlight to widen the scope:
  // word → sentence → paragraph → back to the word. Tap a word outside the
  // highlight (same block) to grow the selection in that direction, word by
  // word. Collected fragments keep a tinted mark on the page for the session.
  var pending = null; // {block, flat, words, sentences, start, end, scope, aw0, aw1}
  var marks = [];     // session-only: {flat, block, start, end, colorIdx}

  function segmentSentences(text) {
    var out = [];
    if (window.Intl && Intl.Segmenter) {
      try {
        var seg = new Intl.Segmenter(undefined, { granularity: 'sentence' });
        var iter = seg.segment(text)[Symbol.iterator]();
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

  function segmentWords(text) {
    var out = [];
    if (window.Intl && Intl.Segmenter) {
      try {
        var seg = new Intl.Segmenter(undefined, { granularity: 'word' });
        var iter = seg.segment(text)[Symbol.iterator]();
        var step;
        while (!(step = iter.next()).done) {
          if (step.value.isWordLike) {
            out.push({ start: step.value.index, end: step.value.index + step.value.segment.length });
          }
        }
        if (out.length) return out;
      } catch (e) {}
    }
    var re = /\S+/g, m;
    while ((m = re.exec(text))) out.push({ start: m.index, end: m.index + m[0].length });
    return out;
  }

  function wordAt(words, off) {
    var best = null, bestDist = Infinity;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (off >= w.start && off < w.end) return w;
      var d = off < w.start ? w.start - off : off - w.end + 1;
      if (d < bestDist) { bestDist = d; best = w; }
    }
    return bestDist <= 3 ? best : null;
  }

  function sentenceBounds(sentences, start, end) {
    var s0 = null, s1 = null;
    var last = Math.max(start, end - 1);
    for (var i = 0; i < sentences.length; i++) {
      if (s0 === null && start < sentences[i].end) s0 = sentences[i];
      if (last < sentences[i].end) { s1 = sentences[i]; break; }
    }
    if (!s0) s0 = sentences[0];
    if (!s1) s1 = sentences[sentences.length - 1];
    return { start: s0.start, end: s1.end };
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

  function rectsFor(flat, start, end) {
    var a = domPoint(flat, start);
    var b = domPoint(flat, end);
    if (!a || !b) return null;
    try {
      var r = document.createRange();
      r.setStart(a.node, a.offset);
      r.setEnd(b.node, b.offset);
      var rects = r.getClientRects();
      return rects.length ? rects : null;
    } catch (e) {
      return null;
    }
  }

  function pendingText() {
    return pending.flat.text.slice(pending.start, pending.end).trim();
  }

  function clearPending() {
    pending = null;
    bar.classList.remove('show');
    notebox.classList.remove('show');
    redraw();
  }

  function paintRects(rects, color) {
    for (var i = 0; i < rects.length; i++) {
      var rc = rects[i];
      if (rc.width < 1 || rc.height < 1) continue;
      var d = document.createElement('div');
      d.className = 'hl';
      d.style.left = rc.left + 'px';
      d.style.top = rc.top + 'px';
      d.style.width = rc.width + 'px';
      d.style.height = rc.height + 'px';
      d.style.background = color;
      hlLayer.appendChild(d);
    }
  }

  function redraw() {
    hlLayer.textContent = '';
    // Session marks for already-collected fragments (drop dead ones quietly).
    marks = marks.filter(function (m) {
      if (!m.block.isConnected) return false;
      var rects = rectsFor(m.flat, m.start, m.end);
      if (!rects) return false;
      paintRects(rects, 'rgba(' + PALETTE[m.colorIdx].rgb + ',.18)');
      return true;
    });
    if (!pending) { bar.classList.remove('show'); return; }
    var rects = rectsFor(pending.flat, pending.start, pending.end);
    if (!rects) { pending = null; bar.classList.remove('show'); return; }
    paintRects(rects, 'rgba(' + PALETTE[nextColorIdx()].rgb + ',.34)');
    var last = rects[rects.length - 1];
    bar.classList.add('show');
    var vw = window.innerWidth, vh = window.innerHeight;
    var bw = bar.offsetWidth || 180, bh = bar.offsetHeight || 40;
    var left = Math.max(8, Math.min(last.left, vw - bw - 8));
    var top = last.bottom + 10;
    if (top + bh > vh - 8) top = rects[0].top - bh - 10;
    bar.style.left = left + 'px';
    bar.style.top = Math.max(8, top) + 'px';
  }

  function placeNotebox() {
    var ins = viewportInsets();
    notebox.style.top = (ins.top + 10) + 'px';
    notebox.style.left = (ins.left + 8) + 'px';
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

  function beginPending(block, flat, foff) {
    var words = segmentWords(flat.text);
    var w = wordAt(words, foff);
    if (!w) return false;
    pending = {
      block: block,
      flat: flat,
      words: words,
      sentences: segmentSentences(flat.text),
      start: w.start,
      end: w.end,
      scope: 'word',
      aw0: w.start,
      aw1: w.end
    };
    return true;
  }

  function cycleScope() {
    var p = pending;
    if (p.scope === 'paragraph') {
      p.start = p.aw0; p.end = p.aw1; p.scope = 'word';
      return;
    }
    if (p.scope === 'sentence') {
      p.start = 0; p.end = p.flat.text.length; p.scope = 'paragraph';
      return;
    }
    // word or custom → the sentence(s) covering the current selection;
    // if that changes nothing, go straight to the paragraph.
    var sb = sentenceBounds(p.sentences, p.start, p.end);
    if (sb.start === p.start && sb.end === p.end) {
      p.start = 0; p.end = p.flat.text.length; p.scope = 'paragraph';
    } else {
      p.start = sb.start; p.end = sb.end; p.scope = 'sentence';
    }
  }

  document.addEventListener('click', function (e) {
    if (e.target === host) return;
    var el = e.target && e.target.nodeType === 1 ? e.target : (e.target ? e.target.parentElement : null);
    if (!el || host.contains(el)) return;
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
      if (off >= 0) {
        if (off >= pending.start && off <= pending.end) {
          cycleScope();
          redraw();
          return;
        }
        // Outside the highlight, same block: grow toward the tapped word.
        var w = wordAt(pending.words, off);
        if (w) {
          if (off >= pending.end) pending.end = Math.max(pending.end, w.end);
          else pending.start = Math.min(pending.start, w.start);
          pending.scope = 'custom';
          redraw();
          return;
        }
      }
    }
    var flat = flatten(block);
    var foff = flatOffset(flat, cp.node, cp.offset);
    if (foff < 0) { clearPending(); return; }
    hideChip();
    notebox.classList.remove('show');
    if (!beginPending(block, flat, foff)) { clearPending(); return; }
    redraw();
  });

  function collectPending(note, notePos) {
    var p = pending;
    var colorIdx = addFragment(pendingText(), note, notePos);
    marks.push({ flat: p.flat, block: p.block, start: p.start, end: p.end, colorIdx: colorIdx });
    clearPending();
  }

  $('addBtn').addEventListener('click', function () {
    if (pending) collectPending();
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
    collectPending($('noteInput').value.trim(), notePos);
  }
  $('noteAdd').addEventListener('click', noteboxAdd);
  $('noteInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') noteboxAdd();
  });
  guardInput($('noteInput'));
  guardInput($('manualTxt'));

  var redrawScheduled = false;
  function scheduleRedraw() {
    if ((!pending && !marks.length) || redrawScheduled) return;
    redrawScheduled = true;
    requestAnimationFrame(function () {
      redrawScheduled = false;
      redraw();
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
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) { hideChip(); return; }
    var text = sel.toString().trim();
    if (text.length < MIN_SEL_LEN) { hideChip(); return; }
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

  // ------------------------------------------------------------------ sheet
  // Non-modal: the conversation stays visible and scrollable behind it, taps
  // still collect while it's open, and the pill rides above it as a toggle.
  function openSheet() {
    sheetOpen = true;
    hideChip();
    clearPending();
    renderList();
    manualEl.classList.remove('show');
    sheet.classList.add('show');
    syncViewport();
    updatePill();
  }
  function closeSheet() {
    sheetOpen = false;
    sheet.classList.remove('show');
    updatePill();
  }
  function toggleSheet() { sheetOpen ? closeSheet() : openSheet(); }

  pill.addEventListener('click', toggleSheet);
  $('closeBtn').addEventListener('click', closeSheet);

  function renderList() {
    // Rebuilding destroys a note input the user may be typing in (e.g. a
    // route-watcher refresh) — carry focus and caret across the rebuild.
    var focusFid = null, focusCaret = 0;
    var ae = root.activeElement;
    if (ae && ae.tagName === 'INPUT' && ae.getAttribute('data-fid')) {
      focusFid = ae.getAttribute('data-fid');
      try { focusCaret = ae.selectionStart || 0; } catch (e) {}
    }
    listEl.textContent = '';
    if (!fragments.length) {
      var empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Nothing collected in this conversation yet. Tap a word in a reply — tap the highlight to widen it (word → sentence → paragraph), tap nearby words to grow it — or long-press to select any span.';
      var backup = loadBackup();
      if (backup && backup.length) {
        empty.appendChild(document.createElement('br'));
        var restore = document.createElement('button');
        restore.className = 'restore';
        restore.textContent = 'Restore last batch (' + backup.length + ')';
        restore.addEventListener('click', function () {
          fragments = normalize(backup);
          persist(); updatePill(); renderList();
        });
        empty.appendChild(restore);
      }
      listEl.appendChild(empty);
      $('goBtn').disabled = true;
      positionPill();
      return;
    }
    $('goBtn').disabled = false;
    fragments.forEach(function (f, i) {
      listEl.appendChild(buildFragItem(f, i));
    });
    if (focusFid) {
      var again = listEl.querySelector('input[data-fid="' + focusFid + '"]');
      if (again) {
        try { again.focus(); again.setSelectionRange(focusCaret, focusCaret); } catch (e) {}
      }
    }
    positionPill();
  }

  function buildFragItem(f, i) {
    var item = document.createElement('div');
    item.className = 'frag';

    var top = document.createElement('div');
    top.className = 'top';

    var idx = document.createElement('span');
    idx.className = 'idx';
    idx.textContent = String(i + 1);
    idx.style.background = PALETTE[f.colorIdx].badgeBg;
    idx.style.color = PALETTE[f.colorIdx].badgeInk;

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
    note.setAttribute('data-fid', f.id);
    note.addEventListener('input', function () { f.note = note.value; persist(); });
    guardInput(note);

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
    return item;
  }

  $('clearBtn').addEventListener('click', function () {
    if (!fragments.length) { closeSheet(); return; }
    saveBackup();
    fragments = [];
    marks = [];
    persist(); updatePill(); renderList(); redraw();
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

  // -------------------------------------------- whole-conversation capture
  function textOf(el) {
    return (el.innerText || '').replace(/ /g, ' ').trim();
  }

  // Light DOM→markdown for rendered chat messages: block structure only
  // (paragraphs, headings, lists, code fences, quotes); inline styling is
  // dropped. Robust beats faithful here.
  function serializeBlocks(rootEl) {
    var out = [];
    function pushText(s) { if (s) out.push(s); }
    function walk(node) {
      if (node.nodeType !== 1 || node === host) return;
      var tag = node.tagName;
      var h = /^H([1-6])$/.exec(tag);
      if (h) { pushText(new Array(+h[1] + 1).join('#') + ' ' + textOf(node)); return; }
      if (tag === 'P') { pushText(textOf(node)); return; }
      if (tag === 'PRE') {
        var code = node.querySelector('code');
        var t = ((code || node).innerText || '').replace(/\s+$/, '');
        if (t) out.push('```\n' + t + '\n```');
        return;
      }
      if (tag === 'UL' || tag === 'OL') {
        var items = node.querySelectorAll(':scope > li');
        Array.prototype.forEach.call(items, function (li, i) {
          pushText((tag === 'OL' ? (i + 1) + '. ' : '- ') + textOf(li).replace(/\n+/g, ' '));
        });
        return;
      }
      if (tag === 'BLOCKQUOTE') {
        var q = textOf(node);
        if (q) out.push(q.split('\n').map(function (l) { return '> ' + l; }).join('\n'));
        return;
      }
      if (tag === 'TABLE') { pushText(textOf(node)); return; }
      var child = node.firstChild;
      while (child) { walk(child); child = child.nextSibling; }
    }
    walk(rootEl);
    if (!out.length) pushText(textOf(rootEl));
    return out;
  }

  function getConversation() {
    var nodes = document.querySelectorAll('[data-message-author-role]');
    if (nodes.length) {
      return Array.prototype.map.call(nodes, function (n) {
        return { role: n.getAttribute('data-message-author-role') === 'user' ? 'You' : 'Assistant', el: n };
      });
    }
    nodes = document.querySelectorAll('[data-testid="user-message"], .font-claude-message');
    if (nodes.length) {
      return Array.prototype.map.call(nodes, function (n) {
        return { role: (' ' + n.className + ' ').indexOf(' font-claude-message ') !== -1 ? 'Assistant' : 'You', el: n };
      });
    }
    return null;
  }

  function convoTitle() {
    var t = (document.title || '').replace(/\s*[—|–-]\s*(ChatGPT|Claude).*$/i, '').trim();
    return t || 'Conversation';
  }

  function fragmentAppendixMd(lines) {
    lines.push('---', '', '## Collected fragments (' + fragments.length + ')', '');
    fragments.forEach(function (f, i) {
      var note = (f.note || '').trim();
      lines.push('### ' + (i + 1), '');
      if (note && f.notePos === 'pre') lines.push('*' + note + ':*', '');
      f.text.trim().split('\n').forEach(function (l) { lines.push('> ' + l); });
      if (note && f.notePos !== 'pre') lines.push('', '→ *' + note + '*');
      lines.push('');
    });
  }

  function buildConversationMarkdown(turns) {
    if (!turns && !fragments.length) return null;
    var lines = ['# ' + convoTitle(), '', '_' + location.hostname + ' — ' + niceStamp() + '_', ''];
    if (turns) {
      turns.forEach(function (t) {
        lines.push('## ' + t.role, '');
        serializeBlocks(t.el).forEach(function (b) { lines.push(b, ''); });
      });
    }
    if (fragments.length) fragmentAppendixMd(lines);
    return lines.join('\n');
  }

  function buildConversationText(turns) {
    if (!turns && !fragments.length) return null;
    var parts = [convoTitle() + ' — ' + location.hostname + ' — ' + niceStamp()];
    if (turns) {
      turns.forEach(function (t) {
        parts.push(t.role + ':\n' + serializeBlocks(t.el).join('\n\n'));
      });
    }
    if (fragments.length) {
      parts.push('--- Collected fragments ---\n\n' + buildPayload());
    }
    return parts.join('\n\n') + '\n';
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

  function exportConversation(ext, mime) {
    var turns = getConversation();
    var content = ext === 'md' ? buildConversationMarkdown(turns) : buildConversationText(turns);
    if (!content) { toast('Nothing to export yet'); return; }
    var ok = download('digboard-' + fileStamp() + '.' + ext, content, mime);
    if (!ok) { toast('Download blocked by the browser'); return; }
    toast(turns
      ? 'Saved conversation' + (fragments.length ? ' + fragments' : '') + ' (.' + ext + ')'
      : 'Transcript not found — saved fragments only (.' + ext + ')', 2400);
  }
  $('mdBtn').addEventListener('click', function () { exportConversation('md', 'text/markdown'); });
  $('txtBtn').addEventListener('click', function () { exportConversation('txt', 'text/plain'); });

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
    saveBackup();
    fragments = [];
    marks = [];
    persist(); updatePill(); closeSheet(); redraw();
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
  syncViewport();
  window.__deepdive = {
    toggle: toggleSheet,
    version: VERSION,
    _debug: function () {
      return {
        pending: pending ? { start: pending.start, end: pending.end, scope: pending.scope, text: pendingText() } : null,
        fragments: fragments.map(function (f) { return { text: f.text, note: f.note, notePos: f.notePos, colorIdx: f.colorIdx }; }),
        marks: marks.length,
        exportMd: buildConversationMarkdown(getConversation()),
        exportTxt: buildConversationText(getConversation())
      };
    }
  };
})();
