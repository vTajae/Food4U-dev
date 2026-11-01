// Genuine /welcome states and baseline-left comparisons; no preview route.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root } from './dashboard-browser.mjs';
import { launchProof, base, welcomeLogin, activate, refs, chooseFirst, closeRefs } from './welcome-browser.mjs';
const output=resolve(root,'internal/sprint/screenshots/rust-008');
const baseline=resolve(root,'internal/sprint/screenshots/nextjs/after');
await mkdir(output,{recursive:true});
const proof=await launchProof('welcome-visual');proof.report.shots=[];proof.report.comparisons=[];
proof.report.fixtureDifferences=['Legacy screenshots used Q avatar. Rust uses genuine D1 fixture login with T avatar.','Both states use real /api/refs ClinicalTables-shaped loopback data for Lactose intolerance E73.9 and Peanut allergy with empty code, then actual keyboard selections. No real NLM requests.','Mono font fallback remains the accepted existing typography difference.'];
async function shot(page, name, viewport, fullPage = true, reference = name) {
  // Do not await networkidle: the loading shot intentionally has an outstanding mock request.
  await page.evaluate(() => document.fonts.ready);
  const metrics = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio, scrollWidth: document.documentElement.scrollWidth, url: location.pathname }));
  proof.check(`${viewport} ${name}: no horizontal overflow`, metrics.scrollWidth <= metrics.width);
  const file = `rust-${name}-${viewport}.png`;
  await page.screenshot({ path: resolve(output, file), fullPage, animations: 'disabled' });
  proof.report.shots.push({ file, name, viewport, reference, metrics });
}
function size(bytes) { assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a'); return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }; }
async function compare() {
  const context = await proof.contextFor({ deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    for (const shot of proof.report.shots) {
      const reference = `next-${shot.reference}-${shot.viewport}.png`;
      const [left, right] = await Promise.all([readFile(resolve(baseline, reference)), readFile(resolve(output, shot.file))]);
      const a = size(left), b = size(right); const width = a.width + b.width, height = Math.max(a.height, b.height) + 32;
      await page.setViewportSize({ width, height });
      await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;background:#dedde3;font:16px/32px Arial,sans-serif}main{display:flex;align-items:flex-start}figure{margin:0;flex:none}figcaption{height:32px;padding:0 12px;background:#23202a;color:white}img{display:block}</style></head><body><main><figure style="width:${a.width}px"><figcaption>Next.js baseline — ${shot.viewport}</figcaption><img width="${a.width}" height="${a.height}" src="data:image/png;base64,${left.toString('base64')}"></figure><figure style="width:${b.width}px"><figcaption>Rust actual ${shot.name} — ${shot.viewport}</figcaption><img width="${b.width}" height="${b.height}" src="data:image/png;base64,${right.toString('base64')}"></figure></main></body></html>`);
      await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
      const file = `compare-${shot.name}-${shot.viewport}.png`;
      await page.screenshot({ path: resolve(output, file), fullPage: true, animations: 'disabled' });
      proof.report.comparisons.push({ file, baseline: reference, rust: shot.file, width, height });
    }
  } finally { await context.close(); }
}
let failure;
try {
 for(const [vp,options] of Object.entries({desktop:{viewport:{width:1440,height:900},deviceScaleFactor:1},mobile:{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}})){
  const context=await proof.contextFor(options);
  try{
   const page=await context.newPage();const user=await welcomeLogin(page);
   await activate(page,'Continue');await activate(page,'Continue');await activate(page,'Continue');
   const search=await refs(page,user,3,'allergy',[{name:'Lactose intolerance',code:'E73.9'},{name:'Peanut allergy',code:''}]);
   await chooseFirst(page);await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await closeRefs(page,search.trigger);
   await page.getByRole('button',{name:'Remove Lactose intolerance (E73.9)',exact:true}).waitFor();await page.getByRole('button',{name:'Remove Peanut allergy',exact:true}).waitFor();
   // Blur only for deterministic baseline visual parity; input selection above remains keyboard driven.
   await page.evaluate(()=>document.activeElement?.blur());
   await shot(page,'10-welcome-step',vp);
   await activate(page,'Continue');await activate(page,'Review');await page.evaluate(()=>document.activeElement?.blur());
   await page.getByRole('heading',{name:"Here's what we'll check against",exact:true}).waitFor();
   await shot(page,'11-welcome-review',vp);
  }finally{await context.close();}
 }
 await compare();
}catch(error){failure=error;}
await proof.finish(failure);
await writeFile(resolve(output,'capture-report.json'),JSON.stringify(proof.report,null,2));
