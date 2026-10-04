import { noInput, type Input } from './game.ts';
export class Controls {
  held = new Set<string>(); pressed = new Set<string>();
  constructor(private pause: () => void, private toggleDebug: () => void, private autoPause: () => void) {
    window.addEventListener('keydown',e=>{
      if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyE','KeyQ'].includes(e.code)&&!(e.target instanceof HTMLButtonElement))e.preventDefault();
      if(!this.held.has(e.code))this.pressed.add(e.code);this.held.add(e.code);
      if(!e.repeat&&e.code==='Escape'){this.clear();this.pause();}
      if(!e.repeat&&e.code==='F3'){e.preventDefault();this.toggleDebug();}
    });
    window.addEventListener('keyup',e=>this.held.delete(e.code));
    window.addEventListener('blur',()=>{this.clear();this.autoPause();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.clear();this.autoPause();}});
  }
  clear() {this.held.clear();this.pressed.clear();}
  sample(): Input {
    const i=noInput(),h=this.held;
    i.x=+(h.has('KeyD')||h.has('ArrowRight'))-+(h.has('KeyA')||h.has('ArrowLeft'));
    i.y=+(h.has('KeyS')||h.has('ArrowDown'))-+(h.has('KeyW')||h.has('ArrowUp'));
    i.interact=h.has('KeyE');i.ePressed=this.pressed.has('KeyE');i.sprint=this.pressed.has('Space');i.quack=this.pressed.has('KeyQ');this.pressed.clear();return i;
  }
}
