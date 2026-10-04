import './style.css';
import { Game } from './game.ts';
import { C } from './config.ts';
import { Controls } from './input.ts';
import { Renderer } from './render.ts';
import { Sound } from './audio.ts';
import { readSave, writeSave } from './storage.ts';
const duckIcon=`<svg viewBox="0 0 44 38" fill="none" aria-hidden="true"><path d="M7 20C-1 9 5 10 13 16c0-14 20-16 21-3l8 4-10 4c-1 16-28 19-29 4Z" fill="currentColor"/><circle cx="27" cy="11" r="2" fill="#255345"/></svg>`;
const featherIcon=`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 20 16 7M7 16C1 4 22-3 20 5c1 8-5 15-13 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="m9 12 6 0" stroke="currentColor" stroke-width="2"/></svg>`;
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<canvas id="world" aria-label="一只鸭子的复仇：公园游戏场景"></canvas>
<div id="title" class="title-screen">
  <header class="masthead"><a class="brand" href="#" aria-label="一只鸭子的复仇">${duckIcon}<span>嘎嘎公园<span class="brand-en">QUACK PARK</span></span></a><div class="edition">公 园 奇 遇 系 列 <span>NO. 001</span></div><button id="title-sound" class="small-button"></button></header>
  <section class="hero"><div class="eyebrow"><span></span> 一场有组织的嘎嘎行动</div><h1>一只鸭子的<br><em>复仇</em><span class="title-period">。</span></h1><p class="intro">昨天，他们把你赶出了喷泉。<br>今天，你带了朋友。</p><button id="start" class="primary">开始复仇 <span>↗</span></button><div class="start-note">一只小鸭 · 五位伙伴 · 一整个不太平的公园</div><div id="record" class="record"></div></section>
  <div class="scene-note"><span class="tiny-label">目的地 / DESTINATION</span><strong>市民喷泉</strong><span>很快，就要改名了。</span><svg viewBox="0 0 100 65"><path d="M5 6Q90-5 76 47m-12-8 12 12 12-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
  <footer class="title-footer"><div class="controls-line"><span><kbd>W A S D</kbd> 移动</span><span><kbd>空格</kbd> 冲刺</span><span><kbd>E</kbd> 互动</span><span><kbd>Q</kbd> 嘎嘎叫</span><span><kbd>Esc</kbd> 暂停</span></div><span class="footer-tag">偷午餐，交朋友，夺回喷泉。</span></footer>
</div>
<div id="hud" hidden>
  <div class="mission card"><div class="tiny-label" id="stage-label">行动 01 / 03</div><div class="mission-title" id="mission-title"></div><div id="mission-desc"></div><div class="mission-dots" id="mission-dots"></div><div class="flock-line"><span class="mini-duck">${duckIcon}</span><span id="flock"></span></div></div>
  <div class="heat card"><div><span class="heat-dot"></span><strong id="heat-name"></strong><span id="heat-number"></span></div><div class="meter"><i id="heat-bar"></i></div><small id="guard-count"></small></div>
  <div class="resources card"><div class="score"><span class="tiny-label">今日战绩</span><strong id="score">0</strong></div><div class="resource-row"><span><span class="food-icon">▱</span> 午餐 <b id="food"></b></span><span class="feathers" id="feathers"></span></div><button id="pause-button" aria-label="暂停游戏">Ⅱ</button></div>
  <div id="occupation" class="occupation card" hidden><div><strong>喷泉政变</strong><span id="inside"></span></div><div class="meter"><i id="occupation-bar"></i></div><p id="occupation-status"></p></div>
  <div id="toast" class="toast" role="status"></div><div id="tutorial" class="tutorial"></div>
  <div class="action-dock card"><div class="action"><kbd>空格</kbd><span><b>冲刺</b><small id="sprint-label"></small></span><div class="cooldown"><i id="sprint-bar"></i></div></div><div class="action"><kbd>Q</kbd><span><b>嘎嘎叫</b><small id="quack-label"></small></span><div class="cooldown"><i id="quack-bar"></i></div></div><div class="action interaction-key"><kbd>E</kbd><span><b>互动</b><small>偷取时按住</small></span></div></div>
  <div class="map-caption"><span id="region">西南池塘</span><small>公园今日不太平</small></div><div class="clock" id="clock"></div>
