const { chromium } = require('playwright-core');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const fs = require('fs');
const { execSync } = require('child_process');
const core = fs.readFileSync(ROOT + '/src/assay.core.js', 'utf8');
const iconSvg = fs.readFileSync(ROOT + '/assets/icon.svg', 'utf8');
const FF = process.env.FFMPEG;
const OUT = ROOT + '/marketing';

const mock = (vertical) => `<!doctype html><html><head><meta charset="utf-8"><style>
  main,.cap,.cwrap,.end{zoom:${vertical ? 2 : 1}}
  body{margin:0;font:${vertical ? 20 : 17}px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f3f4f6;color:#111827}
  .cap{position:fixed;top:0;left:0;right:0;z-index:5;background:#111827;color:#f9fafb;font-size:${vertical ? 24 : 22}px;font-weight:700;padding:${vertical ? 22 : 16}px 28px;letter-spacing:.01em;min-height:${vertical ? 96 : 66}px}
  .cap span{color:#38bdf8}
  .cap.low{top:auto;bottom:${vertical ? 200 : 130}px}
  main{max-width:${vertical ? '100%' : '760px'};margin:0 auto;padding:${vertical ? 120 : 92}px 22px 160px}
  .msg{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:18px 22px;margin-bottom:16px}
  .who{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af;margin:0 0 8px}
  .msg p{margin:0 0 14px} .msg p:last-child{margin:0}
  .cwrap{position:fixed;left:0;right:0;bottom:0;padding:10px 22px 14px;background:linear-gradient(transparent,#f3f4f6 30%)}
  [contenteditable]{max-width:${vertical ? '100%' : '760px'};margin:0 auto;background:#fff;border:1px solid #d1d5db;border-radius:16px;min-height:60px;padding:14px 18px;font-size:${vertical ? 17 : 15}px;white-space:pre-wrap;box-shadow:0 2px 10px rgba(0,0,0,.08)}
  .end{position:fixed;inset:0;z-index:9;background:#111827;color:#f9fafb;display:none;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  .end .icon{width:${vertical ? 140 : 110}px;height:${vertical ? 140 : 110}px}
  .end h1{font-size:${vertical ? 64 : 52}px;margin:0;letter-spacing:-.01em}
  .end p{margin:0;font-size:${vertical ? 24 : 20}px;color:#9ca3af} .end p b{color:#38bdf8;font-weight:600}
</style></head><body>
<div class="cap" id="cap">Reading an AI answer is easy. <span>Thinking with it is the hard part.</span></div>
<main>
<div class="msg"><p class="who">You</p>What would a selection-first interface for thinking with AI look like?</div>
<div class="msg" data-message-author-role="assistant"><p class="who">Assistant</p>
<p id="p1">The garbage collector becomes the allocator of life. Creators rarely bear the cost of rejection. The missing primitive is not annotation; it is accumulating several annotations before responding.</p>
<p id="p2">Current interfaces assume the primary human operation is prompting. For serious thinking it may increasingly be selection: this matters, this does not, connect these three, challenge that one.</p></div>
</main>
<div class="cwrap"><div contenteditable="true" id="composer"></div></div>
<div class="end" id="end"><div class="icon">${iconSvg}</div><h1>Assay</h1><p><b>Tap. Collect. Deep dive.</b></p><p>assay.projectnothing.ai</p><p>100% local · open source · a Project Nothing experiment</p></div>
</body></html>`;


const SHADOW_2X = `
.bar{padding:10px 16px;gap:4px}.bar button{font-size:28px;padding:12px 20px}
.notebox{width:calc(100vw - 32px);padding:20px 24px;gap:16px;border-radius:28px}
.notebox input{font-size:30px;padding:18px 20px;border-radius:16px}
.posbtn{font-size:26px;padding:14px 24px}.notebox .add{font-size:28px;padding:16px 32px}
.pill{padding:24px 36px;font-size:30px;gap:16px;right:24px}.pill .n{min-width:48px;height:48px;font-size:26px}
.sheet{border-radius:36px 36px 0 0}.sheet header{padding:28px 32px 16px}.sheet header h2{font-size:34px}
.sheet header .close{font-size:44px;padding:8px 20px}.list{padding:0 28px}
.frag{padding:20px 24px;margin-bottom:20px;border-radius:24px}.frag .top{gap:20px}
.frag .idx{min-width:44px;height:44px;font-size:24px}.frag .txt{font-size:28px}.frag .del{font-size:36px}
.frag .noterow{gap:16px;margin-top:16px}.frag input{font-size:28px;padding:16px 20px;border-radius:16px}
.frag .pos{font-size:24px;padding:14px 20px}.actions{gap:20px;padding:20px 28px 0}
.btn{font-size:30px;padding:26px 20px;border-radius:24px}.btn.minor{font-size:28px;padding:22px 16px}.btn.go{padding:30px 20px}
.toast{font-size:28px;padding:20px 36px;bottom:120px}.empty{font-size:28px}
`;

