import { C, distance, norm, clamp, spawn, fountain, safePoints, entrances, lunches, companions, type Vec } from './config.ts';
import { clearLine, move, navigate, type Navigator } from './world.ts';
export type Mode = 'title' | 'playing' | 'paused' | 'recovering' | 'celebrating' | 'won' | 'lost';
export type Input = { x: number; y: number; interact: boolean; ePressed: boolean; sprint: boolean; quack: boolean };
export const noInput = (): Input => ({ x:0,y:0,interact:false,ePressed:false,sprint:false,quack:false });
export type Human = Navigator & { id: number; kind: 'visitor' | 'guard'; state: 'idle' | 'patrol' | 'surprise' | 'chase' | 'investigate' | 'search' | 'return' | 'exit'; home: Vec; last: Vec; timer: number; patrol: number; active: boolean; curious: number; alert: number };
export type Duck = Navigator & { id: number; name: string; accessory: string; quote: string; state: 'waiting' | 'following' | 'fleeing' | 'recall'; recruited: boolean; safe: Vec; protection: number; trail: number };
export type Lunch = Vec & { id: number; cooldown: number };
export type Event = { type: string; text?: string; x?: number; y?: number };
export type Particle = Vec & { vx: number; vy: number; life: number; max: number; color: string; size: number };
export type Interaction = { kind: 'lunch' | 'duck' | 'fountain'; id: number; pos: Vec; text: string };
const navigator = (p: Vec): Navigator => ({...p, path:[], repath:0, face:{x:1,y:0}, moving:false});
export class Game {
  mode: Mode = 'title'; elapsed = 0; anim = 0; score = 0; stolen = 0; feathers = 3; food = 0; mischief = 0; unseen = 0; maxChase = 0;
  player = {...navigator(spawn), sprint:0, sprintCd:0, quackCd:0, protection:3, quackFlash:0};
  humans: Human[] = []; ducks: Duck[] = []; lunches: Lunch[] = [];
  history: Vec[] = []; particles: Particle[] = []; events: Event[] = [];
  stage = 0; challenge = false; occupation = 0; invalidTime = 0; inside = 0; occupationReason = ''; transition = 0;
  stealTarget = -1; stealProgress = 0; interaction: Interaction | null = null;
  notice = ''; noticeTime = 0; tutorial = 0; tutorialTime = 0; usedSprint = false; usedQuack = false; recalled = false;
  reduced = false; debug = false; private oldMode: Mode = 'playing'; private reinforcement = 0;
  constructor() {this.reset('title');}
  reset(mode: Mode = 'playing') {
    this.mode = mode; this.elapsed=0;this.anim=0;this.score=0;this.stolen=0;this.feathers=3;this.food=0;this.mischief=0;this.unseen=0;this.maxChase=0;
    this.player={...navigator(spawn),sprint:0,sprintCd:0,quackCd:0,protection:3,quackFlash:0};
    this.humans = lunches.map((p,id) => ({...navigator({x:p.x,y:p.y-66}),id,kind:'visitor',state:'idle',home:{x:p.x,y:p.y-66},last:{...p},timer:0,patrol:0,active:true,curious:0,alert:0}));
    entrances.forEach((p,i) => this.humans.push({...navigator(p),id:i+6,kind:'guard',state:'patrol',home:{...p},last:{...p},timer:0,patrol:i*2,active:i===0,curious:0,alert:0,repath:i*.17}));
    this.ducks = companions.map((p,id) => ({...navigator(p),id,name:p.name,accessory:p.accessory,quote:p.quote,state:'waiting',recruited:false,safe:{...spawn},protection:0,trail:0}));
    this.lunches=lunches.map((p,id)=>({...p,id,cooldown:0})); this.history=[{...spawn}]; this.particles=[];this.events=[];
    this.stage=0;this.challenge=false;this.occupation=0;this.invalidTime=0;this.inside=0;this.transition=0;this.occupationReason='';
    this.stealTarget=-1;this.stealProgress=0;this.interaction=null;this.notice='';this.noticeTime=0;this.tutorial=0;this.tutorialTime=0;this.usedSprint=false;this.usedQuack=false;this.recalled=false;this.reinforcement=0;
    if(mode==='playing') this.say('午餐行动开始。先去右上方的长椅看看。');
  }
  get recruited() {return this.ducks.filter(d=>d.recruited).length;}
  get following() {return this.ducks.filter(d=>d.state==='following').length;}
  get desiredGuards() {return this.mischief>=60?3:this.mischief>=30?2:1;}
  say(text: string, type = 'message') {this.notice=text;this.noticeTime=4;this.events.push({type,text,x:this.player.x,y:this.player.y});}
  burst(p: Vec, color: string, count = 10) {
    if(this.reduced) return;
    for(let i=0;i<count;i++){const angle=i/count*Math.PI*2+this.anim;this.particles.push({...p,vx:Math.cos(angle)*(25+i*3),vy:Math.sin(angle)*(25+i*3)-20,life:.6,max:.6,color,size:3+i%3});}
  }
  pause() {if(this.mode==='playing'||this.mode==='recovering'){this.oldMode=this.mode;this.mode='paused';this.cancelSteal();}}
  resume() {if(this.mode==='paused') this.mode=this.oldMode;}
  cancelSteal() {this.stealTarget=-1;this.stealProgress=0;}
  findInteraction(): Interaction | null {
    const choices: Interaction[]=[];
    for(const l of this.lunches) if(l.cooldown<=0&&distance(this.player,l)<=C.interactRadius) choices.push({kind:'lunch',id:l.id,pos:l,text:this.food>=C.capacity?'背包满了 · 先去喂伙伴':'按住 E  偷午餐'});
    for(const d of this.ducks) if(!d.recruited&&distance(this.player,d)<=C.interactRadius) choices.push({kind:'duck',id:d.id,pos:d,text:this.food>0?`E  喂食${d.name} · 1 份午餐`:`${d.name}饿了 · 需要一份午餐`});
    if(this.stage===2&&!this.challenge&&distance(this.player,fountain)<C.occupationRadius) choices.push({kind:'fountain',id:0,pos:{...this.player},text:this.countInside()>=3?'E  开始喷泉行动':`带队往浅水区深处走 · 场内 ${this.countInside()} / 3`});
    return choices.sort((a,b)=>distance(a.pos,this.player)-distance(b.pos,this.player))[0]??null;
  }
  recruit(id: number) {
    const d=this.ducks[id]; if(!d||d.recruited||this.food<1) return;
    d.recruited=true;d.state='following';d.protection=3;d.repath=0;this.food--;this.score+=200;
    this.say(`${d.name}：${d.quote}`,'join');this.burst(d,'#ffd96b',18);this.advanceStage();
  }
  steal(id: number) {
    const l=this.lunches[id];if(!l||l.cooldown>0||this.food>=C.capacity) return;
    this.food++;this.stolen++;this.score+=100;this.mischief=clamp(this.mischief+20,0,100);l.cooldown=C.restockTime;
    const h=this.humans[id];h.state='surprise';h.timer=C.surpriseTime;h.last={...this.player};h.repath=0;h.face=norm(this.player.x-h.x,this.player.y-h.y);
    this.say('午餐 +1！主人反应过来了，快跑！','steal');this.burst(l,'#ffbf68',15);this.advanceStage();
  }
  advanceStage() {
    if(this.stage===0&&this.stolen>=3){this.stage=1;this.events.push({type:'stage'});}
    if(this.stage===1&&this.recruited===5){this.stage=2;this.say('全员集结！带至少三只伙伴夺回中央喷泉。','stage');}
  }
  quack() {
    if(this.player.quackCd>0) return;
    this.player.quackCd=C.quackCooldown;this.player.quackFlash=.65;this.usedQuack=true;let heard=false, recalled=0;
    for(const h of this.humans) if(h.active&&distance(h,this.player)<=C.quackRadius) {
      heard=true; if(h.state!=='chase'&&h.state!=='surprise') {h.state='investigate';h.timer=0;h.last={x:this.player.x,y:this.player.y};h.curious=16;h.repath=0;h.alert=1;}
    }
    if(heard) this.mischief=clamp(this.mischief+8,0,100);
    for(const d of this.ducks) if(d.state==='recall'&&distance(d,this.player)<=C.quackRadius) {d.state='following';d.protection=C.protection;d.repath=0;recalled++;}
    if(recalled){this.recalled=true;this.say(`嘎！${recalled} 只伙伴重新加入队伍。`);}
    this.events.push({type:'quack'});this.burst(this.player,'#ffffff',8);
  }
  canSee(h: Human) {
    const d=distance(h,this.player);if(d>C.sightRange||!clearLine(h,this.player))return false;
    if(d<=C.rearSight) return true;
    const v=norm(this.player.x-h.x,this.player.y-h.y);return v.x*h.face.x+v.y*h.face.y>=Math.cos(C.fieldOfView/2);
  }
  updateHumans(dt: number) {
    let seen=false, chased=0; const patrols=[{x:2130,y:750},{x:1830,y:540},{x:1200,y:400},{x:630,y:780},{x:430,y:950},{x:1190,y:1150},{x:1830,y:920}];
    for(const h of this.humans) {
      if(!h.active)continue;
      h.alert=Math.max(0,h.alert-dt);h.curious=Math.max(0,h.curious-dt);
      const visible=this.canSee(h);if(visible)seen=true;
      const aware=h.kind==='guard'||h.state==='chase'||h.state==='investigate'||h.state==='search'||h.curious>0;
      if(h.state==='surprise') {h.timer-=dt;h.moving=false;if(h.timer<=0){h.state='chase';h.repath=0;h.curious=18;}continue;}
      if(visible&&aware&&this.player.protection<=0&&h.state!=='exit') {
        if(h.state!=='chase'){h.alert=1;this.events.push({type:'whistle',x:h.x,y:h.y});}
        h.state='chase';h.timer=0;h.last={x:this.player.x,y:this.player.y};h.curious=10;
        if(h.kind==='guard') for(const other of this.humans) if(other.active&&other.kind==='guard'&&other.id!==h.id&&(other.state==='patrol'||other.state==='return')&&distance(other,h)<600) {other.state='investigate';other.last={...h.last};other.repath=0;}
      } else if(h.state==='chase') {h.state='investigate';h.repath=0;}
      let target: Vec | null=null, speed=h.kind==='guard'?C.guardSpeed:C.visitorSpeed;
      if(this.player.protection>0&&distance(h,spawn)<320&&h.state!=='idle') {target={x:700,y:820};h.state='return';}
      else switch(h.state) {
        case 'chase': target=h.last;chased++;break;
        case 'investigate': target=h.last;h.timer+=dt;if(distance(h,h.last)<22||h.timer>12){h.state='search';h.timer=C.searchTime;}break;
        case 'search': h.timer-=dt;h.face={x:Math.cos(h.timer*1.8),y:Math.sin(h.timer*1.8)};if(h.timer<=0){h.state='return';h.repath=0;}break;
        case 'return': target=h.home;speed*=.8;if(distance(h,h.home)<18){h.state=h.kind==='guard'?'patrol':'idle';h.repath=0;}break;
        case 'patrol': target=patrols[h.patrol%patrols.length];speed*=.66;if(this.challenge) {h.state='investigate';h.last={...fountain};h.repath=0;}else if(distance(h,target)<30){h.patrol++;h.repath=0;}break;
        case 'exit':target=h.home;speed*=.85;if(distance(h,h.home)<24)h.active=false;break;
      }
      if(target) navigate(h,target,speed,C.humanRadius,dt,h.id);else h.moving=false;
      for(const other of this.humans) if(other.active&&other.id<h.id) {
        const d=distance(h,other);if(d>0&&d<47){const v=norm(h.x-other.x,h.y-other.y);move(h,v.x*22*dt,v.y*22*dt,C.humanRadius);}
      }
    }
    this.maxChase=Math.max(this.maxChase,chased);this.unseen=seen?0:this.unseen+dt;
    if(this.unseen>C.decayDelay) this.mischief=Math.max(this.challenge?60:0,this.mischief-C.decayRate*dt);
    if(this.challenge)this.mischief=Math.max(60,this.mischief);
    this.reinforcement-=dt;
    const guards=this.humans.filter(h=>h.kind==='guard');
    for(let i=0;i<guards.length;i++) {
      const h=guards[i];
      if(i<this.desiredGuards&&!h.active&&this.reinforcement<=0){h.active=true;h.x=h.home.x;h.y=h.home.y;h.state=this.challenge?'investigate':'patrol';h.last={...fountain};h.path=[];h.repath=0;this.reinforcement=1.5;this.say(`保安增援正从${i===1?'北':i===2?'西':'东'}侧入口进入。`,'reinforce');}
      if(i<this.desiredGuards&&h.active&&h.state==='exit')h.state='patrol';
      if(i>=this.desiredGuards&&h.active&&['patrol','return'].includes(h.state)) {h.state='exit';h.repath=0;}
    }
  }
  updateDucks(dt: number) {
    let rank=0;
    for(const d of this.ducks) {
      d.protection=Math.max(0,d.protection-dt);d.moving=false;
      if(d.state==='following') {
        const lag=34+rank++*27;let walked=0,goal=this.history[0]??this.player;
        for(let i=1;i<this.history.length;i++){walked+=distance(this.history[i-1],this.history[i]);goal=this.history[i];if(walked>=lag)break;}
        const dist=distance(d,goal);
        if(dist>9)navigate(d,goal,dist>125?C.duckCatchup:C.duckSpeed,C.duckRadius,dt,d.id);
        if(d.protection<=0)for(const h of this.humans)if(h.active&&distance(d,h)<C.duckRadius+C.humanRadius-3&&clearLine(d,h)) {this.scare(d);break;}
      } else if(d.state==='fleeing') {navigate(d,d.safe,C.duckCatchup,C.duckRadius,dt,d.id);if(distance(d,d.safe)<24){d.state='recall';d.moving=false;}}
    }
  }
  scare(d: Duck) {if(d.state!=='following')return;d.state='fleeing';d.safe={...safePoints.reduce((best,p)=>distance(d,p)<distance(d,best)?p:best,safePoints[0])};d.path=[];d.repath=0;this.say(`${d.name}受惊了！到小鸭集合点附近按 Q 召回。`,'scared');this.burst(d,'#e5f0ff',10);}
  countInside() {return this.ducks.filter(d=>d.state==='following'&&distance(d,fountain)<=C.occupationRadius).length;}
  startChallenge() {
    if(this.stage!==2||this.challenge||distance(this.player,fountain)>C.occupationRadius||this.countInside()<3)return;
    this.challenge=true;this.occupation=0;this.invalidTime=0;this.mischief=Math.max(60,this.mischief);
    for(const h of this.humans)if(h.kind==='guard'&&h.active&&h.state!=='chase'){h.state='investigate';h.last={...fountain};h.repath=0;}
    this.say('喷泉行动开始！带好伙伴，绕着雕塑跑！','challenge');
  }
  updateOccupation(dt: number) {
    this.inside=this.countInside();if(!this.challenge)return;
    const playerInside=distance(this.player,fountain)<=C.occupationRadius;
    if(playerInside&&this.inside>=3) {this.occupation+=dt;this.invalidTime=0;this.occupationReason='保持队形，喷泉正在归鸭！';}
    else {const before=this.invalidTime;this.invalidTime+=dt;const decay=Math.max(0,this.invalidTime-C.occupationGrace)-Math.max(0,before-C.occupationGrace);this.occupation=Math.max(0,this.occupation-decay);this.occupationReason=!playerInside?'回到喷泉区域继续占领':`伙伴不足 · 场内 ${this.inside} / 3（集合点按 Q 召回）`;}
    if(this.occupation>=C.occupationTime)this.win();
  }
  catchPlayer() {
    if(this.mode!=='playing'||this.player.protection>0)return;
    this.feathers--;this.food=0;this.challenge=false;this.occupation=0;this.invalidTime=0;this.cancelSteal();
    if(this.feathers<=0){this.mode='lost';this.events.push({type:'lose'});return;}
    this.mode='recovering';this.transition=1.8;this.mischief=0;this.unseen=0;
    Object.assign(this.player,navigator(spawn),{protection:C.protection,sprint:0,sprintCd:0,quackCd:0,quackFlash:0});
    this.history=[{...spawn}];
    this.ducks.filter(d=>d.recruited).forEach((d,i)=>{Object.assign(d,navigator({x:spawn.x-34-i%3*30,y:spawn.y+Math.floor(i/3)*32}),{state:'following',protection:3});});
    for(const h of this.humans){h.state=h.kind==='guard'?'patrol':'return';h.timer=0;h.curious=0;h.path=[];h.repath=h.id*.06;h.last={...h.home};if(h.kind==='guard'){h.x=h.home.x;h.y=h.home.y;h.active=h.id===6;}else if(distance(h,spawn)<340){h.x=h.home.x;h.y=h.home.y;}}
    this.particles=[];this.say('被请回池塘了。任务进度保留，伙伴已经集合。','caught');
  }
  win() {if(this.mode!=='playing')return;this.mode='celebrating';this.transition=3;this.occupation=C.occupationTime;this.score+=1000+this.feathers*200+Math.max(0,600-Math.floor(this.elapsed));this.say('喷泉归鸭！','win');this.burst(fountain,'#f7c957',80);}
  tick(dt: number, input: Input) {
    if(this.mode==='paused'||this.mode==='won'||this.mode==='lost')return;
    this.anim+=dt;
    if(this.mode==='title')return;
    if(this.mode==='recovering'){this.transition-=dt;if(this.transition<=0)this.mode='playing';return;}
    this.noticeTime=Math.max(0,this.noticeTime-dt);
    this.particles=this.particles.filter(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=70*dt;return p.life>0;});
    if(this.mode==='celebrating'){this.transition-=dt;if(this.transition<=0||input.ePressed||input.quack||input.sprint)this.mode='won';return;}
    this.elapsed+=dt;this.tutorialTime+=dt;
    const p=this.player;for(const k of ['sprintCd','quackCd','protection','quackFlash'] as const)p[k]=Math.max(0,p[k]-dt);
    for(const l of this.lunches)l.cooldown=Math.max(0,l.cooldown-dt);
    const direction=norm(input.x,input.y);const moving=!!(direction.x||direction.y);
    if(moving)p.face=direction;
    if(input.sprint&&p.sprintCd<=0){p.sprint=C.sprintTime;p.sprintCd=C.sprintCooldown;this.usedSprint=true;this.events.push({type:'sprint'});this.burst(p,'#fff6d9',9);}
    const dir=p.sprint>0?p.face:direction,speed=p.sprint>0?C.sprintSpeed:C.playerSpeed;
    p.moving=moving||p.sprint>0;
    move(p,dir.x*speed*dt,dir.y*speed*dt,C.playerRadius);p.sprint=Math.max(0,p.sprint-dt);
    if(p.moving&&!this.reduced&&Math.floor(this.anim*10)!==Math.floor((this.anim-dt)*10)){
      const water=(p.x>992&&p.x<1408&&p.y>602&&p.y<998)||((p.x-337)/200)**2+((p.y-1297)/150)**2<1;
      this.particles.push({x:p.x-dir.x*12,y:p.y+6,vx:-dir.x*18,vy:-12,life:.32,max:.32,color:water?'#e9fff0':'#f7edcf',size:water?4:3});
    }
    if(distance(p,this.history[0])>=7)this.history.unshift({x:p.x,y:p.y});if(this.history.length>1800)this.history.length=1800;
    if(input.quack)this.quack();
    this.interaction=this.findInteraction();
    if(this.stealTarget>=0){const l=this.lunches[this.stealTarget];if(!input.interact||moving||p.sprint>0||distance(p,l)>C.interactRadius||this.food>=C.capacity)this.cancelSteal();else {this.stealProgress+=dt;if(this.stealProgress+1e-8>=C.stealTime){this.steal(this.stealTarget);this.cancelSteal();}}}
    else if(input.interact&&!moving&&p.sprint<=0&&this.interaction?.kind==='lunch'&&this.food<C.capacity){this.stealTarget=this.interaction.id;this.stealProgress=dt;}
    else if(input.ePressed&&this.interaction){if(this.interaction.kind==='duck')this.recruit(this.interaction.id);if(this.interaction.kind==='fountain')this.startChallenge();}
    this.updateHumans(dt);this.updateDucks(dt);
    // Capture takes precedence over occupation in the same fixed update.
    if(p.protection<=0)for(const h of this.humans)if(h.active&&h.state!=='surprise'&&distance(p,h)<C.playerRadius+C.humanRadius-3&&clearLine(p,h)){this.catchPlayer();return;}
    this.advanceStage();this.updateOccupation(dt);this.updateTutorial();
  }
  updateTutorial() {
    if(this.tutorial===0&&distance(this.player,spawn)>65)this.tutorial=1;
    if(this.tutorial===1&&this.stolen>0)this.tutorial=2;
    if(this.tutorial===2&&this.usedSprint)this.tutorial=3;
    if(this.tutorial===3&&this.recruited>0)this.tutorial=4;
    if(this.tutorial===4&&this.usedQuack)this.tutorial=5;
  }
  get tutorialText() {return ['WASD / 方向键移动 · 去右上方的长椅','靠近午餐，停下来按住 E 0.6 秒','主人追来了！空格冲刺 · 有小鸭标记的缺口能帮你脱身','带着午餐靠近小鸭，按 E 邀请第一位伙伴','Q 嘎嘎叫 · 吸引人类，也能召回集合点附近的伙伴',''][this.tutorial];}
  goal(): { pos: Vec; label: string } | null {
    const missing=this.ducks.filter(d=>d.recruited&&d.state==='recall');
    if((this.stage===2&&this.following<3)||this.challenge&&this.inside<3){const d=missing.sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0];if(d)return {pos:d,label:`Q 召回${d.name}`};}
    if(this.stage===2)return {pos:fountain,label:'夺回喷泉'};
    const waiting=this.ducks.filter(d=>!d.recruited);
    if(this.food>0&&waiting.length){const d=waiting.sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0];return {pos:d,label:`招募${d.name}`};}
    const l=this.lunches.filter(l=>l.cooldown<=0).sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0];return l?{pos:l,label:'午餐在这里'}:null;
  }
}
