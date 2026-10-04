import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const results=[];
for(const [browserName,executablePath] of [['Chrome','C:/Program Files/Google/Chrome/Application/chrome.exe'],['Edge','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']]){
 const browser=await chromium.launch({executablePath,headless:true,args:['--disable-gpu','--no-sandbox']});
 for(const [width,height] of [[1280,720],[1920,1080]]){
  const page=await browser.newPage({viewport:{width,height}});
  await page.goto('http://127.0.0.1:4173/?debug');await page.click('#start');
  await page.evaluate(()=>{
   const g=__duck.game;g.mischief=100;g.player.x=2050;g.player.y=810;g.player.protection=0;g.history=[{x:1990,y:800},{x:1960,y:790}];
   g.catchPlayer=()=>{};
   g.humans.forEach((h,i)=>Object.assign(h,{x:1970+i*2,y:790+i*3,active:true,state:'chase',face:{x:1,y:0},path:[],repath:i*.03,curious:100}));
   g.ducks.forEach((d,i)=>Object.assign(d,{x:1980,y:810+i*4,recruited:true,state:'following',protection:1000}));
   const original=g.tick.bind(g);
   g.tick=(dt,input)=>{const angle=g.elapsed*1.5;const tx=1950+100*Math.cos(angle),ty=810+100*Math.sin(angle);original(dt,{...input,x:tx-g.player.x,y:ty-g.player.y});};
  });
  await page.waitForTimeout(1800);
  const result=await page.evaluate(async()=>{
   let last=performance.now(),start=last;const frames=[];let minChase=9,minFollowers=5;
   await new Promise(resolve=>{function f(now){frames.push(now-last);last=now;minChase=Math.min(minChase,__duck.game.humans.filter(h=>h.active&&h.state==='chase').length);minFollowers=Math.min(minFollowers,__duck.game.following);if(now-start>=5000)resolve();else requestAnimationFrame(f);}requestAnimationFrame(f);});
   frames.shift();const sorted=frames.slice().sort((a,b)=>a-b);
   return {meanFPS:Number((1000/(frames.reduce((a,b)=>a+b)/frames.length)).toFixed(1)),p95FrameMs:Number(sorted[Math.floor(sorted.length*.95)].toFixed(2)),minChase,minFollowers,endPlayer:{x:__duck.game.player.x,y:__duck.game.player.y},frames:frames.length};
  });
  results.push({browser:browserName,version:await browser.version(),width,height,...result});await page.close();
 }
 await browser.close();
}
mkdirSync('reports',{recursive:true});writeFileSync('reports/performance-moving.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
