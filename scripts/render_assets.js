const { chromium } = require('playwright-core');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const fs = require('fs');
const core = fs.readFileSync(ROOT + '/src/winnow.core.js', 'utf8');
const iconSvg = fs.readFileSync(ROOT + '/assets/icon.svg', 'utf8');

const mock = (caption) => `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;font:16px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f3f4f6;color:#111827}
  .cap{background:#111827;color:#f9fafb;font-size:22px;font-weight:700;padding:18px 32px;letter-spacing:.01em}
  .cap span{color:#38bdf8}
  main{max-width:760px;margin:0 auto;padding:28px 24px 40px}
  .msg{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:20px 24px;margin-bottom:18px;font-size:17px}
  .who{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af;margin:0 0 8px}
  .composer-wrap{max-width:760px;margin:0 auto;padding:0 24px}
  [contenteditable]{background:#fff;border:1px solid #d1d5db;border-radius:14px;min-height:56px;padding:14px 18px;font-size:15px;white-space:pre-wrap;box-shadow:0 2px 8px rgba(0,0,0,.06)}
</style></head><body>
<div class="cap">${caption}</div>
<main>
<div class="msg"><p class="who">You</p>What would a selection-first interface for thinking with AI look like?</div>
<div class="msg"><p class="who">Assistant</p><p id="p1">The garbage collector becomes the allocator of life. Creators rarely bear the cost of rejection. The missing primitive is not annotation; it is accumulating several annotations before responding.</p>
<p id="p2">Current interfaces assume the primary human operation is prompting. For serious thinking, it may increasingly be selection: this matters, this does not, connect these three, challenge that one. Selection is probably the higher-bandwidth input modality.</p></div>
</main>
<div class="composer-wrap"><div contenteditable="true" id="composer"></div></div>
</body></html>`;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  // ---- icons ----
  for (const size of [16, 32, 48, 64, 128, 256]) {
    const p = await browser.newPage({ viewport: { width: size, height: size } });
    await p.setContent(`<style>body{margin:0}</style>` + iconSvg.replace('<svg ', `<svg width="${size}" height="${size}" `));
    const buf = await p.screenshot({ omitBackground: true });
    fs.writeFileSync(`${ROOT}/extension/icons/icon${size}.png`, buf);
    await p.close();
  }
  console.log('icons done');

  // ---- screenshots (1280x800) ----
  const shot = async (caption, setup, file) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.route('**/*', r => r.fulfill({ contentType: 'text/html', body: mock(caption) }));
    await page.goto('https://chatgpt.com/c/demo-1');
    await page.evaluate(core);
    await setup(page);
    await page.waitForTimeout(2300);
    await page.screenshot({ path: `${ROOT}/store/${file}` });
    await page.close();
  };
  const clickWord = async (page, pid, word) => {
    const box = await page.evaluate(([pid, word]) => {
      const p = document.getElementById(pid);
      const idx = p.textContent.indexOf(word);
      const r = document.createRange();
      r.setStart(p.firstChild, idx); r.setEnd(p.firstChild, idx + word.length);
      const rc = r.getBoundingClientRect();
      return { x: rc.left + rc.width / 2, y: rc.top + rc.height / 2 };
    }, [pid, word]);
    await page.mouse.click(box.x, box.y);
  };
  const sr = (page) => page.evaluate(fn => {
    const s = document.getElementById('winnow-host').shadowRoot;
    return eval(fn)(s);
  }, null);

  // Shot 1: two collected marks + a pending sentence highlight with the bar
  await shot('Tap a word. Tap again for the sentence, again for the paragraph. <span>Collect as you read.</span>', async (page) => {
    await clickWord(page, 'p1', 'garbage');
    await clickWord(page, 'p1', 'garbage'); // widen to sentence
    await page.evaluate(() => document.getElementById('winnow-host').shadowRoot.getElementById('addBtn').click());
    await clickWord(page, 'p1', 'Creators');
    await clickWord(page, 'p1', 'Creators');
    await page.evaluate(() => document.getElementById('winnow-host').shadowRoot.getElementById('addBtn').click());
    await clickWord(page, 'p2', 'selection');
    await clickWord(page, 'p2', 'selection');
  }, 'screenshot-1.png');

  // Shot 2: sheet open with annotated fragments
  await shot('Annotate each fragment — before or after the quote. <span>Every conversation keeps its own list.</span>', async (page) => {
    await clickWord(page, 'p1', 'garbage');
    await clickWord(page, 'p1', 'garbage');
    await page.evaluate(() => document.getElementById('winnow-host').shadowRoot.getElementById('addBtn').click());
    await clickWord(page, 'p1', 'Creators');
    await clickWord(page, 'p1', 'Creators');
    await page.evaluate(() => document.getElementById('winnow-host').shadowRoot.getElementById('addBtn').click());
    await clickWord(page, 'p2', 'higher');
    await clickWord(page, 'p2', 'higher');
    await page.evaluate(() => document.getElementById('winnow-host').shadowRoot.getElementById('addBtn').click());
    await page.evaluate(() => {
      const s = document.getElementById('winnow-host').shadowRoot;
      window.__winnow.toggle();
      const inputs = s.querySelectorAll('.frag input');
      const notes = ['economic consequence?', 'formalize this', 'expand — connect to writing workflow'];
      inputs.forEach((inp, i) => {
        inp.value = notes[i];
        inp.dispatchEvent(new Event('input'));
      });
    });
  }, 'screenshot-2.png');

  // Shot 3: payload delivered to the composer
  await shot('One tap sends your selection back as a deep-dive prompt. <span>No boilerplate. 100% local.</span>', async (page) => {
    await clickWord(page, 'p1', 'garbage');
    await clickWord(page, 'p1', 'garbage');
    await page.evaluate(() => document.getElementById('winnow-host').shadowRoot.getElementById('addBtn').click());
    await clickWord(page, 'p1', 'Creators');
    await clickWord(page, 'p1', 'Creators');
    await page.evaluate(() => document.getElementById('winnow-host').shadowRoot.getElementById('addBtn').click());
    await page.evaluate(() => {
      const s = document.getElementById('winnow-host').shadowRoot;
      window.__winnow.toggle();
      const inputs = s.querySelectorAll('.frag input');
      ['economic consequence?', 'formalize this'].forEach((n, i) => {
        inputs[i].value = n; inputs[i].dispatchEvent(new Event('input'));
      });
      s.getElementById('goBtn').click();
    });
  }, 'screenshot-3.png');
  console.log('screenshots done');

  // ---- promo tile 440x280 ----
  const tile = await browser.newPage({ viewport: { width: 440, height: 280 } });
  await tile.setContent(`<style>
    body{margin:0;width:440px;height:280px;background:#111827;display:flex;align-items:center;justify-content:center;gap:26px;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
    .icon{width:96px;height:96px;flex:none}
    h1{color:#f9fafb;font-size:34px;margin:0 0 6px;letter-spacing:-.01em}
    p{color:#9ca3af;font-size:15px;margin:0;line-height:1.45;max-width:220px}
    p b{color:#38bdf8;font-weight:600}
  </style>
  <div class="icon">${iconSvg}</div>
  <div><h1>Winnow</h1><p><b>Tap. Collect. Deep dive.</b><br>Think with AI chats, not just read them.</p></div>`);
  await tile.screenshot({ path: ROOT + '/store/promo-tile.png' });
  console.log('tile done');
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
