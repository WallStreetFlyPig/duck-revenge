import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, noInput } from '../src/game.ts';
import { C, spawn, fountain, lunches, companions, safePoints, distance } from '../src/config.ts';
import { collides, clearLine, findPath, move, gaps } from '../src/world.ts';
import { readSave, writeSave } from '../src/storage.ts';
const advance=(g:Game,seconds:number,input={})=>{for(let i=0;i<Math.round(seconds/C.step);i++)g.tick(C.step,{...noInput(),...input});};
const quiet=()=>{const g=new Game();g.reset();g.humans.forEach(h=>{h.active=false;});g.mischief=0;g.player.protection=1000;return g;};
test('diagonal movement normalized; sprint uses last facing and cooldown from launch',()=>{
 const a=quiet(),b=quiet();advance(a,.5,{x:1});advance(b,.5,{x:1,y:-1});assert.ok(Math.abs(distance(a.player,spawn)-distance(b.player,spawn))<.01);
 const g=quiet();g.tick(C.step,{...noInput(),sprint:true});assert.ok(g.player.x>spawn.x);assert.equal(g.player.sprintCd,3);advance(g,.6);assert.ok(g.player.sprintCd<2.5);assert.equal(g.player.sprint,0);
});
test('substepped collision stops high speed movement; duck-only passages reject humans',()=>{
 const p={x:600,y:1080};move(p,0,-500,13);assert.ok(p.y>1060);
 for(const gap of gaps){assert.equal(collides(gap,C.playerRadius),false);assert.equal(collides(gap,C.humanRadius),true);}
});
test('all lunches, companions, safe points and fountain entries reachable for ducks',()=>{
 for(const p of [...lunches,...companions,...safePoints,{x:1200,y:660},{x:1040,y:800},{x:1360,y:800}]){const path=findPath(spawn,p,C.playerRadius);assert.ok(path.length>0,JSON.stringify(p));let prev=spawn;for(const step of path){assert.equal(clearLine(prev,step,C.playerRadius),true,`bad segment ${JSON.stringify(prev)} => ${JSON.stringify(step)}`);prev=step;}}
});
test('human routes around a duck passage without crossing a solid segment',()=>{
 const a={x:714,y:970},b={x:714,y:1090};const path=findPath(a,b,C.humanRadius);assert.ok(path.length>3);let prev=a;for(const step of path){assert.ok(clearLine(prev,step,C.humanRadius));prev=step;}
});
test('steal release and movement cancel with no reward; held E completes once',()=>{
 const g=quiet();Object.assign(g.player,{x:570,y:1200});advance(g,.3,{interact:true});advance(g,.1);assert.equal(g.stolen,0);assert.equal(g.stealTarget,-1);
 advance(g,.3,{interact:true});advance(g,.1,{interact:true,x:1});assert.equal(g.stolen,0);Object.assign(g.player,{x:570,y:1200});advance(g,.7,{interact:true});assert.equal(g.stolen,1);assert.equal(g.food,1);assert.equal(g.score,100);advance(g,1,{interact:true});assert.equal(g.stolen,1);
});
test('capacity, 20-second restock and owner identity stay bounded',()=>{
 const g=quiet();g.steal(0);g.steal(1);g.steal(2);g.steal(3);assert.equal(g.food,3);assert.equal(g.stolen,3);assert.equal(g.humans.length,9);g.food=0;advance(g,20.1);g.steal(0);assert.equal(g.stolen,4);assert.equal(g.humans.length,9);
});
test('recruitment charges once; recall is free and protected',()=>{
 const g=quiet();g.food=2;g.recruit(0);g.recruit(0);assert.equal(g.food,1);assert.equal(g.score,200);const d=g.ducks[0];g.scare(d);assert.equal(d.state,'fleeing');Object.assign(d,{x:360,y:1260,safe:spawn});g.updateDucks(C.step);assert.equal(d.state,'recall');g.quack();assert.equal(d.state,'following');assert.equal(g.food,1);assert.equal(g.score,200);assert.equal(d.protection,3);
});
test('early recruits advance sequential objectives cumulatively',()=>{
 const g=quiet();for(let i=0;i<5;i++){g.food=1;g.recruit(i);}assert.equal(g.stage,0);for(let i=0;i<3;i++){g.food=0;g.steal(i);}assert.equal(g.stage,2);
});
test('capture keeps cumulative progress, clears food and challenge; third capture loses',()=>{
 const g=quiet();g.food=1;g.recruit(0);g.stolen=3;g.challenge=true;g.occupation=9;
 for(let i=0;i<3;i++){g.mode='playing';g.player.protection=0;g.catchPlayer();assert.equal(g.feathers,2-i);assert.equal(g.food,0);assert.equal(g.stolen,3);assert.equal(g.recruited,1);assert.equal(g.occupation,0);if(i<2){assert.equal(g.mode,'recovering');assert.equal(g.player.x,spawn.x);assert.equal(g.player.protection,3);advance(g,2);}}
 assert.equal(g.mode,'lost');
});
test('pause and recovery do not advance effective time; restart clears session data',()=>{
 const g=quiet();advance(g,2);const t=g.elapsed;g.pause();advance(g,10);assert.equal(g.elapsed,t);g.resume();g.player.protection=0;g.catchPlayer();advance(g,1);assert.equal(g.elapsed,t);
 for(let i=0;i<10;i++){g.reset();assert.equal(g.humans.length,9);assert.equal(g.ducks.length,5);assert.equal(g.elapsed,0);assert.equal(g.player.quackCd,0);assert.equal(g.particles.length,0);assert.equal(g.stolen,0);}
});
test('occupation needs 3 followers, pauses 2 seconds, decays and resumes',()=>{
 const g=quiet();g.stage=2;Object.assign(g.player,{x:1100,y:800});g.ducks.slice(0,3).forEach((d,i)=>Object.assign(d,{recruited:true,state:'following',x:1080,y:760+i*35}));g.startChallenge();assert.ok(g.challenge);g.updateOccupation(5);assert.equal(g.occupation,5);g.ducks[0].state='fleeing';g.updateOccupation(2);assert.equal(g.occupation,5);g.updateOccupation(1);assert.equal(g.occupation,4);g.ducks[0].state='following';g.updateOccupation(2);assert.equal(g.occupation,6);g.player.x=1600;g.updateOccupation(3);assert.equal(g.occupation,5);
});
test('capture has priority over victory in same update',()=>{
 const g=quiet();g.stage=2;g.challenge=true;g.occupation=C.occupationTime-.005;Object.assign(g.player,{x:1100,y:800,protection:0});g.ducks.slice(0,3).forEach(d=>Object.assign(d,{state:'following',recruited:true,x:1070,y:800,protection:3}));Object.assign(g.humans[0],{active:true,state:'idle',x:1100,y:800});g.tick(C.step,noInput());assert.equal(g.mode,'recovering');assert.equal(g.occupation,0);
});
test('win scores once and freezes pursuit',()=>{
 const g=quiet();g.elapsed=300;g.score=1500;g.win();assert.equal(g.score,3400);g.win();assert.equal(g.score,3400);advance(g,3.1);assert.equal(g.mode,'won');assert.equal(g.elapsed,300);
});
test('vision obeys walls, front cone, rear radius; quack keeps last location',()=>{
 const g=quiet(),h=g.humans[0];Object.assign(h,{x:600,y:980,face:{x:0,y:1},active:true,state:'idle'});Object.assign(g.player,{x:600,y:1080});assert.equal(g.canSee(h),false);g.quack();assert.equal(h.state,'investigate');const heard={...h.last};g.player.x+=100;assert.deepEqual(h.last,heard);
 Object.assign(h,{x:1100,y:400,face:{x:1,y:0}});Object.assign(g.player,{x:1000,y:400});assert.equal(g.canSee(h),false);g.player.x=1050;assert.equal(g.canSee(h),true);
});
test('one quack increases mischief once; chase does not forget; population bounded',()=>{
 const g=quiet();g.player.protection=0;g.humans.slice(0,3).forEach((h,i)=>Object.assign(h,{active:true,x:400+i*20,y:1260,state:i===0?'chase':'idle'}));g.quack();assert.equal(g.mischief,8);assert.equal(g.humans[0].state,'chase');g.mischief=100;g.updateHumans(C.step);for(let i=0;i<5;i++)g.updateHumans(2);assert.ok(g.humans.filter(h=>h.active).length<=9);assert.equal(g.humans.length,9);
});
test('storage corruption, unavailable storage and invalid values recover defaults',()=>{
 assert.equal(readSave({getItem:()=>'{bad'}).highScore,0);assert.equal(readSave({getItem:()=>{throw Error('denied');}}).sound,true);assert.equal(readSave({getItem:()=>JSON.stringify({version:1,highScore:-4,bestTime:'bad'})}).bestTime,null);assert.equal(writeSave(readSave({getItem:()=>null}),{setItem:()=>{throw Error('denied');}}),false);
});
