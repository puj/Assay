// ==UserScript==
// @name         DeepDive — collect fragments, synthesize together
// @namespace    https://github.com/puj/Diveboard
// @version      0.1.0
// @description  Select passages in ChatGPT or Claude on mobile, collect several, annotate each, then send them back as one deep-dive prompt. No API — your existing subscription does the inference.
// @author       puj
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @match        https://claude.ai/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Re-running (e.g. via bookmarklet) toggles the sheet instead of double-injecting.
  if (window.__deepdive) { try { window.__deepdive.toggle(); } catch (e) {} return; }

  var STORE_KEY = 'deepdive.fragments.v1';
  var BACKUP_KEY = 'deepdive.lastBatch.v1';
  var MIN_LEN = 4;

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  var fragments = loadJSON(STORE_KEY, []);
  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(fragments)); } catch (e) {}
  }

  var pendingText = '';
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
    '.sheet{position:fixed;left:0;right:0;bottom:0;max-height:78vh;display:none;flex-direction:column;' +
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
    '.frag input{width:100%;margin-top:8px;border:1px dashed #cbd5e1;border-radius:8px;padding:8px 10px;' +
      'font-size:14px;background:#f8fafc;color:#0f172a;outline:none}' +
    '.frag input:focus{border-color:#38bdf8;border-style:solid}' +
    '.empty{padding:26px 10px;text-align:center;color:#64748b;font-size:14px;line-height:1.6}' +
    '.empty .restore{color:#0284c7;font-weight:600;text-decoration:underline;font-size:14px}' +
    '.actions{display:flex;gap:10px;padding:12px 14px calc(14px + env(safe-area-inset-bottom));border-top:1px solid #e2e8f0}' +
    '.btn{flex:1;border-radius:12px;padding:14px 10px;font-size:15px;font-weight:700;touch-action:manipulation}' +
    '.btn.clear{background:#e2e8f0;color:#475569;flex:0 0 30%}' +
    '.btn.go{background:#0284c7;color:#fff}' +
    '.btn:disabled{opacity:.5}' +
    '.manual{margin:0 14px 12px;display:none}' +
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
      '.actions{border-top-color:#334155}' +
      '.btn.clear{background:#334155;color:#cbd5e1}' +
      '.empty{color:#94a3b8}' +
      '.manual textarea{background:#1e293b;border-color:#475569;color:#e2e8f0}' +
    '}' +
    '</style>' +
    '<button class="chip" id="chip">&#xFF0B; Collect</button>' +
    '<button class="pill" id="pill"><span>Deep dive</span><span class="n" id="count">0</span></button>' +
    '<div class="backdrop" id="backdrop"></div>' +
    '<div class="sheet" id="sheet">' +
      '<header><h2>Collected fragments</h2><button class="close" id="closeBtn">&#x2715;</button></header>' +
      '<div class="list" id="list"></div>' +
      '<div class="manual" id="manual"><textarea id="manualTxt" readonly></textarea></div>' +
      '<div class="actions">' +
        '<button class="btn clear" id="clearBtn">Clear</button>' +
        '<button class="btn go" id="goBtn">&#x2197; Explore together</button>' +
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

  // ------------------------------------------------------------- selection
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
    pendingText = text;
    var rect = null;
    try { rect = sel.getRangeAt(0).getBoundingClientRect(); } catch (e) {}
    showChip(rect);
  }

  window.addEventListener('scroll', hideChip, true);

  chip.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    e.stopPropagation();
    collect();
  });

  function collect() {
    if (!pendingText) return;
    fragments.push({
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      text: pendingText,
      note: '',
      ts: Date.now()
    });
    pendingText = '';
    persist();
    hideChip();
    try { window.getSelection().removeAllRanges(); } catch (e) {}
    updatePill();
    toast('Collected — ' + fragments.length + ' fragment' + (fragments.length > 1 ? 's' : ''));
  }

  // ----------------------------------------------------------------- sheet
  function openSheet() {
    sheetOpen = true;
    hideChip();
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
      empty.textContent = 'Nothing collected yet. Select a passage in the conversation, then tap “＋ Collect”.';
      var backup = loadJSON(BACKUP_KEY, null);
      if (backup && backup.length) {
        empty.appendChild(document.createElement('br'));
        var restore = document.createElement('button');
        restore.className = 'restore';
        restore.textContent = 'Restore last batch (' + backup.length + ')';
        restore.addEventListener('click', function () {
          fragments = backup;
          persist(); updatePill(); renderList();
        });
        empty.appendChild(restore);
      }
      listEl.appendChild(empty);
      $('goBtn').disabled = true;
      return;
    }
    $('goBtn').disabled = false;
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

      var note = document.createElement('input');
      note.type = 'text';
      note.placeholder = 'add a note (optional) — e.g. “formalize this”';
      note.value = f.note || '';
      note.addEventListener('input', function () { f.note = note.value; persist(); });

      item.appendChild(top);
      item.appendChild(note);
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

  $('goBtn').addEventListener('click', explore);

  // ------------------------------------------------------------ synthesis
  function buildPrompt() {
    var lines = ['I marked these passages in your responses while reading:', ''];
    fragments.forEach(function (f, i) {
      lines.push((i + 1) + '. “' + f.text.trim() + '”');
      if (f.note && f.note.trim()) lines.push('   → ' + f.note.trim());
      lines.push('');
    });
    lines.push('Treat my selection itself as signal — these are the fragments that survived my attention.');
    lines.push('Develop them together: find the deeper structure, the connections and tensions between them, and the implications. Preserve the context of our conversation.');
    return lines.join('\n');
  }

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

  function explore() {
    if (!fragments.length) return;
    var prompt = buildPrompt();
    if (insertIntoComposer(prompt)) {
      finishBatch('In the composer — review and send');
      return;
    }
    copyText(prompt).then(function (copied) {
      if (copied) {
        finishBatch('Copied — paste into the composer');
      } else {
        // Last resort: show the prompt for manual copy, keep fragments.
        manualEl.classList.add('show');
        $('manualTxt').value = prompt;
        $('manualTxt').select();
        toast('Copy the prompt below manually', 2600);
      }
    });
  }

  updatePill();
  window.__deepdive = { toggle: toggleSheet, version: '0.1.0' };
})();
