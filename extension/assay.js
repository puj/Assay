(function () {
  'use strict';

  // Re-running (e.g. via bookmarklet) toggles the sheet instead of double-injecting.
  if (window.__assay) { try { window.__assay.toggle(); } catch (e) {} return; }

  var VERSION = '0.16.1';
  var MAP_KEY = 'assay.byConvo.v1';
  var BACKUP_MAP_KEY = 'assay.backupByConvo.v1';
  // What the page has shown us of this conversation, remembered so an export
  // is not limited to whatever happens to be rendered at the time.
  var LOG_MAP_KEY = 'assay.convoLog.v1';
  var LOG_MAX_MSGS = 500;        // per conversation
  var LOG_MAX_CONVOS = 12;       // least recently seen is dropped first
  var LOG_MAX_CHARS = 900000;    // rough ceiling before localStorage complains
  var LEGACY_KEY = 'deepdive.fragments.v1';
  var MIN_SEL_LEN = 4;
  // GitHub and Gist are a reading surface with no composer: the same tap
  // grammar over a file's rendered markdown or its code lines, and the
  // collected set is copied out rather than written into a message box. A
  // gist's classic table markup (<table class="js-file-line-container">,
  // one <td> per line, an empty <td class="blob-num"> beside it) already
  // matches the selectors github.com's newer blob view needed.
  var IS_GITHUB = location.hostname === 'github.com' || location.hostname === 'gist.github.com';
  var GH_CONTENT = '.markdown-body,.react-code-lines,table.js-file-line-container,.blob-wrapper';
  var GH_CODE = '.react-code-lines,table.js-file-line-container,.blob-wrapper';
  var READ_NOUN = IS_GITHUB ? 'file' : 'reply';
  var BRAND = location.hostname === 'claude.ai' ? 'Claude'
    : (IS_GITHUB ? 'File' : 'ChatGPT');

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
  // The verb palette: one tap classifies a passage instead of writing a note.
  // Each verb renders as a plain-English leading clause in the payload, so the
  // model needs no legend and the payload stays boilerplate-free.
  var VERBS = [
    { id: 'keep', label: 'Keep', clause: 'keep as is' },
    { id: 'push', label: 'Push', clause: 'push this further' },
    { id: 'tweak', label: 'Tweak', clause: 'tweak this, keep the idea' },
    { id: 'reword', label: 'Reword', clause: 'reword this' },
    { id: 'challenge', label: 'Challenge', clause: 'challenge this' },
    { id: 'cut', label: 'Cut', clause: 'drop this' }
  ];
  function verbById(id) {
    for (var i = 0; i < VERBS.length; i++) if (VERBS[i].id === id) return VERBS[i];
    return null;
  }

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  // Each conversation keeps its own fragment list, keyed "<host>:<convo id>"
  // ("<host>:draft" before a brand-new chat gets its id — that batch follows
  // the chat once the id appears). A shared cross-conversation list can layer
  // on top of this keying later.
  function convoKey() {
    // Every file keeps its own list, the way every conversation does.
    if (IS_GITHUB) return location.hostname + ':' + location.pathname.replace(/\/+$/, '');
    var m = location.pathname.match(/\/(?:c|chat)\/([A-Za-z0-9-]+)/);
    return location.hostname + ':' + (m ? m[1] : 'draft');
  }
  function normalize(list) {
    list.forEach(function (f, i) {
      if (!f.notePos) f.notePos = 'post';
      if (typeof f.verb !== 'string') f.verb = '';
      if (f.verb === 'fix') f.verb = 'reword'; // 0.9.0's Fix split into Tweak / Reword
      if (typeof f.colorIdx !== 'number') f.colorIdx = i % PALETTE.length;
    });
    return list;
  }
  function saveMap(key, map) {
    try { localStorage.setItem(key, JSON.stringify(map)); } catch (e) {}
  }
  // Fragments collected under the earlier names (DeepDive/DigBoard, Winnow)
  // move to the assay.* keys once, so nothing already on the device is orphaned.
  [['deepdive.byConvo.v1', MAP_KEY], ['winnow.byConvo.v1', MAP_KEY],
   ['deepdive.backupByConvo.v1', BACKUP_MAP_KEY], ['winnow.backupByConvo.v1', BACKUP_MAP_KEY]]
    .forEach(function (pair) {
      try {
        var old = localStorage.getItem(pair[0]);
        if (!old) return;
        if (!localStorage.getItem(pair[1])) localStorage.setItem(pair[1], old);
        localStorage.removeItem(pair[0]);
      } catch (e) {}
    });

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
  host.id = 'assay-host';
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
    '.bar{position:fixed;display:none;flex-direction:column;align-items:flex-start;gap:2px;background:#111827;color:#f9fafb;' +
      'padding:5px 8px;border-radius:18px;box-shadow:0 4px 16px rgba(0,0,0,.35);z-index:10;user-select:none}' +
    '.bar.show{display:flex}' +
    '.bar button{color:#f9fafb;font-size:14px;font-weight:600;padding:6px 10px;border-radius:999px;touch-action:manipulation;white-space:nowrap}' +
    '.bar button:active{background:#374151}' +
    '.bar .x{color:#9ca3af}' +
    '.bar .drop{color:#fca5a5}' +
    '.bar .tag{flex:none;border-radius:999px;min-width:20px;height:20px;margin:0 4px 0 2px;' +
      'display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}' +
    '.bar [hidden]{display:none}' +
    '.bar .row{display:flex;gap:2px;align-items:center}' +
    '.verbs{display:flex;gap:3px;flex-wrap:wrap}' +
    '.vb{background:#1f2937;color:#cbd5e1;font-size:12px;font-weight:600;border-radius:999px;padding:6px 8px;touch-action:manipulation;white-space:nowrap}' +
    '.vb:active,.vb.on{background:#38bdf8;color:#0c1220}' +
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
    '.frag .pos.verb{background:#f1f5f9;color:#94a3b8}' +
    '.frag .pos.verb.on{background:#0284c7;color:#fff}' +
    '.sheet .hint{margin:0 16px 8px;font-size:12px;color:#64748b}' +
    '.picks{overflow-y:auto;padding:0 14px 4px;flex:1;-webkit-overflow-scrolling:touch}' +
    '.pick{display:flex;gap:8px;align-items:stretch;margin-bottom:8px}' +
    '.pick .row{flex:1;display:flex;gap:10px;align-items:flex-start;text-align:left;min-width:0;' +
      'background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:9px 11px;touch-action:manipulation}' +
    '.pick .row.on{border-color:#38bdf8;background:#f0f9ff}' +
    '.pick .tick{flex:none;width:20px;height:20px;border-radius:6px;border:1.5px solid #cbd5e1;color:transparent;' +
      'display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;margin-top:1px}' +
    '.pick .row.on .tick{background:#0284c7;border-color:#0284c7;color:#fff}' +
    '.pick .body{flex:1;min-width:0}' +
    '.pick .who{display:block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b}' +
    '.pick .prev{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;' +
      'font-size:13px;line-height:1.4;color:#334155;margin-top:2px}' +
    '.pick .from{flex:none;width:38px;border-radius:12px;background:#e2e8f0;color:#475569;' +
      'font-size:15px;font-weight:700;touch-action:manipulation}' +
    '.pick .meta{display:block;margin-top:6px;padding:3px 8px;border-radius:999px;background:#f1f5f9;' +
      'color:#64748b;font-size:11px;font-weight:600;touch-action:manipulation}' +
    '.pick .meta.open{background:#0284c7;color:#fff}' +
    '.pick .full{margin:8px 0 0;padding:8px 10px;max-height:40vh;overflow:auto;background:#f8fafc;' +
      'border:1px solid #e2e8f0;border-radius:8px;font:12px/1.5 ui-monospace,monospace;color:#334155;' +
      'white-space:pre-wrap;word-break:break-word;-webkit-overflow-scrolling:touch}' +
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
      '.frag .pos.verb{background:#1e293b;color:#64748b}' +
      '.frag .pos.verb.on{background:#38bdf8;color:#0c1220}' +
      '.btn.minor{background:#334155;color:#cbd5e1}' +
      '.empty{color:#94a3b8}' +
      '.manual textarea{background:#1e293b;border-color:#475569;color:#e2e8f0}' +
      '.pick .row{background:#1e293b;border-color:#334155}' +
      '.pick .row.on{background:#0c4a6e;border-color:#38bdf8}' +
      '.pick .prev{color:#cbd5e1}' +
      '.pick .from{background:#334155;color:#cbd5e1}' +
      '.pick .meta{background:#334155;color:#94a3b8}' +
      '.pick .meta.open{background:#38bdf8;color:#0c1220}' +
      '.pick .full{background:#0f172a;border-color:#334155;color:#cbd5e1}' +
      '.sheet .hint{color:#94a3b8}' +
    '}' +
    '</style>' +
    '<div id="hlLayer"></div>' +
    '<div class="bar" id="bar">' +
      '<div class="row">' +
        '<span class="tag" id="editTag" hidden></span>' +
        '<button id="addBtn">&#xFF0B; Add</button>' +
        '<button id="noteBtn">&#x270E; Note</button>' +
        '<button class="drop" id="removeBtn" hidden>Remove</button>' +
        '<button class="x" id="cancelBtn">&#x2715;</button>' +
      '</div>' +
      '<div class="verbs" id="barVerbs"></div>' +
    '</div>' +
    '<div class="notebox" id="notebox">' +
      '<input id="noteInput" type="text" placeholder="annotation &mdash; e.g. &ldquo;formalize this&rdquo;">' +
      '<div class="verbs" id="noteVerbs"></div>' +
      '<div class="row">' +
        '<button class="posbtn" id="posPre">before</button>' +
        '<button class="posbtn on" id="posPost">after</button>' +
        '<button class="add" id="noteAdd">Add</button>' +
      '</div>' +
    '</div>' +
    '<button class="chip" id="chip">&#xFF0B; Collect</button>' +
    '<button class="pill" id="pill"><span id="pillLabel">Assay</span><span class="n" id="count">0</span></button>' +
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
        '<button class="btn go" id="goBtn"></button>' +
      '</div>' +
    '</div>' +
    '<div class="sheet" id="picker">' +
      '<header><h2 id="pickTitle">Include in the file</h2>' +
        '<button class="close" id="pickClose">&#x2715;</button></header>' +
      '<p class="hint" id="pickHint">Tap &#x2193; on a message to take it and everything after it.</p>' +
      '<div class="picks" id="pickList"></div>' +
      '<div class="actions">' +
        '<button class="btn minor" id="pickAll">All</button>' +
        '<button class="btn minor" id="pickNone">None</button>' +
        '<button class="btn minor" id="pickLast2">Last 2</button>' +
        '<button class="btn minor" id="pickLast6">Last 6</button>' +
        '<button class="btn minor" id="pickRebuild" title="Forget what is remembered and read the page again">&#x21bb;</button>' +
      '</div>' +
      '<div class="actions last">' +
        '<button class="btn go" id="pickGo">&#x2B07; Download</button>' +
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
    loadLog();
    anchorSig = '';
    updatePill();
    redraw();
    if (sheetOpen) renderList();
  }
  setInterval(checkRoute, 800);

  var $ = function (id) { return root.getElementById(id); };
  var chip = $('chip'), pill = $('pill'), sheet = $('sheet');
  // Nothing to write into on a reading site, so the set is copied out instead.
  $('goBtn').innerHTML = IS_GITHUB ? '&#x29C9; Copy notes' : '&#x2197; To composer';
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
  var preTapActive = null, lastPointerType = '', tapStart = null, tapMoved = false;
  document.addEventListener('pointermove', function (e) {
    if (tapStart && Math.abs(e.clientX - tapStart.x) + Math.abs(e.clientY - tapStart.y) > 10) tapMoved = true;
  }, { capture: true, passive: true });
  document.addEventListener('pointerdown', function (e) {
    // Captured before the browser moves focus, so a tap can tell "already
    // editing here" from "just landed here".
    preTapActive = document.activeElement;
    lastPointerType = e.pointerType || '';
    tapStart = { x: e.clientX, y: e.clientY };
    tapMoved = false;
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
    // Always reachable: the sheet also holds the conversation download
    // buttons, which are useful with zero fragments collected.
    var n = fragments.length;
    $('count').textContent = String(n);
    $('count').style.display = n ? 'flex' : 'none';
    // The picker is a decision, not a place to keep collecting: the pill would
    // only sit over its rows.
    // (`picker` is bound further down; before that there is nothing to hide.)
    pill.classList.toggle('show', !(picker && picker.classList.contains('show')));
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

  function addFragment(text, note, notePos, verb) {
    var frag = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      text: text,
      note: note || '',
      notePos: notePos || 'post',
      verb: verbById(verb) ? verb : '',
      colorIdx: nextColorIdx(),
      ts: Date.now()
    };
    fragments.push(frag);
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
    return frag;
  }

  // -------------------------------------------------- tap-to-collect engine
  // Tap a word to select it. Tap inside the highlight to widen the scope:
  // word → sentence → paragraph → back to the word. Tap a word outside the
  // highlight (same block) to grow the selection in that direction, word by
  // word. Collected fragments keep a tinted mark on the page for the session.
  var pending = null; // {block, flat, words, sentences, start, end, scope, aw0, aw1}
  var marks = [];     // session-only: {fid, blocks, start, end, colorIdx}
  // A tap on a passage already collected opens that fragment instead of
  // starting a new selection: the same bar, showing what it is filed as.
  var editing = null; // a fragment id

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

  // A selection lives inside one message and can span its paragraphs. Blocks
  // are the message's text-bearing elements, laid out on one virtual text
  // axis with a 2-char gap between blocks; words/sentences carry absolute
  // offsets on that axis.
  var BLOCK_SEL = 'p,li,blockquote,h1,h2,h3,h4,h5,h6,td,th,dd,dt,pre';

  // Most replies wrap paragraphs in <p>. A card that lays its lines out as
  // <div>s still has a block-level ancestor, and for our purposes that is the
  // paragraph.
  function blockAnchor(el) {
    var b = el.closest(BLOCK_SEL);
    if (b) return b;
    var n = el;
    while (n && n.nodeType === 1 && n !== document.body) {
      var d = '';
      try { d = window.getComputedStyle(n).display; } catch (e) { return null; }
      if (d && d.indexOf('inline') !== 0 && d !== 'contents') return n;
      n = n.parentElement;
    }
    return null;
  }

  // `light` skips word/sentence segmentation: re-anchoring marks only needs
  // the text axis and its nodes, and segmenting a whole conversation on every
  // attempt would be slow on a phone.
  function buildBlocks(container, light) {
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    var blocks = [], cur = null, n, lastEl = null, lastAnchor = null;
    while ((n = walker.nextNode())) {
      if (!n.nodeValue) continue;
      var el = n.parentElement;
      if (!el) continue;
      if (el.closest('button,[role="button"],svg,style,script')) continue;
      var anchor = el.closest(BLOCK_SEL) || (el === lastEl ? lastAnchor : (lastAnchor = blockAnchor(el), lastEl = el, lastAnchor));
      if (!anchor || !container.contains(anchor)) continue;
      if (!cur || cur.el !== anchor) {
        cur = { el: anchor, nodes: [], text: '' };
        blocks.push(cur);
      }
      cur.nodes.push({ node: n, start: cur.text.length, end: cur.text.length + n.nodeValue.length });
      cur.text += n.nodeValue;
    }
    blocks = blocks.filter(function (b) { return b.text.trim().length > 0; });
    var off = 0;
    blocks.forEach(function (b) {
      b.start = off;
      b.end = off + b.text.length;
      off = b.end + 2; // virtual paragraph gap
      if (light) return;
      var shift = function (seg) { return { start: seg.start + b.start, end: seg.end + b.start }; };
      b.words = segmentWords(b.text).map(shift);
      b.sentences = segmentSentences(b.text).map(shift);
    });
    return blocks;
  }

  function blockAt(blocks, off) {
    for (var i = 0; i < blocks.length; i++) {
      if (off >= blocks[i].start && off <= blocks[i].end) return blocks[i];
    }
    return null;
  }

  function absOffset(blocks, node, offset) {
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      for (var j = 0; j < b.nodes.length; j++) {
        if (b.nodes[j].node === node) return b.start + b.nodes[j].start + offset;
      }
    }
    return -1;
  }

  function domPointAbs(blocks, off) {
    var b = blockAt(blocks, off);
    if (!b) return null;
    var local = off - b.start;
    for (var i = 0; i < b.nodes.length; i++) {
      var e = b.nodes[i];
      if (local < e.end || i === b.nodes.length - 1) {
        return { node: e.node, offset: Math.max(0, Math.min(local - e.start, e.node.nodeValue.length)) };
      }
    }
    return null;
  }

  function rectsForSpan(blocks, start, end) {
    var a = domPointAbs(blocks, start);
    var b = domPointAbs(blocks, end);
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

  function pendingText() {
    // Blocks are paragraphs in prose and lines in a code view: paragraphs read
    // apart, lines read together, and a line's indentation is part of it.
    var code = IS_GITHUB && pending.container.matches && pending.container.matches(GH_CODE);
    var parts = [];
    pending.blocks.forEach(function (b) {
      var s = Math.max(pending.start, b.start), e = Math.min(pending.end, b.end);
      if (e > s) {
        var t = b.text.slice(s - b.start, e - b.start);
        t = code ? t.replace(/\s+$/, '') : t.trim();
        if (t) parts.push(t);
      }
    });
    return parts.join(code ? '\n' : '\n\n');
  }

  function clearPending() {
    pending = null;
    if (editing) { editing = null; paintBar(); }
    bar.classList.remove('show');
    notebox.classList.remove('show');
    redraw();
  }

  function leaveEdit() {
    if (!editing) return;
    editing = null;
    paintBar();
  }

  function fragById(id) {
    for (var i = 0; i < fragments.length; i++) if (fragments[i].id === id) return fragments[i];
    return null;
  }
  function markById(id) {
    for (var i = 0; i < marks.length; i++) if (marks[i].fid === id) return marks[i];
    return null;
  }
  // The collected fragment under a tap, if there is one. Marks carry their own
  // blocks, so a stale one simply reports no hit.
  function markAtPoint(cp) {
    for (var i = marks.length - 1; i >= 0; i--) {
      var m = marks[i];
      var off = absOffset(m.blocks, cp.node, cp.offset);
      if (off >= 0 && off >= m.start && off <= m.end && fragById(m.fid)) return m;
    }
    return null;
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

  // The rects a Range hands back are tight around the glyphs, so they
  // under-report how far apart two lines sit; the block's own line-height is
  // the distance a reader sees, and what the bar must clear.
  function linePitch(blocks, off, fallback) {
    var b = blockAt(blocks, off);
    if (b && b.el) {
      try {
        var cs = window.getComputedStyle(b.el);
        var lh = parseFloat(cs.lineHeight);
        if (lh > 0) return lh;
        var fs = parseFloat(cs.fontSize);
        if (fs > 0) return fs * 1.5;
      } catch (e) {}
    }
    return fallback * 1.6;
  }

  // The bar keeps a full line of clearance from the passage on whichever side
  // it sits, so the neighbouring line above and below both stay tappable and a
  // selection can grow in either direction. It prefers above (anchored to the
  // first line, so it holds still while you grow downward) and falls back to
  // below when the passage starts near the top edge.
  function placeBar(blocks, off, rects) {
    var last = rects[rects.length - 1];
    bar.classList.add('show');
    var vw = window.innerWidth, vh = window.innerHeight, ins = viewportInsets();
    var bw = bar.offsetWidth || 180, bh = bar.offsetHeight || 40;
    var left = Math.max(8, Math.min(last.left, vw - bw - 8));
    var lh = linePitch(blocks, off, last.height || rects[0].height || 16);
    var gap = Math.round(lh * 1.75) + 8;
    var top = rects[0].top - gap - bh;
    if (top < ins.top + 8) top = last.bottom + gap;
    if (top + bh > vh - ins.bottom - 8) top = Math.max(ins.top + 8, rects[0].top - gap - bh);
    bar.style.left = left + 'px';
    bar.style.top = top + 'px';
  }

  function redraw() {
    hlLayer.textContent = '';
    var editRects = null, editMark = null;
    // Session marks for already-collected fragments (drop dead ones quietly).
    marks = marks.filter(function (m) {
      var alive = m.blocks.some(function (b) { return b.el.isConnected; });
      if (!alive) return false;
      var rects = rectsForSpan(m.blocks, m.start, m.end);
      if (!rects) return false;
      // The one being edited reads like a live selection, not a past one.
      var on = m.fid === editing;
      paintRects(rects, 'rgba(' + PALETTE[m.colorIdx].rgb + (on ? ',.34)' : ',.18)'));
      if (on) { editRects = rects; editMark = m; }
      return true;
    });
    if (editing && !editMark) { editing = null; paintBar(); } // gone from the page
    if (editing) {
      placeBar(editMark.blocks, editMark.start, editRects);
      return;
    }
    if (!pending) { bar.classList.remove('show'); return; }
    var rects = rectsForSpan(pending.blocks, pending.start, pending.end);
    if (!rects) { pending = null; bar.classList.remove('show'); return; }
    paintRects(rects, 'rgba(' + PALETTE[nextColorIdx()].rgb + ',.34)');
    placeBar(pending.blocks, pending.start, rects);
  }

  function placeNotebox() {
    var ins = viewportInsets();
    notebox.style.top = (ins.top + 10) + 'px';
    notebox.style.left = (ins.left + 8) + 'px';
  }

  function findBlock(el) {
    var block = el.closest ? blockAnchor(el) : null;
    if (!block || host.contains(block)) return null;
    var ed = block.closest(EDITABLE_SEL);
    if (ed && !host.contains(ed)) {
      // Inside the composer this is a draft; inside anything else editable —
      // a canvas card, a message being edited in place — it is a passage.
      // Short lines count there: a card is written in them.
      return isComposerEl(ed) ? null : block;
    }
    // On GitHub only the file itself is readable text; a line of code is
    // often short, so no length gate there.
    if (IS_GITHUB) return block.closest(GH_CONTENT) ? block : null;
    if (block.closest('[data-message-author-role="assistant"]')) return block;
    if (block.closest('.font-claude-message')) return block;
    if ((block.textContent || '').trim().length < 30) return null;
    var main = document.querySelector('main');
    if (main && main.contains(block)) return block;
    // Cards the site renders outside <main> still belong to the conversation.
    return block.closest(TURN_SEL) ? block : null;
  }

  // Editable regions in the page fall into two kinds, and only one of them is
  // off limits. The site's composer holds a draft you are writing. Everything
  // else editable — ChatGPT's inline canvas card, a message swapped into an
  // edit box in place — is rendered text you are reading, and reads like the
  // rest of the conversation.
  var RICH_SEL = '[contenteditable="true"],[contenteditable=""]';
  var EDITABLE_SEL = 'textarea,input,' + RICH_SEL;
  var TURN_SEL = 'article,[data-message-author-role],[data-testid="user-message"],.font-claude-message';

  function isComposerEl(ed) {
    if (!ed || !ed.closest) return false;
    if (ed.id === 'prompt-textarea') return true;
    if (ed.querySelector && ed.querySelector('#prompt-textarea')) return true;
    // Both sites wrap the composer in a form (ChatGPT) or fieldset (Claude);
    // a card in the conversation sits in neither.
    if (ed.closest('form,fieldset')) return true;
    return !!ed.closest('[data-testid*="composer"],[class*="composer"],[class*="Composer"]');
  }

  // The editable the tap landed in, unless it is the composer.
  function pageEditable(el, sel) {
    if (!el || !el.closest) return null;
    var ed = el.closest(sel || EDITABLE_SEL);
    if (!ed || ed === host || host.contains(ed)) return null;
    return isComposerEl(ed) ? null : ed;
  }

  // The message that a tapped block belongs to; blocks fall back to
  // themselves on unknown layouts, giving single-paragraph behavior there.
  function findContainer(block) {
    // A canvas card is a document of its own: keep growth inside it rather
    // than letting a selection run out into the reply around it.
    var ed = pageEditable(block, RICH_SEL);
    if (ed) return ed;
    // A file (or one rendered comment) is the document a selection grows in.
    if (IS_GITHUB) return block.closest(GH_CONTENT) || block;
    return block.closest('[data-message-author-role],[data-testid="user-message"],.font-claude-message') || block;
  }

  function beginPending(container, blocks, foff) {
    var b = blockAt(blocks, foff);
    var w = b && wordAt(b.words, foff);
    if (!w) return false;
    pending = {
      container: container,
      blocks: blocks,
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
    var bs = blockAt(p.blocks, p.start);
    var be = blockAt(p.blocks, Math.max(p.start, p.end - 1));
    if (!bs || !be) return;
    if (p.scope === 'sentence') {
      p.start = bs.start; p.end = be.end; p.scope = 'paragraph';
      return;
    }
    // word or custom → the sentence(s) covering the current selection
    // (per touched block); if that changes nothing, go straight to the
    // full paragraph(s).
    var s0 = sentenceBounds(bs.sentences, p.start, Math.min(p.end, bs.end));
    var s1 = sentenceBounds(be.sentences, Math.max(p.start, be.start), p.end);
    if (s0.start === p.start && s1.end === p.end) {
      p.start = bs.start; p.end = be.end; p.scope = 'paragraph';
    } else {
      p.start = s0.start; p.end = s1.end; p.scope = 'sentence';
    }
  }

  document.addEventListener('click', function (e) {
    if (e.target === host) return;
    var el = e.target && e.target.nodeType === 1 ? e.target : (e.target ? e.target.parentElement : null);
    if (!el || host.contains(el)) return;
    var onControl = el.closest && el.closest('a,button,select,[role="button"],svg');
    // Text in a rich editable that isn't the composer — ChatGPT's inline
    // canvas card, a message being edited in place — is read like any other
    // passage, so a tap there selects.
    var card = onControl ? null : pageEditable(el, RICH_SEL);
    // On a touchscreen the caret must not stay behind: the keyboard would
    // cover what you are reading. So we hand focus back after each tap —
    // which also means a card that already holds focus holds it deliberately
    // (the site's own edit control put it there), and we leave it alone. With
    // a mouse there is no keyboard to raise, so the caret can stay and the
    // card stays editable by clicking into it.
    var touch = lastPointerType === 'touch';
    if (card && touch && (preTapActive === card || card.contains(preTapActive))) return;
    if (!card && el.closest && el.closest('a,button,input,textarea,select,[contenteditable],[role="button"],svg')) {
      // Tapping into an edit box means "I am editing", not "start over":
      // keep what is already selected behind it.
      if (!pageEditable(el)) clearPending();
      return;
    }
    var sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      // Inside a card the browser makes its own selection: tapping a word a
      // second time selects it, a third time takes the paragraph — which
      // would hijack the scope cycle. A selection the user dragged out (or
      // long-pressed) is theirs, so only a tap that never moved is dropped.
      if (!card || tapMoved) return; // that selection is the user's
      try { sel.removeAllRanges(); } catch (e2) {}
    }
    var block = findBlock(el);
    if (!block) { clearPending(); return; }
    var cp = caretPoint(e.clientX, e.clientY);
    if (!cp) { clearPending(); return; }

    var container = findContainer(block);
    if (card && touch) { try { card.blur(); } catch (e) {} }

    // Widening the selection you are holding comes first; after that, a tap on
    // a passage already collected opens that fragment rather than starting
    // something new.
    var insidePending = false;
    if (pending && pending.container === container) {
      var po = absOffset(pending.blocks, cp.node, cp.offset);
      insidePending = po >= 0 && po >= pending.start && po <= pending.end;
    }
    if (!insidePending) {
      var hit = markAtPoint(cp);
      if (hit) {
        pending = null;
        editing = hit.fid;
        hideChip();
        notebox.classList.remove('show');
        paintBar();
        redraw();
        return;
      }
    }
    leaveEdit();
    if (pending && pending.container === container) {
      // Same message: grow (across paragraphs too) or cycle the scope.
      // Restarting here is deliberate friction — ✕ on the bar, or tap a
      // different message / empty space to start over.
      var off = absOffset(pending.blocks, cp.node, cp.offset);
      if (off >= 0) {
        if (off >= pending.start && off <= pending.end) {
          cycleScope();
          redraw();
          return;
        }
        var b2 = blockAt(pending.blocks, off);
        var w = b2 && wordAt(b2.words, off);
        if (w) {
          // Growing is for the passage in hand: the paragraph you are in, or
          // the one against it. A tap further off is a different passage, so
          // it starts a new selection there rather than dragging the
          // highlight across everything in between. Reaching a paragraph
          // beyond the next one is a tap at a time.
          var bi = pending.blocks.indexOf(b2);
          var lo = pending.blocks.indexOf(blockAt(pending.blocks, pending.start));
          var hi = pending.blocks.indexOf(blockAt(pending.blocks, Math.max(pending.start, pending.end - 1)));
          if (bi >= lo - 1 && bi <= hi + 1) {
            if (off >= pending.end) pending.end = Math.max(pending.end, w.end);
            else pending.start = Math.min(pending.start, w.start);
            pending.scope = 'custom';
          } else if (!beginPending(container, pending.blocks, off)) {
            clearPending();
            return;
          }
          redraw();
          return;
        }
      }
      // Stale nodes (the site re-rendered): fall through and rebuild.
    }
    var blocks = buildBlocks(container);
    var foff = absOffset(blocks, cp.node, cp.offset);
    if (foff < 0) { clearPending(); return; }
    hideChip();
    notebox.classList.remove('show');
    if (!beginPending(container, blocks, foff)) { clearPending(); return; }
    redraw();
  });

  function collectPending(note, notePos, verb) {
    var p = pending;
    var frag = addFragment(pendingText(), note, notePos, verb);
    marks.push({ fid: frag.id, blocks: p.blocks, start: p.start, end: p.end, colorIdx: frag.colorIdx });
    clearPending();
  }

  // Renders the verb chips into a container; `onPick` gets the verb id and
  // `isOn` says which chip (if any) shows as selected.
  function renderVerbs(container, onPick, isOn) {
    container.textContent = '';
    VERBS.forEach(function (v) {
      var b = document.createElement('button');
      b.className = 'vb' + (isOn && isOn(v.id) ? ' on' : '');
      b.textContent = v.label;
      b.title = v.clause;
      b.addEventListener('click', function () { onPick(v.id); });
      container.appendChild(b);
    });
  }

  $('addBtn').addEventListener('click', function () {
    if (pending) collectPending();
  });
  $('cancelBtn').addEventListener('click', clearPending);
  $('removeBtn').addEventListener('click', function () {
    if (!editing) return;
    var id = editing;
    fragments = fragments.filter(function (x) { return x.id !== id; });
    marks = marks.filter(function (m) { return m.fid !== id; });
    editing = null;
    persist(); updatePill(); redraw();
    if (sheetOpen) renderList();
    toast('Removed');
  });

  // The bar wears one of two faces. Collecting: ＋ Add, ✎ Note, and a verb
  // collects in one tap. Editing a passage already collected: its number, a
  // note to rewrite, Remove, and the verbs showing how it is filed.
  function paintBar() {
    var f = editing ? fragById(editing) : null;
    if (f) {
      var i = fragments.indexOf(f);
      var tag = $('editTag');
      tag.textContent = String(i + 1);
      tag.style.background = PALETTE[f.colorIdx].badgeBg;
      tag.style.color = PALETTE[f.colorIdx].badgeInk;
      tag.hidden = false;
      $('addBtn').hidden = true;
      $('removeBtn').hidden = false;
      renderVerbs($('barVerbs'), function (id) {
        f.verb = f.verb === id ? '' : id;
        persist();
        paintBar();
        if (sheetOpen) renderList();
      }, function (v) { return f.verb === v; });
      return;
    }
    $('editTag').hidden = true;
    $('addBtn').hidden = false;
    $('removeBtn').hidden = true;
    // One tap on a verb collects the passage classified — the bike-native
    // path: no keyboard, no note, the verb carries the intent.
    renderVerbs($('barVerbs'), function (id) {
      if (pending) collectPending('', 'post', id);
    });
  }
  paintBar();

  var notePos = 'post';
  function setNotePos(p) {
    notePos = p;
    $('posPre').classList.toggle('on', p === 'pre');
    $('posPost').classList.toggle('on', p === 'post');
  }
  $('posPre').addEventListener('click', function () { setNotePos('pre'); });
  $('posPost').addEventListener('click', function () { setNotePos('post'); });
  var noteVerb = '';
  function setNoteVerb(id) {
    noteVerb = noteVerb === id ? '' : id;
    renderVerbs($('noteVerbs'), setNoteVerb, function (v) { return v === noteVerb; });
  }
  $('noteBtn').addEventListener('click', function () {
    var f = editing ? fragById(editing) : null;
    if (!pending && !f) return;
    setNotePos(f ? (f.notePos || 'post') : 'post');
    noteVerb = f ? (f.verb || '') : '';
    renderVerbs($('noteVerbs'), setNoteVerb, function (v) { return v === noteVerb; });
    $('noteInput').value = f ? (f.note || '') : '';
    $('noteAdd').textContent = f ? 'Save' : 'Add';
    notebox.classList.add('show');
    placeNotebox();
    $('noteInput').focus();
  });
  function noteboxAdd() {
    var f = editing ? fragById(editing) : null;
    if (f) {
      f.note = $('noteInput').value.trim();
      f.notePos = notePos;
      f.verb = noteVerb;
      persist();
      notebox.classList.remove('show');
      paintBar();
      if (sheetOpen) renderList();
      toast('Saved');
      return;
    }
    if (!pending) { notebox.classList.remove('show'); return; }
    collectPending($('noteInput').value.trim(), notePos, noteVerb);
  }
  $('noteAdd').addEventListener('click', noteboxAdd);
  $('noteInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') noteboxAdd();
  });
  guardInput($('noteInput'));
  guardInput($('manualTxt'));

  // ------------------------------------------ restoring marks after a reload
  // Marks hang off live DOM nodes, so a refresh — or the site re-rendering a
  // message — wipes the highlights while the fragments themselves persist in
  // storage. Find each orphaned fragment's text in the conversation again and
  // re-attach its mark, so a reload looks like nothing happened.
  function messageContainers() {
    if (IS_GITHUB) {
      var gh = document.querySelectorAll(GH_CONTENT);
      return Array.prototype.slice.call(gh).filter(function (el) { return !host.contains(el); });
    }
    var nodes = document.querySelectorAll(TURN_SEL);
    var list = nodes.length ? Array.prototype.slice.call(nodes) : [];
    if (!list.length) {
      var main = document.querySelector('main');
      if (main) list = [main];
    }
    return list.filter(function (el) { return !host.contains(el); });
  }

  // The flat text of the axis buildBlocks lays out, gaps included, so an
  // offset found here is an offset a mark can use directly.
  function flatOf(blocks) {
    var s = '';
    blocks.forEach(function (b) {
      while (s.length < b.start) s += ' ';
      s += b.text;
    });
    return s;
  }

  function findSpan(flat, parts, from) {
    var s = flat.indexOf(parts[0], from);
    if (s < 0) return null;
    var e = s + parts[0].length;
    for (var i = 1; i < parts.length; i++) {
      var k = flat.indexOf(parts[i], e);
      if (k < 0) return null;
      e = k + parts[i].length;
    }
    return { start: s, end: e };
  }

  function overlaps(used, span) {
    return used.some(function (u) { return span.start < u.end && u.start < span.end; });
  }

  function reanchorMarks() {
    var have = {};
    marks.forEach(function (m) { have[m.fid] = true; });
    var missing = fragments.filter(function (f) { return !have[f.id]; });
    if (!missing.length) return 0;
    var containers = messageContainers();
    if (!containers.length) return 0;

    var cache = [];
    function ctx(el) {
      for (var i = 0; i < cache.length; i++) if (cache[i].el === el) return cache[i];
      var blocks = buildBlocks(el, true);
      var c = { el: el, blocks: blocks, flat: flatOf(blocks), used: [] };
      // Spans already spoken for by a live mark in this container.
      marks.forEach(function (m) {
        if (m.blocks.length && blocks.length && m.blocks[0].el === blocks[0].el) {
          c.used.push({ start: m.start, end: m.end });
        }
      });
      cache.push(c);
      return c;
    }

    var added = 0;
    missing.forEach(function (f) {
      var parts = (f.text || '').split(/\n+/).map(function (t) { return t.trim(); })
        .filter(function (t) { return t.length; });
      if (!parts.length) return;
      var span = 0;
      parts.forEach(function (t) { span += t.length; });
      var limit = span + 200;
      for (var i = 0; i < containers.length; i++) {
        if (containers[i].textContent.indexOf(parts[0]) < 0) continue; // cheap pre-filter
        var c = ctx(containers[i]);
        var from = 0, hit;
        while ((hit = findSpan(c.flat, parts, from))) {
          if (!overlaps(c.used, hit)) break;
          from = hit.start + 1;
        }
        if (!hit || hit.end - hit.start > limit) continue;
        c.used.push(hit);
        marks.push({ fid: f.id, blocks: c.blocks, start: hit.start, end: hit.end, colorIdx: f.colorIdx });
        added++;
        return;
      }
    });
    return added;
  }

  // Messages stream in and lazy-render, so try a few times and start over
  // whenever the conversation or the fragment list changes.
  var anchorTries = 0, anchorSig = '';
  function maybeReanchor() {
    if (!fragments.length) return;
    var have = {};
    marks.forEach(function (m) { have[m.fid] = true; });
    var missing = fragments.some(function (f) { return !have[f.id]; });
    if (!missing) return;
    var sig = document.querySelectorAll(TURN_SEL).length + ':' + fragments.length;
    if (sig !== anchorSig) { anchorSig = sig; anchorTries = 4; }
    if (anchorTries <= 0) return;
    anchorTries--;
    if (reanchorMarks()) redraw();
  }
  setInterval(maybeReanchor, 1200);

  // Catch messages as they arrive: while one streams, when older ones load on
  // scroll, and when a collapsed one is opened. Two rules keep this from
  // being felt. Nothing is scanned unless the conversation itself changed —
  // typing into the message box changes the page constantly and changes the
  // conversation not at all — and a scan never runs inside the handler that
  // noticed the change: it waits for the browser to have a moment, so it can
  // never land in the middle of a keystroke.
  var scanTimer = null, idleHandle = 0, lastScanAt = 0, domDirty = true, scanCount = 0;
  function runScan() {
    clearTimeout(scanTimer);
    scanTimer = null;
    idleHandle = 0;
    lastScanAt = Date.now();
    domDirty = false;
    scanCount++;
    try { scanTranscript(false); } catch (e) {}
  }
  function scanWhenIdle() {
    if (idleHandle) return;
    if (window.requestIdleCallback) {
      idleHandle = window.requestIdleCallback(runScan, { timeout: 1200 });
    } else {
      idleHandle = 1;
      setTimeout(runScan, 80);
    }
  }
  // `wait` is how long to let changes settle; `maxWait` is how long the scan
  // is willing to be put off while they keep coming — a fast scroll swaps the
  // window several times a second and a plain debounce would wait for the
  // scrolling to stop and miss everything in between.
  function scanSoon(wait, maxWait) {
    if (!domDirty) return;
    if (maxWait && Date.now() - lastScanAt >= maxWait) return scanWhenIdle();
    if (scanTimer) return;
    scanTimer = setTimeout(scanWhenIdle, wait);
  }
  // Did this change touch the conversation, or only the box you are typing in?
  // And if it did: were messages added or taken away, or did existing text
  // merely change? Nodes arriving is the conversation loading more of itself,
  // which must not be missed; text changing is a message streaming, which can
  // wait, since it will still be there when it finishes.
  function conversationChange(records) {
    var kind = 0;
    for (var i = 0; i < records.length; i++) {
      var t = records[i].target;
      var el = t && (t.nodeType === 1 ? t : t.parentElement);
      if (!el || el === host || host.contains(el)) continue;
      var ed = el.closest && el.closest(EDITABLE_SEL);
      if (ed && !host.contains(ed)) continue;   // somewhere text is being written
      if (records[i].type === 'childList' &&
          (records[i].addedNodes.length || records[i].removedNodes.length)) return 2;
      kind = 1;
    }
    return kind;
  }
  if (!IS_GITHUB) {
    // Whatever is pending goes to storage before the page can be taken away.
    window.addEventListener('pagehide', function () { if (logDirty) saveLog(true); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && logDirty) saveLog(true);
    });
    try {
      new MutationObserver(function (records) {
        var kind = conversationChange(records);
        if (!kind) return;
        domDirty = true;
        if (kind === 2) scanSoon(250, 700);   // messages came or went
        else scanSoon(700, 2000);             // one of them is still writing
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (e) {}
    window.addEventListener('scroll', function (e) {
      if (e.target === host || (e.target && e.target.nodeType === 1 && host.contains(e.target))) return;
      scanSoon(200, 400);
    }, true);
    setInterval(function () {
      if (domDirty && Date.now() - lastScanAt > 2000) scanWhenIdle();
    }, 4000);
    setTimeout(runScan, 1000);
  }
  setTimeout(maybeReanchor, 400);

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
  function queueSelection() {
    clearTimeout(selTimer);
    selTimer = setTimeout(onSelection, 250);
  }
  document.addEventListener('selectionchange', queueSelection);
  // Not every browser reports a textarea's selection through selectionchange.
  document.addEventListener('select', queueSelection, true);

  // A <textarea>/<input> keeps its selection to itself: window.getSelection()
  // reports nothing, so read it off the element instead.
  function editorSelection() {
    var ae = document.activeElement;
    if (!ae || !ae.tagName) return null;
    var tag = ae.tagName.toLowerCase();
    if (tag !== 'textarea' && tag !== 'input') return null;
    if (!pageEditable(ae)) return null;
    try {
      var a = ae.selectionStart, b = ae.selectionEnd;
      if (a == null || b == null || b - a < MIN_SEL_LEN) return null;
      var text = String(ae.value || '').slice(a, b).trim();
      if (text.length < MIN_SEL_LEN) return null;
      return { el: ae, text: text };
    } catch (e) { return null; }
  }

  function onSelection() {
    var inEditor = editorSelection();
    if (inEditor) {
      clearPending();
      selPendingText = inEditor.text;
      showChip(inEditor.el.getBoundingClientRect());
      return;
    }
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) { hideChip(); return; }
    var text = sel.toString().trim();
    if (text.length < MIN_SEL_LEN) { hideChip(); return; }
    var node = sel.anchorNode;
    var el = node ? (node.nodeType === 1 ? node : node.parentElement) : null;
    if (!el || host.contains(el)) return;
    // Text in the site's own composer is a draft, not a passage.
    if (el.closest && el.closest(EDITABLE_SEL) && !pageEditable(el)) {
      hideChip();
      return;
    }
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
    anchorSig = '';
    maybeReanchor(); // paint its highlight now rather than on the next tick
    try { window.getSelection().removeAllRanges(); } catch (err) {}
  });

  // ------------------------------------------------------------------ sheet
  // Non-modal: the conversation stays visible and scrollable behind it, taps
  // still collect while it's open, and the pill rides above it as a toggle.
  function openSheet() {
    sheetOpen = true;
    try { scanTranscript(false); } catch (e) {}
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
      empty.textContent = 'Nothing collected here yet. Tap a word in the ' + READ_NOUN +
        ' — tap the highlight to widen it (word → sentence → paragraph), tap nearby words to grow it — or long-press to select any span.';
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
      // Its tinted mark on the page goes with it.
      marks = marks.filter(function (m) { return m.fid !== f.id; });
      persist(); updatePill(); renderList(); redraw();
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

    // Tap cycles none → keep → push → fix → challenge → cut → none, so a
    // verb can be set or changed later without a keyboard.
    var vb = document.createElement('button');
    vb.className = 'pos verb';
    function paintVerb() {
      var v = verbById(f.verb);
      vb.textContent = v ? v.label : 'verb';
      vb.title = v ? v.clause : 'Classify this fragment';
      vb.classList.toggle('on', !!v);
    }
    paintVerb();
    vb.addEventListener('click', function () {
      var i = -1;
      VERBS.forEach(function (v, k) { if (v.id === f.verb) i = k; });
      f.verb = i + 1 < VERBS.length ? VERBS[i + 1].id : '';
      paintVerb();
      persist();
    });

    row.appendChild(note); row.appendChild(vb); row.appendChild(pos);
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
  // The leading clause before a quote: the verb's plain-English reading, a
  // `pre` note, or both joined with a dash.
  function leadClause(f) {
    var v = verbById(f.verb);
    var note = (f.note || '').trim();
    var parts = [];
    if (v) parts.push(v.clause);
    if (note && f.notePos === 'pre') parts.push(note);
    return parts.join(' — ');
  }
  // Prose is trimmed. A multi-line fragment keeps its indentation: in a code
  // view that is part of what was selected.
  function fragText(f) {
    var t = f.text || '';
    return t.indexOf('\n') === -1 ? t.trim() : t.replace(/^[ \t]*\n/, '').replace(/\s+$/, '');
  }

  function buildPayload() {
    var many = fragments.length > 1;
    return fragments.map(function (f, i) {
      var head = many ? (i + 1) + '. ' : '';
      var note = (f.note || '').trim();
      var lead = leadClause(f);
      var lines = [];
      if (lead) {
        lines.push(head + lead + ':');
        lines.push('“' + fragText(f) + '”');
      } else {
        lines.push(head + '“' + fragText(f) + '”');
      }
      if (note && f.notePos !== 'pre') lines.push('→ ' + note);
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
  // A classic GitHub code table (github.com's legacy view, and every gist —
  // gist never got the newer react-code-lines markup) pairs an empty
  // line-number <td> with a code <td> in each row. Reading the table's own
  // innerText joins the two cells with a tab per row, which would land in
  // every exported line; reading each row's own code cell instead avoids it.
  function codeTableText(table) {
    var rows = table.querySelectorAll('tr');
    if (!rows.length) return null;
    return Array.prototype.map.call(rows, function (tr) {
      var cells = tr.querySelectorAll('td');
      var cell = cells[cells.length - 1];
      return cell ? cell.textContent.replace(/\n+$/, '') : '';
    }).join('\n');
  }

  function serializeBlocks(rootEl) {
    var out = [];
    // A code view is lines of text, not prose: keep it verbatim in a fence.
    if (rootEl.matches && rootEl.matches(GH_CODE)) {
      var table = rootEl.tagName === 'TABLE' ? rootEl : rootEl.querySelector('table');
      var code = ((table && codeTableText(table)) || rootEl.innerText || '').replace(/\s+$/, '');
      return code ? ['```\n' + code + '\n```'] : [];
    }
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

  // ------------------------------------------------- remembering the thread
  // Both sites render only a window of a long conversation: messages load as
  // you scroll and some stay collapsed until opened. Whatever the page has
  // shown us is kept here, so ⭳ .md exports the thread rather than the part
  // of it that happens to be on screen. Nothing is fetched to build this —
  // it is only ever what the page itself rendered.
  var logMsgs = [];        // [{k, role, b: [blocks], len, ts}]
  var logDirty = false;
  var lastLogSave = 0;
  var lastScanY = null;
  var logTimer = null;

  function loadLog() {
    var entry = loadJSON(LOG_MAP_KEY, {})[convo];
    logMsgs = (entry && entry.msgs) || [];
    logDirty = false;
    lastScanY = null;
  }

  function saveLog(force) {
    if (!logMsgs.length) return;
    var now = Date.now();
    // Streaming fires constantly; write at most every couple of seconds
    // unless the caller needs it on disk now. A deferred write is scheduled
    // rather than left to whenever something next happens to scan.
    if (!force && now - lastLogSave < 2000) {
      logDirty = true;
      clearTimeout(logTimer);
      logTimer = setTimeout(function () { if (logDirty) saveLog(true); }, 2000 - (now - lastLogSave));
      return;
    }
    clearTimeout(logTimer);
    lastLogSave = now;
    logDirty = false;
    var map = loadJSON(LOG_MAP_KEY, {});
    map[convo] = { ts: now, msgs: logMsgs.slice(-LOG_MAX_MSGS) };
    // Keep the store small enough that it never crowds out the fragments,
    // which matter more: drop whole conversations, least recently seen first.
    var keys = Object.keys(map);
    keys.sort(function (a, b) { return (map[b].ts || 0) - (map[a].ts || 0); });
    var kept = {}, chars = 0;
    keys.forEach(function (k, i) {
      if (i >= LOG_MAX_CONVOS) return;
      var size = JSON.stringify(map[k]).length;
      if (chars + size > LOG_MAX_CHARS && k !== convo) return;
      chars += size;
      kept[k] = map[k];
    });
    saveMap(LOG_MAP_KEY, kept);
  }

  // The element that actually scrolls the conversation: the window on some
  // layouts, an inner pane on others. Saying "none" matters — a scroller we
  // have not found tells us nothing about where in the thread we are.
  function scrollerFor(el) {
    var n = el && el.parentElement;
    while (n && n !== document.body && n !== document.documentElement) {
      var o = '';
      try { o = window.getComputedStyle(n).overflowY; } catch (e) {}
      if (o === 'auto' || o === 'scroll' || o === 'overlay') return n;
      n = n.parentElement;
    }
    var doc = document.scrollingElement || document.documentElement;
    return doc && doc.scrollHeight > doc.clientHeight + 20 ? doc : null;
  }

  // Identity is the text itself. A site's own message id is used when it
  // offers one, but it is never the only thing relied on: a message is the
  // same message when it reads the same, or when one reading opens exactly
  // like the other — which is what a collapsed message, one truncated behind
  // "Show more", and one still streaming all look like.
  function hashOf(str) {
    var h = 5381, i = str.length;
    while (i) h = (h * 33 ^ str.charCodeAt(--i)) >>> 0;
    return h.toString(36);
  }
  function normText(t) { return (t || '').replace(/\s+/g, ' ').trim(); }
  var HEAD_LEN = 200;   // enough of an opening to tell two messages apart
  var textCache = (typeof WeakMap === 'function') ? new WeakMap() : {
    get: function () {}, set: function () {}   // no cache, just slower
  };
  var ANCHOR_MIN = 40;  // shorter than this, a message is too common to trust

  // Where the messages are. Each site is tried in turn, and the first that
  // finds anything wins; the last is a net for markup we have not seen.
  var CHAT_FINDERS = [
    { sel: '[data-message-author-role]',
      user: function (el) { return el.getAttribute('data-message-author-role') === 'user'; } },
    { sel: '[data-testid="user-message"],.font-user-message,.font-claude-message,[data-testid="assistant-message"]',
      user: function (el) { return el.matches('[data-testid="user-message"],.font-user-message'); } },
    { sel: 'main [data-testid*="message" i],main [class*="font-user-message"],main [class*="font-claude-message"]',
      user: function (el) {
        return /user|human/i.test(el.getAttribute('data-testid') || '') || /font-user-message/.test(el.className || '');
      } }
  ];

  // The messages the page is rendering right now, in order. Nested matches
  // keep only the outermost, so one message is never counted twice.
  function liveTurns() {
    var found = null, finder = null;
    for (var i = 0; i < CHAT_FINDERS.length && !found; i++) {
      var nodes = document.querySelectorAll(CHAT_FINDERS[i].sel);
      if (nodes.length) { found = Array.prototype.slice.call(nodes); finder = CHAT_FINDERS[i]; }
    }
    if (!found) return [];
    found = found.filter(function (el, idx) {
      for (var j = 0; j < found.length; j++) {
        if (j !== idx && found[j].contains(el)) return false;
      }
      return !host.contains(el);
    });
    return found.map(function (el) {
      // innerText is what the page actually shows, which is the whole point —
      // but asking for it forces the browser to lay the page out, and on a
      // long thread that is the one genuinely expensive thing here. So it is
      // asked only when the element's own text has changed, which textContent
      // answers without any layout at all.
      var tl = (el.textContent || '').length, kids = el.childElementCount;
      var seen = textCache.get(el);
      if (!seen || seen.tl !== tl || seen.kids !== kids) {
        var norm = normText(el.innerText || '');
        seen = { tl: tl, kids: kids, h: hashOf(norm), head: norm.slice(0, HEAD_LEN), len: norm.length };
        textCache.set(el, seen);
      }
      return {
        el: el,
        role: finder.user(el) ? 'You' : 'Assistant',
        id: (el.getAttribute && el.getAttribute('data-message-id')) || '',
        h: seen.h, head: seen.head, len: seen.len
      };
    });
  }

  // Two readings of the same message: keep whichever holds more of it. Less
  // text is a narrower view — collapsed, truncated, mid-stream — not a newer
  // version, so the fuller one stands.
  function bestOf(oldRec, newRec) {
    var keep = newRec;
    if (newRec.len < oldRec.len) {
      // Shorter. That is a narrower view of the same message only if it reads
      // like its opening — collapsed, cut off behind "Show more", or still
      // streaming. Text that diverges instead is an edit, and an edit is the
      // message now, however much of it there is.
      var head = newRec.head.replace(/[\s…\.]+$/, '');
      if (head && oldRec.head.indexOf(head) === 0) keep = oldRec;
    }
    return {
      id: newRec.id || oldRec.id || '',
      role: newRec.role || oldRec.role,
      h: keep.h, head: keep.head, len: keep.len, b: keep.b,
      ts: Date.now()
    };
  }

  // Line up the window the page is showing against what we already hold.
  // Text is what identifies a message, which means messages that read the
  // same — "Yes." twice in a thread — are indistinguishable on their own.
  // They are told apart by their neighbours: anything matching only one
  // remembered message anchors the window, and an ambiguous one can then only
  // be the copy sitting between its anchors, in the same run as them. A
  // message with nowhere plausible to go is a new message, not a second
  // sighting of an old one.
  function alignTurns(stored, scanned) {
    var at = [], claimed = {}, i;
    for (i = 0; i < scanned.length; i++) at.push(-1);
    if (!stored.length || !scanned.length) return at;

    var byId = {}, byHead = {};
    stored.forEach(function (m, idx) {
      if (m.id) (byId[m.id] = byId[m.id] || []).push(idx);
      var hk = m.role + '\u0000' + m.head;
      (byHead[hk] = byHead[hk] || []).push(idx);
    });
    var candidatesFor = function (sc) {
      if (sc.id && byId[sc.id]) return byId[sc.id];
      return byHead[sc.role + '\u0000' + sc.head] || [];
    };
    var runOf = function (idx) { return typeof stored[idx].r === 'number' ? stored[idx].r : 0; };

    // Anchors: the ones that can only be one thing. A single candidate is
    // only proof when the text is distinctive enough to be worth trusting —
    // "Yes." matching the one "Yes." we happen to hold proves nothing, since
    // the second one is exactly what we have not seen yet. An id from the
    // site settles it whatever the length.
    var anchors = [];
    scanned.forEach(function (sc, n) {
      var cands = candidatesFor(sc);
      if (cands.length !== 1) return;
      if (sc.id || sc.len >= ANCHOR_MIN) anchors.push({ i: n, idx: cands[0] });
    });
    // Anchors within one run have to read in order; where they do not, the
    // largest run of them that does is kept. Anchors in *different* runs
    // disagreeing is not a conflict but the news that those runs are
    // adjacent, so they are all kept — that is what lets runs be stitched.
    var byRun = {};
    anchors.forEach(function (a) {
      var r = runOf(a.idx);
      (byRun[r] = byRun[r] || []).push(a);
    });
    Object.keys(byRun).forEach(function (r) {
      var list = byRun[r], best = [], seq = [];
      list.forEach(function (a, n) {
        seq[n] = [a];
        for (var m = 0; m < n; m++) {
          if (list[m].idx < a.idx && seq[m].length + 1 > seq[n].length) seq[n] = seq[m].concat([a]);
        }
        if (seq[n].length > best.length) best = seq[n];
      });
      best.forEach(function (a) { at[a.i] = a.idx; claimed[a.idx] = true; });
    });

    // The rest: each can only be a remembered message lying between the
    // anchors on either side of it, and in the run those anchors belong to.
    for (i = 0; i < scanned.length; i++) {
      if (at[i] >= 0) continue;
      var lo = -1, hi = stored.length, j;
      for (j = i - 1; j >= 0; j--) if (at[j] >= 0) { lo = at[j]; break; }
      for (j = i + 1; j < scanned.length; j++) if (at[j] >= 0) { hi = at[j]; break; }
      var want = lo >= 0 ? runOf(lo) : (hi < stored.length ? runOf(hi) : null);
      var list2 = candidatesFor(scanned[i]);
      for (j = 0; j < list2.length; j++) {
        var idx = list2[j];
        if (claimed[idx]) continue;
        if (idx <= lo || idx >= hi) continue;
        if (want !== null && runOf(idx) !== want) continue;
        at[i] = idx; claimed[idx] = true; break;
      }
    }
    return at;
  }

  // Fold the window in. Nothing is ever removed: a message we hold but cannot
  // see may be one the page has not loaded, and losing a real message is a
  // worse failure than keeping one the conversation has moved past.
  //
  // Order is the harder half. A window that overlaps what we hold says where
  // it belongs. A window that shares nothing with it — a jump to another part
  // of the thread — says nothing at all, so it is kept as a separate run, in
  // order within itself, and the moment some later window overlaps two runs
  // it has proved they are adjacent and in what order, and they are stitched
  // into one. Scrolling normally always overlaps, so this only matters for
  // jumps, and it resolves itself as soon as the gap is crossed.
  function runsOf(list) {
    var ids = {}, next = 0;
    list.forEach(function (m) {
      if (typeof m.r !== 'number') m.r = 0;
      if (!ids[m.r]) ids[m.r] = true;
      if (m.r >= next) next = m.r + 1;
    });
    return next;
  }

  function mergeTurns(stored, scanned, ctx) {
    if (!scanned.length) return stored;
    ctx = ctx || {};
    var nextRun = runsOf(stored);
    if (!stored.length) {
      return scanned.map(function (m) { m.r = 0; return m; });
    }
    var at = alignTurns(stored, scanned), i;
    var matched = [];
    at.forEach(function (idx) { if (idx >= 0) matched.push(idx); });

    if (!matched.length) {
      // Nowhere to attach it. Keep it whole, as its own run, and put it where
      // the scroller says — or, with nothing to go on, in front: new messages
      // arrive next to what we already hold, so a window sharing nothing with
      // it is almost always older ground.
      scanned.forEach(function (m) { m.r = nextRun; });
      return ctx.later ? stored.concat(scanned) : scanned.concat(stored);
    }

    // Which runs this window touches, in the order it touches them: that is
    // the order those runs go in.
    var order = [], seenRun = {};
    at.forEach(function (idx) {
      if (idx < 0) return;
      var r = stored[idx].r;
      if (!seenRun[r]) { seenRun[r] = true; order.push(r); }
    });
    var work = stored;
    if (order.length > 1) {
      var joined = [], others = [], placed = false;
      // the stitched runs take the place of the first of them
      order.forEach(function (r) {
        stored.forEach(function (m) { if (m.r === r) joined.push(m); });
      });
      stored.forEach(function (m) {
        if (seenRun[m.r]) {
          if (!placed) { others = others.concat(joined); placed = true; }
          return;
        }
        others.push(m);
      });
      work = others;
      var oneRun = order[0];
      joined.forEach(function (m) { m.r = oneRun; });
      at = alignTurns(work, scanned);   // positions moved; line up again
    }

    var insertBefore = {}, replace = {}, pending = [], trailing = null, cursor = -1;
    var run = work[at.filter(function (x) { return x >= 0; })[0]].r;
    scanned.forEach(function (sc, n) {
      var idx = at[n];
      sc.r = run;
      if (idx < 0) { pending.push(sc); return; }
      if (pending.length) {
        insertBefore[idx] = (insertBefore[idx] || []).concat(pending);
        pending = [];
      }
      replace[idx] = bestOf(work[idx], sc);
      replace[idx].r = run;
      cursor = idx;
    });
    if (pending.length) trailing = pending;

    var out = [];
    work.forEach(function (m, n) {
      if (insertBefore[n]) out = out.concat(insertBefore[n]);
      out.push(replace[n] || m);
      if (trailing && n === cursor) { out = out.concat(trailing); trailing = null; }
    });
    if (trailing) out = out.concat(trailing);

    // A site id is unique by definition; the same one twice is one message.
    var seenId = {};
    return out.filter(function (m) {
      if (!m.id) return true;
      if (seenId[m.id]) return false;
      seenId[m.id] = true;
      return true;
    });
  }

  // Read the page and remember it. The costly part is turning a message into
  // blocks, so that is done only when its text has actually changed — an
  // unchanged message is recognised by its hash and left alone.
  function scanTranscript(force) {
    if (IS_GITHUB) return;
    var live = liveTurns();
    if (!live.length) return;
    var at = alignTurns(logMsgs, live);
    var changed = false;
    var scanned = live.map(function (t, i) {
      var old = at[i] >= 0 ? logMsgs[at[i]] : null;
      if (old && old.h === t.h && (old.b || []).length) {
        return old;                                   // nothing about it moved
      }
      changed = true;
      return {
        id: t.id, role: t.role, h: t.h, head: t.head, len: t.len,
        b: serializeBlocks(t.el), ts: Date.now()
      };
    });
    var scroller = scrollerFor(live[0].el);
    var y = scroller ? scroller.scrollTop : 0;
    var lastDir = (scroller && lastScanY !== null && y > lastScanY) ? 'down' : 'up';
    lastScanY = scroller ? y : null;
    var merged = mergeTurns(logMsgs, scanned, { later: !!scroller && lastDir === 'down' });
    // A merge that only puts two runs in the right order changes neither the
    // number of messages nor a word of any of them, and it still has to be
    // kept — throwing it away would leave the thread in the order it happened
    // to be read in, and undo the stitch on the very next scan.
    var moved = merged.length !== logMsgs.length;
    if (!moved) {
      for (var n = 0; n < merged.length; n++) {
        if (merged[n] !== logMsgs[n]) { moved = true; break; }
      }
    }
    logMsgs = merged;
    if (changed || moved) {
      saveLog(force);
      refreshPickerIfOpen();
    } else if (logDirty) {
      saveLog(false);
    }
  }

  // What a turn's body is, whether it is on the page or only remembered — and
  // when it is both, whichever of the two holds more of the message. Being on
  // screen does not make a copy the better one: it may be the collapsed view
  // of something we already hold in full.
  function turnBlocks(t) {
    var remembered = t.b || [];
    if (!(t.el && t.el.isConnected)) return remembered.slice();
    var liveNorm = normText(t.el.innerText || '');
    if (remembered.length && liveNorm.length <= (t.len || 0)) return remembered.slice();
    return serializeBlocks(t.el);
  }

  // Everything we hold, each still tied to its element where the page happens
  // to be showing it. Reading this does not scan — the picker leans on it
  // while the page moves underneath.
  function conversationTurns() {
    var live = liveTurns();
    if (!logMsgs.length) {
      return live.length ? live.map(function (t) {
        return { role: t.role, el: t.el, b: null, len: t.len, onPage: true, key: t.id || (t.role + t.head) };
      }) : null;
    }
    var at = alignTurns(logMsgs, live), onPage = {};
    at.forEach(function (idx, i) { if (idx >= 0) onPage[idx] = live[i]; });
    return logMsgs.map(function (m, i) {
      var t = onPage[i];
      return {
        role: m.role, el: t ? t.el : null, b: m.b, len: m.len,
        onPage: !!t, key: m.id || (m.role + m.head)
      };
    });
  }

  function getConversation() {
    if (IS_GITHUB) {
      // A gist can hold several files, each its own labeled section; a
      // github.com blob page (or a one-file gist with no distinguishing
      // name to find) is still the single path it always was.
      var els = document.querySelectorAll(GH_CONTENT);
      if (!els.length) return null;
      var path = decodeURIComponent(location.pathname.replace(/^\/|\/$/g, ''));
      var multi = els.length > 1;
      return Array.prototype.map.call(els, function (el, i) {
        var fileEl = el.closest('.file');
        var nameEl = fileEl && fileEl.querySelector('.gist-blob-name');
        var name = nameEl && textOf(nameEl).trim();
        var role = name || (multi ? path + ' — message ' + (i + 1) : path) || 'File';
        return { role: role, el: el };
      });
    }
    scanTranscript(true);
    return conversationTurns();
  }

  function convoTitle() {
    // "Assay/README.md at master · puj/Assay · GitHub" → "Assay/README.md at master"
    if (IS_GITHUB) return ((document.title || '').split(' · ')[0] || '').trim() || 'File';
    var t = (document.title || '').replace(/\s*[—|–-]\s*(ChatGPT|Claude).*$/i, '').trim();
    // A brand-new chat is titled just "ChatGPT"/"Claude" — not a real title.
    if (/^(chatgpt|claude|new chat)$/i.test(t)) t = '';
    return t || 'Conversation';
  }

  // Filenames read brand → chat title → timestamp, so exports group by app,
  // say what they are, and sort chronologically within one conversation.
  function titleSlug() {
    var t = convoTitle();
    if (t === 'Conversation') return '';
    return t
      .replace(/[\u0000-\u001F\/\\?%*:|"'<>.,;#&$!`]+/g, ' ')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60)
      .replace(/-+$/, '');
  }

  function fragmentAppendixMd(lines) {
    lines.push('---', '', '## Collected fragments (' + fragments.length + ')', '');
    fragments.forEach(function (f, i) {
      var note = (f.note || '').trim();
      var lead = leadClause(f);
      lines.push('### ' + (i + 1), '');
      if (lead) lines.push('*' + lead + ':*', '');
      fragText(f).split('\n').forEach(function (l) { lines.push('> ' + l); });
      if (note && f.notePos !== 'pre') lines.push('', '→ *' + note + '*');
      lines.push('');
    });
  }

  function buildConversationMarkdown(turns, scope) {
    if (!turns && !fragments.length) return null;
    var lines = ['# ' + convoTitle(), '',
      '_' + location.hostname + ' — ' + niceStamp() + (scope ? ' — ' + scope : '') + '_', ''];
    if (turns) {
      turns.forEach(function (t) {
        lines.push('## ' + t.role, '');
        turnBlocks(t).forEach(function (b) { lines.push(b, ''); });
      });
    }
    if (fragments.length) fragmentAppendixMd(lines);
    return lines.join('\n');
  }

  function buildConversationText(turns, scope) {
    if (!turns && !fragments.length) return null;
    var parts = [convoTitle() + ' — ' + location.hostname + ' — ' + niceStamp() + (scope ? ' — ' + scope : '')];
    if (turns) {
      turns.forEach(function (t) {
        parts.push(t.role + ':\n' + turnBlocks(t).join('\n\n'));
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

  // ------------------------------------------------------- choosing messages
  // Most of the time what you want is the last few exchanges, not thirty. The
  // picker lists the conversation with who said what and enough of each
  // message to recognise it, and ↓ takes one message and everything after —
  // which is that common case in a single tap.
  var picker = $('picker'), pickList = $('pickList');
  var pickTurns = [], picked = [], pickExt = 'md', pickMime = 'text/markdown';
  var pickOpen = {};   // which messages are opened to show what was captured

  function turnText(t) {
    return turnBlocks(t).join('\n\n');
  }
  function pickPreview(text) {
    return (text || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  }
  function countLabel(n) {
    return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k characters' : n + ' characters';
  }

  // "messages 19–30 of 30" when the choice is a run, a plain count when it is
  // not, and nothing at all when the file holds everything.
  function pickScope() {
    var total = pickTurns.length, on = [];
    picked.forEach(function (v, i) { if (v) on.push(i); });
    if (!on.length || on.length === total) return '';
    var run = on[on.length - 1] - on[0] + 1 === on.length;
    return run
      ? 'messages ' + (on[0] + 1) + '–' + (on[on.length - 1] + 1) + ' of ' + total
      : on.length + ' of ' + total + ' messages';
  }

  function paintPickHeader() {
    var n = picked.filter(Boolean).length;
    $('pickTitle').textContent = n === pickTurns.length
      ? 'All ' + n + ' messages'
      : n + ' of ' + pickTurns.length + ' messages';
    var recalled = 0;
    pickTurns.forEach(function (t) { if (t.el === null) recalled++; });
    var hint = $('pickHint');
    if (!pickTurns.length) {
      hint.textContent = 'No messages found on this page. ↻ reads it again.';
      return;
    }
    hint.textContent = recalled
      ? recalled + ' of these ' + (recalled === 1 ? 'is' : 'are') + ' remembered from earlier — not on the page now. Tap a size to read what was captured.'
      : 'Tap ↓ on a message to take it and everything after it, or a size to read what was captured.';
    $('pickGo').disabled = !n && !fragments.length;
    $('pickGo').innerHTML = '&#x2B07; Download .' + pickExt;
  }

  function renderPicks() {
    pickList.textContent = '';
    pickTurns.forEach(function (t, i) {
      var wrap = document.createElement('div');
      wrap.className = 'pick';

      var row = document.createElement('div');
      row.className = 'row' + (picked[i] ? ' on' : '');
      row.setAttribute('role', 'button');
      row.setAttribute('data-i', String(i));
      var tick = document.createElement('span');
      tick.className = 'tick';
      tick.textContent = '✓';
      var body = document.createElement('span');
      body.className = 'body';
      var who = document.createElement('span');
      who.className = 'who';
      who.textContent = t.role === 'You' ? 'You' : (t.role === 'Assistant' ? BRAND : t.role);
      var text = turnText(t);
      var prev = document.createElement('span');
      prev.className = 'prev';
      prev.textContent = pickPreview(text) || '(no text)';
      body.appendChild(who); body.appendChild(prev);

      // How much of this message we actually hold, and where it came from —
      // the whole point of the memory is that you can check it.
      var meta = document.createElement('button');
      meta.className = 'meta';
      meta.textContent = countLabel(text.length) + ' · ' + (t.el === null ? 'remembered' : 'on screen');
      meta.title = 'Show what was captured';
      var full = document.createElement('pre');
      full.className = 'full';
      full.hidden = !pickOpen[t.key];
      full.textContent = text || '(nothing captured)';
      meta.classList.toggle('open', !full.hidden);
      meta.addEventListener('click', function (e) {
        e.stopPropagation();
        full.hidden = !full.hidden;
        meta.classList.toggle('open', !full.hidden);
        pickOpen[t.key] = !full.hidden;
      });
      body.appendChild(meta);
      body.appendChild(full);

      row.appendChild(tick); row.appendChild(body);
      row.addEventListener('click', function () {
        picked[i] = !picked[i];
        row.classList.toggle('on', picked[i]);
        paintPickHeader();
      });

      var from = document.createElement('button');
      from.className = 'from';
      from.textContent = '↓';
      from.title = 'This message and everything after it';
      from.addEventListener('click', function () {
        picked = pickTurns.map(function (_, k) { return k >= i; });
        renderPicks();
        paintPickHeader();
      });

      wrap.appendChild(row); wrap.appendChild(from);
      pickList.appendChild(wrap);
    });
    paintPickHeader();
  }

  function setLast(n) {
    picked = pickTurns.map(function (_, i) { return i >= pickTurns.length - n; });
    renderPicks();
  }
  $('pickAll').addEventListener('click', function () { setLast(pickTurns.length); });
  $('pickNone').addEventListener('click', function () { setLast(0); });
  $('pickLast2').addEventListener('click', function () { setLast(2); });
  $('pickLast6').addEventListener('click', function () { setLast(6); });
  $('pickRebuild').addEventListener('click', rebuildFromPage);

  // Keeping up with the page while the picker is open: the list is rebuilt
  // from what we now hold, and what you had chosen, opened and scrolled to
  // survives it — the count in the header moving is the point, since that is
  // what tells you a scroll is picking more of the conversation up.
  function refreshPickerIfOpen() {
    if (!picker || !picker.classList.contains('show')) return;
    var turns = conversationTurns();
    if (!turns || !turns.length) return;
    var was = {};
    pickTurns.forEach(function (t, i) { was[t.key] = picked[i]; });
    var atEnd = pickList.scrollTop + pickList.clientHeight >= pickList.scrollHeight - 24;
    var keepTop = pickList.scrollTop;
    pickTurns = turns;
    picked = turns.map(function (t) { return was[t.key] === undefined ? true : was[t.key]; });
    renderPicks();
    pickList.scrollTop = atEnd ? pickList.scrollHeight : keepTop;
  }

  // Forget this conversation and take it again from the page. The memory is
  // the only record of messages that have scrolled away, so it is never
  // cleared behind your back — but a thread edited elsewhere can leave it
  // holding a version that no longer exists, and this is the way out.
  function rebuildFromPage() {
    logMsgs = [];
    lastScanY = null;
    var map = loadJSON(LOG_MAP_KEY, {});
    delete map[convo];
    saveMap(LOG_MAP_KEY, map);
    scanTranscript(true);
    var turns = conversationTurns() || [];
    pickTurns = turns;
    picked = turns.map(function () { return true; });
    pickOpen = {};
    renderPicks();
    toast('Rebuilt from the page — ' + turns.length + ' message' + (turns.length === 1 ? '' : 's'), 2400);
  }

  function openPicker(turns, ext, mime) {
    hideChip();
    clearPending();
    pickTurns = turns;
    pickExt = ext;
    pickMime = mime;
    pickOpen = {};
    picked = turns.map(function () { return true; });
    closeSheet();
    picker.classList.add('show');
    updatePill();
    renderPicks();
    // The recent end is what you came for, so start there.
    pickList.scrollTop = pickList.scrollHeight;
  }
  function closePicker(reopen) {
    picker.classList.remove('show');
    if (reopen) openSheet(); else updatePill();
  }
  $('pickClose').addEventListener('click', function () { closePicker(true); });
  $('pickGo').addEventListener('click', function () {
    var chosen = pickTurns.filter(function (_, i) { return picked[i]; });
    saveExport(chosen.length ? chosen : null, pickScope(), pickExt, pickMime);
    closePicker(false);
  });

  function saveExport(turns, scope, ext, mime) {
    var content = ext === 'md' ? buildConversationMarkdown(turns, scope) : buildConversationText(turns, scope);
    if (!content) { toast('Nothing to export yet'); return; }
    var slug = titleSlug();
    var name = 'assay-' + (slug ? slug + '-' : '') + fileStamp() + '.' + ext;
    if (!download(name, content, mime)) { toast('Download blocked by the browser'); return; }
    toast(turns
      ? 'Saved ' + (scope || 'conversation') + (fragments.length ? ' + fragments' : '') + ' (.' + ext + ')'
      : (IS_GITHUB ? 'Saved fragments (.' : 'Transcript not found — saved fragments only (.') + ext + ')', 2400);
  }

  function exportConversation(ext, mime) {
    var turns = getConversation();
    // One message (a file on GitHub) or none: there is nothing to choose.
    if (!turns || turns.length < 2) { saveExport(turns, '', ext, mime); return; }
    openPicker(turns, ext, mime);
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

  // The payload landed but structure did too? Check the first and last
  // meaningful lines are present — a run-on paste passes a naive check.
  function composerHas(el, text) {
    var hay = ((el.tagName === 'TEXTAREA' ? el.value : el.innerText) || '');
    var lines = text.split('\n').filter(function (l) { return l.trim(); });
    if (!lines.length) return false;
    var first = lines[0].slice(0, 20);
    var last = lines[lines.length - 1].slice(0, 20);
    return hay.indexOf(first) !== -1 && hay.indexOf(last) !== -1;
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
        return composerHas(el, text);
      }
      // contenteditable (ProseMirror on both ChatGPT and Claude).
      var sel = window.getSelection();
      sel.selectAllChildren(el);
      sel.collapseToEnd();
      // Structured insertion keeps the payload human-readable: a paragraph
      // break between fragments, a line break within one. A single
      // insertText with embedded newlines flattens to a run-on in
      // ProseMirror, which is exactly the bug this avoids.
      try {
        text.split('\n\n').forEach(function (para, i) {
          if (i > 0) {
            var ok = false;
            try { ok = document.execCommand('insertParagraph'); } catch (e2) {}
            if (!ok) {
              document.execCommand('insertLineBreak');
              document.execCommand('insertLineBreak');
            }
          }
          para.split('\n').forEach(function (line, j) {
            if (j > 0) document.execCommand('insertLineBreak');
            if (line) document.execCommand('insertText', false, line);
          });
        });
      } catch (e) {}
      if (composerHas(el, text)) return true;
      // Fallback: a synthetic paste, which some editors handle natively.
      try {
        var dt = new DataTransfer();
        dt.setData('text/plain', text);
        el.dispatchEvent(new ClipboardEvent('paste', {
          clipboardData: dt, bubbles: true, cancelable: true
        }));
      } catch (e) {}
      return composerHas(el, text);
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

  function manualCopy(payload) {
    manualEl.classList.add('show');
    $('manualTxt').value = payload;
    $('manualTxt').select();
    toast('Copy the text below manually', 2600);
  }

  $('goBtn').addEventListener('click', function () {
    if (!fragments.length) return;
    var payload = buildPayload();
    if (IS_GITHUB) {
      // Keep the fragments: what you paste them into is somewhere else, and a
      // clipboard write can fail quietly on a phone.
      copyText(payload).then(function (copied) {
        if (copied) toast('Copied ' + fragments.length + ' fragment' + (fragments.length > 1 ? 's' : ''), 2400);
        else manualCopy(payload);
      });
      return;
    }
    if (insertIntoComposer(payload)) {
      finishBatch('In the composer — review and send');
      return;
    }
    copyText(payload).then(function (copied) {
      if (copied) {
        finishBatch('Copied — paste into the composer');
      } else {
        manualCopy(payload); // last resort, keeping the fragments
      }
    });
  });

  loadLog();
  updatePill();
  syncViewport();
  window.__assay = {
    toggle: toggleSheet,
    version: VERSION,
    _scan: function () { scanTranscript(false); },
    _scans: function () { return scanCount; },
    _debug: function () {
      return {
        pending: pending ? { start: pending.start, end: pending.end, scope: pending.scope, text: pendingText() } : null,
        fragments: fragments.map(function (f) { return { text: f.text, note: f.note, notePos: f.notePos, verb: f.verb, colorIdx: f.colorIdx }; }),
        marks: marks.length,
        log: logMsgs.map(function (m) { return { r: m.r, head: m.head.slice(0, 18), len: m.len }; }),
        exportMd: buildConversationMarkdown(getConversation()),
        exportTxt: buildConversationText(getConversation())
      };
    }
  };
})();