async function record(vertical) {
  const size = vertical ? { width: 1080, height: 1920 } : { width: 1280, height: 800 };
  const outSize = vertical ? { width: 1080, height: 1920 } : { width: 1280, height: 800 };
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({
    viewport: size,
    recordVideo: { dir: OUT + '/raw', size: outSize }
  });
  const page = await ctx.newPage();
  await page.route('**/*', r => r.fulfill({ contentType: 'text/html', body: mock(vertical) }));
  await page.goto('https://chatgpt.com/c/demo');
  await page.evaluate(core);
  if (vertical) await page.evaluate(css => {
    const st = document.createElement('style'); st.textContent = css;
    document.getElementById('assay-host').shadowRoot.appendChild(st);
  }, SHADOW_2X);
  const cap = (html) => page.evaluate(h => { document.getElementById('cap').innerHTML = h; }, html);
  const btn = (id) => page.evaluate(id => document.getElementById('assay-host').shadowRoot.getElementById(id).click(), id);
  const clickWord = async (pid, word) => {
    const box = await page.evaluate(([pid, word]) => {
      const p = document.getElementById(pid);
      const idx = p.textContent.indexOf(word);
      const r = document.createRange();
      r.setStart(p.firstChild, idx); r.setEnd(p.firstChild, idx + word.length);
      const rc = r.getBoundingClientRect();
      return { x: rc.left + rc.width / 2, y: rc.top + rc.height / 2 };
    }, [pid, word]);
    await page.mouse.move(box.x, box.y);
    await page.mouse.click(box.x, box.y);
  };
  const wait = (ms) => page.waitForTimeout(ms);

  await wait(2200);
  await cap('<span>Tap a word.</span>');
  await clickWord('p1', 'garbage'); await wait(1300);
  await cap('Tap again — <span>the whole sentence.</span>');
  await clickWord('p1', 'garbage'); await wait(1400);
  await cap('<span>＋ Add</span> collects it.');
  await btn('addBtn'); await wait(1500);

  await page.evaluate(() => document.getElementById('cap').classList.add('low'));
  await cap('Annotate as you go — <span>before or after the quote.</span>');
  await clickWord('p1', 'Creators'); await wait(500);
  await clickWord('p1', 'Creators'); await wait(700);
  await btn('noteBtn'); await wait(400);
  await page.keyboard.type('formalize this', { delay: 70 }); await wait(500);
  await btn('noteAdd'); await wait(1400);
  await page.evaluate(() => document.getElementById('cap').classList.remove('low'));

  await cap('Grow the selection <span>across paragraphs</span>, a word at a time.');
  await clickWord('p1', 'missing'); await wait(700);
  await clickWord('p2', 'challenge'); await wait(1600);
  await btn('addBtn'); await wait(1200);

  await cap('Everything you kept, <span>per conversation.</span>');
  await btn('pill'); await wait(2200);

  await cap('One tap sends it back. <span>Your selection is the prompt.</span>');
  await btn('goBtn'); await wait(2600);

  await page.evaluate(() => { document.getElementById('end').style.display = 'flex'; });
  await wait(2800);
  const video = page.video();
  await ctx.close();
  await browser.close();
  return await video.path();
}

async function og() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(`<style>
    body{margin:0;width:1200px;height:630px;background:#111827;display:flex;align-items:center;justify-content:center;gap:56px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
    .icon{width:220px;height:220px;flex:none}
    h1{color:#f9fafb;font-size:96px;margin:0 0 10px;letter-spacing:-.02em}
    p{color:#9ca3af;font-size:32px;margin:0;line-height:1.35;max-width:560px}
    p b{color:#38bdf8;font-weight:600}
  </style><div class="icon">${iconSvg}</div><div><h1>Assay</h1><p><b>Tap. Collect. Deep dive.</b><br>Think with AI chats, not just read them. Nothing leaves your device.</p></div>`);
  await page.screenshot({ path: ROOT + '/site/og.png' });
  await browser.close();
}

(async () => {
  fs.mkdirSync(OUT + '/raw', { recursive: true });
  const v = await record(true);
  const l = await record(false);
  execSync(`"${FF}" -y -loglevel error -i "${v}" -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -movflags +faststart "${OUT}/assay-demo-vertical.mp4"`);
  execSync(`"${FF}" -y -loglevel error -i "${l}" -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -movflags +faststart "${OUT}/assay-demo-landscape.mp4"`);
  fs.copyFileSync(`${OUT}/assay-demo-landscape.mp4`, ROOT + '/site/assay-demo.mp4');
  fs.rmSync(OUT + '/raw', { recursive: true, force: true });
  await og();
  console.log('videos + og done');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
