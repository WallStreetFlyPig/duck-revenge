export class Sound {
  context: AudioContext | null = null; master: GainNode | null = null; enabled = true; active = false; beat = 0; clock = 0;
  private recent = new Map<string, number>(); private voices = new Set<OscillatorNode>();
  unlock() {try {this.context??=new AudioContext();if(!this.master){this.master=this.context.createGain();this.master.connect(this.context.destination);}this.master.gain.value=this.enabled?.22:0;void this.context.resume().catch(()=>{});}catch {this.context=null;this.master=null;}}
  setEnabled(on: boolean) {this.enabled=on;if(this.master&&this.context)this.master.gain.setTargetAtTime(on?.22:0,this.context.currentTime,.025);}
  reset() {for(const v of this.voices)try{v.stop();}catch{}this.voices.clear();this.beat=0;this.clock=0;this.recent.clear();}
  tone(hz: number, duration: number, type: OscillatorType='triangle', volume=.3, end?: number) {
    const c=this.context,m=this.master;if(!c||!m||!this.enabled||this.voices.size>18)return;
    try {const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(hz,c.currentTime);if(end)o.frequency.exponentialRampToValueAtTime(end,c.currentTime+duration);g.gain.setValueAtTime(0,c.currentTime);g.gain.linearRampToValueAtTime(volume,c.currentTime+.012);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g);g.connect(m);o.start();o.stop(c.currentTime+duration);this.voices.add(o);o.onended=()=>{o.disconnect();g.disconnect();this.voices.delete(o);};}catch{}
  }
  effect(name: string) {
    const now=this.context?.currentTime??0;if(now-(this.recent.get(name)??-10)<.16)return;this.recent.set(name,now);
    switch(name){
      case 'quack':this.tone(440,.22,'sawtooth',.32,155);this.tone(290,.17,'triangle',.3,180);break;
      case 'steal':this.tone(730,.13);this.tone(1095,.3);break;
      case 'join':case 'stage':this.tone(523,.4);this.tone(659,.5);this.tone(784,.6);break;
      case 'whistle':this.tone(1580,.22,'sine',.14,1940);break;
      case 'sprint':this.tone(260,.17,'triangle',.25,70);break;
      case 'caught':case 'lose':this.tone(392,.7,'triangle',.4,98);break;
      case 'challenge':this.tone(196,.6,'square',.2);this.tone(392,.6);break;
      case 'win':for(const f of [523,659,784,1047])this.tone(f,1.2,'triangle',.2);break;
      case 'scared':this.tone(650,.25,'sine',.15,1050);break;
    }
  }
  update(dt: number, playing: boolean, finale: boolean) {
    if(!playing||!this.enabled||!this.context)return;
    this.clock-=dt;if(this.clock>0)return;this.clock=finale?.21:.3;
    const melody=[72,0,76,79,76,74,72,0,67,69,72,74,72,69,67,0];const note=melody[this.beat%melody.length];
    if(note)this.tone(440*2**((note-69)/12),.15,'triangle',.095);
    if(this.beat%4===0)this.tone(130.81*(this.beat%16<8?1:.75),.28,'sine',.2);
    if(this.beat%2)this.tone(105,.035,'square',.025,60);this.beat++;
  }
}
