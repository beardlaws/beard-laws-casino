import {Application,Assets,BlurFilter,Container,Graphics,Sprite} from 'pixi.js';
const ids=['oil','comb','razor','balm','key','crown','vernon','vault','coin'];

export class ReelStripView{
 app=new Application();root=new Container();width=980;height=570;textures={};reels=[];grid=null;reducedMotion=false;onReelStop=null;
 async mount(host){
  await this.app.init({width:this.width,height:this.height,antialias:true,backgroundAlpha:0,resolution:Math.min(devicePixelRatio||1,2),autoDensity:true});
  this.app.canvas.classList.add('slot-canvas');host.replaceChildren(this.app.canvas);this.app.stage.addChild(this.root);
  await Promise.all(ids.map(async id=>{this.textures[id]=await Assets.load(`./assets/${id}.svg?v=3.0.0`);}));
  new ResizeObserver(()=>this.resize(host)).observe(host);
 }
 setReducedMotion(v){this.reducedMotion=v}
 renderGrid(grid){
  this.grid=grid;this.root.removeChildren();this.reels=[];
  const cols=grid.length,rows=grid[0]?.length||3,rw=this.width/cols,rh=this.height/rows;
  this.root.addChild(new Graphics().roundRect(0,0,this.width,this.height,20).fill({color:0x031109}).stroke({color:0xe4bd58,width:5}));
  grid.forEach((column,c)=>{
   const reel=new Container();reel.x=c*rw;
   const mask=new Graphics().rect(0,0,rw,this.height).fill(0xffffff);reel.addChild(mask);reel.mask=mask;
   const strip=new Container();reel.addChild(strip);
   column.forEach((symbol,r)=>strip.addChild(this.makeSymbol(symbol,rw,rh,r)));
   reel._strip=strip;reel._blur=new BlurFilter({strength:0,quality:2});strip.filters=[reel._blur];
   this.root.addChild(reel);this.reels.push(reel);
  });
 }
 makeSymbol(symbol,rw,rh,row){
  const holder=new Container();holder.y=row*rh;
  const outer=new Graphics().roundRect(5,5,rw-10,rh-10,14).fill({color:0x0a1d10}).stroke({color:0x8fe56a,width:4});
  const inner=new Graphics().roundRect(12,12,rw-24,rh-24,11).fill({color:0x09120c}).stroke({color:0x2d6433,width:2});
  const sprite=new Sprite(this.textures[symbol]);sprite.anchor.set(.5);sprite.position.set(rw/2,rh/2);
  const size=Math.min(rw-26,rh-20);sprite.width=size;sprite.height=size;
  holder.addChild(outer,inner,sprite);return holder;
 }
 async spinTo(finalGrid){
  if(!this.grid){this.renderGrid(finalGrid);return}
  if(this.reducedMotion){await wait(220);this.renderGrid(finalGrid);return}
  const rw=this.width/finalGrid.length,rh=this.height/(finalGrid[0]?.length||3);
  await Promise.all(this.reels.map((reel,i)=>this.spinReel(reel,i,finalGrid[i],rw,rh)));
  this.grid=finalGrid;
 }
 async spinReel(reel,index,finalColumn,rw,rh){
  const strip=reel._strip;strip.removeChildren();const holders=[];
  for(let i=0;i<12;i++){const h=this.makeSymbol(ids[Math.floor(Math.random()*ids.length)],rw,rh,i-4);holders.push(h);strip.addChild(h)}
  await wait(index*125);
  const start=performance.now(),duration=900+index*175,totalHeight=12*rh;
  await new Promise(resolve=>{
   const frame=now=>{
    const t=Math.min(1,(now-start)/duration);
    const speed=t<.16?easeIn(t/.16):t<.72?1:.14+.86*(1-easeOut((t-.72)/.28));
    for(const h of holders){h.y+=speed*38;while(h.y>this.height+rh)h.y-=totalHeight}
    reel._blur.strength=speed*13;
    if(t<1)requestAnimationFrame(frame);else resolve();
   };requestAnimationFrame(frame);
  });
  reel._blur.strength=0;strip.removeChildren();finalColumn.forEach((s,r)=>strip.addChild(this.makeSymbol(s,rw,rh,r)));
  strip.y=-24;const settle=performance.now();
  await new Promise(resolve=>{const frame=now=>{const t=Math.min(1,(now-settle)/190);strip.y=-24*(1-easeBack(t));if(t<1)requestAnimationFrame(frame);else{strip.y=0;resolve()}};requestAnimationFrame(frame)});
  this.onReelStop?.(index);
 }
 resize(host){
  const w=Math.max(540,Math.floor(host.clientWidth)),h=Math.max(355,Math.floor(w*.58));
  if(w===this.width&&h===this.height)return;this.width=w;this.height=h;this.app.renderer.resize(w,h);if(this.grid)this.renderGrid(this.grid)
 }
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const easeIn=t=>t*t*t;
const easeOut=t=>1-Math.pow(1-t,3);
const easeBack=t=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)};
