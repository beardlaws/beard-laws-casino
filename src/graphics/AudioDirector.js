export class AudioDirector{
 constructor(){this.ctx=null;this.enabled=true;}
 setEnabled(enabled){this.enabled=enabled;}
 ensure(){
  if(!this.enabled)return null;
  if(!this.ctx){
    const Context=window.AudioContext||window.webkitAudioContext;
    if(!Context)return null;
    this.ctx=new Context();
  }
  if(this.ctx.state==='suspended')this.ctx.resume();
  return this.ctx;
 }
 tone(freq,duration=.12,type='sine',gain=.025,delay=0){
  const ctx=this.ensure();if(!ctx)return;
  const osc=ctx.createOscillator(),amp=ctx.createGain();
  osc.type=type;osc.frequency.setValueAtTime(freq,ctx.currentTime+delay);
  amp.gain.setValueAtTime(.0001,ctx.currentTime+delay);
  amp.gain.exponentialRampToValueAtTime(gain,ctx.currentTime+delay+.015);
  amp.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+delay+duration);
  osc.connect(amp).connect(ctx.destination);
  osc.start(ctx.currentTime+delay);osc.stop(ctx.currentTime+delay+duration+.04);
 }
 spin(){
  [95,110,128,145].forEach((f,i)=>this.tone(f,.28,'sawtooth',.012,i*.055));
 }
 stop(index){
  this.tone(115+index*12,.12,'square',.022);
  this.tone(62,.18,'triangle',.018,.02);
 }
 coin(count=1){
  for(let i=0;i<Math.min(count,5);i++){
    this.tone(510+i*38,.16,'triangle',.026,i*.06);
    this.tone(185+i*11,.20,'square',.014,i*.06);
  }
 }
 win(value){
  const notes=value>=10?[262,330,392,523,659]:[330,440,554];
  notes.forEach((f,i)=>this.tone(f,.28,'triangle',.026,i*.09));
 }
}