</div>
<div id="modal" class="modal" hidden></div><div id="recovery" class="recovery" hidden><div>${duckIcon}<h2>回池塘，整顿一下。</h2><p>少一根羽毛，多一点经验。伙伴和任务进度都在。</p></div></div>
<div class="small-window">建议将窗口放大至 1280 × 720 或以上，使用电脑键盘游玩。</div>`;
const $=(id:string)=>document.getElementById(id)!;
const game=new Game(),renderer=new Renderer($('world') as HTMLCanvasElement),sound=new Sound();
const save=readSave();game.reduced=save.reduced;sound.enabled=save.sound;let lastMode=game.mode,recorded=false,newRecord=false;let accumulator=0,last=performance.now(),uiTimer=0;
const time=(v:number)=>`${Math.floor(v/60).toString().padStart(2,'0')}:${Math.floor(v%60).toString().padStart(2,'0')}`;
function persistSettings(){save.sound=sound.enabled;save.reduced=game.reduced;writeSave(save);document.body.classList.toggle('reduced',game.reduced);$('title-sound').textContent=sound.enabled?'♪ 声音开启':'♪ 声音关闭';}
function recordText(){$('record').textContent=save.highScore?`公园传说：${save.highScore.toLocaleString()} 分 · 最快 ${time(save.bestTime??0)}`:'第一场复仇，等你开场。';}
persistSettings();recordText();
function start(){sound.unlock();sound.reset();game.reset();controls.clear();recorded=false;newRecord=false;renderer.camera={x:game.player.x,y:game.player.y};accumulator=0;showMode();}
function back(){game.reset('title');sound.reset();controls.clear();recordText();showMode();}
function toggleSound(){sound.setEnabled(!sound.enabled);if(sound.enabled)sound.unlock();persistSettings();}
function pause(){if(game.mode==='playing'||game.mode==='recovering'){game.pause();sound.reset();showMode();}}
const controls=new Controls(()=>{if(game.mode==='paused'&&!document.hidden){game.resume();controls.clear();showMode();}else pause();},()=>game.debug=!game.debug,pause);
// Blur always pauses; it must never resume a game that was already paused.
window.addEventListener('blur',pause);
$('start').onclick=start;$('title-sound').onclick=toggleSound;$('pause-button').onclick=pause;
document.querySelector('.brand')!.addEventListener('click',e=>e.preventDefault());
function showMode(){
  $('title').hidden=game.mode!=='title';$('hud').hidden=game.mode==='title';$('recovery').hidden=game.mode!=='recovering';
  $('modal').hidden=!['paused','won','lost'].includes(game.mode);
  if(game.mode==='paused'){
    $('modal').innerHTML=`<section class="menu-card"><div class="menu-duck">${duckIcon}</div><div class="eyebrow centered">嘎嘎行动 · 暂停中</div><h2>歇一会儿，<br>再去捣蛋。</h2><p>公园的时间也为你停下了。</p><button id="resume" class="primary">继续行动 <span>→</span></button><div class="settings"><label>游戏声音<button id="mute" class="toggle ${sound.enabled?'on':''}">${sound.enabled?'开启':'关闭'}</button></label><label>减少动态效果<button id="reduce" class="toggle ${game.reduced?'on':''}">${game.reduced?'开启':'关闭'}</button></label></div><div class="menu-links"><button id="restart">重新开始</button><button id="home">返回标题</button></div></section>`;
    $('resume').onclick=()=>{controls.clear();game.resume();sound.unlock();showMode();};$('mute').onclick=()=>{toggleSound();showMode();};$('reduce').onclick=()=>{game.reduced=!game.reduced;persistSettings();showMode();};$('restart').onclick=start;$('home').onclick=back;
  }
  if(game.mode==='won'||game.mode==='lost'){
    const won=game.mode==='won';
    if(won&&!recorded){newRecord=game.score>save.highScore;save.highScore=Math.max(save.highScore,game.score);save.bestTime=Math.min(save.bestTime??Infinity,game.elapsed);writeSave(save);recorded=true;}
    $('modal').innerHTML=`<section class="menu-card results"><div class="menu-duck">${duckIcon}</div><div class="eyebrow centered">${won?'市民喷泉正式更名为小鸭喷泉':'这次只是战略撤退'}</div><h2>${won?'喷泉归鸭！':'今日撤退，<br>明日再嘎。'}</h2><div class="result-score">${game.score.toLocaleString()}<span>本局总分</span></div>${newRecord?'<div class="record-badge">新的最高通关纪录</div>':''}<div class="stats"><span>游戏时间<b>${time(game.elapsed)}</b></span><span>偷取午餐<b>${game.stolen} 份</b></span><span>已招募伙伴<b>${game.recruited} / 5</b></span><span>最多同时追逐<b>${game.maxChase} 人</b></span></div><p>${won?'你们夺回的不只是喷泉，还有午餐自由。':'任务清零，勇气不减。公园见。'}</p><button id="again" class="primary">再来一局 <span>↗</span></button><button id="result-home" class="text-button">返回标题</button></section>`;
    $('again').onclick=start;$('result-home').onclick=back;
  }
  lastMode=game.mode;
}
function updateUI(){
  if(lastMode!==game.mode)showMode();if(game.mode==='title')return;
  $('stage-label').textContent=`行动 0${game.stage+1} / 03`;
  $('mission-title').textContent=['午餐行动','集结鸭群','喷泉政变'][game.stage];
  $('mission-desc').textContent=[`成功偷取午餐 ${Math.min(3,game.stolen)} / 3`,`招募五位伙伴 ${game.recruited} / 5`,'带至少三只伙伴夺回喷泉'][game.stage];
  $('mission-dots').innerHTML=Array.from({length:game.stage===0?3:5},(_,i)=>`<i class="${i<(game.stage===0?game.stolen:game.recruited)?'filled':''}"></i>`).join('');
  $('flock').textContent=`跟随 ${game.following} / 已招募 ${game.recruited}`;
  $('score').textContent=game.score.toLocaleString();$('food').textContent=`${game.food} / 3`;
  $('feathers').innerHTML=Array.from({length:3},(_,i)=>`<i class="${i<game.feathers?'':'empty'}">${featherIcon}</i>`).join('');
  $('heat-name').textContent=game.mischief>=60?'全园追鸭':game.mischief>=30?'公园通报':'有点可疑';$('heat-number').textContent=`${Math.floor(game.mischief)} / 100`;
  $('heat-bar').style.width=`${game.mischief}%`;$('heat-bar').style.background=game.mischief>=60?'#ce6550':game.mischief>=30?'#d9954c':'#9dae71';
  $('guard-count').textContent=`保安 ${game.humans.filter(h=>h.kind==='guard'&&h.active).length} 人 · ${game.player.protection>0?'抓捕保护中':game.unseen>5?'暂时安全，捣蛋值下降':'躲进遮挡后可以脱身'}`;
  $('occupation').hidden=game.stage!==2;
  $('inside').textContent=`场内伙伴 ${game.countInside()} / 3`;$('occupation-bar').style.width=`${game.occupation/C.occupationTime*100}%`;
  $('occupation-status').textContent=game.challenge?`${game.occupation.toFixed(1)} / 15 秒 · ${game.occupationReason}`:'带队走进浅水区深处，满三只后按 E 开始';
  $('toast').textContent=game.notice;$('toast').classList.toggle('visible',game.noticeTime>0);
  $('tutorial').textContent=game.tutorialText;$('tutorial').hidden=!game.tutorialText;
  for(const [name,value,total] of [['sprint',game.player.sprintCd,C.sprintCooldown],['quack',game.player.quackCd,C.quackCooldown]] as [string,number,number][]){$(name+'-label').textContent=value>0?`${value.toFixed(1)} 秒`:'准备好了';$(name+'-bar').style.width=`${(1-value/total)*100}%`;}
  $('clock').textContent=time(game.elapsed);
  const p=game.player;$('region').textContent=distanceToFountain(p.x,p.y)<310?'中央喷泉':p.x<1100?(p.y>850?'西南池塘':'西北草坪'):(p.y>850?'东南花园':'餐车广场');
}
function distanceToFountain(x:number,y:number){return Math.hypot(x-1200,y-800);}
function frame(now:number){
  const dt=Math.min(.1,(now-last)/1000);last=now;accumulator+=dt;
  while(accumulator>=C.step){game.tick(C.step,controls.sample());accumulator-=C.step;}
  for(const event of game.events)sound.effect(event.type);game.events.length=0;
  sound.update(dt,game.mode==='playing',game.challenge);renderer.draw(game,dt);uiTimer+=dt;if(uiTimer>.08||lastMode!==game.mode){updateUI();uiTimer=0;}
  requestAnimationFrame(frame);
}
showMode();requestAnimationFrame(frame);
// Local diagnostic access only when explicitly enabled in the URL. No network API.
if(new URLSearchParams(location.search).has('debug')){
  Object.assign(window,{__duck:{game,renderer,controls,sound,save,start,showMode,updateUI}});
}
