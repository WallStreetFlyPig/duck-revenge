import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,noInput} from '../src/game.ts';
import {C,distance,norm} from '../src/config.ts';
import {findPath,collides} from '../src/world.ts';

test('input-only complete round: steal, gaps, five recruits, capture recovery, fountain victory, replay',()=>{
 const g=new Game();g.reset();
 function tick(input={}){
  g.tick(C.step,{...noInput(),...input});g.events=[];
  assert.notEqual(g.mode,'lost');
  for(const d of g.ducks)assert.equal(collides(d,C.duckRadius),false,`duck ${d.name} crossed a wall`);
 }
 function walk(x:number,y:number){
  let path=findPath(g.player,{x,y},C.playerRadius),time=0;
  while(distance(g.player,{x,y})>9&&time<30){
   if(g.mode==='recovering'){tick();time+=C.step;path=findPath(g.player,{x,y},C.playerRadius);continue;}
   if(path.length>1&&distance(g.player,path[0])<9)path.shift();
   const target=path[0];assert.ok(target,'route exists');const dir=norm(target.x-g.player.x,target.y-g.player.y);
   const imminent=g.humans.some(h=>h.active&&h.state==='chase'&&distance(h,g.player)<160);
   tick({x:dir.x,y:dir.y,sprint:imminent&&g.player.sprintCd===0&&distance(g.player,target)>210});time+=C.step;
  }
  assert.ok(time<30,'route did not get stuck');
 }
 function steal(id:number){const l=g.lunches[id];walk(l.x,l.y+28);for(let i=0;i<40;i++)tick({interact:true});}
 function recruit(id:number){const d=g.ducks[id];walk(d.x,d.y+20);tick({ePressed:true,interact:true});}
 steal(0);recruit(0);walk(714,1100);walk(714,965);steal(3);recruit(1);steal(1);recruit(2);steal(2);walk(970,365);steal(4);recruit(3);walk(2120,980);recruit(4);
 assert.equal(g.recruited,5);assert.equal(g.stage,2);assert.equal(g.stolen,5);
 walk(1500,800);walk(1340,850);walk(1280,930);for(let i=0;i<35;i++)tick();
 if(g.mode==='recovering'){while(g.mode==='recovering')tick();walk(850,800);walk(1060,800);walk(1120,690);}
 tick({ePressed:true,interact:true});
 for(let i=0;i<3600&&g.mode==='playing'&&g.challenge;i++){
  const angle=Math.atan2(g.player.y-800,g.player.x-1200)+.09;
  const dir=norm(1200+103*Math.cos(angle)-g.player.x,800+103*Math.sin(angle)-g.player.y);
  tick({x:dir.x,y:dir.y,sprint:g.player.sprintCd===0});
 }
 if(g.mode==='recovering'){
  while(g.mode==='recovering')tick();walk(840,800);walk(1050,800);walk(1100,690);tick({ePressed:true,interact:true});
  for(let i=0;i<2400&&g.mode==='playing';i++){
   const angle=Math.atan2(g.player.y-800,g.player.x-1200)-.09;
   const dir=norm(1200+115*Math.cos(angle)-g.player.x,800+115*Math.sin(angle)-g.player.y);
   tick({x:dir.x,y:dir.y,sprint:g.player.sprintCd===0,ePressed:!g.challenge,interact:!g.challenge});
  }
 }
 assert.equal(g.mode,'celebrating');assert.equal(g.occupation,15);assert.ok(g.score>=2700);
 tick({ePressed:true});assert.equal(g.mode,'won');g.reset();assert.equal(g.mode,'playing');assert.equal(g.score,0);assert.equal(g.recruited,0);
});

test('frightened duck walks to safety without teleporting, then Q recalls it for free',()=>{
 const g=new Game();g.reset();g.food=1;g.recruit(0);const d=g.ducks[0];g.scare(d);
 let steps=0;
 while(d.state==='fleeing'&&steps<1800){const old={x:d.x,y:d.y};g.updateDucks(C.step);assert.ok(distance(old,d)<=C.duckCatchup*C.step+.001);assert.equal(collides(d,C.duckRadius),false);steps++;}
 assert.equal(d.state,'recall');assert.ok(steps<1800);const score=g.score;
 // The player starts within the pond recall radius of this safe point.
 assert.ok(distance(g.player,d)<C.quackRadius);g.quack();assert.equal(d.state,'following');assert.equal(g.score,score);assert.equal(g.food,0);assert.equal(d.protection,3);
});
