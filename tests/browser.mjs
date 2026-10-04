import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {chromium}=require('playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
fs.mkdirSync('reports/screenshots',{recursive:true});
const results=[];
async function run(name,executablePath){
 const browser=await chromium.launch({executablePath,headless:true,args:['--disable-gpu','--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1280,height:720}});const page=await context.newPage();const errors=[];const outbound=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4173'))outbound.push(r.url());});
 await page.goto('http://127.0.0.1:4173/?debug');await page.waitForTimeout(700);assert.ok(await page.locator('#start').isVisible());
 await page.screenshot({path:`reports/screenshots/${name}-title.png`});
 await page.click('#start');await page.keyboard.down('KeyD');await page.waitForTimeout(1000);await page.keyboard.up('KeyD');await page.keyboard.down('KeyW');await page.waitForTimeout(500);await page.keyboard.up('KeyW');await page.keyboard.down('KeyE');await page.waitForTimeout(720);await page.keyboard.up('KeyE');
 assert.equal(await page.evaluate(()=>__duck.game.stolen),1);await page.screenshot({path:`reports/screenshots/${name}-play.png`});
 await page.keyboard.press('Escape');const paused=await page.evaluate(()=>__duck.game.elapsed);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>__duck.game.elapsed),paused);
 await page.click('#reduce');assert.equal(await page.evaluate(()=>__duck.game.reduced),true);await page.click('#mute');assert.equal(await page.evaluate(()=>__duck.sound.enabled),false);await page.click('#resume');
 await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));});assert.equal(await page.evaluate(()=>__duck.game.mode),'paused');await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>__duck.controls.held.size),0);await page.click('#resume');
 for(let i=0;i<10;i++){await page.keyboard.press('Escape');await page.click('#restart');const s=await page.evaluate(()=>({h:__duck.game.humans.length,d:__duck.game.ducks.length,stolen:__duck.game.stolen,food:__duck.game.food,cooldown:__duck.game.player.sprintCd}));assert.deepEqual(s,{h:9,d:5,stolen:0,food:0,cooldown:0});}
 // Explicitly staged end-screen tests; the separate input-only integration test covers a natural full round.
 await page.evaluate(()=>{const g=__duck.game;for(let i=0;i<3;i++){g.mode='playing';g.player.protection=0;g.catchPlayer();}});await page.waitForTimeout(150);assert.ok(await page.locator('#again').isVisible());assert.ok((await page.locator('.results').innerText()).includes('今日撤退'));await page.click('#again');
 await page.evaluate(()=>{const g=__duck.game;g.stage=2;g.stolen=5;g.score=1500;g.elapsed=120;g.challenge=true;g.occupation=14.995;g.player.x=1100;g.player.y=800;g.player.protection=1;g.history=[{x:1100,y:800}];g.ducks.forEach((d,i)=>Object.assign(d,{x:1090+i*3,y:780,recruited:true,state:'following',protection:3}));});
 await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>__duck.game.mode),'celebrating');await page.keyboard.press('KeyQ');await page.waitForTimeout(150);assert.ok((await page.locator('.results').innerText()).includes('喷泉归鸭'));assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('duck-revenge-v1')).highScore>0));await page.screenshot({path:`reports/screenshots/${name}-win.png`});
 await page.click('#again');await page.setViewportSize({width:1920,height:1080});await page.waitForTimeout(200);assert.equal(await page.locator('#world').evaluate(c=>c.width),1920);
 await page.screenshot({path:`reports/screenshots/${name}-1920.png`});
 const perf=[];
 for(const [width,height] of [[1280,720],[1920,1080]]){
  await page.setViewportSize({width,height});
  await page.evaluate(()=>{const g=__duck.game;g.reset();g.mischief=100;g.player.x=1960;g.player.y=820;g.player.protection=0;g.history=[{x:1925,y:820}];g.catchPlayer=()=>{};g.humans.forEach((h,i)=>Object.assign(h,{x:1870+i*3,y:790+i*4,active:true,state:'chase',face:{x:1,y:0},path:[],repath:0,curious:100}));g.ducks.forEach((d,i)=>Object.assign(d,{x:1930,y:810+i*4,recruited:true,state:'following',protection:1000}));});
  await page.waitForTimeout(1000);
  perf.push(await page.evaluate(async({width,height})=>{let last=performance.now(),start=last,frames=[];await new Promise(resolve=>{function f(now){frames.push(now-last);last=now;if(now-start>=5000)resolve();else requestAnimationFrame(f);}requestAnimationFrame(f);});frames=frames.slice(1);const sorted=frames.slice().sort((a,b)=>a-b);return {width,height,frames:frames.length,meanFPS:Number((1000/(frames.reduce((a,b)=>a+b)/frames.length)).toFixed(1)),p95FrameMs:Number(sorted[Math.floor(sorted.length*.95)].toFixed(2)),chasers:__duck.game.humans.filter(h=>h.active&&h.state==='chase').length,followers:__duck.game.following};},{width,height}));
 }
 assert.equal(errors.length,0);assert.equal(outbound.length,0);
 const unavailable=await context.newPage();await unavailable.addInitScript(()=>{Object.defineProperty(window,'AudioContext',{value:class{constructor(){throw Error('audio unavailable');}}});Object.defineProperty(window,'localStorage',{get(){throw Error('storage unavailable');}});});const unavailableErrors=[];unavailable.on('pageerror',e=>unavailableErrors.push(e.message));await unavailable.goto('http://127.0.0.1:4173/?debug');await unavailable.click('#start');await unavailable.keyboard.down('KeyD');await unavailable.waitForTimeout(100);await unavailable.keyboard.up('KeyD');assert.equal(await unavailable.evaluate(()=>__duck.game.mode),'playing');assert.equal(unavailableErrors.length,0);
 results.push({browser:name,version:await browser.version(),keyboardHeist:true,pause:true,blur:true,resize:true,settings:true,tenRestarts:true,lossScreen:true,winScreen:true,records:true,storageAndAudioUnavailable:true,errors,outbound,perf});await browser.close();console.log(name,JSON.stringify(results.at(-1)));
}
(async()=>{await run('Chrome','C:/Program Files/Google/Chrome/Application/chrome.exe');await run('Edge','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');fs.writeFileSync('reports/browser-results.json',JSON.stringify(results,null,2));})().catch(e=>{console.error(e);process.exitCode=1});

