import { C, clamp, distance, fountain, safePoints, type Vec } from './config.ts';
import { Game, type Duck, type Human } from './game.ts';
import { obstacles, gaps } from './world.ts';
const TAU=Math.PI*2;
export class Renderer {
  ctx: CanvasRenderingContext2D; width=1280;height=720;dpr=1;camera:Vec={x:360,y:1260};zoom=1;fps=60;
  map: HTMLCanvasElement; private elapsed=0; private celebration=false; private lessMotion=false;
  constructor(public canvas: HTMLCanvasElement) {this.ctx=canvas.getContext('2d')!;this.map=document.createElement('canvas');this.map.width=C.width;this.map.height=C.height;this.makeMap();this.resize();window.addEventListener('resize',()=>this.resize());}
  resize(){this.width=window.innerWidth;this.height=window.innerHeight;this.dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=this.width*this.dpr;this.canvas.height=this.height*this.dpr;}
  round(c: CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,fill:string,stroke?:string){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
  ellipse(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
  label(c:CanvasRenderingContext2D,text:string,x:number,y:number,size=17,color='#527858'){c.font=`700 ${size}px "Microsoft YaHei", sans-serif`;c.textAlign='center';c.fillStyle=color;c.fillText(text,x,y);}
  makeMap(){
    const c=this.map.getContext('2d')!;c.fillStyle='#a4c48b';c.fillRect(0,0,C.width,C.height);
    for(let i=0;i<650;i++){const x=(i*173.7)%C.width,y=(i*317.9)%C.height;this.ellipse(c,x,y,1.3+i%3,.8,'#91b77b');}
    // Broad looping park paths and radial approaches.
    const road=(points:number[][],w:number)=>{c.lineJoin='round';c.lineCap='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle='#cfcc9e';c.lineWidth=w+10;c.stroke();c.strokeStyle='#f0e3bc';c.lineWidth=w;c.stroke();};
    road([[330,1220],[300,820],[300,430],[700,320],[1200,380],[1820,390],[2110,600],[2110,1200],[1770,1300],[1240,1200],[750,1220],[330,1220]],136);
    road([[600,1200],[750,800],[1000,800]],125);road([[730,430],[790,750],[960,800]],124);
    road([[1200,380],[1200,580]],128);road([[1440,800],[1730,800],[2110,760],[2300,800]],128);
    road([[1800,450],[1660,780],[1800,1230]],126);road([[1200,1030],[1200,1200]],130);road([[1200,80],[1200,380]],125);road([[80,800],[300,820]],125);
    c.strokeStyle='#d0c69d';c.lineWidth=5;c.beginPath();c.roundRect(890,500,620,600,135);c.stroke();c.strokeStyle='#f0e3bc';c.lineWidth=110;c.stroke();
    this.round(c,68,70,2264,1460,130,'#00000000','#779f73');
    // Pond and its grassy islands.
    this.ellipse(c,337,1310,211,162,'#80ad9b');this.ellipse(c,337,1297,202,153,'#69bac0');this.ellipse(c,328,1285,180,132,'#85d0c7');
    for(let i=0;i<13;i++){const x=192+(i*59)%280,y=1207+(i*37)%175;c.strokeStyle='#c2e7cf';c.lineWidth=3;c.beginPath();c.ellipse(x,y,15,3,0,0,Math.PI);c.stroke();}
    [[190,1330],[470,1240],[280,1380]].forEach(([x,y])=>{this.ellipse(c,x,y,16,7,'#4c967b');this.ellipse(c,x+4,y-2,6,3,'#e8d494');});
    // Fountain water and inlaid tiles.
    this.round(c,969,579,462,442,60,'#6ca9a6');this.round(c,984,595,433,406,48,'#8bcfc8');
    for(let x=1008;x<1400;x+=40)for(let y=618;y<990;y+=40){this.round(c,x,y,33,33,5,'#99d7cb');}
    c.strokeStyle='#d0ecce';c.lineWidth=3;c.beginPath();c.arc(1200,800,151,0,TAU);c.stroke();
    // Picnic blankets, food court and flowerbeds.
    const mats=[[570,1170],[380,380],[680,350],[580,570],[1730,350],[2000,450]];
    for(let i=0;i<mats.length;i++){const[x,y]=mats[i];this.round(c,x-49,y-37,98,71,9,i%2?'#e6c292':'#e3ad88');c.strokeStyle='#f9dbb1';c.lineWidth=2;for(let a=-32;a<48;a+=16){c.beginPath();c.moveTo(x+a,y-34);c.lineTo(x+a,y+30);c.stroke();}for(let b=-20;b<31;b+=16){c.beginPath();c.moveTo(x-47,y+b);c.lineTo(x+47,y+b);c.stroke();}this.round(c,x-47,y-96,94,17,4,'#af7b50');this.round(c,x-40,y-103,80,8,3,'#c39464');}
    for(const [x,y,w,h] of [[1690,1080,100,180],[1930,1110,48,200],[1730,1310,210,30],[470,285,180,28]]){
      this.round(c,x,y,w,h,18,'#76995f');for(let i=0;i<18;i++){const fx=x+12+(i*31)%(w-20),fy=y+10+(i*19)%(h-12);this.ellipse(c,fx,fy,5,5,i%3===0?'#f5d165':i%3===1?'#ee9978':'#e3d3d9');this.ellipse(c,fx,fy,2,2,'#fff1b6');}}
    // Fixed obstacle shadows and plants.
    for(const o of obstacles){
      if(o.kind==='tree'||o.kind==='statue')continue;
      this.round(c,o.x+5,o.y+8,o.w,o.h,14,'#294f3225');
      if(o.kind==='hedge'){this.round(c,o.x,o.y,o.w,o.h,15,'#49754e');this.round(c,o.x-1,o.y-6,o.w,o.h-4,16,'#658c58');this.round(c,o.x+5,o.y-6,o.w-10,8,6,'#81a366');for(let i=14;i<Math.max(o.w,o.h);i+=24){const x=o.w>o.h?o.x+i:o.x+12,y=o.h>o.w?o.y+i:o.y+11;this.ellipse(c,x,y,6,3,'#75965d');}}
      if(o.kind==='rim'){this.round(c,o.x,o.y,o.w,o.h,9,'#9aa38b');this.round(c,o.x,o.y-5,o.w,o.h-2,8,'#e4e3c8');this.round(c,o.x+4,o.y-4,o.w-8,6,3,'#f7f1d4');}
      if(o.kind==='cart'){this.round(c,o.x,o.y,o.w,o.h,8,'#d69061');this.round(c,o.x-7,o.y-15,o.w+14,32,5,'#fff3d8');for(let i=0;i<6;i++)this.round(c,o.x-7+i*24,o.y-15,12,32,2,'#ce6f55');this.label(c,'公园餐车',o.x+65,o.y+46,16,'#fff4df');}
    }
    for(const p of gaps){this.ellipse(c,p.x,p.y,19,19,'#fbefd0');this.drawDuck(c,p.x,p.y,0,{x:1,y:0},'sign',.65,false);}
    for(const p of safePoints){c.strokeStyle='#f9f1d0';c.lineWidth=3;c.setLineDash([6,7]);c.beginPath();c.ellipse(p.x,p.y,61,44,0,0,TAU);c.stroke();c.setLineDash([]);this.label(c,'小鸭集合点',p.x,p.y+64,14,'#406d60');}
    for(const [text,x,y] of [['西北草坪',580,180],['午餐俱乐部',1840,150],['西南池塘',345,1510],['迷迭香花园',1830,1490],['市民喷泉',1200,1110]] as [string,number,number][]){this.label(c,text,x,y,22,'#4f7656');}
    this.label(c,'← 公园西门',180,790,17);this.label(c,'北门',1200,100,16);this.label(c,'公园东门 →',2220,795,17);
  }
  drawDuck(c:CanvasRenderingContext2D,x:number,y:number,t:number,face:Vec,accessory:string,scale=1,moving=false,scared=false){
    const celebrating=this.celebration&&accessory!=='statue'&&accessory!=='sign'&&!this.lessMotion;
    const bob=celebrating?-Math.abs(Math.sin(t*9))*14:moving?Math.sin(t*18)*2:Math.sin(t*2)*.7,flip=face.x<-.05?-1:1;
    c.save();c.translate(x,y);c.scale(scale*flip,scale);this.ellipse(c,0,10,18,7,'#244d4030');
    const feet=moving?Math.sin(t*18)*5:0;this.ellipse(c,-7+feet,10,6,3,'#d8893d');this.ellipse(c,8-feet,11,6,3,'#e89e42');c.translate(0,bob);
    this.ellipse(c,-2,-2,20,15,'#e3e9d6');this.ellipse(c,-2,-5,19,14,scared?'#edf1df':'#fffbed');
    c.fillStyle='#fffbed';c.beginPath();c.moveTo(-15,-8);c.lineTo(-26,-14);c.lineTo(-21,0);c.fill();
    this.ellipse(c,-4,-2,11,7,'#e7e9d5');c.strokeStyle='#ced8c3';c.lineWidth=1.5;c.beginPath();c.arc(-5,-6,10,.5,2.6);c.stroke();
    this.ellipse(c,10,-17,12,13,'#fffbed');this.round(c,17,-16,14,8,4,'#f0a440');this.ellipse(c,14,-20,2.1,2.8,'#273e33');this.ellipse(c,14.6,-21,0.6,0.8,'#ffffff');
    if(accessory==='player'){this.round(c,1,-10,18,5,2,'#d65d4b');c.fillStyle='#cf5346';c.beginPath();c.moveTo(4,-8);c.lineTo(-12-Math.sin(t*12)*4,-11);c.lineTo(-9,-3);c.lineTo(4,-4);c.fill();}
    if(accessory==='leaf'){c.fillStyle='#59954e';c.beginPath();c.ellipse(8,-29,14,5,-.4,0,TAU);c.fill();c.strokeStyle='#376947';c.lineWidth=2;c.beginPath();c.moveTo(2,-26);c.lineTo(11,-36);c.stroke();}
    if(accessory==='bow'){c.fillStyle='#5895ba';c.beginPath();c.moveTo(9,-8);c.lineTo(1,-13);c.lineTo(1,-3);c.lineTo(17,-13);c.lineTo(17,-3);c.fill();}
    if(accessory==='glasses'){c.strokeStyle='#6e685d';c.lineWidth=2;c.beginPath();c.arc(10,-20,5,0,TAU);c.arc(21,-20,4,0,TAU);c.stroke();}
    if(accessory==='bag'){this.round(c,-15,-14,16,19,5,'#d3a740');this.round(c,-13,-11,12,10,3,'#f4ca58');}
    if(accessory==='band'){this.round(c,0,-27,23,5,2,'#9b79b8');c.fillStyle='#a886c0';c.beginPath();c.moveTo(0,-26);c.lineTo(-10,-23);c.lineTo(-7,-17);c.fill();}
    c.restore();
  }
  human(c:CanvasRenderingContext2D,h:Human,t:number){
    const s=h.moving||h.state==='surprise'?Math.sin(t*11+h.id)*5:0;const guard=h.kind==='guard';c.save();c.translate(h.x,h.y);this.ellipse(c,0,11,22,9,'#34513a28');
    c.save();c.rotate(h.state==='chase'?h.face.x*.14:0);
    this.round(c,-12+s*.5,-4,9,24,4,guard?'#354e57':'#706e67');this.round(c,4-s*.5,-4,9,24,4,guard?'#354e57':'#706e67');
    const shirts=['#cf8161','#d5ad5d','#6d9ea0','#c28585','#939e74','#bc8d59'];this.round(c,-19,-36,38,36,12,guard?'#527b8a':shirts[h.id]);
    this.round(c,-27,-32-s,10,28,5,'#e5b086');this.round(c,17,-32+s,10,28,5,'#e5b086');this.ellipse(c,0,-43,15,16,'#efc59b');
    this.ellipse(c,0,-53,16,8,guard?'#314e5a':['#67584a','#c3a481','#594a40'][h.id%3]);
    if(guard){this.round(c,-18,-58,36,9,3,'#3e5f6a');this.round(c,-20,-50,38,5,2,'#284955');this.ellipse(c,0,-55,3,3,'#e9cb76');this.round(c,7,-28,7,9,2,'#eed58a');}
    const eye=h.face.x>=0?5:-5;this.ellipse(c,eye,-43,1.5,2,'#4a433a');c.restore();
    if(h.state==='surprise'||h.alert>0){this.round(c,-12,-91,25,28,9,'#fff5d3');this.label(c,'!',0,-71,23,'#d86e42');}
    else if(h.state==='search'||h.state==='investigate')this.label(c,'?',0,-77,23,'#786e4a');
    c.restore();
  }
  tree(c:CanvasRenderingContext2D,x:number,y:number){this.ellipse(c,x+14,y+7,58,23,'#52774625');this.round(c,x-10,y-48,20,52,6,'#95815b');this.ellipse(c,x,y-62,59,45,'#527d57');this.ellipse(c,x-19,y-76,35,32,'#6a935d');this.ellipse(c,x+19,y-81,37,33,'#789d61');this.ellipse(c,x-7,y-100,29,21,'#88a96a');}
  draw(game:Game,dt:number){
    this.celebration=game.mode==='celebrating';this.lessMotion=game.reduced;
    this.elapsed+=dt;this.fps=this.fps*.95+Math.min(150,1/Math.max(.001,dt))*.05;
    const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);
    const title=game.mode==='title';this.zoom=title?Math.min(1.05,this.width/1450):Math.max(.85,Math.min(1.15,this.height/800));
    let target=title?{x:1050,y:850}:game.player;
    if(game.mode==='celebrating')target=fountain;
    const halfW=this.width/this.zoom/2,halfH=this.height/this.zoom/2;
    const tx=clamp(target.x,halfW,C.width-halfW),ty=clamp(target.y,halfH,C.height-halfH),smooth=game.reduced?1:1-Math.exp(-dt*8);
    this.camera.x+=(tx-this.camera.x)*smooth;this.camera.y+=(ty-this.camera.y)*smooth;
    const ox=this.width/2-this.camera.x*this.zoom,oy=this.height/2-this.camera.y*this.zoom;
    c.save();c.translate(ox,oy);c.scale(this.zoom,this.zoom);c.drawImage(this.map,0,0);
    // Subtle water ripples around the fountain statue.
    c.strokeStyle='#e5f1da';c.lineWidth=2;for(let i=0;i<3;i++){const r=48+((game.anim*12+i*35)%120);c.globalAlpha=(1-(r-48)/120)*.7;c.beginPath();c.ellipse(1200,805,r,r*.65,0,0,TAU);c.stroke();}c.globalAlpha=1;
    if(game.stage===2){c.setLineDash([9,9]);c.strokeStyle=game.challenge?'#fcf4ce':'#e9ba4e';c.lineWidth=4;c.beginPath();c.arc(1200,800,C.occupationRadius,0,TAU);c.stroke();c.setLineDash([]);}
    const items:{y:number;draw:()=>void}[]=[];
    for(const l of game.lunches)items.push({y:l.y,draw:()=>{
      const selected=game.interaction?.kind==='lunch'&&game.interaction.id===l.id;
      if(selected){c.strokeStyle='#fff8d4';c.lineWidth=3;c.beginPath();c.ellipse(l.x,l.y,42,29,0,0,TAU);c.stroke();}
      this.ellipse(c,l.x,l.y+2,23,11,'#a8785730');this.ellipse(c,l.x,l.y,21,12,'#faf4da');
      if(l.cooldown<=0){this.round(c,l.x-13,l.y-11,25,15,4,'#c58a4d');this.round(c,l.x-14,l.y-13,26,6,3,'#6c984d');this.round(c,l.x-14,l.y-18,26,8,4,'#ecc87e');for(let k=0;k<3;k++)this.ellipse(c,l.x-8+k*8,l.y-16,1.5,1,'#fff0c0');}
      else this.label(c,`${Math.ceil(l.cooldown)}s`,l.x,l.y+5,11,'#9a936f');
    }});
    for(const h of game.humans)if(h.active)items.push({y:h.y,draw:()=>this.human(c,h,game.anim)});
    for(const o of obstacles)if(o.kind==='tree')items.push({y:o.y+o.h,draw:()=>this.tree(c,o.x+18,o.y+18)});
    items.push({y:845,draw:()=>{this.ellipse(c,1200,807,57,34,'#629996');this.round(c,1158,776,84,55,14,'#94b8ae');this.ellipse(c,1200,774,42,23,'#c6d5bd');this.round(c,1187,701,26,78,10,'#a4c0af');this.drawDuck(c,1197,692,0,{x:1,y:0},'statue',1.8);}});
    const duckDraw=(d:Duck)=>{if(game.interaction?.kind==='duck'&&game.interaction.id===d.id){c.strokeStyle='#fff5bb';c.lineWidth=3;c.beginPath();c.ellipse(d.x,d.y+5,30,22,0,0,TAU);c.stroke();}this.drawDuck(c,d.x,d.y,game.anim+d.id,d.face,d.accessory,1,d.moving,d.state==='fleeing');if(d.state==='waiting'||d.state==='recall'){this.round(c,d.x-25,d.y-62,50,22,10,d.state==='recall'?'#f6ca69':'#fff8dd');this.label(c,d.state==='recall'?'Q 召回':d.name,d.x,d.y-47,12,'#426553');}if(d.state==='fleeing')this.label(c,'！',d.x,d.y-50,22,'#c6684f');};
    for(const d of game.ducks)items.push({y:d.y,draw:()=>duckDraw(d)});
    if(!title)items.push({y:game.player.y,draw:()=>{
      const p=game.player;if(p.protection>0){c.strokeStyle='#fff4bf';c.lineWidth=3;c.beginPath();c.ellipse(p.x,p.y,29,21,0,0,TAU);c.stroke();}
      this.drawDuck(c,p.x,p.y,game.anim,p.face,'player',1.06,p.moving);
      if(p.quackFlash>0){c.strokeStyle=`rgba(255,250,211,${p.quackFlash})`;c.lineWidth=3;c.beginPath();c.arc(p.x,p.y,(.65-p.quackFlash)*400+25,0,TAU);c.stroke();this.label(c,'嘎——！',p.x,p.y-52,20,'#fff8d8');}
      if(game.stealTarget>=0){c.strokeStyle='#d86d46';c.lineWidth=5;c.beginPath();c.arc(p.x,p.y-23,31,-Math.PI/2,-Math.PI/2+TAU*game.stealProgress/C.stealTime);c.stroke();}
    }});
    if(title){const costumes=['player','leaf','bow','glasses','bag','band'];for(let i=0;i<6;i++)items.push({y:925+i%2*33,draw:()=>this.drawDuck(c,1080+i*61,925+i%2*33,game.anim+i,{x:1,y:0},costumes[i],1.5,true)});}
    items.sort((a,b)=>a.y-b.y).forEach(i=>i.draw());
    if(game.stage===2||title){c.strokeStyle='#6c7a63';c.lineWidth=5;c.beginPath();c.moveTo(1375,690);c.lineTo(1375,598);c.stroke();c.fillStyle=game.mode==='celebrating'||game.mode==='won'?'#f0c859':'#db7c53';c.beginPath();c.moveTo(1376,598);c.lineTo(1435,606);c.lineTo(1420,625);c.lineTo(1376,622);c.fill();if(game.mode==='celebrating'||game.mode==='won')this.drawDuck(c,1398,612,0,{x:1,y:0},'sign',.5);}
    for(const p of game.particles){c.globalAlpha=p.life/p.max;this.ellipse(c,p.x,p.y,p.size,p.size,p.color);}c.globalAlpha=1;
    if(game.mode==='celebrating'){this.label(c,'喷 泉 归 鸭 ！',1200,530,54,'#fffbe4');}
    if(game.debug)this.debug(c,game);
    c.restore();
    if(!title&&['playing','recovering'].includes(game.mode)){
      if(game.interaction&&game.stealTarget<0){const p=this.screen({x:game.player.x,y:game.player.y-66}),text=game.interaction.text;c.font='600 14px "Microsoft YaHei",sans-serif';const w=c.measureText(text).width+28;this.round(c,p.x-w/2,p.y-25,w,35,12,'#fff9e9','#dacda7');this.label(c,text,p.x,p.y-3,14,'#355a4c');}
      this.arrow(c,game);
    }
  }
  screen(p:Vec){return {x:(p.x-this.camera.x)*this.zoom+this.width/2,y:(p.y-this.camera.y)*this.zoom+this.height/2};}
  arrow(c:CanvasRenderingContext2D,g:Game){const goal=g.goal();if(!goal)return;const p=this.screen(goal.pos);if(p.x>70&&p.x<this.width-70&&p.y>155&&p.y<this.height-125){if(distance(g.player,goal.pos)>85){this.label(c,'▼',p.x,p.y-75,19,'#c8733d');}return;}
    const center={x:this.width/2,y:this.height/2};const dx=p.x-center.x,dy=p.y-center.y;const s=Math.min((center.x-100)/Math.max(1,Math.abs(dx)),(center.y-153)/Math.max(1,Math.abs(dy)));const x=center.x+dx*s,y=center.y+dy*s;
    this.round(c,x-64,y-21,128,43,18,'#fff7df','#c8b88c');c.save();c.translate(x+45,y);c.rotate(Math.atan2(dy,dx));c.fillStyle='#cf714a';c.beginPath();c.moveTo(8,0);c.lineTo(-4,-6);c.lineTo(-4,6);c.fill();c.restore();this.label(c,goal.label,x-10,y+5,13,'#48614d');
  }
  debug(c:CanvasRenderingContext2D,g:Game){c.strokeStyle='#ff3866';c.lineWidth=1;for(const o of obstacles)c.strokeRect(o.x,o.y,o.w,o.h);for(const h of g.humans)if(h.active){c.beginPath();c.arc(h.x,h.y,C.humanRadius,0,TAU);c.stroke();c.strokeStyle='#835bef';c.beginPath();c.moveTo(h.x,h.y);for(const p of h.path)c.lineTo(p.x,p.y);c.stroke();const angle=Math.atan2(h.face.y,h.face.x);c.beginPath();c.moveTo(h.x,h.y);c.arc(h.x,h.y,C.sightRange,angle-C.fieldOfView/2,angle+C.fieldOfView/2);c.closePath();c.stroke();}for(const d of g.ducks){c.strokeStyle='#f7eb5b';c.beginPath();c.moveTo(d.x,d.y);for(const p of d.path)c.lineTo(p.x,p.y);c.stroke();}this.label(c,`${this.fps.toFixed(0)} FPS`,g.player.x,g.player.y+60,16,'#293335');}
}
